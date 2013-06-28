describe( 'The GoogleMail service, password auth.', function () {

    var {Google} = require( 'migrate' );
    var service;
    var log = require( 'ringo/logging' ).getLogger( module.id );

    // before each test we instantiate a service object.
    beforeEach( function () {
        service = new Google.Mail( {
            email : 'migratetester@gmail.com',
            password : 'migration10',
            props : {
                'mail.debug' : 'false'
            }
        } );

        service.connect();

        var folders = service.getFolders();
        const MESSAGES_START = 1;
        const DELETED = javax.mail.Flags.Flag.DELETED;
        const READ_WRITE = javax.mail.Folder.READ_WRITE;
        const HOLDS_MESSAGES = javax.mail.Folder.HOLDS_MESSAGES;
        const TRASH = service.store.getFolder('[Gmail]/Trash');
        var msgsToDelete = false;

        for ( var i = folders.length - 1; i >= 0; i-- ) {

            var folder = folders[i];
            var name = folder.getFullName();

            log.info( 'Name of folder being processed: {}', name );

            if ( name.indexOf( '[Gmail]' ) === 0 || name.toLowerCase() === 'inbox' ) {
                log.info( 'Gmail folder or INBOX being processed.' );

                try {
                    folder.open( READ_WRITE );
                } catch(e) {
                    continue;
                }

                // don't delete folder, just all messages inside it.
                var count = folder.getMessageCount();

                if ( count > 0 ) msgsToDelete = true;

                var msgs = service.read( folder, MESSAGES_START, count );

                folder.copyMessages(msgs, TRASH);

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

            for ( j = 0; j < msgs.length; j++ ) {
                msgs[j].setFlag( DELETED, true );
            }

            // if argument is true we expunge on close, getting rid of all the
            // messages we flagged.
            folder.close( true );
        }

        service.store.close();
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
        expect( service.email ).toEqual( 'migratetester@gmail.com' );
    } );

    it( 'should connect to the imap server when I call connect', function () {
        expect(function () {
            service.connect();
        } ).not.toThrow();

        // If no exception is thrown we've connected successfully.

        // Let's make sure, since this is a test.

        expect( service.store.isConnected() ).toBeTruthy();
    } );

    xit( 'should pass the imap shared testing suite', function () {
        getFoldersTests( service );
        writeFoldersTests( service );
        readTests( service );
        writeTests( service );
    } );

} );

xdescribe( 'The GoogleMail service, oauth2.', function () {

    var {Google} = require( 'migrate' );
    var service;
    var log = require( 'ringo/logging' ).getLogger( module.id );

    // before each test we instantiate a service object.
    beforeEach( function () {
        service = new Google.Mail( {
            email : 'migratetester@gmail.com',
            oauth : {
                accessKey : 'ya29.AHES6ZQemCOcwosllRGC2Qm4k9ch8pNydeIDFGchZDKlJ3c',
                refreshToken : '1/z9Thea3cmsYdfdWsqt-kKpxm0r0932LL81QmeejYQIU'
            },
            props : {
                'mail.debug' : 'true'
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
        expect( service.email ).toEqual( 'migratetester@gmail.com' );
    } );

    it( 'should connect to the imap server when I call connect', function () {
        expect(function () {
            service.connect();
        } ).not.toThrow();

        expect( service.store.isConnected() ).toBeTruthy();
    } );


    it( 'should error if I try to connect with an invalid token', function () {
        service.props.put( 'mail.imaps.sasl.mechanisms.oauth2.oauthToken', "adsfafdsdasfdasf" );

        expect(function () {
            service.connect();
        } ).toThrow();
    } );

    it( 'should let me read folders', function () {
        expect(function () {
            service.connect();
        } ).not.toThrow();

        expect( service.getFolders() ).toBeDefined();
    } );

    it( 'should retry if I give it an old access key', function () {
        service.props.put( 'mail.imaps.sasl.mechanisms.oauth2.oauthToken', "adsfafdsdasfdasf" );
        service.retry( service.connect );
    } );

    it( 'should pass the imap shared testing suite', function () {
        getFoldersTests( service );
        writeFoldersTests( service );
        readTests( service );
        writeTests( service );
    } );

} );

