var log = require('ringo/logging').getLogger(module.id);

var {Application} = require('stick');
var app = exports.app = Application();
app.configure('error', 'notfound', 'middleware/auth', 'params', 'route');

var {json} = require('ringo/jsgi/response');


/**
 * Used for client-side verification of validation. In Spring Security, this url is setup
 * to permit ROLE_ANONYMOUS, which means any request will be allowed to connect. If the
 * request is from a client who has previously authenticated, the request object will
 * contain the particulars.
 */
app.get('/', function (req) {
    var result = {
        isAuthenticated: req.isAuthenticated(),
        user: {
            userId: req.getUsername()
        }
    };
    log.info( 'Result of /api/auth/ is {}', JSON.stringify( result ) );
    return json(result);
});
