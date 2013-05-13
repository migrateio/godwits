var log = require( 'ringo/logging' ).getLogger( module.id );

function onmessage( e ) {
    var user = JSON.parse( e.data.input );


    function doWork() {
        var result = {
            data : {
                userId : user.userId,
                name : 'Fred Flintstone',
                email : 'fred@bedrock.com'
            },
            module : module.id,
            status : 200
        };
        log.info( 'load-user::doWork, result: {}', JSON.stringify( result ) );
        e.source.postMessage( result, true );
    }

    setTimeout( doWork, 10 );
}


exports.ActivityType = {
    name : 'load-user',
    version : '0.0.6',
    defaultTaskHeartbeatTimeout : '15',
    defaultTaskScheduleToCloseTimeout : 'NONE',
    defaultTaskScheduleToStartTimeout : 'NONE',
    defaultTaskStartToCloseTimeout : '10',
    taskListName : 'test-tasklist-worker'
};