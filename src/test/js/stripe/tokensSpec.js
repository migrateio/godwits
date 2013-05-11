var log = require( 'ringo/logging' ).getLogger( module.id );

var api_key = 'sk_test_EeLn3Yz6vjKeDIyio6oHw6NS';

var stripe = require( 'stripe' )( api_key );

describe( 'Stripe tokens', function () {

    it( 'should create tokens', function ( done ) {
        stripe.token.create( {
            card : { number : "4242424242424242",
                exp_month : 1,
                exp_year : 2021,
                name : "J. Ester"
            }
        } ).then( function ( token ) {
                expect( token ).toBeDefined();
                expect( token.id ).toBeDefined();
                expect( token.card.exp_year ).toEqual( 2021 );
                done();
            } );
    }, 10000 );


    describe( 'should retrieve card by token', function () {

        var tokenId;

        beforeEach( function ( done ) {
            stripe.token.create( {
                card : { number : "4242424242424242",
                    exp_month : 1,
                    exp_year : 2021,
                    name : "J. Ester"
                }
            } ).then( function ( token ) {
                    expect( token ).toBeDefined();
                    expect( token.id ).toBeDefined();
                    tokenId = token.id;
                    done();
                } );
        } );

        it( 'will retrieve card by token', function ( done ) {
            stripe.token.retrieve( tokenId ).then(
                function ( card ) {
                    expect( card ).toBeDefined();
                    expect( card.object ).toEqual( 'token' );
                    expect( card.id ).toEqual( tokenId );
                    done();
                }
            );
        }, 10000 );
    } );
} );

