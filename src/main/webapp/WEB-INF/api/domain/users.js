var log = require( 'ringo/logging' ).getLogger( module.id );
var {merge} = require( 'ringo/utils/objects' );
var {uuid} = require( 'utility' );
var store = require( 'store-js' );

var {JsonSchema} = require( 'tv4' );
var js = new JsonSchema();
var {schema} = require( 'schema/' + module.name + '.js' );
var validateSchema = function ( obj ) {
    return js.validate( obj, schema );
};
var generateDefaults = function ( obj ) {
    return js.generate( obj, schema );
};


exports = function ( environment, tablename ) {

    var map = store.getMap( environment + '-' + module.name );

    function create( json ) {
        // Verify that the parameter is correct
        if ( !json ) throw {
            status : 400,
            message : module.name + '::create requires a json body'
        };

        // Add a couple dynamic required properties
        json._id = uuid();
        json.dateCreated = new Date().toISOString();

        // Flesh out the object with default/required values from the schema
        var newObj = generateDefaults( json );

        // Validate the new object
        var schema = validateSchema( newObj );

        // If there are validation errors, we throw an exception with the errors
        if ( !schema.valid ) {
            throw { status : 400, errors : schema.errors }
        }

        // Persist the object if validation succeeds
        map.put( newObj );

        return newObj
    }

    function update( json ) {
        // Verify that the parameter is correct
        if ( !json ) throw {
            status : 400,
            message : module.name + '::update requires a json body'
        };

        if ( !json._id ) throw {
            status : 400,
            message : module.name + '::update requires property [_id] on object'
        };

        // Get the current object from the map
        var obj = map.get( json._id );
        if ( !obj ) throw {
            status : 404,
            message : module.name + '::update not found [' + json._id + ']'
        };

        // Combine the existing object with the update json
        var newObj = merge( obj, json );

        // Validate the new object
        var schema = validateSchema( newObj );

        // If there are validation errors, we throw an exception with the errors
        if ( !schema.valid ) {
            throw { status : 400, errors : schema.errors }
        }

        // Persist the object if validation succeeds
        map.put( newObj );

        return newObj;
    }

    function read( id ) {
        // Verify that the parameter is correct
        if ( !id ) throw {
            status : 400,
            message : module.name + '::read requires an id value'
        };

        // Get the current object from the map
        var obj = map.get( id );
        if ( !obj ) throw {
            status : 404,
            message : module.name + '::read not found [' + id + ']'
        };

        return obj;
    }


    function del( id ) {
        // Verify that the parameter is correct
        if ( !id ) throw {
            status : 400,
            message : module.name + '::read requires an id value'
        };

        // Get the current object from the map
        return map.remove( id );
    }


    return {
        create : create,
        read: read,
        update: update,
        del: del
    }
};

