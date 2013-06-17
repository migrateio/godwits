var log = require( 'ringo/logging' ).getLogger( module.id );

var {Application} = require( 'stick' );
var app = exports.app = Application();
app.configure( 'error', 'notfound', 'params', 'route' );

var {json} = require( 'ringo/jsgi/response' );

var {format} = java.lang.String;
var domain = require( 'domain' );
var {props} = require( 'utility' );

var users = new domain.Users( props['environment'] );
var invoices = new domain.Invoices( props['environment'] );

app.get( '/', function ( req ) {
    java.lang.Thread.sleep( 5000 );
    return json( {
        success : true
    } );
} );

/**
 * ## POST /api/jobs/submit
 *
 * ### Body
 * The POST body will contain a JSON object representing the job to submit
 * ```js
 *  {
 *      "jobId": "1434",
 *      "source": {
 *          "service": "flickr",
 *          "auth": {
 *              "username": "jcook@gmail.com",
 *              "accessToken": "access_jsd8as32h373fhasa8",
 *              "refreshToken": "refresh_is812nms0an38dbcuz73"
 *          }
 *      },
 *      "destination": {
 *          "service": "picasa",
 *          "auth": {
 *              "username": "jcook@gmail.com",
 *              "accessToken": "access_jsd8as32h373fhasa8",
 *              "refreshToken": "refresh_is812nms0an38dbcuz73"
 *          }
 *      },
 *      "content": [
 *          "media"
 *      ],
 *      "action": {},
 *      "status": {
 *          "completion": 0,
 *          "state": "pending"
 *      }
 * }
 * ```
 *
 * This API call is different from a straign create job request (which is
 * `POST /api/jobs/`. The submission of the job must perform several checks and the
 * response will be dependent upon the state of several factors on the server. Here is a
 * summary of the checks that take place:
 *
 * 1. The user must be authenticated. This API call is allowed to be submitted by an
 *    unauthenticated user. Upon such a condition, we will not throw the standard 401.
 *    Instead, we will return a 200 json response indicating that authentication is
 *    needed. This will allow the client to invoke its own specialized UI used on the
 *    jobs page to allow the user to sign in or sign up.
 * 2. Check for the invoices for this destination account and user id. There are a few
 *    possible scenarios as a result of this check:
 *     1. An open invoice located.
 *         1. If there is a running job with the same source account and an overlap in
 *            content types, a response is returned to let the user know of this fact,
 *            and the job cannot be submitted as-is.
 *         2. If the running jobs do not overlap with this run, we will add it to the
 *            invoice and **submit it** to workflow.
 *     2. No open invoice was located.
 *         1. If there are no running jobs for this destination, we check the invoices to
 *            see if a test run has been submitted for this destination account. If it
 *            has and it was successful, we will add this information to the response.
 *         2. We will send the client a response indicating a need for payment. If their
 *            source account is an .edu domain we will indicate a price of $5, otherwise
 *            the price is $15.
 *
 *
 *
 */
app.post( '/submit', function ( req ) {
    var job = new domain.Job(req.params);

} );

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
 */
function preAuthorize( userId, job ) {
    // Verify the job has the necessary properties for submission.
    if ( !job.isComplete() ) throw {
        status : 400,
        message : 'Job is not ready to be submitted.'
    };

    // Step 1. retrieve the user record
    var user = users.read( userId );
    if (!user) throw {
        status: 400,
        message : 'User id is not valid: ' + userId
    };

    // Setup the preauth variables we can set without an invoice
    var preauth = {
        last4: users.payment && users.payment.last4,
        isCustomer : users.services && users.services.stripe
    };

    // Step 2. retrieve the invoice record (if any)
    var invoice = invoices.readByJob( userId, job );
    if (invoice) {
        // Step 1.2 Check if this job overlaps with currently running jobs.
        var overlap = invoice.overlappingJobs( job );
        if ( overlap ) throw {
            status: 400,
            jobId: overlap.jobId,
            message: 'Another job with the same source, destination and content is running.'
        };

        // Step 2.1 Check whether a test run has been done in the past
        preauth.test = invoice.getTest();

        // Step 2.2 Check whether an open invoice exists, or in other words, does the
        // user have any more time left since the last payment for this destination?
        preauth.isOpen = invoice.isOpen();
    }

    preauth.subscription = {
        expires: invoice.getExpiration(),
        payment: invoice.calculatePayment( job )
    };
}


/**
 *
 * @param job
 */
function submitJob( job ) {

}
