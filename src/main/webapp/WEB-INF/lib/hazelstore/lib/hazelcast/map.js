/*
 * Copyright (c) 2010, Pykl Studios <admin@pykl.com>, All rights reserved.
 */
var log = require( 'ringo/logging' ).getLogger( module.id );

exports.Map = Map;

// An executor service will be created as a singleton and be available to all maps. This will
// allow us to manage the thread pool and cap it at a reasonable number of threads.
// todo: Expose the thread count as a configurable option
var executor = module.singleton( module.id, function () {
    var MAX_THREADS = 20;
    return new Packages.com.zocia.platform.AsyncExecutorService( MAX_THREADS );
} );

function Map( hazelcast, mapName ) {

    // Instances -------------------------------------------------------------------

    // Keep track of the entry listeners added by the user.
    var _entryListeners = [];

    // Privates --------------------------------------------------------------------

    /**
     * Adds an entry listener which can be notified via callback function when an entry is added,
     * removed, updated or evicted from the map. These notifications will occur asynchronously and
     * they occur _after_ the event has been performed on the cache.
     *
     * The listener will have to provide at least one valid callback function. The function names
     * are entryAdded(entry), entryRemoved(entry), entryUpdated(entry) and entryEvicted(entry). If
     * the entry is a JSON object (which they all are), the entry will be a parsed JSON object. If
     * not, the entry parameter will be passed as-is.
     *
     * Each listener has a name property that uniquely identifies the listener. This is a bit of
     * a hack to prevent multiple listeners from being registered when the JS platform reloads
     * modules when they have been modified. In these cases, the registerListener() functions
     * fire again when the module is reloaded, and there is insufficient uniqueness in the
     * current set of parameters to determine if the registration is a duplicate or two
     * different listeners on the same event.
     *
     * @param listener
     */
    var addEntryListener = function ( listener ) {
        if ( !listener.entryAdded && !listener.entryRemoved &&
            !listener.entryUpdated && !listener.entryEvicted ) {
            throw 'EntryListener must implement a valid callback function.';
        }

        if ( !listener.name ) {
            throw 'EntryListener must have a unique name.';
        }

        // Remove a listener with the same name if it exists
        _entryListeners = _entryListeners.filter( function ( l ) {
            return listener.name !== l.name
        } );

        _entryListeners.push( listener );
    };

    var clearEntryListeners = function () {
        _entryListeners = [];
    };

    var invokeListeners = function ( eventName, event ) {
        log.debug( 'Received internal event: {}, checking for listeners among [{}] candidates.',
            eventName, _entryListeners.length );
        if ( _entryListeners.length > 0 ) {
            // Create the object we will be passing into each of our listeners
            var entry = {
                key : event.key,
                index : index,
                type : type,
                source : mapName,
                value : event.value,
                oldValue : event.oldValue
            };

            if ( typeof entry.value === 'string' ) {
                try {
                    entry.value = JSON.parse( entry.value );
                } catch ( e ) {
                }
            }

            if ( typeof entry.oldValue === 'string' ) {
                try {
                    entry.oldValue = JSON.parse( entry.oldValue );
                } catch ( e ) {
                }
            }

            for ( var i = 0; i < _entryListeners.length; i++ ) {
                var handler = _entryListeners[i][eventName];
                if ( handler ) {
                    executor.submit( createTask( eventName, handler, entry ) );
                }
            }
        }

        function createTask( eventName, func, entry ) {
            return new java.lang.Runnable( {
                run : function () {
                    try {
                        func( entry );
                    } catch ( e ) {
                        log.error( 'Error executing listener event: {}', eventName, e );
                    }
                }
            } );
        }
    };

    /**
     * Puts an entry into this map with a given ttl (time to live) value.
     * Entry will expire and get evicted after the ttl.
     *
     * @param {String} key key of the entry
     * @param {Object} value value of the entry
     * @param {Number} ttl maximum time for this entry to stay in the map
     * @param {String} timeunit time unit for the ttl
     * @return {Object} old value of the entry
     */
    var put = function ( key, value, ttl, timeunit ) {
        log.debug( 'Putting into map [{}]: {}', mapName, key );
        if (typeof key !== 'string') throw { status: 400,
            message: 'map.put requires a parameter [key] of type string'
        };

        if ( isNaN( ttl ) ) ttl = 0;
        timeunit = typeof timeunit === 'string'
            ? java.util.concurrent.TimeUnit.valueOf( timeunit ) : null;

        var json = JSON.stringify( value );
        return map.put( key, json, ttl, timeunit );
    };

    /**
     * Returns the value to which the specified key is mapped,
     * or {@code null} if this map contains no mapping for the key.
     *
     * <p>If this map permits null values, then a return value of
     * {@code null} does not <i>necessarily</i> indicate that the map
     * contains no mapping for the key; it's also possible that the map
     * explicitly maps the key to {@code null}.  The {@link #containsKey
     * containsKey} operation may be used to distinguish these two cases.
     *
     * @param key the key whose associated value is to be returned
     * @return the value to which the specified key is mapped, or
     *         {@code null} if this map contains no mapping for the key
     */
    var get = function ( key ) {
        if ( typeof key === 'object' ) return queryGet( key );
        log.debug( 'Getting from map [{}]: {}', mapName, key );
        var value = map.get( key );
        if ( typeof value === 'string' ) {
            return JSON.parse( value );
        } else {
            return null;
        }
    };


    /**
     * Returns a set view of the keys contained in this map.  The set is
     * backed by the map, so changes to the map are reflected in the set, and
     * vice-versa.  If the map is modified while an iteration over the set is
     * in progress (except through the iterator's own <tt>remove</tt>
     * operation), the results of the iteration are undefined.  The set
     * supports element removal, which removes the corresponding mapping from
     * the map, via the <tt>Iterator.remove</tt>, <tt>Set.remove</tt>,
     * <tt>removeAll</tt> <tt>retainAll</tt>, and <tt>clear</tt> operations.
     * It does not support the add or <tt>addAll</tt> operations.
     *
     * @return a set view of the keys contained in this map.
     */
    var keySet = function () {
        return map.keySet();
    };


    var evict = function ( key ) {
        log.debug( 'Evicting from map [{}]: {}', mapName, key );
        return map.evict( key );
    };


    /**
     * Removes the mapping for a key from this map if it is present
     * (optional operation).   More formally, if this map contains a mapping
     * from key <tt>k</tt> to value <tt>v</tt> such that
     * <code>(key==null ?  k==null : key.equals(k))</code>, that mapping
     * is removed.  (The map can contain at most one such mapping.)
     *
     * <p>Returns the value to which this map previously associated the key,
     * or <tt>null</tt> if the map contained no mapping for the key.
     *
     * <p>The map will not contain a mapping for the specified key once the
     * call returns.
     *
     * @param key key whose mapping is to be removed from the map
     * @return the previous value associated with <tt>key</tt>, or
     *         <tt>null</tt> if there was no mapping for <tt>key</tt>.
     */
    var remove = function ( key ) {
        log.debug( 'Removing from map [{}] using key: {}', mapName, key );
        var previous = map.remove( key );
        return (previous) ? JSON.parse( previous ) : null;
    };


    /**
     * Removes all of the mappings from this map (optional operation).
     * The map will be empty after this call returns.
     */
    var clear = function () {
        map.clear();
    };

    var size = function () {
        return map.size();
    };


    var toString = function () {
        return 'Hazelcast Map [' + mapName + ']';
    };

    // Constructors ----------------------------------------------------------------

    if ( !mapName ) throw { status : 400,
        message : 'Map name must be set'
    };

    // Use the Hazelcast instance to retrieve the map by name
    var map = hazelcast.getMap( mapName );

    // attach a listener to the map to be notified of any events that occur on the map.
    var listener = new com.hazelcast.core.EntryListener( {
        entryAdded : function ( event ) {
            invokeListeners( 'entryAdded', event );
        },
        entryRemoved : function ( event ) {
            invokeListeners( 'entryRemoved', event );
        },
        entryUpdated : function ( event ) {
            invokeListeners( 'entryUpdated', event );
        },
        entryEvicted : function ( event ) {
            invokeListeners( 'entryEvicted', event );
        }
    } );

    // We use the local version of the entry listener because we usually only want one node in the
    // cluster to handle the event. If all of our nodes were notified when an event fired, we would
    // have to do some distributed gymnastics to ensure only one node handled the event. So, this
    // local event listening is very crucial, and provides excellent performance.
    log.debug( 'Adding Hazelcast event listener to map [{}]', mapName );
    map.addLocalEntryListener( listener );


    return {
        addEntryListener : addEntryListener,
        clearEntryListeners : clearEntryListeners,
        clear : clear,
        evict : evict,
        get : get,
        keySet : keySet,
        hzObject : map,
        name : mapName,
        put : put,
        remove : remove,
        size : size,
        toString : toString
    };
}
