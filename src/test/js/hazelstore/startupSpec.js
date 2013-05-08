var log = require( 'ringo/logging' ).getLogger( module.id );
var store = require( 'hazelstore' );
var uuid = require( 'hazelstore/utils' );

var {Hazelcast} = Packages.com.hazelcast.core;

describe( 'Hazelstore startup', function () {


    beforeEach( function () {
        log.info( 'beforeEach 1' );
        store.shutdown();
        expect( Hazelcast.allHazelcastInstances.size() ).toEqual( 0 );
    } );

    it( 'should initialize with no options', function () {
        store.init();
        expect( Hazelcast.allHazelcastInstances.size() ).toEqual( 1 );
    } );


    it( 'should initialize with options', function () {
        store.init( 'hazelcast-dynamo.xml', {
            name : uuid.generateId()
        } );
        expect( Hazelcast.allHazelcastInstances.size() ).toEqual( 1 );
    } );

    afterEach( function () {
        log.info( 'afterEach 1' );
        store.shutdown();
        expect( Hazelcast.allHazelcastInstances.size() ).toEqual( 0 );
    } );
} );

describe( 'Hazelcast map operations with dynamo ', function () {

    var map;

    beforeEach( function () {
        log.info( 'beforeEach 2' );
        store.shutdown();
        store.init( {
                config : 'hazelcast-dynamo.xml',
                name : uuid.generateId()
            }
        );
        map = store.getMap( 'dev-users' );
        expect(map ).toBeDefined();
    } );

    it( 'should allow us to store and retrieve', function (  ) {
        var result, user = { name : 'Fred Flintstone'};

        result = map.get( '123' );
        log.info( 'Result of map.get: {}', JSON.stringify( result ) );
        expect( result ).toBeNull();

        result = map.put( '123', user );
        log.info( 'Result of map.put: {}', JSON.stringify( result ) );
        expect( result ).toBeNull();

        result = map.evict( '123' );
        log.info( 'Result of map.evict: {}', JSON.stringify( result ) );
        expect( result ).toBe( true );

        result = map.get( '123' );
        log.info( 'Result of map.get: {}', JSON.stringify( result ) );
        expect( result ).toEqual( user );
    } );

    afterEach( function (  ) {
        log.info( 'afterEach 1' );
        try {
            map.clear();
            store.shutdown();
            expect( Hazelcast.allHazelcastInstances.size() ).toEqual( 0 );
            log.info( 'shut down' );
        } catch ( e ) {
            log.error( 'ERROR', e );
        }
    } );
} );
