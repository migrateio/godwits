var log = require( 'ringo/logging' ).getLogger( module.module.id );

function onmessage( e ) {
    var input = e.data.input;

    // Simulate that this might take a little while
    setTimeout( function () {
        var result = getUser( input );
        e.source.postMessage( result );
    }, 10000 );
}

function getUser( userId ) {
    return {
        userId: userId,
        name: 'Fred Flintstone',
        email: 'fred@bedrock.com'
    }
}

exports.ActivityType = {
    name: 'io.migrate.transfers.load-user',
    version: 'v0.1.0',
    description: 'Loads the user object for the userId that is provided.',
    defaultTaskList: 'io.migrate.transfers',
    defaultTaskHeartbeatTimeout: '60',
    defaultTaskScheduleToCloseTimeout: 'NONE',
    defaultTaskScheduleToStartTimeout: 'NONE',
    defaultTaskStartToCloseTimeout: '15'
};