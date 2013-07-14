var log = require( 'ringo/logging' ).getLogger( module.id );

var {format} = java.lang.String;
var domain = require( 'domain' );
var emailService = require( 'email' );
var {props} = require( 'utility' );

var users = new domain.Users( props['environment'] );
var invoices = new domain.Invoices( props['environment'] );
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

app.get( '/:userId', function ( req, userId ) {
    req.allow(
        req.hasRole( 'ROLE_ADMIN' ) || req.hasRole( 'ROLE_USER' ) && req.isUser( userId )
    );

    var user = users.read( userId );
    user = stripByRole( req, user );

    return response.json( user )
} );

app.post( '/', function ( req ) {
    // Pull the new user out of the request parameter and create the record
    var user = users.create( req.params );

    return response.created().json( user )
        .addHeaders( { 'Location' : buildPost( req, user.userId ) } );
} );

app.put( '/:userId', function ( req, userId ) {
    req.allow(
        req.hasRole( 'ROLE_ADMIN' ) || req.hasRole( 'ROLE_USER' ) && isUser( userId )
    );

    var user = users.update( req.params );

    return response.json( user )
        .addHeaders( { 'Location' : buildPut( req, user.userId ) } );
} );

app.del( '/:userId', function ( req, userId ) {
    req.allow( req.hasRole( 'ROLE_ADMIN' ) );

    var user = users.del( userId );

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
 *     username: '',
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

    emailService.sendVerificationEmail( token.tokenId, user );

    return response.created().json( { userId: user.userId } );
});

/**
 * ## POST /api/users/:userId/resendtoken
 *
 * Sends the user's token to their email address again. If the user doesn't have a token
 * (as it must have expired) a new one is created.
 *
 */
app.post( '/:userId/resendtoken', function( req, userId ) {
    // We will need both the user and the token to send the email again
    var token;

    var user = users.read( userId );
    if (!user) return response.notFound();

    var tokenHits = tokens.readByEmail( user.email.address );

    // The token may have expired
    if (tokenHits.length === 0) {
        // Generate a new token for this user
        token = tokens.create( {user : user} );
    }

    if (tokenHits.length > 0) {
        // We really shouldn't be getting more than one of these. If there is a business
        // reason for duplicates in the future, perhaps we should sort these and return
        // the most recent one.
        token = tokenHits[0];
    }

    emailService.sendVerificationEmail( token.tokenId, user );

    return response.ok();
});

/**
 * ## POST /api/users/passwordreset
 *
 * Sends the user's token to their email address again. If the user doesn't have a token
 * (as it must have expired) a new one is created.
 *
 */
app.post( '/passwordreset', function( req ) {
    // We will need both the user and the token to send the email again
    var user, token;

    var email = req.params.email;
    if (!email) throw { status: 400,
        message: 'reset password api requires parameter [email]'
    };

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

    emailService.sendResetPasswordEmail( token.tokenId, user );

    return response.ok();
});

/**
 * ## POST /api/users/:userId/verify/:token
 *
 * Sends the user's token to their email address again. If the user doesn't have a token
 * (as it must have expired) a new one is created.
 *
 * Responses
 * > **200** - The token has been verified and the user's email account has been updated
 *   to verified status.
 * > **404** - Either the token was not found, or the user record was not found. Either
 *   way, the token is not valid.
 *
 */
app.post( '/:userId/verify/:tokenId', function( req, userId, tokenId ) {
    // No security check on this one
    log.info( 'Verifying token {} for user id {}', tokenId, userId );

    // We will need to load the token for verification purposes
    var token = tokens.read( tokenId );
    log.info( 'http handler, token: ', JSON.stringify( token ) );

    // todo: delete the json (used for debugging)
    if (!token) return response.notFound().json({
        status: 404,
        message: 'Token ' + tokenId + ' not found'
    });

    // The token was found, but is it for the same user?
    // todo: delete the json (used for debugging)
    if (token.user.userId !== userId) return response.notFound().json({
        status: 404,
        message: 'User ' + userId + ' did not match token ' + token.user.userId
    });

    // So, we have a match. Let's update the user's account and remove the token.
    users.update( {
        userId: token.user.userId,
        email: {
            status: 'verified'
        }
    });

    // We don't delete the token just yet, because the user may not select a password
    // right away. In these cases, the user will have to verify his token again before
    // they can choose a new password.

    return response.ok();
});

/**
 * ## POST /api/users/:userId/password
 *
 * Resets the user's password to the value they choose. For security purposes, the user
 * must be aware of the email verification token associated with the user account.
 *
 * Request Body
 * > **token** - The email verification token
 * > **password** - The cleartext password he would like to use
 *
 * Responses
 * > **200** - The token has been verified and the user's email account has been updated
 *   to verified status.
 * > **404** - The token was not found and it probably expired. User waited 3 days
 *   between verifying their email and selecting their password.
 *
 */
app.post( '/:userId/password', function( req, userId ) {
    // No security check on this one
    var tokenId = req.params.token;
    var password = req.params.password;

    if (!tokenId) throw { status: 400,
        message: 'No tokenId parameter present'
    };
    if (!password) throw { status: 400,
        message: 'No password parameter present'
    };

    // We will need to load the token for verification purposes
    var token = tokens.read( tokenId );
    log.info( 'http handler, token: ', JSON.stringify( token ) );

    // todo: delete the json (used for debugging)
    if (!token) return response.notFound().json({
        status: 404,
        message: 'Token ' + tokenId + ' not found'
    });

    // The token was found, but is it for the same user?
    // todo: delete the json (used for debugging)
    if (token.user.userId !== userId) return response.notFound().json({
        status: 404,
        message: 'User ' + userId + ' did not match token ' + token.user.userId
    });

    // If all matchy-matchy then we can update the users password.
    var user = users.update( {
        userId: token.user.userId,
        password: req.params.password
    });

    // We can delete the token now as it is no longer needed
    tokens.del( token );

//    emailService.sendWelcomeEmail( user );

    return response.ok().json( {
        email: user.email.address
    } );
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
        userId: user.userId,
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



/* ******************************************************** */
/* JOBS                                                     */
/* ******************************************************** */


app.get( '/:userId/jobs', function ( req ) {
    java.lang.Thread.sleep( 5000 );
    return response.json( {
        success: true
    } );
} );

/**
 * ## POST /api/jobs/submit
 *
 * ### Body
 * The POST body will contain a JSON object representing the job to submit
 * ```js
 *  {
 *      "jobId": "1434",
 *      "source": {
 *          "service": "flickr",
 *          "auth": {
 *              "username": "jcook@gmail.com",
 *              "accessToken": "access_jsd8as32h373fhasa8",
 *              "refreshToken": "refresh_is812nms0an38dbcuz73"
 *          }
 *      },
 *      "destination": {
 *          "service": "picasa",
 *          "auth": {
 *              "username": "jcook@gmail.com",
 *              "accessToken": "access_jsd8as32h373fhasa8",
 *              "refreshToken": "refresh_is812nms0an38dbcuz73"
 *          }
 *      },
 *      "content": [
 *          "media"
 *      ],
 *      "action": {},
 *      "status": {
 *          "completion": 0,
 *          "state": "pending"
 *      }
 * }
 * ```
 *
 * This API call is different from a straight create job request (which is
 * `POST /api/jobs/`. The submission of the job must perform several checks and the
 * response will be dependent upon the state of several factors on the server. Here is a
 * summary of the checks that take place:
 *
 * 1. The user must be authenticated. This API call is allowed to be submitted by an
 *    unauthenticated user. Upon such a condition, we will not throw the standard 401.
 *    Instead, we will return a 200 json response indicating that authentication is
 *    needed. This will allow the client to invoke its own specialized UI used on the
 *    jobs page to allow the user to sign in or sign up.
 * 2. Check for the invoices for this destination account and user id. There are a few
 *    possible scenarios as a result of this check:
 *     1. An open invoice located.
 *         1. If there is a running job with the same source account and an overlap in
 *            content types, a response is returned to let the user know of this fact,
 *            and the job cannot be submitted as-is.
 *         2. If the running jobs do not overlap with this run, we will add it to the
 *            invoice and **submit it** to workflow.
 *     2. No open invoice was located.
 *         1. If there are no running jobs for this destination, we check the invoices to
 *            see if a test run has been submitted for this destination account. If it
 *            has and it was successful, we will add this information to the response.
 *         2. We will send the client a response indicating a need for payment. If their
 *            source account is an .edu domain we will indicate a price of $5, otherwise
 *            the price is $15.
 */
app.post( '/:userId/jobs/preauth', function ( req, userId ) {
    req.allow(
        req.hasRole( 'ROLE_ADMIN' ) || req.hasRole( 'ROLE_USER' ) && req.isUser( userId )
    );

    if (!req.params) throw {
        status: 400,
        message: 'A job is required in the post body'
    };

    var job = new domain.Job(req.params);
    log.info( 'Job:', JSON.stringify( job ) );
    var result = invoices.preauthorize( userId, job );

    log.info( 'Result of preauth: {}', JSON.stringify( result ) );
    return response.json( result );
} );


app.post( '/:userId/jobs/submit', function ( req, userId ) {
    req.allow(
        req.hasRole( 'ROLE_ADMIN' ) || req.hasRole( 'ROLE_USER' ) && req.isUser( userId )
    );

    if (!req.params) throw {
        status: 400,
        message: 'A payload is required in the post body'
    };

    var payload = req.params;

    var job = new domain.Job( payload.job );

    // Make sure the job can still be submitted
    var preauth = invoices.preauthorize( userId, job );
    if (!preauth.ok) {
        return response.json( preauth );
    }

    // If we are ok, then pre-process the job.
    var preparedJob = prepareJob( req.getUsername(), job, payload.payment );

    // Submit the job to the workflow engine for processing
    var activeJob = submitJob( preparedJob );

    return response.json( activeJob.toJSON() );
} );


function submitJob( job ) {

}

/**
 * The processing of a job will involve a few steps.
 *
 * 1. Create a customer record for the user if they do not yet have one.
 * 2. Bill the user's credit card.
 * 3. Lookup an open invoice or create a new one.
 * 4. Append the job and the payment info to the invoice record.
 *
 */
function prepareJob( userId, job, payment ) {

}
