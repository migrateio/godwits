require.paths.push( module.resolve( '../../main/webapp/WEB-INF/api' ) );
require.paths.push( module.resolve( '../../main/webapp/WEB-INF/lib' ) );

describe( "The GoogleMail service", function () {

    var {Google} = require( 'migrate' );
    var service;

    beforeEach( function () {
        service = new Google.Mail( {
            email : 'joe@blow.me'
        } );
    } );


    it( "should return the expected email address", function () {
        expect( service.email ).toEqual( 'joe@blow.me' );
    } );
} );

