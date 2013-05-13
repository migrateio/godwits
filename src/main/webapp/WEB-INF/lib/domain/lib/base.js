var log = require( 'ringo/logging' ).getLogger( module.id );
var {merge} = require( 'ringo/utils/objects' );
var store = require( 'store-js' );
var {JsonSchema} = require( 'tv4' );


/**
 *
 * @type {*}
 */
exports.BaseDomain = Object.subClass( {

    init : function ( name, map, pk, schema ) {
        if ( typeof name !== 'string' ) throw { status : 400,
            message : 'Domain object requires parameter [name] as a string'
        };
        if ( typeof map !== 'object' ) throw { status : 400,
            message : 'Domain object [' + name + '] requires parameter [map] as a function'
        };
        if ( typeof pk !== 'function' ) throw { status : 400,
            message : 'Domain object [' + name + '] requires parameter [pk] as a function'
        };
        if ( typeof schema !== 'object' ) throw { status : 400,
            message : 'Domain object [' + name + '] requires parameter [schema] as a function'
        };

        this.name = name;
        this.map = map;
        this.pk = pk;

        var js = new JsonSchema();
        this.validateSchema = function ( obj ) {
            return js.validate( obj, schema );
        };
        this.generateDefaults = function ( obj ) {
            return js.generate( obj, schema );
        };
    },

    create : function ( json ) {
        // Verify that the parameter is correct
        if ( !json ) throw {
            status : 400,
            message : this.name + '::create requires a json body'
        };

        // Clone json object because we don't want to modify its properties
        json = JSON.parse( JSON.stringify( json ) );

        // Add a the creation date
        json.created = new Date().toISOString();

        // Flesh out the object with default/required values from the schema
        var newObj = this.generateDefaults( json );

        // Validate the new object
        var schema = this.validateSchema( newObj );

        // If there are validation errors, we throw an exception with the errors
        if ( !schema.valid ) {
            throw { status : 400, errors : schema.errors,
                message : this.name + '::validation errors: ' + JSON.stringify( schema.errors )};
        }

        // Persist the object if validation succeeds
        this.map.put( this.pk( newObj ), newObj );

        log.info( 'successful validation' );
        return newObj
    },

    update : function ( json ) {
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

        // Combine the existing object with the update json
        var newObj = merge( obj, json );

        // Validate the new object
        var schema = this.validateSchema( newObj );

        // If there are validation errors, we throw an exception with the errors
        if ( !schema.valid ) {
            throw { status : 400, errors : schema.errors,
                message : this.name + '::validation errors: ' + JSON.stringify( schema.errors )};
        }

        // Persist the object if validation succeeds
        this.map.put( pkey, newObj );

        return newObj;
    },
    read : function ( pkey ) {

        // Verify that the parameter is correct
        if ( !pkey ) throw {
            status : 400,
            message : this.name + '::read requires a primary key value'
        };

        // Get the current object from the map
        var obj = this.map.get( pkey );
        if ( !obj ) throw {
            status : 404,
            message : this.name + '::read not found [' + pkey + ']'
        };

        return obj;
    },

    del : function del( pkey ) {
        // Verify that the parameter is correct
        if ( !pkey ) throw {
            status : 400,
            message : this.name + '::del requires an primary key value'
        };

        // Get the current object from the map
        return this.map.remove( pkey );
    },

    backingMap: function() {
        return this.map;
    }
} );


