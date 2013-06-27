//describe( 'The GoogleMail service, password auth.', function () {
//
//    var {Google} = require( 'migrate' );
//    var service;
//    var log = require( 'ringo/logging' ).getLogger( module.id );
//
//    // before each test we instantiate a service object.
//    beforeEach( function () {
//        service = new Google.Mail( {
//            email : 'migratetester@gmail.com',
//            password : 'migration10',
//            props : {
//                'mail.debug' : 'false'
//            }
//        } );
//    } );
//
//    // after each test we'll close our connections
//    afterEach( function () {
//        // Clean up after ourselves.
//        service.store.close();
//    } );
//
//    it( 'should exist', function () {
//        expect( service ).toBeDefined();
//    } );
//
//    it( 'should return the expected email address', function () {
//        expect( service.email ).toEqual( 'migratetester@gmail.com' );
//    } );
//
//    it( 'should connect to the imap server when I call connect', function () {
//        expect(function () {
//            service.connect();
//        } ).not.toThrow();
//
//        // If no exception is thrown we've connected successfully.
//
//        // Let's make sure, since this is a test.
//
//        expect( service.store.isConnected() ).toBeTruthy();
//    } );
//
//    it( 'should pass the imap shared testing suite', function () {
//        getFoldersTests( service );
//        writeFoldersTests( service );
//        readTests( service );
//        writeTests( service );
//    } );
//
//} );

describe( 'The GoogleMail service, oauth2.', function () {

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
        service.retry(service.connect);
    } );
//
//    it( 'should pass the imap shared testing suite', function () {
//        getFoldersTests( service );
//        writeFoldersTests( service );
//        readTests( service );
//        writeTests( service );
//    } );

} );

