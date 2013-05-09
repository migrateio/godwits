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
    DeleteAttributesRequest, BatchPutAttributesRequest, ReplaceableItem,
    PutAttributesRequest, GetAttributesRequest, ReplaceableAttribute
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
                log.debug( 'SimpleDBStore::load, attrs: ', attr );
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
        log.info( 'Making pmvn clean testrops: {}', JSON.stringify( props ) );

        var attrs = new java.util.ArrayList();
        attrs.add( new ReplaceableAttribute( '_value', value, true ) );
        Object.keys( props ).forEach( function ( key ) {
            log.info( 'Entry key: {}, value: {}',
                JSON.stringify( key ), JSON.stringify( props[key] ) );
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

