var log = require( 'ringo/logging' ).getLogger( module.id );
var {merge} = require( 'utility' );
var {JsonSchema} = require( 'tv4' );


/**
 *
 * @type {*}
 */
exports.BaseDomain = Object.subClass( {

    init : function ( name, map, pk, query, schema ) {
        if ( typeof name !== 'string' ) throw { status : 400,
            message : 'Domain object requires parameter [name] as a string'
        };
        if ( typeof map !== 'object' ) throw { status : 400,
            message : 'Domain object [' + name + '] requires parameter [map] as a function'
        };
        if ( typeof pk !== 'function' ) throw { status : 400,
            message : 'Domain object [' + name + '] requires parameter [pk] as a function'
        };
        if ( typeof query !== 'function' ) throw { status : 400,
            message : 'Domain object [' + name + '] requires parameter [query] as a function'
        };
        if ( typeof schema !== 'object' ) throw { status : 400,
            message : 'Domain object [' + name + '] requires parameter [schema] as a function'
        };

        this.name = name;
        this.map = map;
        this.pk = pk;
        this.query = query;

        var js = new JsonSchema();
        this.validateSchema = function ( obj ) {
            return js.validate( obj, schema );
        };
        this.generateDefaults = function ( obj ) {
            return js.generate( obj, schema );
        };
        this.strip = function ( obj, keys ) {
            return js.strip( obj, schema, keys );
        };
    },

    prevalidate: function ( json ) {
    },

    validate: function( json ) {
        var schema = this.validateSchema( json );
        if ( !schema.valid ) {
            log.warn( 'Schema results: ', JSON.stringify( schema ), JSON.stringify( json ) );
            throw { status : 400, errors : schema.errors,
                message : this.name + '::validation errors: ' + JSON.stringify( schema.errors )};
        }
    },

    create : function ( json, ttl, timeunit ) {
        // Verify that the parameter is correct
        if ( !json ) throw {
            status : 400,
            message : this.name + '::create requires a json body'
        };

        // Clone json object because we don't want to modify its properties
        json = JSON.parse( JSON.stringify( json ) );

        // Flesh out the object with default/required values from the schema
        var newObj = this.generateDefaults( json );
        log.debug( 'After generating defaults: {}', JSON.stringify( newObj ) );

        this.prevalidate( newObj );

        // Validate the new object
        this.validate( newObj );

        // Persist the object if validation succeeds
        if (typeof timeunit === 'string')
            timeunit = java.util.concurrent.TimeUnit.valueOf( timeunit );
        this.map.put( this.pk( newObj ), newObj, ttl, timeunit );

        return newObj;
    },

    update : function ( json, ttl, timeunit ) {
        // Verify that the parameter is correct
        if ( !json ) throw {
            status : 400,
            message : this.name + '::update requires a json body'
        };

        var pkey = this.pk( json );

        if ( !pkey ) throw {
            status : 400,
            message : this.name + '::update requires primary key property on object'
        };

        // Get the current object from the map
        var obj = this.map.get( pkey );
        if ( !obj ) throw {
            status : 404,
            message : this.name + '::update not found [' + pkey + ']'
        };

        // Combine the existing object with the update json and generate any defaults
        var newObj = merge( {}, obj, json );
//        log.debug( 'Merging {} into object {}, resulting in {}',
//            JSON.stringify( json ), JSON.stringify( obj ), JSON.stringify( newObj ) );
        newObj = this.generateDefaults( newObj );
        log.debug( 'After generating defaults: {}', JSON.stringify( newObj ) );


        this.prevalidate( newObj );

        // Validate the new object
        var schema = this.validate( newObj );

        // Persist the object if validation succeeds
        if (typeof timeunit === 'string')
            timeunit = java.util.concurrent.TimeUnit.valueOf( timeunit );
        this.map.put( pkey, newObj, ttl, timeunit );

        return newObj;
    },

    read : function ( pkey ) {
        // Verify that the parameter is correct
        if ( !pkey ) throw {
            status : 400,
            message : this.name + '::read requires a primary key value'
        };

        // If the key is a query (as identified by the subclass), pass it on through to
        // the map, and on the way back out, evict the query from the map's cache.
        var isQuery = this.query( pkey );
        if (isQuery) {
            pkey = '__query:' + pkey;
        }

        // Get the current object from the map
        var obj = this.map.get( pkey );
        if ( !obj ) throw {
            status : 404,
            message : this.name + '::read not found [' + pkey + ']'
        };

        if (isQuery) {
            this.map.evict( pkey );

            // Queries will return arrays of json strings
            if (Array.isArray(obj)) {
                var result = obj.map(function(item) {
                    if ( typeof item === 'string' ) {
                        return JSON.parse( item );
                    } else {
                        return null;
                    }
                });
//                log.info( 'Result in Map: {}', JSON.stringify( result, null, 4 ) );
                return result;
            }
        }

        return obj;
    },

    readLock : function ( pkey, ttl, timeunit ) {
        // Verify that the parameter is correct
        if ( !pkey ) throw {
            status : 400,
            message : this.name + '::readLock requires a primary key value'
        };

        // Get the current object from the map
        var obj = this.map.lock( pkey, ttl, timeunit );
        if ( !obj ) throw {
            status : 404,
            message : this.name + '::readLock not found [' + pkey + ']'
        };

        return obj;
    },

    del : function del( pkey ) {
        // Verify that the parameter is correct
        if ( !pkey ) throw {
            status : 400,
            message : this.name + '::del requires an primary key value'
        };

        // In case the user passes in an object, convert it to a pk
        if (typeof pkey !== 'string') pkey = this.pk( pkey );

        // Get the current object from the map
        return this.map.remove( pkey );
    },

    backingMap : function () {
        return this.map;
    }
} );



