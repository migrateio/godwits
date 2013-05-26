//noinspection BadExpressionStatementJS
'use strict';

var log = require( 'ringo/logging' ).getLogger( module.id );
var store = require( 'hazelstore' );


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
var {BaseDomain} = require('./base');

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
    }
} );

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

    preValidate: function ( json ) {
        return json;
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


