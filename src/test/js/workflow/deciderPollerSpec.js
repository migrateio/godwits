var log = require( 'ringo/logging' ).getLogger( module.id );

var {Worker, WorkerPromise} = require( 'ringo/worker' );

describe( 'DeciderPoller', function () {
    var async = new AsyncSpec( this );

    describe( 'should have proper init values', function () {

        var w;

        beforeEach( function () {
            w = new Worker( 'workflow/deciderPoller' );
        } );

        async.it( 'should not be created without a decider property', function ( done ) {
            w.onerror = function ( e ) {
                expect( e.data.status ).toEqual( 400 );
                expect( e.data.message ).toMatch( '[decider]' );
                done();
            };
            w.postMessage( {
                command : 'start',
                workflow : {},
                taskListName : 'tasklist'
            } );
        } );

        async.it( 'should not be created without a workflow property', function ( done ) {
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
        } );

        async.it( 'should not be created without a taskListName property', function ( done ) {
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
        } );

    } );

} );
