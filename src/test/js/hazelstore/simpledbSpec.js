var log = require( 'ringo/logging' ).getLogger( module.id );
var store = require( 'hazelstore' );
var {generateId} = require( 'hazelstore/utils' );

var {Hazelcast} = Packages.com.hazelcast.core;

xdescribe( 'Hazelstore startup', function () {


    beforeEach( function () {
    } );

    it( 'should initialize with no options', function () {
        store.init();
        expect( Hazelcast.allHazelcastInstances.size() ).toEqual( 1 );
    } );


    it( 'should initialize with options', function () {
        store.init( 'hazelcast-simpledb.xml', {
            name : generateId()
        } );
        expect( Hazelcast.allHazelcastInstances.size() ).toEqual( 1 );
    } );

    afterEach( function () {
        store.shutdown();
        expect( Hazelcast.allHazelcastInstances.size() ).toEqual( 0 );
    } );
} );

describe( 'Hazelcast map operations with simpledb ', function () {

    var map;

    beforeEach( function () {
        log.info( 'beforeEach 2' );
        store.init( {
                config : 'hazelcast-simpledb.xml',
                name : generateId()
            }
        );
        map = store.getMap( 'dev-users' );
        expect( map ).toBeDefined();
    } );

    it( 'should allow us to store and retrieve', function () {
        var result, user = { name : 'Fred Flintstone'};

        result = map.get( '123' );
        expect( result ).toBeNull();

        result = map.put( '123', user );
        expect( result ).toBeNull();

        result = map.evict( '123' );
        expect( result ).toBe( true );

        result = map.get( '123' );
        expect( result ).toEqual( user );
    } );

    afterEach( function () {
        log.info( 'afterEach 1' );
        map.clear();
    } );
} );
