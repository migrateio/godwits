//noinspection BadExpressionStatementJS
'use strict';

var log = require( 'ringo/logging' ).getLogger( module.id );
var store = require( 'hazelstore' );
var {uuid} = require('utility');


/**
 * Extends the Object class with John Resig's class inheritance recipe.
 */
(function () {
    if ( typeof Object.subClass === 'function' ) return;

    var initializing = false,
        superPattern = // Determine if functions can be serialized
            /xyz/.test( function () {
                xyz;
            } ) ? /\b_super\b/ : /.*/;       //#1

    // Creates a new Class that inherits from this class
    Object.subClass = function ( properties ) {                           //#2
        var _super = this.prototype;

        // Instantiate a base class (but only create the instance,
        // don't run the init constructor)
        initializing = true;                                              //#3
        var proto = new this();                                           //#3
        initializing = false;                                             //#3

        // Copy the properties over onto the new prototype
        for ( var name in properties ) {                                    //#4
            // Check if we're overwriting an existing function
            proto[name] = typeof properties[name] == "function" &&
                typeof _super[name] == "function" &&
                superPattern.test( properties[name] ) ?
                (function ( name, fn ) {                                        //#5
                    return function () {
                        var tmp = this._super;

                        // Add a new ._super() method that is the same method
                        // but on the super-class
                        this._super = _super[name];

                        // The method only need to be bound temporarily, so we
                        // remove it when we're done executing
                        var ret = fn.apply( this, arguments );
                        this._super = tmp;

                        return ret;
                    };
                })( name, properties[name] ) :
                properties[name];
        }

        // The dummy class constructor
        function Class() {                                                   //#6
            // All construction is actually done in the init method
            if ( !initializing && this.init )
                this.init.apply( this, arguments );
        }

        // Populate our constructed prototype object
        Class.prototype = proto;                                             //#7

        // Enforce the constructor to be what we expect
        Class.constructor = Class;                                           //#8

        // And make this class extendable
        Class.subClass = arguments.callee;                                   //#9

        return Class;
    };
})();

// Order is important. This require statement must appear after the Object.subClass(...)
var {BaseDomain} = require( './base' );

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
        if (!json.id) json.id = uuid();
    }
} );

/**
 * Returns a random character from the list of tokenChars. Little funky as it overwrites
 * itself in order to keep things from polluting the parent namespace, but this is what
 * I like about JavaScript.
 * 6 character permutation will represent 48^6 permutations = 12,230,590,464
 */
var randomChar = (function () {
    var tokenChars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjklmnpqrstuvwxyz';
    var tokenLen = tokenChars.length;
    var random = new java.security.SecureRandom();
    return function () {
        return tokenChars.charAt( Math.floor( random.nextDouble() * tokenLen ) );
    }
})();

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
     * Creates a new token that is guaranteed to be unique.
     */
    generate: function(length) {
        var result = '';
        while (!result) {
            // Create a new token with the desired length
            for (var i = 0; i < length; i++) result += randomChar();

            // Check to see if this token exists already
            var hits = this.read(
                "select * from `[mapname]` where `id` = '" + result + "'"
            );

            // If there is a match (highly unlikely depending on the length), we will
            // try again
            if (hits.length > 0) result = '';
        }
        return result;
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
        if (!json.id) json.id = this.generate(6);
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

/*
 exports.Invoices = BaseDomain.subClass( {

 init: function() {
 var {schema} = require( 'domain/schema/invoices.js' );
 var map = store.getMap( 'dev-invoices' );
 var pk = function(invoice) {
 return invoice.invoiceId;
 };
 this._super('Invoices', map, pk, schema);
 }
 } );
 */


