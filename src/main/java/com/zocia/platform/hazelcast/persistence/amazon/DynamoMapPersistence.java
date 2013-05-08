package com.zocia.platform.hazelcast.persistence.amazon;

import com.amazonaws.auth.BasicAWSCredentials;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDB;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDBClient;
import com.amazonaws.services.dynamodbv2.model.*;
import com.hazelcast.core.HazelcastInstance;
import com.zocia.platform.hazelcast.persistence.MapPersistence;
import org.eclipse.jetty.util.ajax.JSON;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;

import java.util.*;

public class DynamoMapPersistence implements MapPersistence, InitializingBean {

    // Constants -------------------------------------------------------------------

    private static final Logger LOG = LoggerFactory.getLogger(DynamoMapPersistence.class);

    // Instances -------------------------------------------------------------------

    protected AmazonDynamoDB _dynamoDB;
    protected String _access = "ro";

    protected String _awsAccessKey;
    protected String _awsSecretKey;

    protected String _tableName;

    // Constructors ----------------------------------------------------------------

    public DynamoMapPersistence() {
        LOG.debug("Initializing DynamoMapPersistence");
    }


    // Implementing InitializingBean -----------------------------------------------


    @Override
    public void afterPropertiesSet() throws Exception {
        LOG.debug("Authenticating to Amazon AWS using access key: {}, secret key: {}",
                _awsAccessKey, "<secret>");
        BasicAWSCredentials credentials = new BasicAWSCredentials(_awsAccessKey, _awsSecretKey);
        _dynamoDB = new AmazonDynamoDBClient(credentials);
        LOG.debug("Handle to db client: {}", _dynamoDB);
    }


    // Protecteds ------------------------------------------------------------------

    protected boolean tableExists(String tableName) {
        DescribeTableRequest request = new DescribeTableRequest()
                .withTableName(tableName);
        try {
            _dynamoDB.describeTable(request);
        } catch (ResourceNotFoundException e) {
            return false;
        }
        return true;
    }

    // Properties ------------------------------------------------------------------

    public void setAccess(String access) {
        _access = access;
    }

    public void setAwsAccessKey(String awsAccessKey) {
        _awsAccessKey = awsAccessKey;
    }

    public void setAwsSecretKey(String awsSecretKey) {
        _awsSecretKey = awsSecretKey;
    }

    // MapLoaderLifecycleSupport ---------------------------------------------------

    /**
     * Initializes this MapLoader implementation. Hazelcast will call this method when
     * the map is first used on the HazelcastInstance. Implementation can initialize
     * required resources for the implementing mapLoader such as reading a config file
     * and/or creating database connection.
     *
     * @param hazelcastInstance HazelcastInstance of this mapLoader.
     * @param properties        Properties set for this mapStore. see MapStoreConfig
     * @param mapName           name of the map.
     */
    public void init(HazelcastInstance hazelcastInstance, Properties properties, String mapName) {
        if (LOG.isInfoEnabled()) {
            LOG.info("Initializing the persistence for map {}. Additional props: {}",
                    mapName, properties.toString());
        }

        _access = "rw";
        _tableName = mapName;

        // mapName is the table name we are seeking
        if (!tableExists(_tableName)) {
            throw new IllegalArgumentException("Failed to find a DynamoDB table named: " + _tableName);
        }
    }

    /**
     * Hazelcast will call this method before shutting down.
     * This method can be overridden to cleanup the resources
     * held by this map loader implementation, such as closing the
     * database connections etc.
     */
    public void destroy() {
        try {
            _dynamoDB.shutdown();
        } catch (Exception e) {
            LOG.error("Failure attempting to stop dynamoDB client.", e);
        }
    }


    // MapStore Implementation -----------------------------------------------------


    /**
     * Deletes the entry with a given key from the store.
     *
     * @param key key to delete from the store.
     */
    public void delete(Object key) {
        if (_access.equalsIgnoreCase("ro") || _access.equalsIgnoreCase("rw")) {
            LOG.warn("Permission error while deleting document, " +
                    "table [{}], key [{}], access [{}]",
                    _tableName, key, _access);
            return;
        }

        HashMap<String, AttributeValue> map = new HashMap<String, AttributeValue>();
        map.put("_id", new AttributeValue().withS(key.toString()));

        DeleteItemRequest request = new DeleteItemRequest()
                .withTableName(_tableName)
                .withKey(map);
        try {
            _dynamoDB.deleteItem(request);
        } catch (ResourceNotFoundException e) {
            // Not really a problem
        }

        if (LOG.isDebugEnabled()) {
            LOG.debug("Deleting document, table [{}], key [{}]",
                    _tableName, key);
        }
    }

    /**
     * Deletes multiple entries from the store.
     *
     * @param keys keys of the entries to delete.
     */
    public void deleteAll(Collection keys) {
        for (Object key : keys) {
            delete(key);
        }
    }

    /**
     * Stores multiple entries. Implementation of this method can optimize the
     * store operation by storing all entries in one database connection for instance.
     * <p/>
     *
     * @param map map of entries to store
     */
    public void storeAll(Map map) {
        for (Object item : map.entrySet()) {
            Map.Entry entry = (Map.Entry) item;
            store(entry.getKey(), entry.getValue());
        }
    }

    /**
     * Stores the key-value pair. For a REST service like ours, this is typically be a two-step
     * process. We have to determine whether we are inserting a record for the first time, or
     * updating an existing record. This will require a GET request followed by either a POST or
     * PUT request depending on whether the record previously existed.
     * <p/>
     * Besides the drawback where we have to make two requests, the other problem is the GET
     * request must return before the POST/PUT can follow up. This is a real drag to performance.
     * <p/>
     * On the plus side, performance is not especially important when it comes to storing as it is
     * an asynchronous activity on the part of this persistence bridge.
     *
     * @param key   key of the entry to store
     * @param value value of the entry to store
     */
    public void store(Object key, Object value) {
        LOG.info("Storing, key: [{}], value: [{}]", key, value);
        if (_access.equalsIgnoreCase("ro")) {
            LOG.warn("Readonly permission prevents either inserting or updating document, " +
                    "table [{}], key [{}], access [{}]",
                    _tableName, key, _access);
            return;
        }

        String[] split = key.toString().split("\\\\");


        Map<String, AttributeValue> item = new HashMap<String, AttributeValue>();
        item.put("key", new AttributeValue(key.toString()));
        item.put("value", new AttributeValue(value.toString()));
        PutItemRequest putItemRequest = new PutItemRequest(_tableName, item);
        _dynamoDB.putItem(putItemRequest);
    }

    // MapLoader Implementation ----------------------------------------------------


    /**
     * Loads the values for a given key. If distributed map doesn't contain the value
     * for the given key then Hazelcast will call implementation's load (key) method
     * to obtain the value. Implementation can use any means of loading the given key;
     * such as an O/R mapping tool, simple SQL or reading a file etc.
     *
     * @param key The key to lookup. May contain a locale by using an '@' as delimeter.
     *            <key>[@<locale>]. If no locale is included, a search for key across
     *            all locales is performed.
     * @return value of the key
     */
    public Object load(Object key) {
        if (LOG.isDebugEnabled()) {
            LOG.debug("Loading document, table [{}], key [{}]",
                    _tableName, key);
        }

        HashMap<String, AttributeValue> map = new HashMap<String, AttributeValue>();
        map.put("_id", new AttributeValue().withS(key.toString()));

        GetItemRequest request = new GetItemRequest()
                .withTableName(_tableName)
                .withKey(map);
        try {
            GetItemResult result = _dynamoDB.getItem(request);
            Map<String, AttributeValue> item = result.getItem();
            return item.get("json").getS();
        } catch (ResourceNotFoundException e) {
            LOG.warn("Failed to load a record from table [{}] and key [{}]", _tableName, key);
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
    public Map<Object, Object> loadAll(Collection keys) {
        Map<Object, Object> result = new HashMap<Object, Object>(keys.size());

        for (Object key : keys) {
            result.put(key, load(key));
        }
        return result;
    }

    /**
     * Loads all of the keys from the store.
     *
     * @return all the keys
     */
    public Set loadAllKeys() {
        return null;
    }

}
