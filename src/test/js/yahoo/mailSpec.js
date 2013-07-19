describe( 'The Yahoo Mail service', function () {

    var {Yahoo} = require( 'migrate' );
    var service;

    service = new Yahoo.Mail( {
        email : 'migratetester@yahoo.com',
        password : 'migration10',
        props : {
            'mail.debug' : 'false'
        }
    } );

    cleanSlate(service);

    beforeEach( function () {
        service = new Yahoo.Mail( {
            email : 'migratetester@yahoo.com',
            password : 'migration10',
            props : {
                'mail.debug' : 'false'
            }
        } );
    } );

    // after each test we'll close our connections
    afterEach( function () {
        // Clean up after ourselves.
        service.store.close();
    } );

    it( 'should exist', function () {
        expect( service ).toBeDefined();
    } );

    it( 'should return the expected email address', function () {
        expect( service.email ).toEqual( 'migratetester@yahoo.com' );
    } );

    it( 'should connect to the imap server when I call connect', function () {
        expect(function () {
            service.connect();
        } ).not.toThrow();

        // If no exception is thrown we've connected successfully.

        // Let's make sure, since this is a test.

        expect( service.store.isConnected() ).toBeTruthy();
    } );

    it( 'should pass the imap shared testing suite', function () {
        getFoldersTests( service );
        writeFoldersTests( service );
        readTests( service );
        writeTests( service );
    } );
} );

function cleanSlate(service) {
    service.connect();

    var folders = service.getFolders();
    const MESSAGES_START = 1;
    const DELETED = javax.mail.Flags.Flag.DELETED;
    const READ_WRITE = javax.mail.Folder.READ_WRITE;
    const HOLDS_MESSAGES = javax.mail.Folder.HOLDS_MESSAGES;
    const TRASH = service.store.getFolder( '[Gmail]/Trash' );
    var msgsToDelete = false;

    for ( var i = folders.length - 1; i >= 0; i-- ) {

        var folder = folders[i];
        var name = folder.getFullName();

        log.info( 'Name of folder being processed: {}', name );

        if ( name.indexOf( '[Gmail]' ) === 0 || name.toLowerCase() === 'inbox' ) {
            log.info( 'Gmail folder or INBOX being processed.' );

            try {
                folder.open( READ_WRITE );
            } catch ( e ) {
                log.error(e);
                continue;
            }

            // don't delete folder, just all messages inside it.
            var count = folder.getMessageCount();

            if ( count > 0 ) msgsToDelete = true;

            var msgs = service.read( folder, MESSAGES_START, count );

            folder.copyMessages( msgs, TRASH );

            folder.close( true );
        } else {
            // else we delete the entire folder.
            folder.delete( false );
        }
    }

    if ( msgsToDelete ) {
        folder = service.store.getFolder( '[Gmail]/Trash' );
        folder.open( READ_WRITE );

        // don't delete folder, just all messages inside it.
        count = folder.getMessageCount();

        msgs = service.read( folder, MESSAGES_START, count );

        for ( var j = 0; j < msgs.length; j++ ) {
            msgs[j].setFlag( DELETED, true );
        }

        // if argument is true we expunge on close, getting rid of all the
        // messages we flagged.
        folder.close( true );
    }

    service.store.close();
}

