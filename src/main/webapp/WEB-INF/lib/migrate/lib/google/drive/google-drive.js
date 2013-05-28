'use strict';

var log = require( 'ringo/logging' ).getLogger( module.id );
var httpClient = require( 'ringo/httpclient' );

/**
 * credentials = {
 *      access_key
 *      refresh_token
 * };
 *
 * @param credentials
 * @returns {{}}
 * @constructor
 */
exports.Drive = function ( credentials ) {

    var files = [];

    function init() {

    }

    function read() {

        var opts = {
            // UGHHHHHHH
            url : 'https://www.googleapis.com/drive/v2/files?maxResults=1000&key=AIzaSyCoimO0Pl6XrijUuqKiTyBRR4C5WrvALaE',
            headers : {
                Authorization : 'Bearer ' + credentials.accesskey
            }
        };

        log.info( 'getDialogUrlOneOA::Making request: {}', JSON.stringify( opts, null, 4 ) );
        var exchange = httpClient.request( opts );

        if ( exchange.status === 200 ) {
            //hooray shit works
            var json = exchange.content;
            files.push()
        }

        if ( exchange.status === 401 ) {
            //we need to refresh the token.
            refreshToken( credentials )
        }

        log.info( 'getDialogUrlOneOA::Status: {}, Response: {}', exchange.status, exchange.content );
    }

    function write( files ) {
        var file;
        for ( var i = 0; i < files.length; i++ ) {
            file = files[i];


        }
    }

    function refreshToken( credentials ) {
        var opts2 = {
            url : serviceDef.accessTokenUrl,
            method : serviceDef.tokenRequestMethod,
            data : {
                refresh_token : credentials.refresh_token,
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
        log.info( 'Making request: {}', JSON.stringify( opts2, null, 4 ) );
        var exchange = httpClient.request( opts2 );
    }

    return {};
};
