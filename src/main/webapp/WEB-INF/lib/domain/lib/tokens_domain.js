var log = require( 'ringo/logging' ).getLogger( module.id );

var store = require( 'hazelstore' );
var {format} = java.lang.String;
var {BaseDomain} = require( './base' );
var {makeToken} = require( './main' );

exports.Tokens = BaseDomain.subClass( {

    init : function ( environment ) {
        var {schema} = require( 'domain/schema/tokens.js' );

        var map = store.getMap( environment + '-tokens' );
        this.removeOnEvict( map );

        var pk = function ( token ) {
            return token.id;
        };

        var query = function ( key ) {
            return /^select /ig.test( key );
        };

        // Our tokens will live for 3 days, and then they will expire.
        this.ttl = 3;
        this.timeunit = java.util.concurrent.TimeUnit.DAYS;
        this.expirationPeriod = this.timeunit.toMillis(this.ttl);

        this._super( 'Tokens', map, pk, query, schema );
    },

    /**
     * We will remove any results which have expired. This is made a bit tricky
     * because the result can be a single item in the case of a pk read or an array
     * in the case of a query.
     *
     * @param results
     */
    filterResults: function( result ) {
        if ( result ) {
            var isArray = Array.isArray( result );
            result = [].concat( result ).filter( function ( token ) {
                var createdTime = new Date( token.created ).time;
                var expiresAt = createdTime + this.expirationPeriod;
                return expiresAt > java.lang.System.currentTimeMillis();
            } );
            if ( isArray ) return result;
            return result.length === 0 ? null : result[0];
        }
        return result;
    },

    /**
     * By default, we will create these tokens with a time to live of 3 days
     */
    create : function ( json, ttl, timeunit ) {
        if ( isNaN( ttl ) ) {
            ttl = this.ttl;
            timeunit = this.timeunit
        }
        return this._super( json, ttl, timeunit );
    },

    read : function ( pkey ) {
        var result = this._super( pkey );
        return this.filterResults( result );
    },

    readByEmail: function( email ) {
        var query = format( 'select * from `[mapname]` where `email.address` = "%s"', email );
        return this.read( query );
    },

    /**
     * By default, we will create these tokens with a time to live of 3 days
     */
    update : function ( json, ttl, timeunit ) {
        if ( isNaN( ttl ) ) {
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
    preCreate : function ( json ) {
        json.created = new Date().toISOString();
        if ( !json.id ) json.id = makeToken( 6 );
    },

    // When the time-to-live expires on members of this map, we want to remove the
    // token from the map store. At this point, the map has already evicted the entry.
    removeOnEvict : function ( map ) {
        map.addEntryListener( {
            name : map.name,
            entryEvicted : function ( entry ) {
                log.info( 'Evicted the entry, key: ' + entry.key );
                map.remove( entry.key );
            },
            entryRemoved : function ( entry ) {
                log.info( 'Removed the entry, key: ' + entry.key );
            }
        } );
    }
} );
