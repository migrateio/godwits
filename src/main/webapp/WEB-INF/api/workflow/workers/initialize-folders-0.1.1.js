var log = require( 'ringo/logging' ).getLogger( module.id );
// todo: figure out actual path.
var {Google, Yahoo, Imap, getService} = require( 'lib/migrate/main' );


function onmessage( e ) {

    var input = e.data.input;

    function doWork() {
        var source;

        source = getService( input.source.service, input.source.auth );

        // We have a source service instantiated now, time to do stuff.
        var folders = input.source.folders;

        var result = createJobs( getUIDS( source, folders ) );

        function getUIDS( service, folders ) {
            var result = [];

            for ( var i = 0; i < folders.length; i++ ) {
                var messages = folders[i].getMessages( 0, folders[i].messageCount );
                var uids = [];
                for ( var j = 0; j < messages.length; j++ ) {
                    uids.push( messages[j].getUID() );
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
            // This should probably go in a configuration file.
            const MAX_MESSAGES = 100;

            var done = false;

            // These probably shouldn't be named so similar...
            var jobs = [];
            var job = {};

            // Loop until we're done.
            while ( done ) {
                // Each iteration of this loop is a new job.
                // We initialize the job thusly.
                job = {
                    folders : [],
                    messageCount : 0
                };

                // Creating a job happens in this loop.
                while ( job.messageCount < MAX_MESSAGES ) {

                    // Iterate over all folders passed to us.
                    for ( var i = 0; i < folders.length; i++ ) {

                        // If a folder has no uids we don't care about it anymore, so we just get rid of it,
                        // update our iterator, and kick to the next iteration of the loop.
                        if ( folders[i].uids.length === 0 ) {
                            folders.splice( i, 1 );
                            i--;
                            continue;
                        }

                        // Now we have a worthwhile folder, so we push into the folders array, which will
                        // contain our data.
                        var folder = job.folders.push( {
                            folderName : folders[i].folderName,
                            uids : []
                        } );

                        // Finally, we'll loop over the uids in said folder until the job we're building has
                        // enough messages, or until we run out of uids to move into the job.
                        while ( job.messageCount < MAX_MESSAGES || folders[i].uids.length === 0 ) {
                            folder.uids.push( folders[i].uids.shift() );
                            job.messageCount++;
                        }
                    }
                }

                // Getting here means our job has gotten the max number of messages it can hold.
                jobs.push( job );

                // If there's no folders to read from we're done, else we're not.
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
    name : 'initFolders',
    version : '0.1.1',
    defaultTaskHeartbeatTimeout : '15',
    defaultTaskScheduleToCloseTimeout : 'NONE',
    defaultTaskScheduleToStartTimeout : 'NONE',
    defaultTaskStartToCloseTimeout : '10',
    taskListName : 'test-tasklist-worker'
};