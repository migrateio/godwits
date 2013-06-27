/**
 * # Invoices Domain Service
 *
 * _The primary interface for CRUD and business rule implementation for the invoice
 * domain objects_
 *
 */
var log = require( 'ringo/logging' ).getLogger( module.id );

var store = require( 'hazelstore' );
var {Deferred} = require( 'ringo/promise' );
var {Invoice} = require( './invoice' );
var {BaseDomain} = require( '../base' );
var domain = require( '../main' );
var {makeToken} = domain;
var {format} = java.lang.String;

var {props} = require( 'utility' );
var stripe = require( 'stripe' )( props['stripe.secret_key'] );

/**
 * An Invoice is an object that represents all of the jobs and transactions associated
 * with a user id and a destination account. There is only one invoice for each composite
 * key formed by the userId and destination account.
 *
 */
exports.Invoices = BaseDomain.subClass( {

    init : function ( environment ) {
        var map = store.getMap( environment + '-invoices' );
        var pk = function ( obj ) {
            return obj.invoiceId;
        };
        var query = function ( key ) {
            return /^(select|where) /ig.test( key.trim() );
        };
        var {schema} = require( '../schema/invoices.js' );
        this._super( 'Invoices', map, pk, query, schema );

        // Need to get references to some other domains
        this.Users = new domain.Users( environment );
    },

    // ## BaseDomain Overrides

    prevalidate : function ( json ) {
        // add an id if not provided
        if ( !json.invoiceId ) json.invoiceId = this.generate( 6 );

        if ( !json.invoiceNum ) json.invoiceNum = this.generate( 6 );

        var now = Date.now();

        if ( !json.starts )
            json.starts = new Date( now ).toISOString();

        if ( !json.expires )
            json.expires = new Date( now + 1000 * 60 * 60 * 24 * 30 ).toISOString();
    },

    create : function ( json, ttl, timeunit ) {
        var result = this._super( this.normalize( json ), ttl, timeunit );
        return new Invoice( result );
    },

    read : function ( pkey ) {
        var result = this._super( pkey );
        if ( !Array.isArray( result ) ) return new Invoice( result );
        return result.map( function ( json ) {
            return new Invoice( json );
        } );
    },

    update : function ( json, ttl, timeunit ) {
        var result = this._super( this.normalize( json ), ttl, timeunit );
        return new Invoice( result );
    },

    // ## Extended Queries

    readByJob : function ( userId, job ) {
        var query = format( '\
            where `destination.service` = "%s" \
            and `destination.auth.username` = "%s" \
            and `userId` = "%s"',
            job.destination.service, job.destination.auth.username, userId );

        var invoices = this.read( query );

        return invoices.length === 0 ? null : new Invoice( invoices[0] );
    },

    // ## Protected functions

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
        return json.toJSON && json.toJSON() || json;
    },

    /**
     * Creates a new id that is guaranteed to be unique.
     */
    generate : function ( length ) {
        var result = '';
        while ( !result ) {
            result = makeToken( length );

            // Check to see if this token exists already
            var hits = this.read(
                "where `invoiceId` = '" + result + "'"
            );

            // If there is an unlikely match (depending on the length), we will retry
            if ( hits.length > 0 ) result = '';
        }
        return result;
    },

    // ## Public functions

    /**
     * ## preAuthorize
     * _Inspects the submitted job, the user and the records of current and past runs to
     * determine whether the job may be submitted under the current conditions. If the job
     * cannot be submitted, it is appended with several properties that will be necessary
     * for the client to prompt the user for more information._
     *
     * ### Prerequisites
     *
     * 1. The user record is retrieved with their payment information. We will obtain their
     *    stripe customer number if present, and the last 4 digits of their stored credit
     *    card.
     * 2. The destination record is pulled for this userId and the job's destination account.
     *    1. We check as to whether a test run has been successfully made against this
     *       account.
     *    2. We note whether there is an open invoice for this job.
     *    3. If this is a rerun (same source and destination) there is no additional
     *       charge.
     *    4. If it is a new source account, we calculate the outstanding balance.
     *        1. If the source is an edu account, the amount is +$5 with a max of $15.
     *        2. If the source is an non-edu account, the amount is +$15 with a max of $15.
     * 3. We will load all running jobs against this destination account.
     *    1. If the source account and a content type overlap a running job, this information
     *       is returned to the client and the job cannot be submitted.
     *
     * ### Response
     * The resulting response is a json object containing all of the information needed for
     * the UI to properly handle the next stage of job submission.
     *
     * **last4**
     * > If the user has an existing customer account with us, this is the last four
     *   digits of their credit card on file. If they do not have this property, it
     *   means they will have to submit payment info.
     *
     * **open**
     * > If true, the invoice exists and has not yet expired. If false, there is no
     *   invoice started for this destination account.
     *
     * **testedOn**
     * > Returns the date this destination had been tested. If there is no property, the
     *   account is available for a test run.
     *
     * **payment**
     * > **promotion** Either 'edu' or 'full'.
     * > **expires** The date the subscription expires, or will expire.
     * > **amounts** The amount due to purchase or add (`due`) and the total charged
     *               so far (`charged`).
     *
     */
    preauthorize : function ( userId, job ) {
        // Verify the job has the necessary properties for submission.
        if ( !job.isComplete() ) throw {
            status : 400,
            message : 'Job is not complete.'
        };

        // Setup the preauth variables we can set without an invoice
//        return {};
        var user = this.Users.read( userId );
        if ( !user ) throw {
            status : 400,
            message : 'User is not valid.'
        };

        var preauth = {
            last4 : user.payment && user.payment.last4
        };

        // Step 2. retrieve the invoice record (if any). Only one open invoice is allowed
        // per destination. Since the readByJob() function sorts by expiration date, the
        // first invoice in the list will potentially be the open one.
        var invoice = this.readByJob( userId, job ) || new Invoice( {} );

        // Step 1.2 Check if this job overlaps with currently running jobs.
        var overlap = invoice.overlappingJobs( job );
        if ( overlap.length > 0 ) throw {
            status : 400,
            jobId : overlap.jobId,
            message : 'Another job with the same source, destination and content is running.'
        };

        // Step 2.1 Check whether a test run has been done in the past
        var testInfo = invoice.getTest();
        if ( testInfo ) preauth.testedOn = testInfo.started;

        // Step 2.2 Check whether an open invoice exists, or in other words, does the
        // user have any more time left since the last payment for this destination?
        preauth.open = invoice.isOpen();

        preauth.payment = {
            promotion : invoice.getPromotionType( job ),
            expires : invoice.getExpiration(),
            amounts : invoice.calculatePayment( job )
        };

        return preauth;
    },

    /**
     * ## submitJob
     * _Used by a controller to coordinate all of the tasks to take the job from creation
     * to payment, to submission to the workflow engine._
     *
     * #### [External documentation](https://github.com/migrateio/godwits/wiki/Job-Submission)
     *
     * ### Parameters
     *
     * **userId**
     * > The id of the user with whom this job is associated.
     *
     * **job**
     * > The fully qualified Job object
     *
     * **payment**
     * >  The payment object summarizes the mechanism being used to purchase this job.
     *    There are four possible scenarios:
     *
     * > 1. The user can choose to perform a test run without entering any more
     *      information. If a test has already been successfully executed, this will not
     *      be an option.
     *
     *          ```js
     *          { test: true }
     *          ```
     * > 2. The user can enter a credit card number, expiration date, name and CVC for a
     *      new form of payment.
     *
     *          ```js
     *          { due: 5, tokenId: '' }
     *          ```
     * > 3. The user can select to use the credit card number on file as their form of
     *      payment.
     *
     *          ```js
     *          { due: 5 }
     *          ```
     * > 4. The user may have previously paid the maximum of $15 within the past 30 days
     *      and owe no payment.
     *
     *          ```js
     *          { due: 0 }
     *          ```
     * ### Return
     *
     * Various error conditions can be returned from this function, and they will be
     * thrown as exception objects of the format:
     *
     * ```js
     * {
     *    status: 4xx,
     *    message: 'general text message of the error',
     *    code: '',        // A string code indicating the specific
     *                     // error.
     *    preauth: {...}   // If the code is a preauth failure, the
     *                     // result of the preauth check will be
     *                     // included in this property.
     *    payment: {...}   // If the code is a preauth failure, the
     *                     // result of the preauth check will be
     *                     // included in this property.
     * }
     * ```
     *
     */
    submitJob : function ( userId, job, payment ) {
        // Identify the invoice object associated with this job and user. If one is not
        // found, we will create a new empty invoice and persist it so it can be locked.
        var invoice = this.readByJob( userId, job ) || this.create( new Invoice( {
            userId : userId,
            destination : job.destination
        } ) );

        // Acquire a lock on the invoice object. This serves as our semaphore around _the
        // job submission process_ and not necessarily just the invoice object.
        this.lock( invoice.invoiceId );

        try {
            // Get the latest version of invoice
            invoice = this.read( invoice.invoiceId );

            // Preauthenticate the job before proceeding. May throw exceptions.
            var preauth = this.preauthorize( userId, job );

            // Verify integrity of payment against preauth
            preauthChecks( preauth, payment );

            if ( payment.due > 0 ) {
                var user = this.Users.read( userId );

                // If there is a tokenId included, we need to register it with Stripe and
                // update the user record
                if ( payment.due && payment.tokenId ) {
                    user = this.Users.updateActiveCard( user, payment.tokenId );
                }

                // Charge the customer
                var charge = this.capturePayment( user, payment.due ).wait();

                // Update transaction record
                invoice.addCharge( job, charge );
            }

            // At this point, any housekeeping regarding customer accounts and payment
            // charges are complete.
            invoice.addJob( job, payment );

//            this.Workflow.submit( user, job );
        } finally {
            invoice = this.update( invoice );
            this.unlock( invoice.invoiceId );
        }

        return invoice;

        /**
         * If the preauth succeeds, we will check to see if any conditions have changed
         * since it was previously read. We do this by checking whether the payment
         * assumption is still valid. If not, we throw exceptions and exit.
         */
        function preauthChecks( preauth, payment ) {
            // If payment is a test run request, ensure test run is available
            if ( payment.test && preauth.testedOn ) throw {
                status : 400,
                message : '',
                code : 'preauth_test',
                preauth : preauth,
                payment : payment
            };

            // If we are testing and it is ok, then skip remaining checks
            if ( payment.test ) return;

            // Otherwise a payment.due amount is set and it must equal the preauth due
            if ( preauth.payment.amounts.due !== payment.due ) throw {
                status : 400,
                message : '',
                code : 'preauth_due',
                preauth : preauth,
                payment : payment
            };
        }
    },

    /**
     * Charges the credit card tied to the user's customer record. In addition to the
     * payment charge, the user's record is updated with the transaction details and some
     * amounts are updated.
     */
    capturePayment : function ( user, amount ) {
        var deferred = new Deferred();

        if ( !amount || amount < 50 ) {
            deferred.resolve( {
                status : 400,
                message : 'Charge amount must be more than 50 cents, not: ' + amount
            }, true );
            return deferred.promise;
        }

        var isComplete = user && user.userId && user.isVerified();
        if ( !isComplete ) {
            deferred.resolve( {
                status : 400,
                message : 'Cannot create a stripe charge without a verified email address.'
            }, true );
            return deferred.promise;
        }

        var customerId = user.getCustomerId( 'stripe' );
        if ( !customerId ) {
            deferred.resolve( {
                status : 400,
                message : 'This user is not yet a stripe customer.'
            }, true );
            return deferred.promise;
        }

        var charge = {
            amount : amount,
            currency : 'usd',
            customer : customerId,
            description : user.email.address,
            capture : true
        };

        stripe.charges.create( charge ).then(
            function success( charge ) {
                deferred.resolve( charge );
            },
            function error( error ) {
                var result = {
                    status : 400,
                    code: error.detail.code,
                    charge : charge,
                    message : 'Error occurred while creating charge.',
                    detail : error.detail
                };
                deferred.resolve( result, true );
            }
        );
        return deferred.promise;
    }




} );

