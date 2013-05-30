var log = require( 'ringo/logging' ).getLogger( module.id );

var {format} = java.lang.String;
var domain = require( 'domain' );
var email = require( 'email' );

var users = new domain.Users( props['environment'] );
var tokens = new domain.Tokens( props['environment'] );

var {Application} = require( 'stick' );
var app = exports.app = Application();
app.configure( 'route' );

var response = require( "ringo/jsgi/response" );

/**
 * Removes properties from the user object based on the user's role.
 *
 * @param req
 * @param user
 * @return {User} Stripped down user object according to role
 */
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

app.get( '/signin/:email', function( req, email ) {
    var query = format( 'select * from `[mapname]` where `email.address` = "%s"', email );
    var hits = users.read( query );

    if (hits.length === 0) return response.notFound();

    if (hits.length > 1) {
        log.error('There is more than one record with an email address of '
            + email, JSON.stringify( hits ) );
    }

    var user = hits[0];

    // If there is a user object, we won't be passing it back. Instead we will create the
    // most minimal object for the signin process to use.
    var result = {
        id: user.id,
        verified: user.email.status === 'verified',
        complete: user.password && user.password.length > 0
    };

    return response.json( result );
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