var log = require( 'ringo/logging' ).getLogger( module.id );

var store = require( 'hazelstore' );
var {BaseDomain} = require('./base');
var {makeToken} = require('./main');

exports.Users = BaseDomain.subClass( {

    init: function(environment) {
        var {schema} = require( 'domain/schema/users.js' );
        var map = store.getMap( environment + '-users' );
        var pk = function(user) {
            return user.id;
        };
        var query = function(key) {
            return /^select /ig.test(key);
        };
        this._super('Users', map, pk, query, schema);
    },

    preCreate: function(json) {
        // Add a the creation date
        json.created = new Date().toISOString();

        // add an id if not provided
        if (!json.id) json.id = this.generate(6);
    },

    /**
     * Creates a new user id that is guaranteed to be unique.
     */
    generate: function(length) {
        var result = '';
        while (!result) {
            result = makeToken(length);

            // Check to see if this token exists already
            var hits = this.read(
                "select * from `[mapname]` where `id` = '" + result + "'"
            );

            // If there is an unlikely match (depending on the length), we will retry
            if (hits.length > 0) result = '';
        }
        return result;
    }

} );

