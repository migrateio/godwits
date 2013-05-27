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
                result[getKey( '', prefix, isArray )] = '';

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
                        if ( isArray ) prefix.pop();
                        break;
                }
//                log.error('Result: {}, type: {}, prefix: {}, array: {}',
//                    JSON.stringify( result ), type, JSON.stringify( prefix ), isArray);
            } );
            if ( isArray ) prefix.pop();
        }
        return result;
    };

    if ( !delim ) delim = '.';
    return toProps( {}, [], json );
};

exports.propsToJson = function ( props, delim ) {
    var isArray, next;
    var regex = /\[([0-9]*)\]/;
    var iso8601 = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.*\d*Z/;
    if ( !delim ) delim = '.';

    function addProp( node, keys, value, start ) {
        // First pass through result is null, and we are just trying to figure out
        // whether we have an object or array as the root element.
        if ( !start ) {
            // Check to see if we have an array coming up
            isArray = regex.exec( keys[0] );
            start = isArray ? [] : {};
            addProp( start, keys, value, start );
            return start;
        }

        // Get the first key part from the split, and determine if it is an array element
        var key = keys.shift();
        isArray = regex.exec( key );
        if ( isArray ) {
            // Handle empty array syntax
            if ( key.length === 2 ) {
                return start;
            }
            key = parseInt( isArray[1] );
        }

        // If this key is the last in the chain, we have to set the value
        if ( keys.length === 0 ) {
            // Value may be a date
            if ( iso8601.test( value ) ) {
                value = new Date( Date.parse( value ) );
            }
            node[key] = value;
            return start;
        }

        // If there are more keys to come, we have to dig down into the object heirachy
        next = node[key] = isArray ? node[key] || [] : node[key] || {};
        addProp( next, keys, value, start );
        return node;
    }

    var list = Object.keys( props ).map( function ( key ) {
        return {key : key, value : props[key]};
    } );
    list.sort( function ( a, b ) {
        return a.key.localeCompare( b.key );
    } );
    var result = null;
    list.forEach( function ( item ) {
        result = addProp( result, item.key.split( delim ), item.value, result );
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