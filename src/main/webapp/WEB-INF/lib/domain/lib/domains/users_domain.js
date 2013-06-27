var log = require( 'ringo/logging' ).getLogger( module.id );

var store = require( 'hazelstore' );
var {format} = java.lang.String;
var {Deferred} = require( 'ringo/promise' );
var {BaseDomain} = require( '../base' );
var {User} = require( './user' );
var {makeToken, bcrypt, deferSafe} = require( '../main' );

var {props} = require( 'utility' );
var stripe = require( 'stripe' )( props['stripe.secret_key'] );

exports.Users = BaseDomain.subClass( {

    init : function ( environment ) {
        var {schema} = require( '../schema/users.js' );
        var map = store.getMap( environment + '-users' );
        var pk = function ( user ) {
            return user.userId;
        };
        var query = function ( key ) {
            return /^(select|where) /ig.test( key.trim() );
        };
        this._super( 'Users', map, pk, query, schema );
    },

    /**
     * This is a bit hacky. Since we have created a domain object which may be
     * wrapping the actual json we intend to persist, we will have to detect this
     * wrapper and reference the enclosed json. The only way I could come up with
     * to identify the wrapper from the json, is to look for a property that is not
     * part of the json but is part of the wrapper.
     *
     * @param json
     */
    normalize : function ( json ) {
        return json && json.toJSON && json.toJSON() || json;
    },

    prevalidate : function ( json ) {
        // Add a the creation date
        json.created = new Date().toISOString();

        // add an id if not provided
        if ( !json.userId ) json.userId = this.generate( 6 );

        // If the password is present, but is not BCrypt'd, let's take care of it
        // Is this going too far? Since BCrypt has known characteristics it seems like
        // a nice convenience feature and allows us to centralize the bcrypt function.
        if ( json.password ) {
            // All BCrypt passwords start with $2a$, $2x$ or $2y$
            if ( !/^\$2[axy]\$/.test( json.password ) ) {
                json.password = bcrypt( json.password );
            }
        }
    },

    create : function ( json, ttl, timeunit ) {
        var result = this._super( this.normalize( json ), ttl, timeunit );
        return new User( result );
    },

    read : function ( pkey ) {
        var result = this._super( pkey );

        if ( Array.isArray( result ) ) return result.map( function ( json ) {
            return new User( json );
        } );

        return new User( result );
    },

    update : function ( json, ttl, timeunit ) {
        var result = this._super( this.normalize( json ), ttl, timeunit );
        return new User( result );
    },


    readByEmail : function ( email ) {
        var query = format( 'where `email.address` = "%s"', email );
        var hits = this.read( query );

        if ( hits.length > 1 ) {
            log.error( 'There is more than one record with an email address of '
                + email, JSON.stringify( hits ) );
        }

        return hits.length === 0 ? null : new User( hits[0] );
    },

    /**
     * Creates a new user id that is guaranteed to be unique.
     */
    generate : function ( length ) {
        var result = '';
        while ( !result ) {
            result = makeToken( length );

            // Check to see if this token exists already
            var hits = this.read(
                "where `userId` = '" + result + "'"
            );

            // If there is an unlikely match (depending on the length), we will retry
            if ( hits.length > 0 ) result = '';
        }
        return result;
    },

    /**
     * Adds the credit card identified by the token to the customer account. If this user
     * does not yet have a customer account with Stripe, one will be created.
     *
     * The relevant part of the user record affected by this operation is:
     *
     * ```js
     * {
     *     payment: {
     *         last4: '',
     *         type: '',
     *         fingerprint: '',
     *         expires: ''
     *     },
     *     services: {
     *         stripe: {
     *             customerId: ''
     *         }
     *     }
     * }
     * ```
     *
     * ### Parameters
     *
     * **token** string
     * > The stripe token which corresponds to a credit card on Stripe's server. This
     *   card will be bound to the user's account.
     */
    updateActiveCard : function ( user, token ) {
        var customer, success, error, deferred, self = this;

        // Sanity check for required properties used by this function
        if ( !( user && user.userId && user.isVerified() ) ) throw {
            status : 400,
            data : user,
            message : 'Cannot create a stripe customer without a verified email address.'
        };

        if ( !token ) throw {
            status : 400,
            message : 'Creating a customer record requires the credit card token.'
        };

        var createNewCustomer = function () {
            deferred = new Deferred();

            customer = {
                email : user.email.address,
                description : user.userId,
                card : token
            };

            success = deferSafe( deferred, function ( customer ) {
                customerId = customer.id;

                // The stripe customer has been created so we need to store info
                var card = customer.active_card;

                var newUser = {
                    userId : user.userId,
                    services : {
                        stripe : {
                            customerId : customer.id
                        }
                    },
                    payment : {
                        last4 : card.last4,
                        type : card.type,
                        fingerprint : card.fingerprint,
                        expires : self.getExpiration( card )
                    }
                };

                var updatedUser = self.update( newUser );
                deferred.resolve( updatedUser );
            } );

            error = deferSafe( deferred, function ( error ) {
                // Failed to create the stripe customer, what are the possible
                // failure scenarios?
                log.error( 'Failed to create stripe customer: {}, error: {}',
                    JSON.stringify( customer ), JSON.stringify( error ) );
                throw {
                    status : 400,
                    code: error.detail && error.detail.code,
                    error : error,
                    message : error.detail && error.detail.message ||
                        'Error occurred while creating stripe customer.'
                };
            } );

            stripe.customers.create( customer ).then( success, error );

            return deferred.promise;
        };

        var updateCustomer = function () {
            deferred = new Deferred();

            // The customer record already existed, so we will update the active card
            customer = { card : token };

            success = deferSafe( deferred, function ( customer ) {
                // The stripe customer has been created so we need to store info
                var data, card = customer.active_card;
                data = {
                    userId : user.userId,
                    payment : {
                        last4 : card.last4,
                        type : card.type,
                        fingerprint : card.fingerprint,
                        expires : self.getExpiration( card )
                    }
                };
                var updatedUser = self.update( data );
                deferred.resolve( updatedUser );
                return deferred.promise;
            } );

            error = deferSafe( deferred, function ( error ) {
                // Failed to create the stripe customer, what are the possible
                // failure scenarios?
                log.error( 'Failed to update stripe customer: {}, error: {}',
                    JSON.stringify( customer ), JSON.stringify( error ) );
                throw {
                    status : 500,
                    message : 'Error occurred while updating stripe customer.'
                };
            } );

            stripe.customers.update( customerId, customer ).then( success, error );

            return deferred.promise;
        };

        // Is the user already a stripe-registered customer?
        var customerId = user.getCustomerId( 'stripe' );

        // If not yet a customer, we will register the user with stripe
        var promise = customerId ? updateCustomer() : createNewCustomer();
        return promise.wait();
    },

    getExpiration : function ( card ) {
        if ( card && card.exp_year && card.exp_month ) {
            var month = card.exp_month + 1;
            if ( card.exp_month > 12 ) {
                card.exp_month = 1;
                card.exp_year += 1;
            }
            return format( '%.0f-%02.0f-01T00:00:00.000Z',
                card.exp_year, (card.exp_month + 1) % 12 );
        }
        return new Date().toISOString();
    }

} );

