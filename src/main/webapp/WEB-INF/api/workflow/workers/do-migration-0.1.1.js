var log = require( 'ringo/logging' ).getLogger( module.id );
// todo: figure out actual path.
var {Google, Yahoo, Imap} = require( 'lib/migrate/main' );

function onmessage(e) {

    var input = e.data.input;

    function doWork() {
        var source;

        switch (input.source.service) {
            case 'gmail':
                source = new Google.Mail(input.source.auth);
                break;
            case 'yahoo':
                source = new Yahoo.Mail(input.source.auth);
                break;
            default:
                source = new Imap.Mail(input.source.auth);
                break;
        }

        e.source.postMessage( {
            module: module.id,
            status: 200
        } );
    }


}


exports.ActivityType = {
    name: 'initCopy',
    version: '0.1.1',
    defaultTaskHeartbeatTimeout: '15',
    defaultTaskScheduleToCloseTimeout: 'NONE',
    defaultTaskScheduleToStartTimeout: 'NONE',
    defaultTaskStartToCloseTimeout: '10',
    taskListName: 'test-tasklist-worker'
};