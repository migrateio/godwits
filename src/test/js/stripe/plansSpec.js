var log = require( 'ringo/logging' ).getLogger( module.id );
var {uuid} = require( 'utility' );

var api_key = 'sk_test_EeLn3Yz6vjKeDIyio6oHw6NS';

var stripe = require( 'stripe' )( api_key );


describe( 'Subscription Plans', function () {

    var planId;

    beforeEach( function () {
        planId = uuid();
    } );

    it( 'should create a subscription plan', function ( done ) {
        stripe.plans.create( {
            id : planId,
            amount : 2000,
            currency : 'usd',
            interval : 'year',
            name : 'The super duper FooBarBaz subscription!'
        } ).then( function ( response ) {
                expect( response ).toBeDefined();
                expect( response.object ).toEqual( 'plan' );
                expect( response.id ).toEqual( planId );
                expect( response.interval ).toEqual( 'year' );
                expect( response.amount ).toEqual( 2000 );
                done();
            } );
    } );

    afterEach( function ( done ) {
        stripe.plans.del( planId )
            .then( function ( data ) {
                expect( data.deleted ).toBe( true );
                expect( data.id ).toEqual( planId );
                done();
            } );
    } );
} );

