describe( 'The Yahoo Mail service', function () {

    var {Yahoo} = require( 'migrate' );
    var service;

    beforeEach( function () {
        service = new Yahoo.Mail( {
            email : 'joe@blow.me'
        } );
    } );


    it( 'should exist', function () {
        expect( service ).toBeDefined();
    } );

    it( 'should return the expected email address', function () {
        expect( service.email ).toEqual( 'joe@blow.me' );
    } );
} );

