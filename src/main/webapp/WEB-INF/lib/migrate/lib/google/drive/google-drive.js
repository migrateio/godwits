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

    this.credentials = credentials;

    function buildURI( shorthand, id ) {
        const API_KEY = 'AIzaSyCoimO0Pl6XrijUuqKiTyBRR4C5WrvALaE';
        const MAX_RESULTS = 1000;

        var baseurl = getAppropriateURI( shorthand );

        return baseurl + id ? id + '?key=' + API_KEY : '?key=' + API_KEY + '&maxresults=' + MAX_RESULTS;
    }

    /**
     * Gotta be a better way to do this.
     * @param shorthand
     * @returns {string}
     */
    function getAppropriateURI( shorthand ) {
        switch ( shorthand ) {
            case 'listFiles':
                return 'https://www.googleapis.com/drive/v2/files';
            case 'getFile':
                return 'https://www.googleapis.com/drive/v2/files/';
            case 'upload':
                return 'https://www.googleapis.com/upload/drive/v2/files';
            default:
                throw {
                    status : 500,
                    message : 'Expected listFiles, upload, or getFile, got neither'
                };
        }
    }


    /**
     *
     * basic read. returns an array of file resources:
     * https://developers.google.com/drive/v2/reference/files
     *
     * @returns {*}
     */
    function read() {

        var url = buildURI( 'listFiles' );

        var opts = {
            url : url,
            headers : {
                Authorization : 'Bearer ' + this.credentials.accesskey
            }
        };

        var exchange = httpClient.request( opts );

        if ( exchange.status === 200 ) {
            return exchange.content;
        }

        if ( exchange.status === 401 ) {
            //we need to refresh the token.
            this.credentials = refreshToken( this.credentials );
            java.lang.Thread.sleep( 2000 );
            return read();
        }
    }


    /**
     *
     * Takes an array of files resources to upload to google drive. File resources have download/export links.
     * This function loops through a specific job chunked and passes through the specified files before returning a result.
     * @param files
     * @returns {Array}
     */
    function write( files ) {
        var result = [];

        for ( var i = 0; i < files.length; i++ ) {
            result.push( passthroughToDrive( files[i] ) );
        }

        return result;
    }

    /**
     * Here's where the bulk of the work gets done.
     *
     * In here we take a singular file resource, download it, remove any metadata that we
     * aren't allowed to upload (download link would be one).
     *
     * Then we download the file and upload to drive with the metadata.
     * @param file
     */
    function passthroughToDrive( file ) {
        var metadata = JSON.stringify({
            description: file.description,
            indexableText: file.indexableText,
            labels: file.labels,
            lastViewedByMeDate: file.lastViewedByMeDate,
            mimeType: file.mimeType,
            modifiedDate: file.modifiedDate,
            parents: file.parents,
            title: file.title
        });


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

        if ( exchange.status === 200 ) return exchange.content;

        throw 'Error refreshing credentials';
    }

    function updateCredentials( rawcreds ) {
        return {
            access_key : rawcreds.access_key,
            refresh_token : rawcreds.refresh_token
        };
    }

    return {};
};
