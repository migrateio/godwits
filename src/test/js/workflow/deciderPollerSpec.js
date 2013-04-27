var log = require( 'ringo/logging' ).getLogger( module.id );

var {Worker, WorkerPromise} = require( 'ringo/worker' );

describe( 'DeciderPoller', function () {

    it( 'should not be created without a workflow instance', function () {

        var success;

        runs( function () {
            try {
                log.info( 'Spec::instantiating worker' );
                var w = new Worker( 'workflow/deciderPoller' );
                log.info( 'Spec::Worker running' );

                var opts = {
                    command : 'start',
                    decider : 'workflow/decider'
                };

                w.onerror = function ( e ) {
                    success = true;
                };

                w.postMessage( opts );
            } catch ( e ) {
                log.error( e )
            }
        } );

        waits( 100 );

        runs( function () {
            expect( success ).toBe(true);
        } );
    } );

} );
