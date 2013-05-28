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

    function init() {

    }

    function read() {
        //get CalendarList
        var opts = {
            url : 'https://www.googleapis.com/calendar/v3/users/me/calendarList?key=AIzaSyCoimO0Pl6XrijUuqKiTyBRR4C5WrvALaE',
            headers : {
                Authorization : 'Bearer ' + credentials.accesskey
            }
        };

        var result = httpClient.request( opts );

        return JSON.parse( result.content ).items;
    }

    function write( calendars ) {
        var opts = {
            headers : {
                Authorization : 'Bearer ' + credentials.accesskey
            }
        };

        // get events, write events.

        for ( var i = 0; i < calendars.length; i++ ) {
            opts.url = 'https://www.googleapis.com/calendar/v3/users/me/calendarList?key=AIzaSyCoimO0Pl6XrijUuqKiTyBRR4C5WrvALaE';
            var result = httpClient.request( opts );
        }


    }

    return {};
};