var log = require( 'ringo/logging' ).getLogger( module.id );

function onmessage( e ) {
    var user = JSON.parse( e.data.input );
    log.info( 'Beginning work in module [{}]: {}', module.id, JSON.stringify( user ) );


    function doWork() {
        log.info( 'Performed the work, e: {}', JSON.stringify( e ) );
        var result = {
            data : {
                userId : user.userId,
                name : 'Fred Flintstone',
                email : 'fred@bedrock.com'
            },
            module : module.id,
            success : true
        };
        log.info( 'Returning data: {}', JSON.stringify( result ) );
        e.source.postMessage( result, true );
    }

    setTimeout( doWork, 5000 );
}


exports.ActivityType = {
    name : 'load-user',
    version : '0.0.5',
    defaultTaskHeartbeatTimeout : '15',
    defaultTaskScheduleToCloseTimeout : 'NONE',
    defaultTaskScheduleToStartTimeout : 'NONE',
    defaultTaskStartToCloseTimeout : '10',
    taskListName : 'test-tasklist-worker'
};