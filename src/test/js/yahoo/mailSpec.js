describe( 'The Yahoo Mail service', function () {

    var {Yahoo} = require( 'migrate' );
    var service;

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

