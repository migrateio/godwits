var log = require( 'ringo/logging' ).getLogger( module.id );

var store = require( 'hazelstore' );
var domain = require( 'domain' );

beforeEach( function () {
    store.init( 'hazelcast-simpledb.xml' );
} );

describe( 'User Domain', function () {

    var users, map;

    beforeEach( function () {
        users = new domain.Users();
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

    it( 'should fail if no email is included', function () {
        expect(function () {
            users.create( {} );
        } ).toThrowMatch( 'Missing required property: address' );
    } );

    it( 'should default the email status', function () {
        var result = users.create( { email : { address : 'fred@bedrock.com' } } );
        expect( result.email.status ).toEqual( 'candidate' );
    } );

    it( 'should be able to create a new user', function () {
        var result = users.create( fred );
        expect( result ).toBeDefined();
    } );

    it( 'should be able to read a new user', function () {
        var result = users.create( fred );
        expect( result ).toBeDefined();

        // Evict it so another read will occur
        map.evict( fred.email.address );

        result = users.read( fred.email.address );
        // The original [fred] object should not be modified
        expect( result ).not.toEqual( fred );
        expect( result.created ).toBeDefined();
    } );

} );

// User has signed up, but not yet verified their email.
var fred = {
    email : {
        address : 'fred@bedrock.com',
        status : 'candidate'
    }
};

// User is verified and selected a password and run a job.
var wilma = {
    email : {
        address : 'wilma@bedrock.com',
        status : 'verified'
    },
    password : '5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8',
    service : {
        stripe : 'stripe_4382648',
        xero : 'xero_9382716'
    }
};
// User is verified and selected a password, but has not started a run yet.
var betty = {
    email : {
        address : 'betty@bedrock.com',
        status : 'verified'
    },
    password : '5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8'
};
// Password is verified, but user has not selected a password yet.
var barney = {
    email : {
        address : 'barney@bedrock.com',
        status : 'verified'
    }
};


