var log = require( 'ringo/logging' ).getLogger( module.id );

function onmessage(e) {
    var input = e.data.input;
    log.info( 'Beginning work in module [{}]: {}', module.id, JSON.stringify( input ) );


    function doWork() {
        log.info( 'Performed the work in module [{}]', module.id );
        e.source.postMessage( {
            module: module.id,
            success: true
        } );
    }
    setTimeout(doWork, 10000);
}


exports.ActivityType = {
    name: 'load-user',
    version: '0.0.0',
    defaultTaskHeartbeatTimeout: '15',
    defaultTaskScheduleToCloseTimeout: 'NONE',
    defaultTaskScheduleToStartTimeout: 'NONE',
    defaultTaskStartToCloseTimeout: '10'
};