var log = require( 'ringo/logging' ).getLogger( module.id );

var store = require( 'hazelstore' );
var domain = require( 'domain' );

var {props} = require( 'utility' );
var stripe = require( 'stripe' )( props['stripe.secret_key'] );
var {Deferred} = require( 'ringo/promise' );

var CARD_GOOD_VISA         = '4242424242424242';  // good visa number
var CARD_CHECK_ADRZIP_FAIL = '4000000000000010';  // address_line1_check and address_zip_check will both fail.
var CARD_CHECK_ADR_FAIL    = '4000000000000028';  // address_line1_check will fail.
var CARD_CHECK_ZIP_FAIL    = '4000000000000036';  // address_zip_check will fail.
var CARD_CHECK_CVC_FAIL    = '4000000000000101';  // cvc_check will fail.
var CARD_CHARGE_FAIL       = '4000000000000341';  // Attaching this card to a Customer object will succeed, but attempts to charge the customer will fail.
var CARD_CHARGE_CHK_FAIL   = '4000000000000002';  // Charges with this card will always be declined with a card_declined code.
var CARD_CHARGE_CVC_FAIL   = '4000000000000127';  // Will be declined with an incorrect_cvc code.
var CARD_CHARGE_EXP_FAIL   = '4000000000000069';  // Will be declined with an expired_card code.
var CARD_CHARGE_ERR_FAIL   = '4000000000000119';  // Will be declined with a processing_error code.


beforeEach( function () {
    store.init( 'hazelcast-simpledb.xml' );
} );

describe( 'User Domain', function () {

    var users, map;

    function initCustomer( card, user ) {
        var deferred = new Deferred();
        var card = {
            card : {
                number : card,
                exp_month : 12,
                exp_year : 2016,
                cvc : '478'
            }
        };
//        log.debug( 'test::initCustomer, creating card token: ', JSON.stringify( card ) );
        stripe.tokens.create( card ).then(
            function success( token ) {
                expect( token.id ).toEqual( jasmine.any( String ) );

                var betty;
                try {
//                    log.debug( 'test::initCustomer, creating user: ', JSON.stringify( user ) );
                    betty = users.create( user );
                    expect( betty ).toBeDefined();
//                    betty = new domain.User( result );
                } catch ( e ) {
                    log.warn( 'test::initCustomer, failed to create user: ',
                        JSON.stringify( user ), JSON.stringify( e ) );
                    deferred.resolve( e, true );
                }

                try {
//                    log.debug( 'test::initCustomer, stripifying betty: ', JSON.stringify( betty ) );
                    var newBetty = users.updateActiveCard( betty, token.id ).wait( 5000 );
//                    log.debug( 'test::initCustomer, done updating stripe data: ', JSON.stringify( newBetty ) );
                    deferred.resolve( newBetty );
                } catch ( e ) {
                    log.warn( 'test::initCustomer, failed to stripify user: ',
                        JSON.stringify( betty ), JSON.stringify( e ) );
                    deferred.resolve( e, true );
                }
            },
            function failure() {
                log.warn( 'test::initCustomer, failed to create token: ',
                    JSON.stringify( card ), JSON.stringify( arguments ) );
                deferred.resolve( arguments, true );
            }
        );
        return deferred.promise;
    }

    beforeEach( function () {
        users = new domain.Users( 'dev' );
        expect( users ).toBeDefined();

        map = users.backingMap();
    } );

    afterEach( function () {
        map.clear();
    } );

    describe( 'CRUD functions', function () {
        it( 'should fail if no body is included', function () {
            expect(function () {
                users.create();
            } ).toThrow( 'Users::create requires a json body' );
        } );

        it( 'will auto-generate id if not supplied', function () {
            var result = users.create( { username : 'fred', email : { address : 'fred@bedrock.com' } } );
            expect( result.userId ).toEqual( jasmine.any( String ) );
        } );

        it( 'should fail if no email is included', function () {
            expect(function () {
                users.create( { userId : '123', username : 'fred' } );
            } ).toThrowMatch( 'Missing required property: address' );
        } );

        it( 'should default the email status', function () {
            var result = users.create( {
                userId : '123',
                username : 'fred',
                email : { address : 'fred@bedrock.com' } } );
            expect( result.email.status ).toEqual( 'candidate' );
        } );

        it( 'should default the user\'s role', function () {
            var result = users.create( {
                userId : '123',
                username : 'fred',
                email : { address : 'fred@bedrock.com' } } );
            expect( result.roles ).toBeArray();
            expect( result.roles ).toEqual( ['ROLE_CANDIDATE'] );
        } );

        it( 'should be able to create a new user', function () {
            var result = users.create( samples.fred );
            expect( result ).toBeDefined();
        } );

        it( 'should not be able to create a user with the same username', function () {
            var result = users.create( samples.fred );
            expect( result ).toBeDefined();

            expect(function(){
                users.create( {
                    userId : 'ABC',
                    username : 'fred',
                    email : { address : 'fred@migrate.io' } } )
            } ).toThrowMatch('unique username');
            
        } );

        it( 'should be able to create a "robust" user', function () {
            var result = users.create( samples.wilma );
            expect( result ).toBeDefined();
            expect( result.userId ).toEqual( samples.wilma.userId );

            // Check for defaults
            expect( result.payment.stored ).toEqual( false );
        } );

        it( 'should be able to read a new user', function () {
            var result = users.create( samples.fred );
            expect( result ).toBeDefined();

            // Evict it so another read will occur
            map.evict( samples.fred.userId );

            result = users.read( samples.fred.userId );
            // The original [fred] object should not be modified
            expect( result ).not.toEqual( samples.fred );
            expect( result.userId ).toEqual( samples.fred.userId );
            expect( result.email ).toEqual( samples.fred.email );
            expect( result.created ).toBeDefined();
        } );

        it( 'should be able to search for user by email', function () {
            users.create( samples.fred );
            users.create( samples.barney );
            users.create( samples.betty );

            var results = users.read(
                "select * from `[mapname]` where `email.address` like 'b%'"
            );

            expect( results ).toBeArray();
            expect( results.length ).toEqual( 2 );

            // Should have a result for betty and one for barney
            var [a, b] = results;
            expect( a.userId ).not.toEqual( b.userId );
            expect(
                a.userId === samples.barney.userId || a.userId === samples.betty.userId
            ).toBeTruthy();
            expect(
                b.userId === samples.barney.userId || b.userId === samples.betty.userId
            ).toBeTruthy();

            results = users.read(
                'select * from `[mapname]` where `email.address` = "fred@bedrock.com"'
            );

            expect( results ).toBeArray();
            expect( results.length ).toEqual( 1 );
            expect( results[0].userId ).toEqual( samples.fred.userId );
        } );
    } );

    describe( 'Customer creation functions', function () {

        describe( 'should fail property checks', function () {
            it( 'should not be able to create stripe customer when unverified', function () {
                var fred = new domain.User( samples.fred );
                expect(function () {
                    users.updateActiveCard( fred, 'fake_token' ).wait(5000);
                } ).toThrowMatch( 'verified email' );
            } );

            it( 'should not be able to create stripe customer when no token', function () {
                var barney = new domain.User( samples.barney );
                expect(function () {
                    users.updateActiveCard( barney ).wait(5000);
                } ).toThrowMatch( 'requires.+token' );
            } );
        } );

        describe( 'will require token and user account', function () {

            it( 'should be able to detect and respond to a bad cvc value', function ( done ) {
                try {
                    initCustomer( CARD_CHECK_CVC_FAIL, samples.betty ).wait( 5000 );
                } catch ( e ) {
//                    log.error( 'TEST::', JSON.stringify( e ) );
                    // Expecting the bad cvc to cause an exception when creating.
                    var isExpected = e && e.error && e.error.detail && e.error.detail.code;
                    if ( /incorrect_cvc/.test( isExpected ) ) done();
                }
            }, 5000);

            it( 'should not be able to detect a bad address value', function ( done ) {
                try {
                    initCustomer( CARD_CHECK_ADR_FAIL, samples.betty ).wait( 5000 );
                    done();
                } catch ( e ) {
//                    log.error( 'TEST::', JSON.stringify( e ) );
                }
            }, 5000);

            it( 'should not be able to detect a bad address/zip value', function ( done ) {
                try {
                    initCustomer( CARD_CHECK_ADRZIP_FAIL, samples.betty ).wait( 5000 );
                    done();
                } catch ( e ) {
//                    log.error( 'TEST::', JSON.stringify( e ) );
                }
            }, 5000);

            it( 'should not be able to detect a bad zip value', function ( done ) {
                try {
                    initCustomer( CARD_CHECK_ZIP_FAIL, samples.betty ).wait( 5000 );
                    done();
                } catch ( e ) {
//                    log.error( 'TEST::', JSON.stringify( e ) );
                }
            }, 5000);

            /**
             * I was expecting charge time failures to occur with this card number
             * according to stripe docs (https://stripe.com/docs/testing), but it seems
             * to check and fail the card at customer creation time as well.
             */
            it( 'should  detect a charge time cvc failure', function ( done ) {
                try {
                    initCustomer( CARD_CHARGE_CVC_FAIL, samples.betty ).wait( 5000 );
                } catch ( e ) {
                    var isExpected = e && e.error && e.error.detail && e.error.detail.code;
                    if ( /incorrect_cvc/.test( isExpected ) ) done();
                }
            }, 5000);

            /**
             * I was expecting charge time failures to occur with this card number
             * according to stripe docs (https://stripe.com/docs/testing), but it seems
             * to check and fail the card at customer creation time as well.
             */
            it( 'should detect an expired card failure', function ( done ) {
                try {
                    initCustomer( CARD_CHARGE_EXP_FAIL, samples.betty ).wait( 5000 );
                } catch ( e ) {
                    var isExpected = e && e.error && e.error.detail && e.error.detail.code;
                    if ( /expired_card/.test( isExpected ) ) done();
                }
            }, 5000);

            /**
             * I was expecting charge time failures to occur with this card number
             * according to stripe docs (https://stripe.com/docs/testing), but it seems
             * to check and fail the card at customer creation time as well.
             */
            it( 'should detect a card processing failure', function ( done ) {
                try {
                    initCustomer( CARD_CHARGE_ERR_FAIL, samples.betty ).wait( 5000 );
                } catch ( e ) {
                    var isExpected = e && e.error && e.error.detail && e.error.detail.code;
                    if ( /processing_error/.test( isExpected ) ) done();
                }
            }, 5000);

            it( 'should not detect an charge-time card failure', function ( done ) {
                initCustomer( CARD_CHARGE_FAIL, samples.betty ).wait( 5000 );
                done();
            }, 5000);

            it( 'should not detect an charge-time decline card failure', function ( done ) {
                try {
                    initCustomer( CARD_CHARGE_CHK_FAIL, samples.betty ).wait( 5000 );
                } catch ( e ) {
                    var isExpected = e && e.error && e.error.detail && e.error.detail.code;
                    if ( /card_declined/.test( isExpected ) ) done();
                }
            }, 5000);

            it( 'should be able to create typical stripe customer', function ( done ) {
                initCustomer( CARD_GOOD_VISA, samples.betty ).wait( 5000 );
                done();
            }, 5000 );
        } );
    } );

} );

// User has signed up, but not yet verified their email.
var samples = {
    fred : {
        userId : '123',
        username : 'fred',
        email : {
            address : 'fred@bedrock.com',
            status : 'candidate'
        },
        roles : [ 'ROLE_CANDIDATE' ]
    },

    // User is verified and selected a password and run a job.
    wilma : {
        userId : '456',
        username : 'wilma',
        password : '$2a$10$TzHJ5IdWP9ooyXanLoT5uuDYFeCTVUiHLw5JUjY9e8Wr9Ob7STHWC',
        payment : {
            fingerprint : 'pay_token_1',
            last4 : '9876',
            type : 'Visa',
            expires : '2016-09-01T00:00:00.000Z'
        },
        services : {
            stripe : {
                customerId : 'stripe_4382648'
            },
            xero : {
                customerId : 'xero_9382716'
            }
        },
        email : {
            address : 'wilma@bedrock.com',
            status : 'verified'
        },
        roles : [ 'ROLE_USER' ]
    },

    // User is verified and selected a password, but has not started a run yet.
    betty : {
        userId : '789',
        username : 'betty',
        email : {
            address : 'betty@bedrock.com',
            status : 'verified'
        },
        password : '$2a$10$TzHJ5IdWP9ooyXanLoT5uuDYFeCTVUiHLw5JUjY9e8Wr9Ob7STHWC',
        roles : [ 'ROLE_USER' ]
    },

    // Password is verified, but user has not selected a password yet.
    barney : {
        userId : '987',
        username : 'barney',
        email : {
            address : 'barney@bedrock.com',
            status : 'verified'
        },
        roles : [ 'ROLE_CANDIDATE' ]
    }

};


