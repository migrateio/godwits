var log = require( 'ringo/logging' ).getLogger( module.id );

var {format} = java.lang.String;
var domain = require( 'domain' );
var emailService = require( 'email' );

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


/**
 * ## POST /api/users/signup
 *
 * Creates the initial user record, an email verification token, and sends an email
 * address to the user.
 *
 * ### Request
 *
 * ```js
 * {
 *     name: '',
 *     email: {
 *         address: ''
 *     }
 * }
 * ```
 *
 */
app.post( '/signup', function( req ) {
    // Anyone is allowed to access this request

    try {
        // Pull the new user out of the request parameter and create the record
        var user = users.create( req.params );

        // Add a token to associate with the user account
        var token = tokens.create( {user : user} );

    } catch ( e ) {
        // If some error occurred while saving, let's clean up. Closest thing to
        // transactions we have at the moment.
        if (user) users.del( user );
        if (token) tokens.del( token );
        throw e;
    }

    emailService.sendWelcomeEmail( token.id, user );

    return response.created().json( user );
});

/**
 * ## POST /api/users/resendToken
 *
 * Sends the user's token to their email address again. If the user doesn't have a token
 * (as it must have expired) a new one is created.
 *
 */
app.post( '/resendToken/:email', function( req, email ) {
    // We will need both the user and the token to send the email again
    var user, token;

    var tokenHits = tokens.readByEmail( email );

    // The token may have expired
    if (tokenHits.length === 0) {
        // First we need to make sure the user has an account
        user = users.readByEmail( email );
        if (!user) return response.notFound();

        // Generate a new token for this user
        token = tokens.create( {user : user} );
    }

    if (tokenHits.length > 0) {
        // We really shouldn't be getting more than one of these. If there is a business
        // reason for duplicates in the future, perhaps we should sort these and return
        // the most recent one.
        token = tokenHits[0];
    }

    emailService.sendWelcomeEmail( token.id, user );

    return response.ok();
});

/**
 * ## GET /api/users/signin/:email
 *
 * By suppling an email address, the caller will receive an object containing the basic
 * objects necessary for navigating the signin process.
 *
 */
app.get( '/signin/:email', function( req, email ) {
    var user = users.readByEmail( email );

    if (!user) return response.notFound();

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