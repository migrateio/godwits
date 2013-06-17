var log = require( 'ringo/logging' ).getLogger( module.id );

var store = require( 'hazelstore' );
var {Invoice} = require( './invoice' );
var {BaseDomain} = require( '../base' );
var {makeToken} = require( '../main' );
var {format} = java.lang.String;

exports.Destinations = BaseDomain.subClass( {

    init : function ( environment ) {
        var {schema} = require( 'domain/schema/invoices.js' );
        var map = store.getMap( environment + '-invoices' );
        var pk = function ( obj ) {
            return obj.invoiceId;
        };
        var query = function ( key ) {
            return /^(select|where) /ig.test( key );
        };
        this._super( 'Destinations', map, pk, query, schema );
    },

    prevalidate : function ( json ) {
        // add an id if not provided
        if ( !json.invoiceId ) json.invoiceId = this.generate( 6 );
    },

    /**
     * Creates a new id that is guaranteed to be unique.
     */
    generate : function ( length ) {
        var result = '';
        while ( !result ) {
            result = makeToken( length );

            // Check to see if this token exists already
            var hits = this.read(
                "where `invoiceId` = '" + result + "'"
            );

            // If there is an unlikely match (depending on the length), we will retry
            if ( hits.length > 0 ) result = '';
        }
        return result;
    },

    create : function ( json, ttl, timeunit ) {
        var result = this._super( json, ttl, timeunit );
        return new Invoice(result);
    },

    read : function ( pkey ) {
        var result = this._super( pkey );
        if (!Array.isArray(result)) return new Invoice(result);
        return result.map(function(json) {
            return new Invoice( json );
        });
    },

    readByEmail: function( email ) {
        var query = format( 'where `email.address` = "%s"', email );
        return this.read( query );
    },

    update : function ( json, ttl, timeunit ) {
        var result = this._super( json, ttl, timeunit );
        return new Invoice(result);
    },

    readByJob : function ( userId, job ) {
        var query = format( '\
            where `destination.service` = "%s" \
            and `destination.username` = "%s" \
            and `userid` = "%s"',
            job.destination.service, job.destination.auth.username, userId );

        var destRecord = this.read( query );
    }

} );

