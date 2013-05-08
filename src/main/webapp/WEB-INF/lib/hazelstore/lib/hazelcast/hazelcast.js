'use strict';

var log = require( 'ringo/logging' ).getLogger( module.id );

var {Map} = require( './map' );
var {Set} = require( './set' );
var {convertPropsToMap} = require( '../utils' );
var {DelegatingMapStoreFactory} = require( '../store/mapStoreFactory' );
var {Config, XmlConfigBuilder} = Packages.com.hazelcast.config;
var {Hazelcast} = Packages.com.hazelcast.core;

/*
var maps = module.singleton( "maps", function () {
    return {}
} );
*/

var hazelcast;
var maps = {};
var sets = {};
var entryListeners = [];

exports.shutdown = function () {
    log.debug( 'shutdown::hazelcast instance: {}', hazelcast);
    if ( hazelcast )
        hazelcast.lifecycleService.shutdown();
//    hazelcast.shutdownAll();
    hazelcast = null;
};

/**
 *
 *
 * @param {String} [configFileName]
 * @param {Object} options
 */
exports.init = function () {
    var configFileName, options;
    var args = Array.slice( arguments );
    if ( typeof args[0] === 'string' ) configFileName = args.shift();
    if ( typeof args[0] === 'object' ) options = args.shift();

    var config;

    if (!configFileName) configFileName = options.config;
    log.debug( 'init::hazelcast, config file: {}, options: {}',
        configFileName, JSON.stringify( options ));

    if ( configFileName ) {
        var configurationUrl = java.lang.Thread.currentThread().contextClassLoader
            .getResource( configFileName );
        if ( configurationUrl == null ) {
            throw {
                status : 400,
                message : 'Config file [' + configFileName + '] was not found on the classpath'
            };
        }
        log.info( 'Using configuration file ' + configurationUrl.getFile()
            + ' in the classpath.' );

        config = new XmlConfigBuilder( configurationUrl.openStream() ).build();
    } else {
        config = new XmlConfigBuilder().build();
    }

    if (options.name) config.groupConfig.setName( options.name );

    // Iterate over map configs and setup those map stores that need it.
    config.mapConfigs.entrySet().toArray().forEach( initializeMapStores );

    hazelcast = Hazelcast.newHazelcastInstance( config );
};

/**
 *
 * @param mapConfigs
 */
function initializeMapStores( entry ) {
    var mapConfig = entry.value;
    var mapStoreConfig = mapConfig.getMapStoreConfig();

    // We can bail if there is no MapStoreConfig; ie: <map-store enabled = 'false'>
    if ( mapStoreConfig ) {
        log.info( 'MapStoreConfig: {}', mapStoreConfig.toString() );

        // If there is a property <storeEngine>, then we take over, otherwise bail
        var props = convertPropsToMap( mapStoreConfig.properties );
        if (props.storeEngine) {
            log.info( 'Store engine: ', props.storeEngine );
            var factory = new DelegatingMapStoreFactory();
            mapStoreConfig.setFactoryImplementation( factory );
        }
    }
}

exports.getMap = function ( mapName ) {
    log.debug( 'getMap::mapName: {}', mapName );
    var result = maps[mapName];
    if ( !result ) {
        log.debug( 'getMap::cache miss, mapName: {}', mapName );
        result = maps[mapName] = new Map( hazelcast, mapName );
        applyListeners( result );
    }
    return result;
};

exports.getSet = function ( name ) {
    log.debug( 'getSet::name: ' + name );
    var result = sets[name];
    if ( !result ) {
        log.debug( 'getSet::cache miss: ' + name );
        result = sets[name] = new Set( hazelcast, name );
    }
    return result;
};


exports.lock = function ( map, func, delay ) {
    if ( isNaN( delay ) ) delay = 3000;

    var result = null;
    var hzMap = map.hzObject;
    var hzLock = hazelcast.getLock( hzMap );

    if ( hzLock.tryLock( delay, TimeUnit.MILLISECONDS ) ) {
        try {
            result = func.call( this, map );
        } finally {
            hzLock.unlock();
        }
    }

    return result;
};

// Not tested
exports.inTransaction = function ( func ) {
    var txn = hazelcast.getTransaction();
    txn.begin();
    try {
        func.call( this );
        txn.commit();
    } catch ( t ) {
        txn.rollback();
        throw t;
    }
};

/**
 * Registers a set of entry listeners on maps. This function allows events to be applied to matching
 * maps in a lazy manner. If any maps exist when this function is called, they will be checked for
 * a match, and if found the listeners will be added. As new maps are created, the index and map
 * names are matched to find out if any existing listeners should be applied.
 *
 * @param {String} name A unique name that identifies this listener.
 * @param {Array|String} index The name of the map's index, or null if it applies to all indices
 * @param {Array|String} type The name of the map's type, or null if it applies to all indices
 * @param {Array|String} events A list of events to map to, or can be a single event name
 * @param {Function} f The function to execute when an event is detected.
 */
exports.registerListener = function ( name, index, type, events, f ) {
    var listener = {
        name : name,
        index : index === null ? [] : [].concat( index ),
        type : type === null ? [] : [].concat( type ),
        events : [].concat( events ),
        f : f
    };

    entryListeners.push( listener );

    var arrMaps = [];
    for each ( var map in maps ) arrMaps.push( map );
    applyListeners( arrMaps, listener );
};

/**
 * Apply the listener to all maps that match the listener filters of index and type.
 *
 * @param maps
 * @param listeners
 */
function applyListeners( maps, listeners ) {
    if ( !Array.isArray( maps ) ) maps = [].concat( maps );
    if ( !listeners ) listeners = entryListeners;
    if ( !Array.isArray( listeners ) ) listeners = [].concat( listeners );

    maps.forEach( function ( map ) {
        listeners.forEach( function ( listener ) {
            var match = true;

//            log.info('Checking map {} against listener: {}', map.name, JSON.stringify(listener,null,4));
            if ( match && listener.index.length > 0 )
                match = listener.index.indexOf( map.index ) >= 0;
            if ( match && listener.type.length > 0 )
                match = listener.type.indexOf( map.type ) >= 0;

            if ( match ) {
                var l = {name : listener.name};
                listener.events.forEach( function ( name ) {
                    l[name] = listener.f;
                } );
//                log.info('Map {} is adding listener: {}', map.name, JSON.stringify(l,null,4));
                map.addEntryListener( l );
            }
        } );
    } );
}

/**
 * Clear all listeners on all maps.
 *
 */
exports.clearListeners = function () {
    entryListeners = [];
    for each ( var map in maps ) map.clearEntryListeners();
};