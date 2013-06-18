var log = require( 'ringo/logging' ).getLogger( module.id );

var store = require( 'hazelstore' );
var domain = require( 'domain' );

beforeEach( function () {
    store.init( 'hazelcast-simpledb.xml' );
} );

describe( 'User Domain', function () {

    var users, map;

    beforeEach( function () {
        users = new domain.Users('dev');
        expect( users ).toBeDefined();

        map = users.backingMap();
    } );

    afterEach( function () {
        map.clear();
    } );

    it( 'should fail if no body is included', function () {
        expect(function () {
            users.create();
        } ).toThrow( 'Users::create requires a json body' );
    } );

    it( 'will auto-generate id if not supplied', function () {
        var result = users.create( { name: 'fred', email : { address: 'fred@bedrock.com' } } );
        expect( result.userId ).toEqual( jasmine.any(String) );
    } );

    it( 'should fail if no email is included', function () {
        expect(function () {
            users.create( { userId : '123', name: 'fred' } );
        } ).toThrowMatch( 'Missing required property: address' );
    } );

    it( 'should default the email status', function () {
        var result = users.create( {
            userId : '123',
            name: 'fred',
            email : { address : 'fred@bedrock.com' } } );
        expect( result.email.status ).toEqual( 'candidate' );
    } );

    it( 'should default the user\'s role', function () {
        var result = users.create( {
            userId : '123',
            name: 'fred',
            email : { address : 'fred@bedrock.com' } } );
        expect( result.roles ).toBeArray( );
        expect( result.roles ).toEqual( ['ROLE_CANDIDATE'] );
    } );

    it( 'should be able to create a new user', function () {
        var result = users.create( fred );
        expect( result ).toBeDefined();
    } );

    it( 'should be able to create a "robust" user', function () {
        var result = users.create( wilma );
        expect( result ).toBeDefined();
        expect( result.userId ).toEqual( wilma.userId );
    } );

    it( 'should be able to read a new user', function () {
        var result = users.create( fred );
        expect( result ).toBeDefined();

        // Evict it so another read will occur
        map.evict( fred.userId );

        result = users.read( fred.userId );
        // The original [fred] object should not be modified
        expect( result ).not.toEqual( fred );
        expect( result.userId ).toEqual( fred.userId );
        expect( result.email ).toEqual( fred.email );
        expect( result.created ).toBeDefined();
    } );

    it( 'should be able to search for user by email', function () {
        users.create( fred );
        users.create( barney );
        users.create( betty );

        var results = users.read(
            "select * from `[mapname]` where `email.address` like 'b%'"
        );

        expect( results ).toBeArray();
        expect( results.length ).toEqual( 2 );

        // Convert to a map for comparing. todo: Create an "array in any order" match
        var expected = {};
        delete results[0].created;
        delete results[1].created;
        expected[results[0].userId] = results[0];
        expected[results[1].userId] = results[1];
        var actual = {};
        actual[barney.userId] = barney;
        actual[betty.userId] = betty;

        expect( expected ).toEqual( actual );

        results = users.read(
            'select * from `[mapname]` where `email.address` = "fred@bedrock.com"'
        );

        expect( results ).toBeArray();
        expect( results.length ).toEqual( 1 );
        delete results[0].created;
        expect( results ).toEqual( [fred] );
    } );

} );

// User has signed up, but not yet verified their email.
var fred = {
    userId: '123',
    name: 'fred',
    email : {
        address : 'fred@bedrock.com',
        status : 'candidate'
    },
    roles : [ 'ROLE_CANDIDATE' ]
};

// User is verified and selected a password and run a job.
var wilma = {
    userId: '456',
    name: 'wilma',
    email : {
        address : 'wilma@bedrock.com',
        status : 'verified'
    },
    password : '$2a$10$TzHJ5IdWP9ooyXanLoT5uuDYFeCTVUiHLw5JUjY9e8Wr9Ob7STHWC',
    services : {
        stripe : 'stripe_4382648',
        xero : 'xero_9382716'
    },
    roles : [ 'ROLE_USER' ]
};
// User is verified and selected a password, but has not started a run yet.
var betty = {
    userId: '789',
    name: 'betty',
    email : {
        address : 'betty@bedrock.com',
        status : 'verified'
    },
    password : '$2a$10$TzHJ5IdWP9ooyXanLoT5uuDYFeCTVUiHLw5JUjY9e8Wr9Ob7STHWC',
    roles : [ 'ROLE_USER' ]
};
// Password is verified, but user has not selected a password yet.
var barney = {
    userId: '987',
    name: 'barney',
    email : {
        address : 'barney@bedrock.com',
        status : 'verified'
    },
    roles : [ 'ROLE_CANDIDATE' ]
};


