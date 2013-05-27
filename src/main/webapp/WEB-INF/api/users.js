var log = require( 'ringo/logging' ).getLogger( module.id );

var {props} = require( 'utility' );
var domain = require( 'domain' );
var email = require( 'email' );

var users = new domain.Users( props['environment'] );
var tokens = new domain.Tokens( props['environment'] );

var {Application} = require( 'stick' );
var app = exports.app = Application();
app.configure( 'route' );
//app.configure( 'error', 'notfound', 'params', 'middleware/auth', 'route' );

var response = require( "ringo/jsgi/response" );

app.get( '/me', function ( req ) {
    return json( {
        success : true
    } );
} );

/**
 * Create an entry in the tokens table associating a newly created token with this user
 * id.
 *
 * @param userId
 */
function addToken( userId ) {
    var token = tokens.generate(6);
    tokens.create( {token : token, userId : userId} );
    return token;
}

app.post( '/', function ( req ) {
    // Perform our permissions check
    req.allow( 'ROLE_ADMIN' );

    // Pull the new user out of the request parameter and create the record
    log.info( 'User object to store: ', JSON.stringify( req.params ) );
    var user = users.create( req.params );

    // Add a token to associate with the user account
    var token = tokens.create( {userId : user.id} ).id;

    email.sendWelcomeEmail( token, user );

    return response.created().json( user )
        .addHeaders( { 'Location' : buildPost( req, user.id ) } );
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