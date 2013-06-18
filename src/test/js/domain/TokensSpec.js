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

    it( 'will auto-create a token id if not supplied', function () {
        var result = tokens.create( {
            user : { userId : 'abc' }
        } );
        expect( result.tokenId ).toEqual( jasmine.any( String ) );
    } );

    it( 'should fail if no user is included', function () {
        expect(function () {
            tokens.create( {
                tokenId : '123'
            } );
            tokens.create( { tokenId : '123' } );
        } ).toThrowMatch( 'Missing required property: user' );
    } );

    it( 'should be able to create a new token', function () {
        var result = tokens.create( {
            tokenId: '123',
            user: { userId: 'abc' }
        } );
        expect( result ).toBeDefined();
        expect( result.tokenId ).toEqual( '123' );
        expect( result.user ).toEqual( { userId: 'abc' } );
    } );

    it( 'should be able to auto delete a token after ttl', function () {
        runs( function () {
            var result = tokens.create( {
                tokenId: '123',
                user: { userId: 'abc' }
            }, 2, 'SECONDS' );
            expect( result ).toBeDefined();
        } );

        // Should be evicted and removed in under 6 seconds
        waits( 6000 );

        runs(function() {
            expect(function () {
                var result = tokens.read( '123' );
            } ).toThrow( 'Tokens::read not found [123]' );
        });
    } );
} );



