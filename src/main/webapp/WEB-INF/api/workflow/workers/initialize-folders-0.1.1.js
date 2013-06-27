var log = require( 'ringo/logging' ).getLogger( module.id );
// todo: figure out actual path.
var {Google, Yahoo, Imap} = require( 'lib/migrate/main' );


function onmessage( e ) {

    /**
     *
     *
     */

    var input = e.data.input;

    function doWork() {
        var source;

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
        var folders = input.source.folders;

        var result = createJobs( getUIDS( source, folders ) );

        function getUIDS( service, folders ) {
            var result = [];

            for ( var i = 0; i < folders.length; i++ ) {
                var messages = folders[i].getMessages( 0, folders[i].messageCount );
                var uids = [];
                for ( var j = 0; j < messages.length; j++ ) {
                    uids.push( messages[j].getuid );
                }

                result.push( {
                    folderName : folders[i].getFullName(),
                    messageCount : folders[i].messageCount(),
                    uids : uids
                } );
            }

            return result;
        }

        function createJobs( folders ) {
            const MAX_MESSAGES = 100;
            var done = false;
            var jobs = [];
            var job = {};

            while ( done ) {
                job = {
                    folders : [],
                    messageCount : ''
                };

                while ( job.messageCount < MAX_MESSAGES ) {

                    for ( var i = 0; i < folders.length; i++ ) {
                        var folder = job.folders.push( {
                            folderName : folders[i].folderName,
                            uids : []
                        } );

                        while ( job.messageCount < MAX_MESSAGES || folders[i].uids.length === 0 ) {
                            folder.uids.push( folders[i].uids.shift() );
                            job.messageCount++;
                        }

                        if ( folders[i].uids.length === 0 ) {
                            folders.splice( i, 1 );
                        }
                    }

                }

                jobs.push( job );

                if ( folders.length === 0 ) {
                    done = true;
                }
            }

            return jobs;
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