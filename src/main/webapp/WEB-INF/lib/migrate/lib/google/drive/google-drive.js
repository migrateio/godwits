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

    function buildURI( shorthand, id ) {
        const API_KEY = 'AIzaSyCoimO0Pl6XrijUuqKiTyBRR4C5WrvALaE';
        const MAX_RESULTS = 1000;

        var baseurl = getAppropriateURI( shorthand );

        return baseurl + id ? id + '?key=' + API_KEY : '?key=' + API_KEY + '&maxresults=' + MAX_RESULTS;
    }

    function getAppropriateURI( shorthand ) {
        switch ( shorthand ) {
            case 'listFiles':
                return 'https://www.googleapis.com/drive/v2/files';
            case 'getFile':
                return 'https://www.googleapis.com/drive/v2/files/';
            default:
                throw {
                    status : 500,
                    message : 'Expected listFiles or getFile, got neither'
                };
        }
    }

    function init() {

    }

    function read() {

        var url = buildURI( 'listFiles' );

        var opts = {
            url : url,
            headers : {
                Authorization : 'Bearer ' + credentials.accesskey
            }
        };

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
    }

    function write( files ) {

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
