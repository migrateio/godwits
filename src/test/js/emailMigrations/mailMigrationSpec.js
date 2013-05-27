// These tests are poorly written and need some more fiddling.


//describe( 'The mail migration services', function () {
//
//    var {Google, Yahoo} = require( 'migrate' );
//    var log = require( 'ringo/logging' ).getLogger( module.id );
//
//    var services = [
//        new Google.Mail( {
//            email : 'migratetester@gmail.com',
//            password : 'migration10',
//            props : {
//                'mail.debug' : 'true',
//                'mail.imaps.connectionpoolsize' : 15
//            }
//        } ),
//        new Yahoo.Mail( {
//            email : 'migratetester@yahoo.com',
//            password : 'migration10',
//            props : {
//                'mail.debug' : 'true',
//                'mail.imaps.connectionpoolsize' : 10
//            }
//        } )
//    ];
//
//    // after each test we'll close our connections
//    afterEach( function () {
//        for ( var i = 0; i < services.length; i++ ) {
//            services[i].store.close();
//        }
//    } );
//
//    it( 'should pass the shared email migration testing suite', function () {
//        for ( var i = 0; i < services.length; i++ ) {
//            for ( var j = 0; j < services.length; j++ ) {
//                mailMigrationTest( services[i], services[j] );
//            }
//        }
//    } );
//} );



