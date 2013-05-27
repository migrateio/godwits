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

    it( 'should fail if no id is included', function () {
        expect(function () {
            users.create( { email : { address: 'fred@bedrock.com' } } );
        } ).toThrowMatch( 'Missing required property: id' );
    } );

    it( 'should fail if no email is included', function () {
        expect(function () {
            users.create( { id : '123' } );
        } ).toThrowMatch( 'Missing required property: address' );
    } );

    it( 'should default the email status', function () {
        var result = users.create( {
            id : '123',
            email : { address : 'fred@bedrock.com' } } );
        expect( result.email.status ).toEqual( 'candidate' );
    } );

    it( 'should be able to create a new user', function () {
        var result = users.create( fred );
        expect( result ).toBeDefined();
    } );

    it( 'should be able to create a "robust" user', function () {
        var result = users.create( wilma );
        expect( result ).toBeDefined();
        expect( result.id ).toEqual( wilma.id );
    } );

    it( 'should be able to read a new user', function () {
        var result = users.create( fred );
        expect( result ).toBeDefined();

        // Evict it so another read will occur
        map.evict( fred.id );

        result = users.read( fred.id );
        // The original [fred] object should not be modified
        expect( result ).not.toEqual( fred );
        expect( result.id ).toEqual( fred.id );
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
        expected[results[0].id] = results[0];
        expected[results[1].id] = results[1];
        var actual = {};
        actual[barney.id] = barney;
        actual[betty.id] = betty;

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
    id: '123',
    email : {
        address : 'fred@bedrock.com',
        status : 'candidate'
    }
};

// User is verified and selected a password and run a job.
var wilma = {
    id: '456',
    email : {
        address : 'wilma@bedrock.com',
        status : 'verified'
    },
    password : '5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8',
    services : {
        stripe : 'stripe_4382648',
        xero : 'xero_9382716'
    }
};
// User is verified and selected a password, but has not started a run yet.
var betty = {
    id: '789',
    email : {
        address : 'betty@bedrock.com',
        status : 'verified'
    },
    password : '5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8'
};
// Password is verified, but user has not selected a password yet.
var barney = {
    id: '987',
    email : {
        address : 'barney@bedrock.com',
        status : 'verified'
    }
};


