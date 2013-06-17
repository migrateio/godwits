var log = require( 'ringo/logging' ).getLogger( module.id );

var store = require( 'hazelstore' );
var domain = require( 'domain' );

beforeEach( function () {
    store.init( 'hazelcast-simpledb.xml' );
} );

describe( 'Job Domain', function () {

    var jobs, map;

    beforeEach( function () {
        jobs = new domain.Jobs( 'dev' );
        expect( jobs ).toBeDefined();

        map = jobs.backingMap();
    } );

    afterEach( function () {
        map.clear();
    } );

    it( 'should create a base object with no body', function () {
        var result = jobs.create();
        expect( result.jobId ).toEqual( jasmine.any( String ) );
        expect( result.status ).toEqual( 'pending' );
        expect( result.created ).toEqual( jasmine.any( String ) );
        expect( Date.now() - new Date( result.created ).getTime() ).toBeLessThan( 5000 );
    } );

     it( 'should autogenerate an id and default the status', function () {
        var result = jobs.create( {} );
        expect( result.jobId ).toEqual( jasmine.any( String ) );
        expect( result.status ).toEqual( 'pending' );
    } );

    it( 'should allow to set a status', function () {
        var result = jobs.create( {
            status: 'active'
        } );
        expect( result.status ).toEqual( 'active' );
    } );

     it( 'should fail if status is not one of the proper values', function () {
        expect(function () {
            jobs.create( {
                status: 'cancelled'
            } )
        } ).toThrowMatch( 'No enum match for:.+cancelled' );
    });

    it( 'should fail if source.service is not one of the blessed values', function () {
        expect(function () {
            jobs.create( {
                source : {
                    service : 'goggle'
                }
            } )
        } ).toThrowMatch( 'No enum match for:.+goggle' );

    } );

     it( 'should allow for a source to be added', function () {
        var result = jobs.create( {
            source: {
                service: 'google'
            }
        } );
        expect( result.source.service ).toEqual( 'google' );
    } );

    it( 'should fail if source.service is not included', function () {
        expect(function () {
            jobs.create( {
                source: {
                    username: 'jcook'
                }
            } )
        } ).toThrowMatch( 'Missing required property: service' );
    });

    it( 'should fail if destination.service is not one of the blessed values', function () {
        expect(function () {
            jobs.create( {
                destination : {
                    service : 'yahooo'
                }
            } )
        } ).toThrowMatch( 'No enum match for:.+yahooo' );

    } );

     it( 'should allow for a destination to be added', function () {
        var result = jobs.create( {
            destination: {
                service: 'yahoo'
            }
        } );
        expect( result.destination.service ).toEqual( 'yahoo' );
    } );

    it( 'should fail if destination.service is not included', function () {
        expect(function () {
            jobs.create( {
                destination: {
                    username: 'jcook'
                }
            } )
        } ).toThrowMatch( 'Missing required property: service' );
    });

    it( 'should not allow duplicates in the content property', function () {
        expect(function () {
            jobs.create( {
                content: ['mails', 'contacts', 'mails']
            } )
        } ).toThrowMatch( 'Array items are not unique' );
    } );

    it( 'should not allow unknown values in the content property', function () {
        expect(function () {
            jobs.create( {
                content: ['mails', 'contacts', 'hearts']
            } )
        } ).toThrowMatch( 'No enum match for: ..hearts' );
    } );

    it( 'should allow the content property to be set', function () {
        var result = jobs.create( {
            content: ['mails', 'contacts', 'media']
        } );
        expect( result.content ).toEqual( ['mails', 'contacts', 'media'] );
    } );

} );