var log = require( 'ringo/logging' ).getLogger( module.id );

var {Worker, WorkerPromise} = require( 'ringo/worker' );

describe( 'DeciderPoller', function () {

    describe( 'should have proper init values', function () {

        var w;

        beforeEach( function () {
            w = new Worker( 'workflow/deciderPoller' );
        } );

        afterEach( function () {
            w.terminate();
        } );


        it( 'should not be created without a decider property', function ( done ) {
            w.onerror = function ( e ) {
                log.info( 'Result: ' + JSON.stringify( e ) );
                expect( e.data.status ).toEqual( 400 );
                expect( e.data.message ).toMatch( '[decider]' );
                done();
            };
            w.postMessage( {
                command : 'start',
                workflow : {},
                taskListName : 'tasklist'
            } );
        }, 100 );

        it( 'should not be created without a workflow property', function ( done ) {
            w.onerror = function ( e ) {
                expect( e.data.status ).toEqual( 400 );
                expect( e.data.message ).toMatch( '[workflow]' );
                done();
            };
            w.postMessage( {
                command : 'start',
                decider : 'workflow/decider',
                taskListName : 'tasklist'
            } );
        }, 100 );

        it( 'should not be created without a taskListName property', function ( done ) {
            w.onerror = function ( e ) {
                expect( e.data.status ).toEqual( 400 );
                expect( e.data.message ).toMatch( '[taskListName]' );
                done();
            };
            w.postMessage( {
                command : 'start',
                decider : 'workflow/decider',
                workflow : {}
            } );
        }, 100 );

    } );

    describe( '', function () {

    } );
} );
