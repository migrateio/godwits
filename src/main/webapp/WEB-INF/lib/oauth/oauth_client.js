/**
 * @fileOverview CommonJS module for implementing the client side of the OAuth protocol
 * with a focus on authorization for making subsequent API calls against a server's REST api.
 *     1) Implement the OAuth protocol to retrieve a token from a server to authorize the
 *     access to an API on behalf of the current user.
 *     2) Perform calls to a Web services API using a token previously obtained using this
 *     class or a token provided some other way by the Web services provider.
 *
 * @version 0.1.0
 * @license BSD
 * The original version of this library was written for PHP by Manuel Lemos
 * http://www.phpclasses.org/package/7700-PHP-Authorize-and-access-APIs-using-OAuth.html
 *
 * Regardless of your purposes, you always need to start calling the class initialize
 * function after initializing setup variables. After you are done with the class, always
 * call the Finalize function at the end.
 *
 * This class supports either OAuth protocol versions 1.0, 1.0a and 2.0. It abstracts the
 * differences between these protocol versions, so the class usage is the same independently
 * of the OAuth version of the server.
 * The class also provides built-in support to several popular OAuth servers, so you do not
 * have to manually configure all the details to access those servers. Just set the server
 * variable to configure the class to access one of the built-in supported servers. If you
 * need to access one type of server that is not yet directly supported by the class, you
 * need to configure it explicitly setting the variables:
 *     oauth_version
 *     url_parameters
 *     authorization_header
 *     request_token_url
 *     dialog_url
 *     offline_dialog_url
 *     append_state_to_redirect_uri
 *     access_token_url
 *
 * Before proceeding to the actual OAuth authorization process, you need to have registered
 * your application with the OAuth server. The registration provides you values to set the
 * variables:
 *     client_id
 *     client_secret
 *
 * You also need to set the variables:
 *     redirect_uri
 *     scope
 *
 * before calling the process function to make the class perform the necessary interactions
 * with the OAuth server.
 *
 * The OAuth protocol involves multiple steps that include redirection to the OAuth server.
 * There it asks permission to the current user to grant your application access to APIs on
 * his/her behalf. When there is a redirection, the class will set the exit variable to 1.
 * Then your script should exit immediately without outputting anything.
 *
 * When the OAuth access token is successfully obtained, the following variables are set by
 * the class with the obtained values:
 *     access_token
 *     access_token_secret
 *     access_token_expiry
 *     access_token_type.
 *
 * You may want to store these values to use them later when calling the server APIs. If there
 * was a problem during OAuth authorization process, check the variable:
 *     authorization_error
 * to determine the reason.
 *
 * Once you get the access token, you can call the server APIs using the CallAPI function. Check
 * the access_token_error variable to determine if there was an error when trying to to call the
 * API.
 *
 * If for some reason the user has revoked the access to your application, you need to ask the
 * user to authorize your application again. First you may need to call the function ResetAccessToken
 * to reset the value of the access token that may be cached in session variables.
 *
 * We have to spend a bit of time to determine how this class is wired in to the typical web
 * application. It was developed for a web application that did not want to use third-party oauth
 * for only signon purposes. The application needs access to a user's emails, contacts and documents,
 * so oauth is a means to an access token. Even more to the point, the application may need separate
 * access tokens for two separate google accounts from a user. So the caching of tokens that is so
 * desireable during sign on is definitely not wanted here.
 *
 * This wouldn't be so bad, but there is a UI aspect to
 * obtaining access tokens. Namely, the user must give permission via a signin window that we have
 * to initiate, but do not control.
 *
 * From the UI perspective, the user and server will have to perform these steps.
 *
 * U1: Select a service provider (ie google, yahoo, microsoft, etc from a list.
 * U2. Make a call to the server verifying access to the service provider.
 *     //server/api/oauth/google
 * S1.
 *
 * S2. Server tests the existing token. If it is no longer valid it is discarded.
 * S3. If no valid token is found, the server can send back the url to begin the
 *     registration process.
 * U3. Client app recognizes the url and pops up a new window targeted at the url.
 * U4. User gives permission
 * P1. The provider acknowledges the user's desire to allow access to the app and
 *     sends a token to a url that the server is listening on.
 * S4. The server accepts the token and sends a request to the server for an access
 *     token so that the app may make future API calls against the user's data.
 * S5. When the server goes to make an API call, the access token may have expired.
 * S6. A new token must be fetched when an expired token is found.
 * U5. The user may revoke our access to their data, perhaps right in the middle
 *     of a process when we need it. Too bad for us.
 *
 */

'use strict';

var log = require( 'ringo/logging' ).getLogger( module.id );

var {Application} = require( 'stick' );
var app = exports.app = Application();
app.configure( 'error', 'notfound', 'params', 'mount', 'route' );

var {json, html, redirect} = require( 'ringo/jsgi/response' );
var {uuid} = require( 'utility' );
var httpClient = require( 'ringo/httpclient' );
//var httpClient = require( 'httpclient-jetty' );

//var oauthClient = module.singleton( 'oauthclient', function () {
var oauthClient = (function () {
    var clientData = {
        google : {
            clientId : '499071365392.apps.googleusercontent.com',
            clientSecret : 'LrtzVHRI3Finz_jhBZnopeRK'
        },
        microsoft : {
            clientId : '00000000440EC5A2',
            clientSecret : '-D9iQh1DutPDGdYw5G7hLEZyaP2jlhZQ'
        },
        github : {
            clientId : 'e74f3138147e13e6583a',
            clientSecret : 'bb82324a0768272d69d54633ae74ede51860c1a2'
        },
        linkedin : {
            clientId : 'mx2magtcd4my',
            clientSecret : 'JX7xjqrzQi9t58oa'
        },
        yahoo : {
            clientId : 'dj0yJmk9Rm1NcktNdkdLeHRrJmQ9WVdrOWNYTXphWGQ1TjJjbWNHbzlNamd6TWpNNE1qWXkmcz1jb25zdW1lcnNlY3JldCZ4PWU5',
            clientSecret : '06101f8b10b2d2d679eaff266506c3880620c25b'
        }
    };

    return new OAuthClient( clientData );
})();

var redirectUrl = 'http://cpe-71-67-162-170.insight.res.rr.com:8080/mio/api/oauth/callback/';
//var redirectUrl = 'http://cpe-71-67-162-170.insight.res.rr.com:8080/migrate/api/oauth/callback/';


/**
 * Request to authorize access to the given service for the current user.
 */
app.get( '/:uid/:service', generateDialogUrl );

app.get( '/users/:uid', function ( req, uid ) {
    for ( var i = 0; i < users[uid].oauth.length; i++ ) {
        if ( typeof users[uid].oauth[i].params.state === 'string' ) {
            users[uid].oauth[i].params.state = JSON.parse( users[uid].oauth[i].params.state );
        }
    }
    return html( "<pre>" + JSON.stringify( users[uid], null, 4 ) + "</pre>" );
} );

app.get( '/refreshToken/:uid', function ( req, uid ) {

    for ( var i = 0; i < users[uid].oauth.length; i++ ) {
        if ( typeof users[uid].oauth[i].params.state === 'string' ) {
            users[uid].oauth[i].params.state = JSON.parse( users[uid].oauth[i].params.state );
        }
    }

    var user = users[uid];

    var refreshToken = user.oauth[0].access.refresh_token;

    var access = oauthClient.refreshAccessToken( 'google', refreshToken );

    user.oauth[0].access.access_token = access.access_token;

    return json( access );
} );

app.get( '/callback', handleOAuthCallback );
app.post( '/callback', handleOAuthCallback );


var users = module.singleton( 'mio_users', function () {
    return [];
} );

/**
 * Get the state from the request. For most services this comes back as
 * params.state and params.code holds the temporary access code. If denied
 * the result may come back with params.error = 'access_denied'.
 *
 * Somewhat ironically, we are not exactly sure of the service that has
 * invoked this callback. We only have the state object that was passed into
 * the original request, so the state property includes the service name.
 *
 * @param req
 * @return {*}
 */
function handleOAuthCallback( req ) {
    var authCode = req.params.code;
    var state = JSON.parse( req.params.state || '{}' );

    var access = oauthClient.getAccessToken( state.service, authCode, redirectUrl );

    log.info( 'handleOAuthCallback::Access token: {}', JSON.stringify( access, null, 4 ) );

    var data = {params : req.params, access : access};

    Array.isArray( users[state.uid].oauth ) ? users[state.uid].oauth.push( data ) : users[state.uid].oauth = [data];

    return redirect( 'http://cpe-71-67-162-170.insight.res.rr.com:8080/mio/#/' + state.uid );
}

function generateDialogUrl( req, uid, service ) {
    log.info( '5generateDialogUrl::uid: {}, service: {}', uid, service );
    var scope = 'calendar-r, docs-rw, media-rw, contacts-rw';

    if ( !users[uid] ) {
        users[uid] = {
            uid : uid,
            email : ''
        };
    }

    var state = JSON.stringify( {service : service, uid : uid} );
    var url = oauthClient.getDialogUrl( service, state, scope, redirectUrl, true );

    return json( {
        service : service,
        url : url
    } );
}


/**
 * OAuth client class which will authenticate a user with an OAuth server.
 *
 * The parameter can be a string value of a pre-defined server, or an object containing
 * properties that describe an OAuth server.
 *
 * If server is a string value, it represents one of the predefined OAuth servers:
 * <ul><li>bitbucket</li>
 * <li>box</li>
 * <li>dropbox</li>
 * <li>eventful</li>
 * <li>facebook</li>
 * <li>fitbit</li>
 * <li>flickr</li>
 * <li>foursquare</li>
 * <li>github</li>
 * <li>google</li>
 * <li>instagram</li>
 * <li>linkedin</li>
 * <li>microsoft</li>
 * <li>scoopit</li>
 * <li>stocktwits</li>
 * <li>tumblr</li>
 * <li>twitter</li>
 * <li>xing</li>
 * <li>yahoo</li></ul>
 *
 * Otherwise, the caller will pass in an object containing the following parameters to define
 * the OAuth server:
 * {
 *     requestTokenUrl: '',  // URL of the OAuth server to request the initial token for OAuth 1.0 and 1.0a servers.
 *                           // Set this variable to the OAuth request token URL when you are not accessing one of
 *                           // the built-in supported OAuth servers. For OAuth 1.0 and 1.0a servers, the request
 *                           // token URL can have certain marks that will act as template placeholders which will
 *                           // be replaced with given values before requesting the authorization token. Currently it
 *                           // supports the following placeholder marks:
 *                           // {scope} - scope of the requested permissions to the granted by the OAuth server with
 *                           // the user permissions
 *     dialogUrl: '',        // URL of the OAuth server to redirect the browser so the user can grant access to your
 *                           // application. Set this variable to the OAuth request token URL when you are not
 *                           // accessing one of the built-in supported OAuth servers. For certain servers, the dialog
 *                           // URL can have certain marks that will act as template placeholders which will be
 *                           // replaced with values defined before redirecting the users browser. Currently it supports
 *                           // the following placeholder marks:
 *                           // redirectUri - URL to redirect when returning from the OAuth server authorization page
 *                           // {clientId} - client application identifier registered at the server
 *                           // {scope} - scope of the requested permissions to the granted by the OAuth server with the
 *                           // user permissions
 *                           // {state} - identifier of the OAuth session state
 *     offlineDialogUrl: '', // URL of the OAuth server to redirect the browser so the user can grant access to your
 *                           // application when offline access is requested. Set this variable to the OAuth request token
 *                           // URL when you are not accessing one of the built-in supported OAuth servers and the OAuth
 *                           // server supports offline access. It should have the same format as the dialogUrl variable.
 *     appendStateToRedirectUri: '',
 *                           // Pass the OAuth session state in a variable with a different name to work around
 *                           // implementation bugs of certain OAuth servers.
 *                           // Set this variable when you are not accessing one of the built-in supported OAuth servers
 *                           // if the OAuth server has a bug that makes it not pass back the OAuth state identifier in a
 *                           // request variable named state.
 *      accessTokenUrl: '',  // OAuth server URL that will return the access token URL.
 *                           // Set this variable to the OAuth access token URL when you are not accessing one of the
 *                           // built-in supported OAuth servers.
 *      oauthVersion: '',    // Version of the protocol version supported by the OAuth server.
 *                           // Set this variable to the OAuth server protocol version when you are not accessing one
 *                           // of the built-in supported OAuth servers.
 *      urlParameters: false,// Determine if the API call parameters should be moved to the call URL.
 *                           // Set this variable to true if the API you need to call requires that the call parameters
 *                           // always be passed via the API URL.
 *      authorizationHeader: true,
 *                           // Determine if the OAuth parameters should be passed via HTTP Authorization request header.
 *                           // Set this variable to true if the OAuth server requires that the OAuth parameters be
 *                           // passed using the HTTP Authorization instead of the request URI parameters.
 *      tokenRequestMethod: 'GET',
 *                           // Define the HTTP method that should be used to request tokens from the server.
 *                           // Set this variable to POST if the OAuth server does not support requesting tokens
 *                           // using the HTTP GET method.
 *      signatureMethod: 'HMAC-SHA1',
 *                           // Define the method to generate the signature for API request parameters values.
 *                           // Currently it supports PLAINTEXT and HMAC-SHA1.
 *      redirectUri: '',     // URL of the current script page that is calling this class.
 *                           // Set this variable to the current script page URL before proceeding the the OAuth
 *                           // authorization process.
 *      clientId: '',        // Identifier of your application registered with the OAuth server.
 *                           // Set this variable to the application identifier that is provided by the OAuth server
 *                           // when you register the application.
 *      clientSecret: '',    // Secret value assigned to your application when it is registered with the OAuth server.
 *                           // Set this variable to the application secret that is provided by the OAuth server when
 *                           // you register the application.
 *      scope: '',           // Permissions that your application needs to call the OAuth server APIs.
 *                           // Check the documentation of the APIs that your application needs to call to set this
 *                           // variable with the identifiers of the permissions that the user needs to grant to
 *                           // your application.
 *      offline: false,      // Specify whether it will be necessary to call the API when the user is not present and
 *                           // the server supports renewing expired access tokens using refresh tokens.
 *                           // Set this variable to true if the server supports renewing expired tokens automatically
 *                           // when the user is not present.
 * }
 *
 * @param server
 * @constructor
 */
function OAuthClient( clientData ) {

    /**
     * Access token obtained from the OAuth server.
     *
     * Check this variable to get the obtained access token upon successful OAuth authorization.
     *
     * @type {String}
     */
    var accessToken = '';

    /**
     * Access token secret obtained from the OAuth server.
     *
     * If the OAuth protocol version is 1.0 or 1.0a, check this variable to get the obtained
     * access token secret upon successful OAuth authorization.
     *
     * @type {String}
     */
    var accessTokenSecret = '';

    /**
     * Timestamp of the expiry of the access token obtained from the OAuth server.
     *
     * Check this variable to get the obtained access token expiry time upon successful
     * OAuth authorization. If this variable is empty, that means no expiry time was set.
     *
     * @type {String}
     */
    var accessTokenExpiry = '';

    /**
     * Type of access token obtained from the OAuth server.
     *
     * Check this variable to get the obtained access token type upon successful OAuth
     * authorization.
     *
     * @type {String}
     */
    var accessTokenType = '';

    /**
     * Refresh token obtained from the OAuth server.
     *
     * Check this variable to get the obtained refresh token upon successful OAuth
     * authorization.
     *
     * @type {String}
     */
    var refreshToken = '';

    /**
     * Error message returned when a call to the API fails.
     *
     * Check this variable to determine if there was an error while calling the Web
     * services API when using the CallAPI function.
     *
     * @type {String}
     */
    var accessTokenError = '';

    /**
     * Error message returned when it was not possible to obtain an OAuth access token.
     *
     * Check this variable to determine if there was an error while trying to obtain
     * the OAuth access token.
     *
     * @type {String}
     */
    var authorizationError = '';


    /**
     * Default values for a service definition
     * @type {Object}
     */
    var serviceDefDefaults = {
        requestTokenUrl : '',
        appendStateToRedirectUri : '',
        authorizationHeader : true,
        urlParameters : false,
        tokenRequestMethod : 'GET',
        signatureMethod : 'HMAC-SHA1'
    };

    /**
     * Every service will have different keys to identify scope (access permissions) for
     * their service. We have standardized the list of scopes for our domain and the service
     * definition has a structure that will be used to translate our scopes to the
     * service-specific values.
     *
     * @param {Object} serviceDef
     * @param {String|Array} scope
     */
    function translateScope( serviceDef, scope ) {
        // Convert scope to an array of clean values (removing dupes, nulls and empty)
        if ( typeof scope === 'string' ) scope = scope.split( /, / );

        var removeEmptyAndDupes = function ( value, pos, self ) {
            return !!value && self.indexOf( value ) === pos;
        };
        scope = scope.filter( removeEmptyAndDupes );

        // Create a mirror array of values looked up in the service-specific scopes
        var xlate = serviceDef.scopeTranslation || {};
        var xScope = [];
        scope.forEach( function ( scope ) {
            xScope = xScope.concat( (xlate[scope] || '').split( ' ' ) );
        } );
        xScope = xScope.filter( removeEmptyAndDupes );

        return xScope.join( serviceDef.scopeJoinChar );
    }

    /**
     * Given a service name, it will look up the pre-configured definition of a service and combine it
     * with the api key and api secret information provided by the constructor. If the service parameter
     * is an object, it will be a fully formed definition of a service (including the api key and secret).
     *
     * @param {String|Object} service The name or definition of a service
     * @return {Object} The full definition of the service
     */
    function getServiceDefinition( service ) {
        var serviceDef;

        // If service type is string, use a lookup to fill out the service definition with parameters
        // specific to the chosen service.
        if ( typeof service === 'string' ) {
            var services = OAuthClient.prototype.services;
            serviceDef = services[service];
            if ( !serviceDef ) {
                var builtIns = Object.keys( services ).join( ', ' );
                throw 'Service name ' + service + ' is not found in built-in list: ' + builtIns;
            }
            extend( serviceDef, clientData[service] || {} );
        } else serviceDef = service;

        return extend( {}, serviceDefDefaults, serviceDef );
    }

    /**
     *
     * @param {String|Object} service
     * @param {String} state Unique identifier of this transaction.
     * @param {String|Array} scope
     * @param {String} redirectUrl The redirect path after a successful auth
     * @param {Boolean} [offline] If true, uses the authorization type that can refresh an
     *                            access key without user interaction.
     * @return {String} The URL the client can invoke to begin the oauth authorization process
     */
    function getDialogUrl( service, state, scope, redirectUrl, offline ) {
        var serviceDef = getServiceDefinition( service );

        if ( serviceDef.oauthVersion === '1.0a' )
            return getDialogUrlOneOA( serviceDef, state, scope, redirectUrl, offline );

        var url = offline ? serviceDef.offlineDialogUrl || serviceDef.dialogUrl : serviceDef.dialogUrl;

        // The dialog url may have several values that can be substituted for these values
        var opts = {
            clientId : serviceDef.clientId,
            redirectUri : redirectUrl || '',
            scope : translateScope( serviceDef, scope ),
            state : state
        };

        Object.keys( opts ).forEach( function ( key ) {
            var subst = '{' + key + '}';
            url = url.replace( subst, encodeURIComponent( opts[key] ) );
        } );

        return url;
    }

    /**
     * Yahoo Example: http://developer.yahoo.com/oauth/guide/oauth-requesttoken.html
     *
     * Notes: Yahoo defines your application's permissions (state) on their server when
     *        you apply for an application. Basically, the state parameter is hardcoded.
     *        Not sure if all OAuth 1.0a providers do this or not.
     *
     * @param {Object} serviceDef
     * @param {String} state Unique identifier of this transaction.
     * @param {String|Array} scope
     * @param {String} redirectUrl The redirect path after a successful auth
     * @param {Boolean} [offline] If true, uses the authorization type that can refresh an
     *                            access key without user interaction.
     * @return {String} The URL the client can invoke to begin the oauth authorization process
     */
    function getDialogUrlOneOA( serviceDef, state, scope, redirectUrl, offline ) {
        // Request a request token from the OAuth server
        var params = [];
        params.push( 'oauth_nonce=' + encodeURIComponent( uuid() ) );
        params.push( 'oauth_consumer_key=' + encodeURIComponent( serviceDef.clientId ) );
        params.push( 'oauth_signature_method=' + encodeURIComponent( 'plaintext' ) );
        params.push( 'oauth_signature=' + encodeURIComponent( serviceDef.clientSecret ) + '\%26' );
        params.push( 'oauth_timestamp=' + encodeURIComponent( new Date().getTime() ) );
        params.push( 'oauth_version=' + encodeURIComponent( '1.0' ) );
        params.push( 'oauth_callback=' + encodeURIComponent( redirectUrl ) );

        var url = serviceDef.requestTokenUrl + '?' + params.join( '&' );

        var aopts = {
            url : url,
            method : 'GET'
        };
        log.info( 'getDialogUrlOneOA::Making request: {}', JSON.stringify( opts, null, 4 ) );
        var exchange = httpClient.request( opts );

        log.info( 'getDialogUrlOneOA::Status: {}, Response: {}', exchange.status, exchange.content );

        // If successful, we have the next piece of the puzzle; the url and a request token
        if ( exchange.status === 200 ) {
            // The content is in a url query string format. Convert to a json object.
            var result = {};
            decodeURIComponent( exchange.content ).split( '&' ).forEach( function ( keyval ) {
                var parts = keyval.split( '=' );
                result[parts[0]] = parts[1];
            } );
            log.info( 'getDialogUrlOneOA::Result: {}', JSON.stringify( result, null, 4 ) );

            // The login url
            return serviceDef.dialogUrl + '?oauth_token=' + result.oauth_token;
        }

        throw 'Failed to obtain a request token from service ' + url;
    }

    /**
     * Exchange the auth code for an access token.
     *
     * @param service
     * @param authCode
     */
    function getAccessToken( service, authCode, redirectUri ) {
        var serviceDef = getServiceDefinition( service );

        var opts = {
            url : serviceDef.accessTokenUrl,
            method : serviceDef.tokenRequestMethod,
            data : {
                code : authCode,
                client_id : serviceDef.clientId,
                client_secret : serviceDef.clientSecret,
                redirect_uri : redirectUri,
                grant_type : 'authorization_code',
                headers : {
                    'user-agent' : 'CommonJS OAuth Library'
                }
            },
            contentType : 'application/x-www-form-urlencoded',
            async : false
        };
        log.info( 'Making request: {}', JSON.stringify( opts, null, 4 ) );
        var exchange = httpClient.request( opts );

        if ( exchange.status === 200 ) {
            log.info( 'Response: {}', exchange.content );
            return JSON.parse( exchange.content );
        }

        return null;
    }

    function refreshAccessToken( service, refreshToken ) {
        var serviceDef = getServiceDefinition( service );

        var opts = {
            url : serviceDef.accessTokenUrl,
            method : serviceDef.tokenRequestMethod,
            data : {
                refresh_token : refreshToken,
                client_id : serviceDef.clientId,
                client_secret : serviceDef.clientSecret,
                grant_type : 'refresh_token',
                headers : {
                    'user-agent' : 'CommonJS OAuth Library'
                }
            },
            contentType : 'application/x-www-form-urlencoded',
            async : false
        };
        log.info( 'Making request: {}', JSON.stringify( opts, null, 4 ) );
        var exchange = httpClient.request( opts );

        if ( exchange.status === 200 ) {
            log.info( 'Response: {}', exchange.content );
            return JSON.parse( exchange.content );
        } else {
            log.error( 'Response: {}', exchange.content );
        }

        return null;
    }

    return {
        getDialogUrl : getDialogUrl,
        getAccessToken : getAccessToken,
        refreshAccessToken : refreshAccessToken
    }
}


OAuthClient.prototype.services = {
    bitbucket : {
        oauthVersion : '1.0a',
        requestTokenUrl : 'https://bitbucket.org/!api/1.0/oauth/request_token',
        dialogUrl : 'https://bitbucket.org/!api/1.0/oauth/authenticate',
        accessTokenUrl : 'https://bitbucket.org/!api/1.0/oauth/access_token',
        urlParameters : true
    },
    box : {
        oauthVersion : '2.0',
        dialogUrl : 'https://www.box.com/api/oauth2/authorize?response_type=code&client_id={clientId}&redirect_uri={redirectUri}&state={state}',
        offlineDialogUrl : 'https://www.box.com/api/oauth2/authorize?response_type=code&client_id={clientId}&redirect_uri={redirectUri}&state={state}&access_type=offline&approval_prompt=force',
        accessTokenUrl : 'https://www.box.com/api/oauth2/token'
    },
    dropbox : {
        oauthVersion : '1.0',
        requestTokenUrl : 'https://api.dropbox.com/1/oauth/request_token',
        dialogUrl : 'https://www.dropbox.com/1/oauth/authorize',
        accessTokenUrl : 'https://api.dropbox.com/1/oauth/access_token',
        authorizationHeader : false
    },
    eventful : {
        oauthVersion : '1.0a',
        requestTokenUrl : 'http://eventful.com/oauth/request_token',
        dialogUrl : 'http://eventful.com/oauth/authorize',
        accessTokenUrl : 'http://eventful.com/oauth/access_token',
        authorizationHeader : false,
        urlParameters : true,
        tokenRequestMethod : 'POST'
    },
    evernote : {
        oauthVersion : '1.0a',
        requestTokenUrl : 'https://sandbox.evernote.com/oauth',
        dialogUrl : 'https://sandbox.evernote.com/OAuth.action',
        accessTokenUrl : 'https://sandbox.evernote.com/oauth',
        urlParameters : true,
        authorizationHeader : false
    },
    facebook : {
        oauthVersion : '2.0',
        dialogUrl : 'https://www.facebook.com/dialog/oauth?client_id={clientId}&redirect_uri={redirectUri}&scope={scope}&state={state}',
        accessTokenUrl : 'https://graph.facebook.com/oauth/access_token'
    },
    fitbit : {
        oauthVersion : '1.0a',
        requestTokenUrl : 'http://api.fitbit.com/oauth/request_token',
        dialogUrl : 'http://api.fitbit.com/oauth/authorize',
        accessTokenUrl : 'http://api.fitbit.com/oauth/access_token'
    },
    flickr : {
        oauthVersion : '1.0a',
        requestTokenUrl : 'http://www.flickr.com/services/oauth/request_token',
        dialogUrl : 'http://www.flickr.com/services/oauth/authorize?perms={scope}',
        accessTokenUrl : 'http://www.flickr.com/services/oauth/access_token',
        authorizationHeader : false
    },
    foursquare : {
        oauthVersion : '2.0',
        dialogUrl : 'https://foursquare.com/oauth2/authorize?client_id={clientId}&scope={scope}&response_type=code&redirect_uri={redirectUri}&state={state}',
        accessTokenUrl : 'https://foursquare.com/oauth2/access_token'
    },
    github : {
        oauthVersion : '2.0',
        dialogUrl : function ( data ) {
            var params = [];
            if ( data.clientId ) params.push( 'client_id=' + encodeURIComponent( data.clientId ) );
            if ( data.redirectUri ) params.push( 'redirect_uri=' + encodeURIComponent( data.redirectUri ) );
            if ( data.scope ) params.push( 'scope=' + encodeURIComponent( data.scope ) );
            if ( data.state ) params.push( 'state=' + encodeURIComponent( data.state ) );
            var url = 'https://github.com/login/oauth/authorize';
            if ( params.length > 0 ) url = url + '?' + params.join( '&' );
            return url;
        },
        accessTokenUrl : 'https://github.com/login/oauth/access_token'
    },
    google : {
        oauthVersion : '2.0',
        dialogUrl : 'https://accounts.google.com/o/oauth2/auth?response_type=code&client_id={clientId}&redirect_uri={redirectUri}&scope={scope}&state={state}',
        offlineDialogUrl : 'https://accounts.google.com/o/oauth2/auth?response_type=code&client_id={clientId}&redirect_uri={redirectUri}&scope={scope}&state={state}&access_type=offline&approval_prompt=force',
        accessTokenUrl : 'https://accounts.google.com/o/oauth2/token',
        tokenRequestMethod : 'POST',
        scopeJoinChar : ' ',
        scopeTranslation : {
            'calendar-r' : 'http://www.google.com/calendar/feeds/',
            'calendar-rw' : 'http://www.google.com/calendar/feeds/',
            'contacts-r' : 'http://www.google.com/m8/feeds/',
            'contacts-rw' : 'http://www.google.com/m8/feeds/',
            'docs-r' : 'http://docs.google.com/feeds/ http://spreadsheets.google.com/feeds/',
            'docs-rw' : 'http://docs.google.com/feeds/ http://spreadsheets.google.com/feeds/',
            'mail-r' : 'http://mail.google.com/mail/feed/atom/',
            'mail-rw' : 'http://mail.google.com/mail/feed/atom/',
            'media-r' : 'http://picasaweb.google.com/data/',
            'media-rw' : 'http://picasaweb.google.com/data/'
        }
    },
    instagram : {
        oauthVersion : '2.0',
        dialogUrl : 'https://api.instagram.com/oauth/authorize/?client_id={clientId}&redirect_uri={redirectUri}&scope={scope}&response_type=code&state={state}',
        accessTokenUrl : 'https://api.instagram.com/oauth/access_token'
    },
    linkedin : {
        oauthVersion : '2.0',
        dialogUrl : 'https://www.linkedin.com/uas/oauth2/authorization?response_type=code&client_id={clientId}&scope={scope}&state={state}&redirect_uri={redirectUri}',
        accessTokenUrl : 'https://www.linkedin.com/uas/oauth2/accessToken?grant_type=authorization_code',
        scopeJoinChar : ',',
        scopeTranslation : {
            'contacts-r' : 'r_network',
            'contacts-rw' : '',
            'docs-r' : '',
            'docs-rw' : '',
            'mail-r' : '',
            'mail-rw' : '',
            'media-r' : '',
            'media-rw' : ''
        }
    },
    microsoft : {
        oauthVersion : '2.0',
        dialogUrl : 'https://login.live.com/oauth20_authorize.srf?client_id={clientId}&scope={scope}&response_type=code&redirect_uri={redirectUri}&state={state}',
        accessTokenUrl : 'https://login.live.com/oauth20_token.srf',
        scopeJoinChar : ',',
        scopeTranslation : {
            'calendar-r' : 'wl.offline_access wl.calendars',
            'calendar-rw' : 'wl.offline_access wl.calendars_update',
            'contacts-r' : 'wl.offline_access wl.contacts_calendars',
            'contacts-rw' : 'wl.offline_access wl.contacts_create',
            'docs-r' : 'wl.offline_access  wl.contacts_skydrive',
            'docs-rw' : 'wl.offline_access  wl.skydrive_update',
            'mail-r' : '',
            'mail-rw' : '',
            'media-r' : 'wl.offline_access wl.contacts_photos',
            'media-rw' : 'wl.offline_access wl.skydrive_update'
        }
    },
    rightsignature : {
        oauthVersion : '1.0a',
        requestTokenUrl : 'https://rightsignature.com/oauth/request_token',
        dialogUrl : 'https://rightsignature.com/oauth/authorize',
        accessTokenUrl : 'https://rightsignature.com/oauth/access_token',
        authorizationHeader : false
    },
    scoopit : {
        oauthVersion : '1.0a',
        requestTokenUrl : 'https://www.scoop.it/oauth/request',
        dialogUrl : 'https://www.scoop.it/oauth/authorize',
        accessTokenUrl : 'https://www.scoop.it/oauth/access',
        authorizationHeader : false
    },
    stocktwits : {
        oauthVersion : '2.0',
        dialogUrl : 'https://api.stocktwits.com/api/2/oauth/authorize?client_id={clientId}&response_type=code&redirect_uri={redirectUri}&scope={scope}&state={state}',
        accessTokenUrl : 'https://api.stocktwits.com/api/2/oauth/token'
    },
    tumblr : {
        oauthVersion : '1.0a',
        requestTokenUrl : 'http://www.tumblr.com/oauth/request_token',
        dialogUrl : 'http://www.tumblr.com/oauth/authorize',
        accessTokenUrl : 'http://www.tumblr.com/oauth/access_token'
    },
    twitter : {
        oauthVersion : '1.0a',
        requestTokenUrl : 'https://api.twitter.com/oauth/request_token',
        dialogUrl : 'https://api.twitter.com/oauth/authenticate',
        accessTokenUrl : 'https://api.twitter.com/oauth/access_token',
        urlParameters : true
    },
    xing : {
        oauthVersion : '1.0a',
        requestTokenUrl : 'https://api.xing.com/v1/request_token',
        dialogUrl : 'https://api.xing.com/v1/authorize',
        accessTokenUrl : 'https://api.xing.com/v1/access_token',
        authorizationHeader : false
    },
    yahoo : {
        oauthVersion : '1.0a',
        requestTokenUrl : 'https://api.login.yahoo.com/oauth/v2/get_request_token',
        dialogUrl : 'https://api.login.yahoo.com/oauth/v2/request_auth',
        accessTokenUrl : 'https://api.login.yahoo.com/oauth/v2/get_token',
        authorizationHeader : false
    }
};

/**
 * Date comes in as an ISO8601 format. Compare it to now and return true if the
 * date passed in is less than the current date/time.
 *
 * @param isodate
 * @return {Boolean}
 */
function isExpired( isodate ) {
    return false;
}

function extend() {
    for ( var i = 1; i < arguments.length; i++ )
        for ( var key in arguments[i] )
            if ( arguments[i].hasOwnProperty( key ) )
                arguments[0][key] = arguments[i][key];
    return arguments[0];
}

function main() {
    var client = new OAuthClient( 'google' );
}

if ( require.main === module ) {
    main();
}