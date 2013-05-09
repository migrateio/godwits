'use strict';

var log = require( 'ringo/logging' ).getLogger( module.id );
var {MapStore} = Packages.com.hazelcast.core;
var {BasicAWSCredentials} = Packages.com.amazonaws.auth;
var {
    AmazonSimpleDBClient
    } = Packages.com.amazonaws.services.simpledb;

exports.SimpleDBStore = function ( mapName, options ) {

    var dynamoDB;
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

        // If the key is an object, it is a json
        if (typeof key === 'object') {

        }
        try {
            var map = new java.util.HashMap();
            map.put( "key", new AttributeValue().withS( key.toString() ) );

            var request = new GetItemRequest()
                .withTableName( tableName )
                .withKey( map );
            var result = dynamoDB.getItem( request );
            var attrVals = result.getItem();
            if (!attrVals) return null;
            var value = attrVals.get( 'value' );
            return value ? value.getS() : null;
        } catch ( e if e.javaException instanceof ResourceNotFoundException ) {
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

        var item = new java.util.HashMap();
        item.put("key", new AttributeValue(key.toString()));
        item.put("value", new AttributeValue(new java.lang.String(value)));
        var request = new PutItemRequest(tableName, item);
        dynamoDB.putItem(request);
    }

    /**
     * Stores multiple entries. Implementation of this method can optimize the
     * store operation by storing all entries in one database connection for instance.
     *
     * @param map map of entries to store
     */
    function storeAll(map) {
        map.entrySet().toArray().forEach(function(entry){
            store( entry.key, entry.value );
        });
    }

    /**
     * Deletes the entry with a given key from the store.
     *
     * @param key key to delete from the store.
     */
    function del(key) {
        log.debug( 'SimpleDBStore::delete', JSON.stringify( arguments ) );
        var map = new java.util.HashMap();
        map.put("key", new AttributeValue().withS(key.toString()));

        var request = new DeleteItemRequest()
            .withTableName(tableName)
            .withKey(map);

        try {
            dynamoDB.deleteItem(request);
        } catch ( e if e.javaException instanceof ResourceNotFoundException ) {
            // Not really a problem
        }
    }

    /**
     * Deletes multiple entries from the store.
     *
     * @param keys keys of the entries to delete.
     */
    function deleteAll(keys) {
        log.debug( 'SimpleDBStore::deleteAll' );
        keys.toArray().forEach( del );
    }

    function tableExists( tableName ) {

        var request = new DomainMetadataRequest().withDomainName( tableName );
        try {
            dynamoDB.domainMetadata( request );
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
        dynamoDB = new AmazonSimpleDBClient( credentials );
        log.debug( "SimpleDBStore::init, handle to db client: {}", dynamoDB );

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

