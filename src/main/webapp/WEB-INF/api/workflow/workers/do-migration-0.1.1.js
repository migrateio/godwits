var log = require( 'ringo/logging' ).getLogger( module.id );
// todo: figure out actual path.
var {Google, Yahoo, Imap, getService} = require( 'lib/migrate/main' );

function onmessage( e ) {

    var input = e.data.input;

    function doWork() {

        var job = input.job;
        var sourceServ;
        var destinationServ;

        sourceServ = getService( input.source.service, input.source.auth );
        destinationServ = getService( input.destination.service, input.destination.auth );

        var result = migrate( sourceServ, destinationServ, job );

        function migrate( source, dest, job ) {
            var mails = [];
            for ( var i = 0; i < job.folders.length; i++ ) {
                mails.concat.apply(
                    source.read( job.folders[i].folderName, job.folders[i].uids )
                );
            }

            return dest.write(mails);
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