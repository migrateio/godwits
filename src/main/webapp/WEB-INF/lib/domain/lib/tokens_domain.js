var log = require( 'ringo/logging' ).getLogger( module.id );

var store = require( 'hazelstore' );
var {BaseDomain} = require('./base');
var {makeToken} = require('./main');

exports.Tokens = BaseDomain.subClass( {

    init: function(environment) {
        var {schema} = require( 'domain/schema/tokens.js' );

        var map = store.getMap( environment + '-tokens' );
        this.removeOnEvict( map );

        var pk = function(token) {
            return token.id;
        };

        var query = function(key) {
            return /^select /ig.test(key);
        };

        this._super('Tokens', map, pk, query, schema);
    },

    /**
     * By default, we will create these tokens with a time to live of 3 days
     */
    create : function ( json, ttl, timeunit ) {
        if (isNaN(ttl) ) {
            ttl = 3;
            timeunit = 'DAYS'
        }
        return this._super( json, ttl, timeunit );
    },

    /**
     * By default, we will create these tokens with a time to live of 3 days
     */
    update : function ( json, ttl, timeunit ) {
        if (isNaN(ttl) ) {
            ttl = 3;
            timeunit = 'DAYS'
        }
        return this._super( json, ttl, timeunit );
    },

    /**
     * If the user has not yet generated a token and attached it, we will create a new
     * token on the fly.
     *
     * @param json
     */
    preCreate: function ( json ) {
        json.created = new Date().toISOString();
        if (!json.id) json.id = makeToken(6);
    },

    // When the time-to-live expires on members of this map, we want to remove the
    // token from the map store. At this point, the map has already evicted the entry.
    removeOnEvict: function(map) {
        map.addEntryListener({
            name: map.name,
            entryEvicted: function(entry) {
                log.info( 'Evicted the entry, key: ' + entry.key );
                map.remove( entry.key );
            },
            entryRemoved: function(entry) {
                log.info( 'Removed the entry, key: ' + entry.key );
            }
        });
    }
} );
