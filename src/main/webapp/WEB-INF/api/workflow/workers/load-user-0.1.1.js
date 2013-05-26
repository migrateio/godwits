var log = require( 'ringo/logging' ).getLogger( module.id );
var {props} = require( 'utility' );

var users = module.singleton('users', function() {
    var domain = require( 'domain' );
    return new domain.Users( props['environment'] );
});


/**
 * ## **load-user worker**
 *
 * A Worker object that takes in a userId and returns the user object associated with the
 * id if any.
 *
 * ### Input
 *
 * ```js
 * task = {
 *     data : {
 *         input : {
 *             userId: ''     // User id of the user to lookup
 *         }
 *     }
 * }
 * ```
 *
 * ### Output
 *
 * The output of this worker is returned by calling `e.source.postMessage( result )`
 *
 * ```js
 * result = {
 *     status: 200,
 *     data: { The user data looked up },
 * }
 * ```
 *
 * Potential status results other than success are:
 *
 * ```js
 * result = {
 *     status: 404,
 *     message: 'Resource not found.'
 * }
 * ```
 *
 * ```js
 * result = {
 *     status: 500,
 *     message: 'Some unexpected error such as network outage. Could be retried
 *     successfully later.'
 * }
 * ```
 */
function onmessage( e ) {
    var user = JSON.parse( e.data.input );

    var user
    function doWork() {


        var result = {
            data : {
                userId : user.userId,
                name : 'Fred Flintstone',
                email : 'fred@bedrock.com'
            },
            status : 200
        };
        log.info( 'load-user::doWork, result: {}', JSON.stringify( result ) );
        e.source.postMessage( result, true );
    }

    setTimeout( doWork, 10 );
}


exports.ActivityType = {
    name : 'load-user',
    version: '0.1.1',
    defaultTaskHeartbeatTimeout : '15',
    defaultTaskScheduleToCloseTimeout : 'NONE',
    defaultTaskScheduleToStartTimeout : 'NONE',
    defaultTaskStartToCloseTimeout : '10',
    taskListName : 'test-tasklist-worker'
};