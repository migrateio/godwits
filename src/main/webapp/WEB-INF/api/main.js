var log = require( 'ringo/logging' ).getLogger( module.id );

// First thing is to initialize the Hazelcast server instance used for this web
// application. It was bootstrapped in the bootscripts, but the concept of a singleton
// instance was lost and we need to recreate it. This won't create another instance of
// hazelcast; it will just allow the original to be re-discovered.

log.info( 'Initializing the hazelcast instance in the main web application.' );
require( 'hazelstore' ).init();

var {Application} = require('stick');

var app = exports.app = Application();
app.configure(
    'profiler', 'middleware/nocache', 'middleware/ajaxerror', 'notfound', 'params',
    'middleware/auth', 'mount', 'route'
);

var {json} = require( 'ringo/jsgi/response' );

app.mount( '/jobs', require( 'jobs' ) );
app.mount( '/users', require( 'users' ) );
app.mount( '/auth', require( 'auth' ) );
app.mount( '/oauth', require( 'oauth/oauth_client' ) );

app.get('/', function (req) {
    return json({
        success: true
    });
});
