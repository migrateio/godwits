var log = require( 'ringo/logging' ).getLogger( module.id );

var store = require( 'hazelstore' );
var {format} = java.lang.String;
var {BaseDomain} = require('../base');
var {User} = require('./user');
var {makeToken, bcrypt} = require('../main');

exports.Users = BaseDomain.subClass( {

    init: function(environment) {
        var {schema} = require( '../schema/users.js' );
        var map = store.getMap( environment + '-users' );
        var pk = function(user) {
            return user.userId;
        };
        var query = function(key) {
            return /^(select|where) /ig.test( key.trim() );
        };
        this._super('Users', map, pk, query, schema);
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
        return json.toJSON && json.toJSON() || json;
    },

    prevalidate: function(json) {
        // Add a the creation date
        json.created = new Date().toISOString();

        // add an id if not provided
        if (!json.userId) json.userId = this.generate(6);

        // If the password is present, but is not BCrypt'd, let's take care of it
        // Is this going too far? Since BCrypt has known characteristics it seems like
        // a nice convenience feature and allows us to centralize the bcrypt function.
        if (json.password) {
            // All BCrypt passwords start with $2a$, $2x$ or $2y$
            if (!/^\$2[axy]\$/.test(json.password)) {
                json.password = bcrypt( json.password );
            }
        }
    },

    create : function ( json, ttl, timeunit ) {
        var result = this._super( this.normalize( json ), ttl, timeunit );
        return new User(result);
    },

    read : function ( pkey ) {
        var result = this._super( pkey );

        if (Array.isArray(result)) return result.map(function(json) {
            return new User( json );
        });

        return new User(result);
    },

    update : function ( json, ttl, timeunit ) {
        var result = this._super( this.normalize( json ), ttl, timeunit );
        return new User(result);
    },


    readByEmail: function( email ) {
        var query = format( 'where `email.address` = "%s"', email );
        var hits = this.read( query );

        if (hits.length > 1) {
            log.error('There is more than one record with an email address of '
                + email, JSON.stringify( hits ) );
        }

        return hits.length === 0 ? null : new User( hits[0] );
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
                "where `userId` = '" + result + "'"
            );

            // If there is an unlikely match (depending on the length), we will retry
            if (hits.length > 0) result = '';
        }
        return result;
    }
} );

