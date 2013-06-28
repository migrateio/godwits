'use strict';

var log = require( 'ringo/logging' ).getLogger( module.id );

// Let's define some exceptions that we might through, so we can have a bit more fun than just throwing objects.
function GenericException( code, msg ) {
    log.error( msg );
    this.code = code;
    this.message = msg;
}

// And we override the toString function in case I feel like logging one directly.
GenericException.prototype.toString = function () {
    return this.message;
};

// Same deal, only this one we pass an already existing java exception, for preservation purposes.
function WrappedException( code, msg, e ) {
    log.error( msg, e );
    this.code = code;
    this.message = msg;
    this.exception = e;
}

// Override toString again.
WrappedException.prototype.toString = function () {
    return JSON.stringify( {
        code : this.code,
        message : this.message,
        exception : this.exception
    }, null, 4 );
};

// **Export** our CommonJS module, which is also a subclass of Object. This is for extensibility.
exports.ImapService = Object.subClass( {

    // init is our constructor.
    init : function ( opts ) {

        // Assign the passed in options to as a property of the class.
        this.opts = opts;


        log.info(JSON.stringify(opts, null, 4));

        // And some aliasing for ease of use.
        this.email = this.opts.email;

        // factored out so we can override it in subclasses.
        this.setProps();

        try {
            log.info( 'Trying to get session instance.' );
            // Try to get a session instance.
            this.session = javax.mail.Session.getInstance( this.props, null );
            this.session.setDebug( true );
        } catch ( e ) {
            throw new WrappedException( 500, 'Error getting session.', e );
        }

        try {
            log.info( 'Trying to get IMAP store.' );
            // And now the IMAPStore.
            this.store = this.session.getStore( 'imaps' );
        } catch ( e ) {
            throw new WrappedException( 500, 'Error getting IMAP store.', e );
        }
    },

    setProps : function () {
        // Get the java properties object, we'll need this in order to get a session.
        this.props = java.lang.System.getProperties();

        // Set the protocol to imaps, (IMAP, secure).
        this.props.setProperty( 'mail.store.protocol', 'imaps' );

        // If we've got other properties passed in, set those as well.
        if ( this.opts.props ) {
            var names = Object.keys( this.opts.props );
            for ( var i = 0; i < names.length; i++ ) {
                this.props.setProperty( names[i], this.opts.props[names[i]] );
            }
        }

        log.info( 'Set mail.store.protocol to secure IMAP.' );
    },

    // Eventually we'll have to connect to the server. This function does the work involved in that.
    connect : function () {

        // If we don't have a password, we cannot connect.
        if ( !this.opts.password ) {
            throw new GenericException( 401, 'No authentication provided.' );
        }

        // Password-based connection.
        if ( this.opts.password ) {
            try {
                log.info( 'Trying to connect to IMAP store with supplied credentials: {}', JSON.stringify( this.opts, null, 4 ) );
                this.store.connect( this.opts.hostname, this.opts.email, this.opts.password );
            } catch ( e ) {
                throw new WrappedException( 500, 'Could not connect to store', e );
            }
        }

    },

    // Migrating emails has two steps, getting the mails and writing them out. This covers the write portion.
    write : function ( folder, messages ) {

        // The folder argument can be passed in as either a java object representing an imap folder, or a string path.
        // This takes care of turning the string representation into the java object.
        if ( typeof folder === 'string' ) {
            folder = this.store.getFolder( folder );
        }

        // If the folder's type is incorrect, we cannot write messages to this folder.
        if ( folder.getType() === javax.mail.Folder.HOLDS_FOLDERS ) {
            throw new GenericException( 500, 'Folder cannot contain messages, unable to write.' );
        }

        // If folder isn't open, we open it.
        if ( !folder.isOpen() ) {
            folder.open( javax.mail.Folder.READ_WRITE );
        }

        // If the folder is open, but in readonly mode, we need to close and reopen it correctly.
        if ( folder.isOpen() && folder.getMode() === javax.mail.Folder.READ_ONLY ) {
            folder.close( false );
            folder.open( javax.mail.Folder.READ_WRITE );
            // Okay, now our folder is open, and set to the correct mode.
        }

        // Define some result variables.
        var successCount = 0;
        var errors = [];

        // Loop over messages, append each one individually.

        folder.appendMessages( messages );

//        for ( var i = 0; i < messages.length; i++ ) {
//            log.info( 'Appending message: {}', messages[i].getMessageNumber() );
//            try {          try :{

//                if(!folder.isOpen()) {
//                    folder.open( javax.mail.Folder.READ_WRITE );
//                }
//                folder.appendMessages( [messages[i]] );
//            } catch ( e ) {
//                log.error( 'Error appending message', e );
//
//                // If we had an error we push info into this structure to be returned later.
//                errors.push( {
//                    id : messages[i].getMessageNumber(),
//                    imap : messages[i],
//                    code : 500,
//                    message : e.toString()
//                } );
//                continue;
//            }
//            // If we didn't encounter an error, we successfully wrote an email, so increase the successCount.
//            successCount++;
//        }

        // ...and we're done here.
        return {
            successCount : successCount,
            errors : errors
        }
    },

    // Here's our read step.
    read : function ( folder, from, to ) {

        // This function has two distinct function signatures: read(folder, ids) and read(folder, from, to).
        // This is just some aliasing to make what I'm doing a little more clear. In theory.
        var ids = from;

        // Check for an incorrect call and throw.
        if ( !to && Array.isArray( ids ) ) {
            throw new GenericException( 400, 'Incorrect arguments passed to read. Accepted calling patterns: read(number, number) OR read(array_of_ids)' );
        }

        // The folder argument can be passed in as either a java object representing an imap folder, or a string path.
        // This takes care of turning the string representation into the java object.
        // This also violates DRY since I've got the same code in the write function. :(
        if ( typeof folder === 'string' ) {
            try {
                folder = this.store.getFolder( folder );
            } catch ( e ) {

            }
        }

        // We only have to check if it isn't open in this case, since every open case will allow us to read from the folder.
        if ( !folder.isOpen() ) {
            folder.open( javax.mail.Folder.READ_ONLY );
        }

        // Get our messages for the range call.
        if ( typeof from === 'number' && typeof to === 'number' ) {
            to > folder.getMessageCount() ? to = folder.getMessageCount() : to;
            return folder.getMessages( from, to );
        }

        // Get our messages for the array of ids.
        if ( Array.isArray( ids ) ) {
            return folder.getMessages( ids );
        }
    },

    // Sometimes we need to get all the folders. This function lets us do so.
    getFolders : function () {
        return this.store.getDefaultFolder().list( '*' );
    },

    // Sometimes we need to write folders. Let's do that now.
    writeFolders : function ( folders ) {
        var successCount = 0;
        var errors = [];

        // Why wouldn't you give me the folders to write :(
        if ( !folders ) {
            throw new GenericException( 500, 'Bad request, folders must be an array.' );
        }

        // Simply loop over the array passed in,
        for ( var i = 0; i < folders.length; i++ ) {
            var folder, type;

            if ( typeof folders[i] === 'object' && typeof folders[i].getFullName === 'function' ) {
                folder = this.store.getFolder( folders[i].getFullName() );
                type = 'java';
            } else if ( typeof folders[i] === 'string' ) {
                folder = this.store.getFolder( folders[i] );
                type = 'string';
            } else {
                throw new GenericException( 500, 'Folders should be an array of either javax.mail.folders or strings' );
            }

            // And if the folder doesn't exist already, we create it.
            if ( !folder.exists() ) {
                log.info( 'creating folder: {}', folders[i] );
                if ( type === 'java' ) {
                    try {
                        folder.create( folder.getType() );
                    } catch ( e ) {
                        log.error( e.getCause() );
                    }
                } else {
                    folder.create( javax.mail.Folder.HOLDS_MESSAGES );
                }
            }

            successCount++;
        }

        return {
            successCount : successCount,
            errors : errors
        }
    }
} );