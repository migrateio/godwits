var log = require( 'ringo/logging' ).getLogger( module.id );

var {Application} = require( 'stick' );
var app = exports.app = Application();
app.configure( 'error', 'notfound', 'params', 'mount', 'route' );

var {json} = require( 'ringo/jsgi/response' );

app.get( '/', function ( req ) {
    var {Google} = require( 'migrate' );

    var migrator = new Google.Mail( { email : 'jcook@migrate.io'} );
    return json( {
        email: migrator.email
    } );
} );

app.get('/test/src/:email/:password/dest/:emaildest/:passworddest', function (req, email, password, emaildest, passworddest) {
    var {Google} = require('migrate');

    var src = {
        email: email,
        password: password
    };

    var dest = {
        email: emaildest,
        password: passworddest
    };

    var source = new Google.Mail(src);
    var destination = new Google.Mail(dest);

    try {
        var emails = source.read(1, 100);
        var result = destination.write(emails);
    } catch (e) {
        log.error(e);
    }
    return json(result);
});
