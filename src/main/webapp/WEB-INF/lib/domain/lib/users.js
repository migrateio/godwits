var log = require( 'ringo/logging' ).getLogger( module.id );
var {merge} = require( 'ringo/utils/objects' );
var store = require( 'store-js' );
var {JsonSchema} = require( 'tv4' );


exports.Users = function ( name, map, pk, schema ) {

    if (typeof name !== 'string') throw { status: 400,
        message: 'Domain object requires parameter [name] as a string'
    };
    if (typeof map !== 'object') throw { status: 400,
        message: 'Domain object [' + name + '] requires parameter [map] as a function'
    };
    if (typeof pk !== 'function') throw { status: 400,
        message: 'Domain object [' + name + '] requires parameter [pk] as a function'
    };
    if (typeof schema !== 'object') throw { status: 400,
        message: 'Domain object [' + name + '] requires parameter [schema] as a function'
    };

    var js = new JsonSchema();
    var validateSchema = function( obj ) {
        log.info( 'Validating\n{}\nagainst schema\n{}',
            JSON.stringify( obj, null, 4 ), JSON.stringify( schema ) );
        return js.validate( obj, schema );
    };
    var generateDefaults = function ( obj ) {
        return js.generate( obj, schema );
    };

    function create( json ) {
        // Verify that the parameter is correct
        if ( !json ) throw {
            status : 400,
            message : name + '::create requires a json body'
        };

        // Clone json object because we don't want to modify its properties
        json = JSON.parse( JSON.stringify( json ) );

        // Add a the creation date
        json.created = new Date().toISOString();

        // Flesh out the object with default/required values from the schema
        var newObj = generateDefaults( json );

        // Validate the new object
        var schema = validateSchema( newObj );

        // If there are validation errors, we throw an exception with the errors
        if ( !schema.valid ) {
            throw { status : 400, errors : schema.errors,
                message : name + '::validation errors: ' + JSON.stringify( schema.errors )};
        }

        // Persist the object if validation succeeds
        map.put( pk(newObj), newObj );

        log.info( 'successful validation' );
        return newObj
    }

    function update( json ) {
        // Verify that the parameter is correct
        if ( !json ) throw {
            status : 400,
            message : name + '::update requires a json body'
        };

        var pkey = pk( json );

        if ( !pkey ) throw {
            status : 400,
            message : name + '::update requires primary key property on object'
        };

        // Get the current object from the map
        var obj = map.get( pkey );
        if ( !obj ) throw {
            status : 404,
            message : name + '::update not found [' + pkey + ']'
        };

        // Combine the existing object with the update json
        var newObj = merge( obj, json );

        // Validate the new object
        var schema = validateSchema( newObj );

        // If there are validation errors, we throw an exception with the errors
        if ( !schema.valid ) {
            throw { status : 400, errors : schema.errors,
                message : name + '::validation errors: ' + JSON.stringify( schema.errors )};
        }

        // Persist the object if validation succeeds
        map.put( pkey, newObj );

        return newObj;
    }

    function read( pkey ) {
        // Verify that the parameter is correct
        if ( !pkey ) throw {
            status : 400,
            message : name + '::read requires a primary key value'
        };

        // Get the current object from the map
        var obj = map.get( pkey );
        if ( !obj ) throw {
            status : 404,
            message : name + '::read not found [' + pkey + ']'
        };

        return obj;
    }


    function del( pkey ) {
        // Verify that the parameter is correct
        if ( !pkey ) throw {
            status : 400,
            message : name + '::del requires an primary key value'
        };

        // Get the current object from the map
        return map.remove( pkey );
    }


    return {
        create : create,
        read: read,
        update: update,
        del: del
    }
};

