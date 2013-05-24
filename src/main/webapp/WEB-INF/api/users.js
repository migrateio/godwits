var log = require('ringo/logging').getLogger(module.id);

var {Application} = require('stick');
var app = exports.app = Application();
app.configure('error', 'notfound', 'params', 'route');

var {json} = require('ringo/jsgi/response');

app.get('/me', function (req) {

    return json({
        success: true
    });
});
