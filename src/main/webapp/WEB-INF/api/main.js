var log = require('ringo/logging').getLogger(module.id);

var {Application} = require('stick');
var app = exports.app = Application();
app.configure('profiler', 'middleware/nocache', 'error', 'notfound', 'params', 'mount', 'route');

var {json} = require('ringo/jsgi/response');

app.mount( '/jobs', require( 'jobs' ) );
app.mount( '/users', require( 'users' ) );
app.mount( '/auth', require( 'auth' ) );

app.get('/', function (req) {
    return json({
        success: true
    });
});
