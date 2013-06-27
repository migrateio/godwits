var log = require( 'ringo/logging' ).getLogger( module.id );
// todo: figure out actual path.
var {Google, Yahoo, Imap} = require( 'lib/migrate/main' );


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

        // encapsulate this somehow.
        switch ( input.source.service ) {
            case 'gmail':
                source = new Google.Mail( input.source.auth );
                break;
            case 'yahoo':
                source = new Yahoo.Mail( input.source.auth );
                break;
            default:
                source = new Imap.Mail( input.source.auth );
                break;
        }

        // We have a source service instantiated now, time to do stuff.

        var folders = source.getFolders();
        var result = [];

        for ( var i = 0; i < folders.length; i++ ) {
            result.push( {
                folderName : folders[i].getFullName(),
                count : folders[i].messageCount,
                uids : [] // Don't do anything yet, just initialize as empty array.
            } );
        }

        e.source.postMessage( {
            module : module.id,
            status : 200,
            result : result
        } );
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