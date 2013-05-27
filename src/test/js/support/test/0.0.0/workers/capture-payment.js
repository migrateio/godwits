var log = require( 'ringo/logging' ).getLogger( module.id );

function onmessage( e ) {
    var input = e.data.input;
    log.info( 'Beginning work in module [{}]: {}', module.id, JSON.stringify( input ) );


    function doWork() {
        log.info( 'Performed the work in module [{}]', module.id );
        e.source.postMessage( {
<<<<<<< Updated upstream
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
>>>>>>> Stashed changes
}


exports.ActivityType = {
<<<<<<< Updated upstream
    name: 'capture-payment',
    version: '0.0.6',
    defaultTaskHeartbeatTimeout: '15',
    defaultTaskScheduleToCloseTimeout: 'NONE',
    defaultTaskScheduleToStartTimeout: 'NONE',
    defaultTaskStartToCloseTimeout: '10',
    taskListName: 'test-tasklist-worker'
=======
    name : 'capture-payment',
    version : '0.0.5',
    defaultTaskHeartbeatTimeout : '15',
    defaultTaskScheduleToCloseTimeout : 'NONE',
    defaultTaskScheduleToStartTimeout : 'NONE',
    defaultTaskStartToCloseTimeout : '10',
    taskListName : 'test-tasklist-worker'
>>>>>>> Stashed changes
};