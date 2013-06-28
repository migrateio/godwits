var log = require( 'ringo/logging' ).getLogger( module.id );
// todo: figure out actual path.
var {getService} = require( 'lib/migrate/main' );


function onmessage( e ) {

    /**
     *  Assume input looks something like:
     *
     *  {
     *       source: {
     *          service: <string>,
     *          auth: {
     *              username: <string>,
     *              refreshToken: <string>,
     *              password: <string>,
     *          }
     *       },
     *       destination: {
     *          service: <string>,
     *          auth: {
     *              username: <string>,
     *              refreshToken: <string>,
     *              password: <string>
     *          }
     *       }
     *  }
     *
     */

    var input = e.data.input;

    function doWork() {
        var source;

        try {
            source = getService( input.source.service, input.source.auth );
            // We have a source service instantiated now, time to do stuff.

            var folders = source.getFolders();
            var result = folders.map( function ( folder ) {
                return {
                    folderName : folder.getFullName(),
                    messageCount : folder.messageCount,
                    uids : [] // Don't do anything yet, just initialize as empty array.
                }
            } );

            e.source.postMessage( {
                status : 200,
                result : result
            } );
        } catch ( e ) {
            e.source.postError( {
                reason : '',
                details : ''
            } );
        }
    }
}


exports.ActivityType = {
    name : 'initCopy',
    version : '0.1.1',
    defaultTaskHeartbeatTimeout : '15',
    defaultTaskScheduleToCloseTimeout : 'NONE',
    defaultTaskScheduleToStartTimeout : 'NONE',
    defaultTaskStartToCloseTimeout : '10',
    taskListName : 'test-tasklist-worker'
};