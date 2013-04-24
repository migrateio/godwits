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
