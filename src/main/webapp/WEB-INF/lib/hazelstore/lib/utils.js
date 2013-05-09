"use strict";
var log = require( 'ringo/logging' ).getLogger( module.id );
var uuid = Packages.java.util.UUID;

/**
 * Generates a UUID with or without dashes (removes dashes by default). Note, this creates a version
 * 4 UUID which is comprised of pseudo-random generated numbers. It might be better to resort to
 * using an implementation which takes the computers MAC address into consideration which is known
 * as a Type 1 UUID.
 *
 * @param leaveDashes
 */
exports.generateId = function ( leaveDashes ) {
    var result = uuid.randomUUID().toString();
    if ( !leaveDashes ) result = result.replace( /-/g, '' );
    return result;
};

exports.convertPropsToMap = function ( properties ) {
    var result = {};
    properties.entrySet().toArray().forEach( function ( entry ) {
        result[entry.key.toString()] = entry.value.toString();
    } );
    return result;
};

exports.jsonToProps = function ( json, delim ) {
    var getKey = function ( key, prefix, isArray ) {
        var k = prefix.length > 0 ? prefix.join( delim ) + delim : '';
        return isArray ? k + '[' + key + ']' : k + key;
    };
    var toProps = function ( result, prefix, js ) {
        if ( typeof js === 'object' ) {
            var isArray = Array.isArray( js );
            var keys = Object.keys( js );

//            // Take care of empty arrays
            if ( isArray && keys.length === 0 )
                result[getKey('', prefix, isArray)] = '';

            keys.forEach( function ( key ) {
                var value = js[key];
                var type = typeof value === 'object' && toString.call( value ) === '[object Date]'
                    ? 'date' : typeof value;
                switch ( type ) {
                    case 'number':
                    case 'boolean':
                    case 'string':
                        result[getKey( key, prefix, isArray )] = value;
                        break;
                    case 'date':
                        result[getKey( key, prefix, isArray )] = value.toISOString();
                        break;
                    case 'object':
                        prefix.push( getKey( key, [], isArray ) );
                        toProps( result, prefix, value );
                        if (isArray) prefix.pop();
                        break;
                }
//                log.error('Result: {}, type: {}, prefix: {}, array: {}',
//                    JSON.stringify( result ), type, JSON.stringify( prefix ), isArray);
            } );
            if (isArray) prefix.pop();
        }
        return result;
    };

    if ( !delim ) delim = '.';
    return toProps( {}, [], json );
};

exports.propsToJson = function ( props, delim ) {
    var result = {};
    var isArray = /\[([0..9]*)\]/;
    if ( !delim ) delim = '.';

    function addProp(result, keys, value, isArray) {
        var key = keys.shift();
        if (keys.length === 0) result[key] = value;
        else {
            var match = key.match( regex );
            if (match) {
                result[match[0]] = value;
            } else {
                result[key] = {};
            }
            addProp( result, keys, value );
        }
    }


    Object.keys( props ).forEach( function ( key ) {
        addProp( result, key.split(delim), props[key] );
    } );

    return result;
};

/**
 * Generates a base62 UUID. Saves 10 bytes.
 * @param leaveDashes
 */
function base62UUID() {
    var uuid = uuid.randomUUID();
    return encodeBase62( uuid.mostSignificantBits() ) + '-' + encodeBase62( uuid.leastSignificantBits() );
}


var digits = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split( '' );

var encodeBase62 = function ( n ) {
    var r = [], b = digits.length;

    while ( n > 0 ) {
        var mod = n % b;
        r.push( digits[mod] );
        n = Math.floor( n / b );
    }

    return r.reverse().join( '' );
};

var decodeBase62 = function ( s ) {
    var n = 0,
        i = 0,
        b = digits.length,
        slen = s.length;

    for ( ; i < slen; i++ ) {
        n = (n * b) + digits.indexOf( s[i] );
    }
    return n;
};