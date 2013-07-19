var log = require( 'ringo/logging' ).getLogger( module.id );
var {getService} = require( 'lib/migrate/main' );


function onmessage( e ) {

    var input = e.data.input;

    function doWork() {
        var source;
        const FILES_PER_JOB = 50;

        try {
            source = getService( input.source.service, input.source.auth );

            var files = source.read();

            function splitJobs(files) {
                var result = [];

                while(files.length > 0) {
                    result.push({
                        files: files.slice(0, Math.min(FILES_PER_JOB, files.length - 1))
                    });
                }

                return result;
            }

            var result = splitJobs(files);

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
    name : 'initDocsJobs',
    version : '0.1.1',
    defaultTaskHeartbeatTimeout : '15',
    defaultTaskScheduleToCloseTimeout : 'NONE',
    defaultTaskScheduleToStartTimeout : 'NONE',
    defaultTaskStartToCloseTimeout : '10',
    taskListName : 'test-tasklist-worker'
};