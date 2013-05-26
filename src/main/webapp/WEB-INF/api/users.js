var log = require( 'ringo/logging' ).getLogger( module.id );

var {tokenator, props} = require( 'utility' );
var domain = require( 'domain' );

var users = new domain.Users( props['environment'] );
var tokens = new domain.Tokens( props['environment'] );

var {Application} = require( 'stick' );
var app = exports.app = Application();
app.configure( 'error', 'notfound', 'params', 'route' );

var response = require("ringo/jsgi/response");

app.get( '/me', function ( req ) {

    return json( {
        success : true
    } );
} );

function addToken (userId) {

}

app.post( '/', function ( req ) {
    try {
        // Pull the new user out of the request parameter and create the record
        var user = users.create( req.params );

        // Add a token to associate with the user account
        var token = addToken(user);

        email.sendWelcomeEmail( user );

        return response.created().json(user)
            .addHeaders({ 'Location' : buildPost( req, user.id ) });
    } catch ( e ) {
        log.error( 'Error: ' + e.message || e.toString() );
        return response
            .setStatus( e.status || 400 )
            .json( e.message || e.toString() );
    }
} );

app.put( '/:id', function ( req, id ) {
    try {
        var user = users.update( req.params );
        var result = {
            status : 204,
            header : {
                'Location' : buildPut( req, user.id )
            },
            body : [JSON.stringify( user )]
        };
        log.info( 'Returning result:', JSON.stringify( result ) );
        return result;
    } catch ( e ) {
        return {
            status : e.status,
            body : [ e.message ]
        }
    }
} );

app.get( '/:id', function ( req, id ) {
    try {
        var user = users.read( id );
        return {
            status : 200,
            body : [JSON.stringify( user )]
        };
    } catch ( e ) {
        return {
            status : e.status,
            body : [ e.message ]
        }
    }
} );


function buildPost( req, id ) {
    var servletReq = req.env.servletRequest;
    return servletReq.getRequestURL().append( id ).toString();
}

function buildPut( req, id ) {
    var servletReq = req.env.servletRequest;
    var url = servletReq.getRequestURL().toString();
    var parts = url.split( '/' );
    parts.pop();
    return parts.join( '/' ) + '/' + id;
}