var log = require('ringo/logging').getLogger(module.id);

var {Application} = require('stick');
var app = exports.app = Application();
app.configure('error', 'notfound', 'params', 'route');

var {json} = require('ringo/jsgi/response');

app.get('/', function (req) {
    java.lang.Thread.sleep( 5000 );
    return json({
        success: true
    });
});
