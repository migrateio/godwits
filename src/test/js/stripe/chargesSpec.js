var log = require( 'ringo/logging' ).getLogger( module.id );
var {uuid} = require( 'utility' );
var {PromiseList} = require( 'ringo/promise' );

var api_key = 'sk_test_EeLn3Yz6vjKeDIyio6oHw6NS';

var stripe = require( 'stripe' )( api_key );

describe( "Charges API w/ captured payment", function () {

    var charge;

    beforeEach( function () {
        charge = stripe.charges.create( {
            amount : 50,
            currency : "usd",
            card : {
                number : "4242424242424242",
                exp_month : 12,
                exp_year : 2020,
                name : 'T. Ester'
            }
        } ).wait( 5000 );

        expect( charge ).toBeDefined();
        expect( charge.object ).toEqual( 'charge' );
        expect( charge.id ).toEqual( jasmine.any( String ) );
    } );

    it( 'should create a new charge', function () {
        expect( charge.card.last4 ).toEqual( '4242' );
        expect( charge.card.type ).toEqual( 'Visa' );
        expect( charge.card.exp_month ).toEqual( 12 );
        expect( charge.card.exp_year ).toEqual( 2020 );
        expect( charge.card.name ).toEqual( 'T. Ester' );
    } );

    it( 'should allow charge to be retrieved', function () {
        var newCharge = stripe.charges.retrieve( charge.id ).wait( 5000 );
        expect( newCharge ).toEqual( charge );
    } );

    it( 'should allow charge to be partially refunded', function () {
        var refund = stripe.charges.refund( charge.id, 30 ).wait( 5000 );
        expect( refund.object ).toEqual( 'charge' );
        expect( refund.amount_refunded ).toEqual( 30 );

        var newCharge = stripe.charges.retrieve( charge.id ).wait( 5000 );
        expect( newCharge.amount ).toEqual( 50 );
    } );

    it( 'should allow charge to be fully refunded', function () {
        var refund = stripe.charges.refund( charge.id ).wait( 5000 );
        expect( refund.object ).toEqual( 'charge' );
        expect( refund.amount_refunded ).toEqual( 50 );

        var newCharge = stripe.charges.retrieve( charge.id ).wait( 5000 );
        expect( newCharge.amount ).toEqual( 50 );
    } );

    it( 'should allow charges to be listed', function () {
        var list = stripe.charges.list().wait( 5000 );
        expect( list.object ).toEqual( 'list' );
        expect( list.count > 0 ).toBe( true );
        expect( list.data[0].object ).toEqual( 'charge' );
    } );
} );


describe( "Charges API with uncaptured amount", function () {

    var charge;

    beforeEach( function () {
        charge = stripe.charges.create( {
            amount : 50,
            currency : "usd",
            capture : false,
            card : {
                number : "4242424242424242",
                exp_month : 12,
                exp_year : 2020,
                name : 'T. Ester'
            }
        } ).wait( 5000 );

        expect( charge ).toBeDefined();
        expect( charge.object ).toEqual( 'charge' );
        expect( charge.id ).toEqual( jasmine.any( String ) );
    } );

    it( 'should allow for a charge to be captured', function () {
        var capture = stripe.charges.capture( charge.id ).wait( 5000 );
        expect( capture.object ).toEqual( 'charge' );
        expect( capture.captured ).toBe( true );
    } );
} );
