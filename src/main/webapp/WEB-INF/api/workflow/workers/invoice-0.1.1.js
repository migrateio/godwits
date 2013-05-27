var log = require( 'ringo/logging' ).getLogger( module.id );

function onmessage( e ) {
    var input = e.data.input;
    log.info( 'Beginning work in module [{}]: {}', module.id, JSON.stringify( input ) );


    function doWork() {
        log.info( 'Performed the work in module [{}]', module.id );
        e.source.postMessage( {
<<<<<<< Updated upstream:src/main/webapp/WEB-INF/api/workflow/workers/invoice-0.1.1.js
            module: module.id,
            status: 200
        } );
    }
    setTimeout(doWork, 10);
=======
            module : module.id,
            success : true
        } );
    }

    setTimeout( doWork, 10000 );
>>>>>>> Stashed changes:src/test/js/support/test/0.0.0/workers/do-work.js
}


exports.ActivityType = {
<<<<<<< Updated upstream:src/main/webapp/WEB-INF/api/workflow/workers/invoice-0.1.1.js
    name: 'invoice',
    version: '0.1.1',
    defaultTaskHeartbeatTimeout: '15',
    defaultTaskScheduleToCloseTimeout: 'NONE',
    defaultTaskScheduleToStartTimeout: 'NONE',
    defaultTaskStartToCloseTimeout: '10',
    taskListName: 'test-tasklist-worker'
=======
    name : 'do-work',
    version : '0.0.5',
    defaultTaskHeartbeatTimeout : '15',
    defaultTaskScheduleToCloseTimeout : 'NONE',
    defaultTaskScheduleToStartTimeout : 'NONE',
    defaultTaskStartToCloseTimeout : '10',
    taskListName : 'test-tasklist-worker'
>>>>>>> Stashed changes:src/test/js/support/test/0.0.0/workers/do-work.js
};