'use strict';


var config = exports.config = {
    version : '0.1.0'
};


exports.uuid = function () {
    var uuid = java.util.UUID.randomUUID();
    return uuid.toString();
};

exports.props = module.singleton( 'props', function () {
    var props = new java.util.Properties();

    var loader = java.lang.Thread.currentThread().contextClassLoader;
    var url = loader.getResource( 'props.properties' );
    props.load( url.openStream() );

    var map = {};

    var keys = props.keySet().toArray();
    keys.forEach( function ( key ) {
        map[key] = props.getProperty( key );
    } );

    return map;
} );

// Adapted from https://gist.github.com/kurtmilam/1868955
var merge = exports.merge = function ( obj ) {
    var parentRE = /#{\s*?_\s*?}/,
        slice = Array.prototype.slice,
        hasOwnProperty = Object.prototype.hasOwnProperty;

    function isType( o, type ) {
        if ( type === 'array' ) return Array.isArray( o );
        return typeof o === type;
    }

    slice.call( arguments, 0 ).forEach( function ( source ) {
        for ( var prop in source ) {
            if ( hasOwnProperty.call( source, prop ) ) {
                if ( isType( obj[prop], 'undefined' ) || isType( obj[prop], 'function' ) || source[prop] === null ) {
                    obj[prop] = source[prop];
                }
                else if ( isType( source[prop], 'string' ) && parentRE.test( source[prop] ) ) {
                    if ( isType( obj[prop], 'string' ) ) {
                        obj[prop] = source[prop].replace( parentRE, obj[prop] );
                    }
                }
                else if ( isType( obj[prop], 'array' ) || isType( source[prop], 'array' ) ) {
                    if ( !isType( obj[prop], 'array' ) || !isType( source[prop], 'array' ) ) {
                        throw 'Error: Trying to combine an array with a non-array (' + prop + ')';
                    } else {
                        obj[prop] = merge( obj[prop], source[prop] )
                            .filter( function ( item ) {
                                return item !== null;
                            } );
                    }
                }
                else if ( isType( obj[prop], 'object' ) || isType( source[prop], 'object' ) ) {
                    if ( !isType( obj[prop], 'object' ) || !isType( source[prop], 'object' ) ) {
                        throw 'Error: Trying to combine an object with a non-object (' + prop + ')';
                    } else {
                        obj[prop] = merge( obj[prop], source[prop] );
                    }
                } else {
                    obj[prop] = source[prop];
                }
            }
        }
    } );
    return obj;
};
