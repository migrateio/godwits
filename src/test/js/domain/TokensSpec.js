var log = require( 'ringo/logging' ).getLogger( module.id );

var store = require( 'hazelstore' );
var domain = require( 'domain' );

beforeEach( function () {
    store.init( 'hazelcast-simpledb.xml' );
} );

describe( 'Token Domain', function () {

    var tokens, map;

    beforeEach( function () {
        tokens = new domain.Tokens( 'dev' );
        expect( tokens ).toBeDefined();

        map = tokens.backingMap();
    } );

    afterEach( function () {
        map.clear();
    } );

    it( 'should fail if no body is included', function () {
        expect(function () {
            tokens.create();
        } ).toThrow( 'Tokens::create requires a json body' );
    } );

    it( 'should fail if no id is included', function () {
        expect(function () {
            tokens.create( { userId : 'abc' } );
        } ).toThrowMatch( 'Missing required property: id' );
    } );

    it( 'should fail if no user id is included', function () {
        expect(function () {
            tokens.create( { id : '123' } );
        } ).toThrowMatch( 'Missing required property: userId' );
    } );

    it( 'should be able to create a new token', function () {
        var result = tokens.create( { id: '123', userId: 'abc' } );
        expect( result ).toBeDefined();
        expect( result.id ).toEqual( '123' );
        expect( result.userId ).toEqual( 'abc' );
    } );

    it( 'should be able to auto delete a token after ttl', function () {
        runs( function () {
            var result = tokens.create( { id: '123', userId: 'abc' }, 2, 'SECONDS' );
            expect( result ).toBeDefined();
        } );

        // Should be evicted and removed in 10 seconds
        waits( 10000 );

        runs(function() {
            expect(function () {
                var result = tokens.read( '123' );
            } ).toThrow( 'Tokens::read not found [123]' );
        });
    } );
} );



