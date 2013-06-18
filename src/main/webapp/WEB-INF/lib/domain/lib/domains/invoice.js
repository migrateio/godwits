var log = require( 'ringo/logging' ).getLogger( module.id );

var {Job} = require( './job' );

exports.Invoice = function ( invoice ) {

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
        return [].concat( invoice.jobs ).filter( function ( job ) {
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
        var totalCharged = isNaN( invoice.totalCharged ) ? 0.00 : invoice.totalCharged;
        var isEdu = job.source && job.source.auth && job.source.auth.hostname
            && /\.edu$/ig.test( job.source.auth.hostname );
        var due = isEdu ? 5.00 : 15.00;
        return {
            due : due + totalCharged > 15 ? 15 - totalCharged : due,
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

    function addJob( job ) {
        if ( !invoice.jobs ) invoice.jobs = [];
        invoice.jobs.push( job );
    }

    var obj = {
        addComment : addComment,
        addJob : addJob,
        calculatePayment : calculatePayment,
        getExpiration : getExpiration,
        isOpen : isOpen,
        json : invoice,
        getTest : invoice.test,
        overlappingJobs : overlappingJobs
    };

    Object.keys( invoice ).forEach( function ( prop ) {
//        log.info( 'Invoice, key:', prop, '=', JSON.stringify( invoice[prop] ) );
        obj[prop] = invoice[prop];
    } );

    return obj;
};