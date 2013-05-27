'use strict';

var log = require( 'ringo/logging' ).getLogger( module.id );
var {jsonToProps} = require( '../utils' );

var {MapStore} = Packages.com.hazelcast.core;
var {BasicAWSCredentials} = Packages.com.amazonaws.auth;
var {
    AmazonSimpleDBClient
    } = Packages.com.amazonaws.services.simpledb;
var {
    DomainMetadataRequest, BatchDeleteAttributesRequest, DeletableItem,
    DeleteAttributesRequest, BatchPutAttributesRequest, GetAttributesRequest,
    NoSuchDomainException,
    PutAttributesRequest, ReplaceableAttribute, ReplaceableItem, SelectRequest
    } = Packages.com.amazonaws.services.simpledb.model;

exports.SimpleDBStore = function ( mapName, options ) {

    var client;
    var tableName = mapName;

    /**
     * Loads the value of a given key. If distributed map doesn't contain the value
     * for the given key then Hazelcast will call implementation's load (key) method
     * to obtain the value. Implementation can use any means of loading the given key;
     * such as an O/R mapping tool, simple SQL or reading a file etc.
     *
     * @param key
     * @return value of the key
     */
    function load( key ) {
        // If we are dealing with the load of a query, forward that request to the
        // query function.
        if (/^__query/ig.test(key)) {
            var select = key.substring( 8 );
            return query( select );
        }

        log.debug( 'SimpleDBStore::load, table: {}, key: {}',
            tableName, JSON.stringify( key ) );

        var attrs = new java.util.ArrayList();
        attrs.add( '_value' );

        var request = new GetAttributesRequest()
            .withDomainName( tableName )
            .withItemName( key )
            .withConsistentRead(true)
            .withAttributeNames( attrs );

        try {
            var result = client.getAttributes( request );
            attrs = result.attributes;
            for ( var i = attrs.iterator(); i.hasNext(); ) {
                var attr = i.next();
                if ( attr.name === '_value' ) {
                    return attr.value;
                }
            }
        } catch ( e ) {
            log.error( 'SimpleDBStore::store', e );
            throw e;
        }

        return null;
    }

    /**
     * Queries the server for one or more objects that match the query template.
     *
     * Support for the token is going to be a little tricky to make the API slightly
     * nice. SimpleDB requires the query string on each request, so from the top-level
     * of the api, we would have to pass in the token _and_ the query. This is where it
     * will get a bit ugly. As an alternative, we could store the query in Hazelcast
     * using the token as the key. Then, if a future request for the token comes in, we
     * would already have the token. There are some problems with that approach, mainly
     * there was at one time a restriction from using hazelcast while in this MapStore
     * implementation. Need to check if that restriction is still valid, and if so,
     * perhaps we can move the storing of the query up one level in the api to the base
     * class.
     *
     * @param select
     * @return An array of matching objects
     */
    function query( select ) {
        log.debug( 'SimpleDBStore::query, table: {}, key: {}',
            tableName, JSON.stringify( select ) );

        // Replace substituable variables, if any
        select = select.replace( '[mapname]', tableName );

        var response = [];

        var request = new SelectRequest()
            .withConsistentRead( true )
            .withSelectExpression( select );

        try {
            var result = client.select( request );

//            if (result.nextToken) response.next = result.nextToken;

            result.items.toArray().forEach( function ( item ) {
                for ( var i = item.attributes.iterator(); i.hasNext(); ) {
                    var attr = i.next();
                    if ( attr.name === '_value' ) {
                        response.push(attr.value);
                    }
                }
            });
        } catch ( e ) {
            log.error( 'SimpleDBStore::query', e.toString() );
            throw e;
        }

        return JSON.stringify( response );
    }

    /**
     * Loads given keys. This is batch load operation so that implementation can
     * optimize the multiple loads.
     *
     * @param keys keys of the values entries to load
     * @return map of loaded key-value pairs.
     */
    function loadAll( keys ) {
        log.debug( 'SimpleDBStore::load', JSON.stringify( arguments ) );
        var result = {};
        keys.toArray().forEach( function ( key ) {
            result[key] = load( key );
        } );
        return result;
    }

    /**
     * Loads all of the keys from the store.
     *
     * @return all the keys
     */
    function loadAllKeys() {
        return null;
    }

    /**
     * Stores the key-value pair.
     *
     * @param key   key of the entry to store
     * @param value value of the entry to store
     */
    function store(key, value) {
        log.debug( 'SimpleDBStore::store', JSON.stringify( arguments ) );

        // The json object to be stored will be flattened into an attribute list
        var attrs = jsonToAttributes( value );
        var request = PutAttributesRequest()
            .withDomainName( tableName )
            .withItemName( key )
            .withAttributes( attrs );

        try {
            client.putAttributes( request );
        } catch ( e ) {
            log.error( 'SimpleDBStore::store', e );
            throw e;
        }
    }

    /**
     * Stores multiple entries. Implementation of this method can optimize the
     * store operation by storing all entries in one database connection for instance.
     *
     * @param map map of entries to store
     */
    function storeAll(map) {
        var items = new java.util.ArrayList();
        map.entrySet().toArray().forEach(function(entry){
            items.add(
                new ReplaceableItem( entry.key, jsonToAttributes( entry.value ) )
            );
        });

        var request = BatchPutAttributesRequest()
            .withDomainName( tableName )
            .withItems( items );

        try {
            client.batchPutAttributes( request );
        } catch ( e ) {
            log.error( 'SimpleDBStore::storeAll', e);
            throw e;
        }
    }

    /**
     * Deletes the entry with a given key from the store.
     *
     * @param key key to delete from the store.
     */
    function del(key) {
        log.debug( 'SimpleDBStore::delete', JSON.stringify( arguments ) );

        // The json object to be stored will be flattened into an attribute list
        var request = DeleteAttributesRequest()
            .withDomainName( tableName )
            .withItemName( key );

        try {
            client.deleteAttributes( request );
        } catch ( e ) {
            log.error( 'SimpleDBStore::delete', e );
            throw e;
        }
    }

    /**
     * Deletes multiple entries from the store.
     *
     * @param keys keys of the entries to delete.
     */
    function deleteAll(keys) {
        var items = new java.util.ArrayList();
        map.entrySet().toArray().forEach(function(entry){
            items.add(
                new DeletableItem( entry.key )
            );
        });

        var request = BatchDeleteAttributesRequest()
            .withDomainName( tableName )
            .withItems( items );

        try {
            client.batchDeleteAttributes( request );
        } catch ( e ) {
            log.error( 'SimpleDBStore::deleteAll', e );
            throw e;
        }
    }

    function jsonToAttributes(value) {
        var json = typeof value === 'string' ? JSON.parse( value ) : value;
        var props = jsonToProps( json );
//        log.info( 'Making props: {}', JSON.stringify( props ) );

        var attrs = new java.util.ArrayList();
        attrs.add( new ReplaceableAttribute( '_value', value, true ) );
        Object.keys( props ).forEach( function ( key ) {
//            log.info( 'Entry key: {}, value: {}',
//                JSON.stringify( key ), JSON.stringify( props[key] ) );
            attrs.add(
                new ReplaceableAttribute()
                    .withReplace( true )
                    .withName( key )
                    .withValue( props[key] )
            );
        } );

        return attrs;
    }

    function tableExists( tableName ) {

        var request = new DomainMetadataRequest().withDomainName( tableName );
        try {
            client.domainMetadata( request );
        } catch ( e if e.javaException instanceof NoSuchDomainException ) {
            return false;
        }
        return true;
    }

    function init( options ) {
        log.debug( 'SimpleDBStore::init', JSON.stringify( options ) );

        var accessKey = options && options.accessKey;
        var secretKey = options && options.secretKey;

        if ( !accessKey ) throw {
            status : 400,
            message : 'SimpleDBStore instance requires an [accessKey] property in Hazelcast config.'
        };
        if ( !secretKey ) throw {
            status : 400,
            message : 'SimpleDBStore instance requires a [secretKey] property in Hazelcast config.'
        };

        log.debug( 'SimpleDBStore::init, authenticating to Amazon AWS using access key: {}, secret key: {}',
            accessKey, '<secret>' );
        var credentials = new BasicAWSCredentials( accessKey, secretKey );
        client = new AmazonSimpleDBClient( credentials );
        log.debug( "SimpleDBStore::init, handle to db client: {}", client );

        if ( !tableExists( tableName ) ) {
            log.error( 'Table does not exist: ', tableName );
            throw {
                status : 400,
                message : 'SimpleDBStore was unable to connect to table [' + tableName + ']'
            }
        }
    }

    init( options );

    return new MapStore( {
        load : load,
        loadAll : loadAll,
        loadAllKeys : loadAllKeys,
        store : store,
        storeAll : storeAll,
        "delete" : del,
        deleteAll : deleteAll,
        toString : function () {
            return 'SimpleDBStore::' + tableName
        }
    } );

};

