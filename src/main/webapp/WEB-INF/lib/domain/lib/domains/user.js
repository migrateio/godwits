var log = require( 'ringo/logging' ).getLogger( module.id );

var {props} = require( 'utility' );

var stripe = require( 'stripe' )( props['stripe.secret_key'] );

var domain = require( 'domain' );


var {format} = java.lang.String;
var {Deferred} = require( 'ringo/promise' );

/**
 * # User _(Domain Object)_
 *
 * ## Constructor
 *
 * ### Parameters
 *
 * **json** The json representation of a job.
 */
exports.User = function ( user ) {
    if (typeof user.toJSON === 'function') return user;

    function getCustomerId( service ) {
        return  user && user.services && user.services[service]
            && user.services[service].customerId;
    }

    function getExpiration(card) {
        if (card && card.exp_year && card.exp_month) {
            var month = card.exp_month + 1;
            if (card.exp_month > 12) {
                card.exp_month = 1;
                card.exp_year += 1;
            }
            return format( '%.0f-%02.0f-01T00:00:00.000Z',
                card.exp_year, (card.exp_month + 1) % 12);
        }
        return new Date().toISOString();
    }

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
    function updateActiveCard( token ) {
        var customer,
            deferred = new Deferred();

        // Sanity check for required properties used by this function
        var isComplete = user && user.userId
            && user.email && user.email.address && user.email.status === 'verified';
        if ( !isComplete ) {
            deferred.resolve( {
                status : 400,
                message : 'Cannot create a stripe customer without a verified email address.'
            }, true);
            return deferred.promise;
        }

        if ( !token ) {
            deferred.resolve( {
                status : 400,
                message : 'Creating a customer record requires the credit card token.'
            }, true);
            return deferred.promise;
        }

        // Is the user already a stripe-registered customer?
        var customerId = getCustomerId( 'stripe' );

        // If not yet a customer, we will register the user with stripe
        if ( !customerId ) {
            customer = {
                email : user.email.address,
                description : user.userId,
                card : token
            };

            stripe.customers.create( customer ).then(
                function success( customer ) {
                    customerId = customer.id;

                    // The stripe customer has been created so we need to store info
                    var card = customer.active_card;
                    var newUser = {
                        userId: user.userId,
                        services : {
                            stripe : {
                                customerId : customer.id
                            }
                        },
                        payment : {
                            last4 : card.last4,
                            type : card.type,
                            fingerprint : card.fingerprint,
                            expires : getExpiration( card )
                        }
                    };
                    var updatedUser = users.update( newUser );

                    deferred.resolve( updatedUser );
                }, function error( error ) {
                    // Failed to create the stripe customer, what are the possible
                    // failure scenarios?
                    log.error( 'Failed to create stripe customer: {}, error: {}',
                        JSON.stringify( customer ), JSON.stringify( error ) );
                    deferred.resolve( {
                        status: 500,
                        error: error,
                        message: 'Error occurred while creating stripe customer.'
                    }, true);
                }
            );
        } else {
            // The customer record already existed, so we will update the active card
            customer = { card: token };
            stripe.customers.update( customerId, customer ).then(
                function success( customer ) {
                    // The stripe customer has been created so we need to store info
                    var card = customer.active_card;
                    var updatedUser = users.update( {
                        userId: user.userId,
                        payment : {
                            last4 : card.last4,
                            type : card.type,
                            fingerprint : card.fingerprint,
                            expires : getExpiration( card )
                        }
                    } );
                    deferred.resolve( updatedUser );
                }, function error( error ) {
                    // Failed to create the stripe customer, what are the possible
                    // failure scenarios?
                    log.error( 'Failed to update stripe customer: {}, error: {}',
                        JSON.stringify( customer ), JSON.stringify( error ) );
                    deferred.resolve( {
                        status: 500,
                        message: 'Error occurred while updating stripe customer.'
                    }, true);
                }
            );
        }

        return deferred.promise;
    }

    function isEmailVerified() {
        return user && user.email && user.email.address
            && user.email.status === 'verified';
    }

    function exposeProps() {
        Object.keys( user || {} ).forEach( function ( prop ) {
            obj[prop] = user[prop];
        } );
    }

    function refresh() {
        if (user && user.userId) {
            user = users.read( user.userId );
            exposeProps();
        }
        return user;
    }

    var users = new domain.Users( props['environment'] );

    var obj = {
        capturePayment : capturePayment,
        getCustomerId: getCustomerId,
        isEmailVerified: isEmailVerified,
        refresh : refresh,
        updateActiveCard : updateActiveCard,
        toJSON : function toJSON() {
            return user;
        }
    };

    return obj;
};