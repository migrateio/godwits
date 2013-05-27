var log = require( 'ringo/logging' ).getLogger( module.id );

var {MapStoreFactory} = Packages.com.hazelcast.core;
var {DynamoDBStore} = require( './dynamo' );
var {SimpleDBStore} = require( './simpledb' );
var {convertPropsToMap} = require( '../utils' );

exports.DelegatingMapStoreFactory = function ( options ) {

    /*
     var mapStores = module.singleton('mapStores', function() {
     return {};
     });
     */
    var mapStores = {};

    /**
     * ### **newMapStore**
     *
     * Produces a MapLoader or a MapStore for the given map name and properties.
     *
     * @param mapName    name of the map (or other instance) that the produced MapLoader
     * or MapStore will serve
     * @param options the properties of the MapStoreConfig for the produced MapLoader
     * or MapStore
     */
    function createMapStore( mapName, options ) {
        log.debug( 'DelegatingMapStoreFactory::createMapStore',
            JSON.stringify( arguments ) );

        var storeEngine = options.storeEngine;
        if ( storeEngine ) {
            switch ( storeEngine ) {
                case 'dynamo':
                    return new DynamoDBStore( mapName, options );
                    break;
                case 'simpledb':
                    return new SimpleDBStore( mapName, options );
                    break;
                default:
                    throw { status : 400, message : 'Unknown storeEngine ['
                        + storeEngine + '] specified in hazelcast config'};
                    break;
            }
        }
    }

    /**
     * ### **newMapStore**
     *
     * Produces a MapLoader or a MapStore for the given map name and properties.
     *
     * @param {String} mapName name of the map (or other instance) that the produced MapLoader
     * or MapStore will serve
     * @param {java.util.Properties} props the properties of the MapStoreConfig for the produced MapLoader
     * or MapStore
     */
    function newMapStore( mapName, props ) {
        var mapParts = mapName.split( ':' );
        if ( mapParts.length > 0 ) mapName = mapParts[1];
        log.debug( 'DelegatingMapStoreFactory::newMapStore', mapName );
        var options = convertPropsToMap( props );
        var store = mapStores[mapName];
        if ( !store ) {
            store = createMapStore( mapName, options );
            if ( !store ) return null;
            mapStores[mapName] = store;
        }
        log.debug( 'DelegatingMapStoreFactory::newMapStore', store );
        return store;
    }

    log.info( 'DelegatingMapStoreFactory::init' );

    return  new MapStoreFactory( {
        newMapStore : newMapStore
    } );
};