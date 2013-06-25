var log = require( 'ringo/logging' ).getLogger( module.id );

var store = require( 'hazelstore' );
var {Invoice} = require( './invoice' );
var {BaseDomain} = require( '../base' );
var {makeToken} = require( '../main' );
var {format} = java.lang.String;

exports.Invoices = BaseDomain.subClass( {

    init : function ( environment ) {
        var map = store.getMap( environment + '-invoices' );
        var pk = function ( obj ) {
            return obj.invoiceId;
        };
        var query = function ( key ) {
            return /^(select|where) /ig.test( key.trim() );
        };
        var {schema} = require( 'domain/schema/invoices.js' );
        this._super( 'Invoices', map, pk, query, schema );
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
    normalize: function( json ) {
        return json.toJSON && json.toJSON() || json;
    },

    prevalidate : function ( json ) {
        // add an id if not provided
        if ( !json.invoiceId ) json.invoiceId = this.generate( 6 );

        var now = Date.now();

        if ( !json.starts )
            json.starts = new Date(now).toISOString();

        if ( !json.expires )
            json.expires = new Date(now + 1000 * 60 * 60 * 24 * 30 ).toISOString();
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

    create : function ( json, ttl, timeunit ) {
        var result = this._super( this.normalize( json ), ttl, timeunit );
        return new Invoice(result);
    },

    read : function ( pkey ) {
        var result = this._super( pkey );
        if (!Array.isArray(result)) return new Invoice(result);
        return result.map(function(json) {
            return new Invoice( json );
        });
    },

    update : function ( json, ttl, timeunit ) {
        var result = this._super( this.normalize( json ), ttl, timeunit );
        return new Invoice(result);
    },

    readByJob : function ( userId, job ) {
        var query = format( '\
            where `destination.service` = "%s" \
            and `destination.auth.username` = "%s" \
            and `userId` = "%s"',
            job.destination.service, job.destination.auth.username, userId );

        var invoices = this.read( query );
        // Sort by expiration date
        invoices.sort(function (i1, i2) {
            return i1.expires.localeCompare( i2.expires );
        });
        return invoices;
    },

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
     * **subscription**
     *
     * > **expires**
     * > > The date the subscription expires, or will expire.
     *
     * > **due**
     * > > The amount due to purchase or add to the subscription.
     *
     */
    preauthorize : function ( userId, job ) {
        // Verify the job has the necessary properties for submission.
        if ( !job.isComplete() ) throw {
            status : 400,
            message : 'Job is not complete.'
        };

        // Setup the preauth variables we can set without an invoice
        var preauth = {
//        last4: users.payment && users.payment.last4
        };

        // Step 2. retrieve the invoice record (if any). Only one open invoice is allowed
        // per destination. Since the readByJob() function sorts by expiration date, the
        // first invoice in the list will potentially be the open one.
        var invoices = this.readByJob( userId, job );

        // If no invoice was returned in the search, then we will instantiate an empty
        // invoice object
        var invoice = invoices[0] || new Invoice( {} );

        // Step 1.2 Check if this job overlaps with currently running jobs.
        var overlap = invoice.overlappingJobs( job );
        if ( overlap.length > 0 ) throw {
            status: 400,
            jobId: overlap.jobId,
            message: 'Another job with the same source, destination and content is running.'
        };

        // Step 2.1 Check whether a test run has been done in the past
        var testInfo = invoice.getTest();
        if (testInfo) preauth.testedOn = testInfo.completed;

        // Step 2.2 Check whether an open invoice exists, or in other words, does the
        // user have any more time left since the last payment for this destination?
        preauth.open = invoice.isOpen();

        preauth.subscription = {
            promotion: invoice.getPromotionType( job ),
            expires: invoice.getExpiration(),
            payment: invoice.calculatePayment( job )
        };

        return preauth;
    }

} );

