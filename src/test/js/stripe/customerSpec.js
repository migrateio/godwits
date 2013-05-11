var log = require( 'ringo/logging' ).getLogger( module.id );
var {uuid} = require( 'utility' );
var {PromiseList} = require( 'ringo/promise' );

var api_key = 'sk_test_EeLn3Yz6vjKeDIyio6oHw6NS';

var stripe = require( 'stripe' )( api_key );

describe( "Customer API", function () {

    var customers = {};

    beforeEach( function ( done ) {
        stripe.customers.create( {email : uuid() + '@example.com'} )
            .then( function ( customer ) {
                expect( customer.object ).toEqual( 'customer' );
                expect( customer.id ).toBeDefined();
                customers[customer.id] = customer;
            } );

        stripe.customers.create( {email : uuid() + '@example.com'} )
            .then( function ( customer ) {
                expect( customer.object ).toEqual( 'customer' );
                expect( customer.id ).toBeDefined();
                customers[customer.id] = customer;
            } );

        stripe.customers.create( {email : uuid() + '@example.com'} )
            .then( function ( customer ) {
                expect( customer.object ).toEqual( 'customer' );
                expect( customer.id ).toBeDefined();
                customers[customer.id] = customer;
                done();
            } );
    } );

    it( 'should retrieve a customer by id', function () {
        var id = Object.keys( customers )[2];
        var customer = stripe.customers.retrieve( id ).wait( 5000 );
        expect( customer ).toBeDefined();
        expect( customer.id ).toEqual( id );
        expect( customer ).toEqual( customers[id] );
    } );

    it( 'should retrieve a list of customers', function () {
        var customers = stripe.customers.list().wait( 5000 );
        expect( customers.object ).toEqual( 'list' );
        expect( customers.count ).toEqual( 3 );
    } );

    it( 'can update a customer', function () {
        var id = Object.keys( customers )[0];
        var newCustomer = JSON.parse( JSON.stringify( customers[id] ) );
        newCustomer.email = 'fred@example.com';
        var customer = stripe.customers.update( id, {
            email : newCustomer.email
        } ).wait( 5000 );

        expect( customer ).toBeDefined();
        expect( customer ).toEqual( newCustomer );
    } );

    afterEach( function ( done ) {
        var requests = [];
        Object.keys( customers ).forEach( function ( key ) {
            requests.push( stripe.customers.del( key ) );
        } );
        new PromiseList( requests[0], requests[1], requests[2] )
            .then( function ( responses ) {
                try {
                    expect( responses ).toBeArray();
                    expect( responses.length ).toEqual( requests.length );
                    responses.forEach( function ( response ) {
                        expect( response.value ).toBeTruthy();
                        expect( response.value.deleted ).toBe( true );
                        var id = response.value.id;
                        expect( id ).toEqual( jasmine.any( String ) );
                        expect( customers[id] ).toBeDefined();
                        delete customers[id];
                    } );
                } catch ( e ) {
                    log.error( 'ERROR', e );
                }
                expect( Object.keys( customers ).length ).toEqual( 0 );
                done();
            } );
    } );

} );

