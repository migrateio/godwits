var log = require( 'ringo/logging' ).getLogger( module.id );

var {Job} = require( './job' );
var {format} = java.lang.String;

exports.Invoice = function ( invoice ) {
    if (invoice && typeof invoice.toJSON === 'function') return invoice;

    function intersect( a, b ) {
        a = [].concat( a );
        for ( var i = a.length - 1; i >= 0; i-- ) {
            var index = b.indexOf( a[i] );
            if ( index < 0 ) a.splice( i, 1 );
        }
        return a;
    }

    function isOpen() {
        var expires = new Date( invoice.expires );
        return expires > Date.now();
    }

    /**
     * We will iterate over all jobs associated with this invoice. The job passed in will
     * overlap with an existing job, if:
     *
     * 1. The invoice job is running
     * 2. The source's service name is the same
     * 3. The source's username is the same
     * 4. The content in the invoice job overlaps with the content in the parameter
     *
     * @param checkJob
     */
    function overlappingJobs( checkJob ) {
        return [].concat( invoice.jobs || [] ).filter( function ( job ) {
            var match = true;
            var jobObj = new Job( job );
            match = match && jobObj.isRunning() && jobObj.sourceOverlaps( checkJob.source );
            return match && intersect( checkJob.content, job.content ).length > 0;
        } );
    }


    /**
     * Determine how much will need to be collected in order to run the proposed job.
     *
     * The business rules for calculating a subscription payment are as follows.
     *
     * 1. For a source account with an .edu extension on the host name, add $5
     * 2. For any other source account add $15
     * 3. The maximum amount of the subscription (including prior payments) is $15.
     *
     * ### Returns
     *
     * A JSON object with the following properties
     *
     * **due**
     * > The amount of payment needed for a one month subscription for the job
     *
     * **charged**
     * > The amount charged for the subscription thus far
     */
    function calculatePayment( job ) {
        var totalCharged = isNaN( invoice.totalCharged ) ? 0 : invoice.totalCharged;
        var isEdu = getPromotionType( job ) === 'edu';
        var due = isEdu ? 500 : 1500;
        return {
            due : due + totalCharged > 1500 ? 1500 - totalCharged : due,
            charged : totalCharged
        }
    }

    function getExpiration() {
        if ( invoice.expires ) return invoice.expires;
        var expires = Date.now() + 1000 * 60 * 60 * 24 * 30;
        return new Date( expires ).toISOString();
    }

    function addComment( userId, message, date ) {
        if ( !date ) date = new Date().toISOString();
        if ( typeof date !== 'string' ) date = date.toISOString();

        if ( !invoice.comments ) invoice.comments = [];
        invoice.comments.push( {
            userId : userId,
            message : message,
            created : date
        } );
    }

    function getTest() {
        return invoice.test;
    }

    function getPromotionType( job ) {
        var isEdu = job.source && job.source.auth && job.source.auth.hostname
            && /\.edu$/ig.test( job.source.auth.hostname );
        return isEdu ? 'edu' : 'full'
    }

    function addJob(job, payment) {
        if (!invoice.jobs) invoice.jobs = [];
        var now = Date.now();
        var testedOn = new Date( now );
        var expires = new Date(now + 1000 * 60 * 60 * 24 * 30);

        var j = {
            content: job.content,
            expires: expires.toISOString(),
            jobId: job.jobId,
            status: job.status,
            source: job.source
        };

        if (payment.test) {
            j.test = true;
            invoice.test = {
                jobId: job.jobId,
                started: testedOn.toISOString()
            };
        }
        invoice.jobs.push( j );
    }

    function addCharge(job, charge) {
        if (!invoice.transactions) invoice.transactions = [];
        var num = invoice.invoiceNum + '/' + format('%03.0f', invoice.transactions.length + 1);

        // This may not be needed as I hadn't seen it fail. Better safe than sorry.
        var date;
        try {
            date = new Date( charge.created * 1000 ).toISOString();
        } catch ( e ) {
            log.warn( 'Error creating date from charge:', charge.created );
            date = new Date().toISOString();
        }

        invoice.transactions.push( {
            relatedJob: job.jobId,

            invoiceDate : date,
            invoiceNum : num,

            service: 'stripe',
            txType: 'charge',

            amount: charge.amount,
            captureId : charge.id,
            customerId: charge.customer,
            last4: charge.card.last4,
            fingerprint: charge.card.fingerprint,
            type: charge.card.type
        } );

        // Update total charges
        var total = 0;
        invoice.transactions.forEach(function (tx) {
            total = /charge/.test( tx.txType ) ? total + tx.amount : total - tx.amount;
        });
        invoice.totalCharged = total;
    }


/*
    // Ensure the invoice has the required properties
    log.info( 'Instantiation Invoice', JSON.stringify( invoice, null, 4 ) );
    function reqCheck(prop) {
        if (typeof invoice[prop] === 'undefined') throw {
            status: 400,
            message: 'Required property not present [' + prop + ']'
        };
    }
    ['destination', 'expires', 'invoiceId', 'invoiceNum', 'starts',
        'totalCharged', 'userId'].forEach(reqCheck);
*/

    var obj = {
        addCharge : addCharge,
        addComment : addComment,
        addJob : addJob,
        calculatePayment : calculatePayment,
        getExpiration : getExpiration,
        getPromotionType: getPromotionType,
        getTest : getTest,
        isOpen : isOpen,
        toJSON : function toJSON() {
            return invoice;
        },
        overlappingJobs : overlappingJobs
    };

    Object.keys( invoice ).forEach( function ( prop ) {
//        log.info( 'Invoice, key:', prop, '=', JSON.stringify( invoice[prop] ) );
        obj[prop] = invoice[prop];
    } );

    return obj;
};