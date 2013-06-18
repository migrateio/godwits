var log = require( 'ringo/logging' ).getLogger( module.id );

var store = require( 'hazelstore' );
var {Invoice} = require( './invoice' );
var {BaseDomain} = require( '../base' );
var {makeToken} = require( '../main' );
var {format} = java.lang.String;

exports.Invoices = BaseDomain.subClass( {

    init : function ( environment ) {
        var {schema} = require( 'domain/schema/invoices.js' );
        var map = store.getMap( environment + '-invoices' );
        var pk = function ( obj ) {
            return obj.invoiceId;
        };
        var query = function ( key ) {
            return /^(select|where) /ig.test( key.trim() );
        };
        this._super( 'Invoices', map, pk, query, schema );
    },

    /**
     * This is a bit hacky. Since we have created a domain object which may be
     * wrapping the actual json we intend to persist, we will have to detect this
     * wrapper and reference the enclosed json. The only way I could come up with
     * to identify the wrapper from the json, is to look for a property that is not
     * part of the json but is part of the wrapper.
     *
     * @param json
     */
    normalize: function( json ) {
        return json.json ? json.json : json;
    },

    prevalidate : function ( json ) {
        // add an id if not provided
        if ( !json.invoiceId ) json.invoiceId = this.generate( 6 );

        var now = Date.now();

        if ( !json.starts )
            json.starts = new Date(now).toISOString();

        if ( !json.expires )
            json.expires = new Date(now + 1000 * 60 * 60 * 24 * 30 ).toISOString();
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
        var result = this._super( this.normalize( json ), ttl, timeunit );
        return new Invoice(result);
    },

    read : function ( pkey ) {
        var result = this._super( pkey );
        if (!Array.isArray(result)) return new Invoice(result);
        return result.map(function(json) {
            return new Invoice( json );
        });
    },

    update : function ( json, ttl, timeunit ) {
        var result = this._super( this.normalize( json ), ttl, timeunit );
        return new Invoice(result);
    },

    readByJob : function ( userId, job ) {
        var query = format( '\
            where `destination.service` = "%s" \
            and `destination.auth.username` = "%s" \
            and `userId` = "%s"',
            job.destination.service, job.destination.auth.username, userId );

        return this.read( query );
    }

} );

