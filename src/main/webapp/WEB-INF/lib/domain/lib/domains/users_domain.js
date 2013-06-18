var log = require( 'ringo/logging' ).getLogger( module.id );

var store = require( 'hazelstore' );
var {format} = java.lang.String;
var {BaseDomain} = require('../base');
var {makeToken, bcrypt} = require('../main');

exports.Users = BaseDomain.subClass( {

    init: function(environment) {
        var {schema} = require( 'domain/schema/users.js' );
        var map = store.getMap( environment + '-users' );
        var pk = function(user) {
            return user.userId;
        };
        var query = function(key) {
            return /^(select|where) /ig.test( key.trim() );
        };
        this._super('Users', map, pk, query, schema);
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

    readByEmail: function( email ) {
        var query = format( 'where `email.address` = "%s"', email );
        var hits = this.read( query );

        if (hits.length > 1) {
            log.error('There is more than one record with an email address of '
                + email, JSON.stringify( hits ) );
        }

        return hits.length === 0 ? null : hits[0];
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

