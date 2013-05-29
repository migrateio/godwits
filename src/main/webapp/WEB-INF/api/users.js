var log = require( 'ringo/logging' ).getLogger( module.id );

var {props, makeToken} = require( 'utility' );
var domain = require( 'domain' );
var email = require( 'email' );

var users = new domain.Users( props['environment'] );
var tokens = new domain.Tokens( props['environment'] );

var {Application} = require( 'stick' );
var app = exports.app = Application();
app.configure( 'route' );

var response = require( "ringo/jsgi/response" );

function stripByRole( req, user ) {
    if ( req.hasRole( 'ROLE_ADMIN' ) ) return user;
    if ( req.hasRole( 'ROLE_USER' ) ) {
        return users.strip( user, 'ROLE_USER' );
    }
    // Why are we here?
    return null;
}

app.get( '/me', function ( req ) {
    req.allow( req.isAuthenticated() );

    var user = users.read( req.getUsername() );

    user = users.strip( user, req.isUserInRole );

    user = stripByRole( req, user );

    return response.json( user )
} );

app.get( '/:id', function ( req, id ) {
    req.allow(
        req.hasRole( 'ROLE_ADMIN' ) || req.hasRole( 'ROLE_USER' ) && req.isUser( id )
    );

    var user = users.read( id );
    user = stripByRole( req, user );

    return response.json( user )
} );

app.post( '/', function ( req ) {
    // Pull the new user out of the request parameter and create the record
    var user = users.create( req.params );

    // Add a token to associate with the user account
    var token = tokens.create( {userId : user.id} ).id;

    var result = email.sendWelcomeEmail( token, user );

    return response.created().json( user )
        .addHeaders( { 'Location' : buildPost( req, user.id ) } );
} );

app.put( '/:id', function ( req, id ) {
    req.allow(
        req.hasRole( 'ROLE_ADMIN' ) || req.hasRole( 'ROLE_USER' ) && isUser( id )
    );

    var user = users.update( req.params );

    return response.json( user )
        .addHeaders( { 'Location' : buildPut( req, user.id ) } );
} );

app.del( '/:id', function ( req, id ) {
    req.allow( req.hasRole( 'ROLE_ADMIN' ) );

    var user = users.del( id );

    return response.json( user )
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