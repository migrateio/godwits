var log = require( 'ringo/logging' ).getLogger( module.id );

var {Worker, WorkerPromise} = require( 'ringo/worker' );

describe( 'DeciderPoller', function () {

    it( 'should be a worker instance', function () {

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
                    log.info( 'Spec::onerror: {}', JSON.stringify( e ) );
                };

                w.onmessage = function ( e ) {
                    success = false;
                    log.info( 'Spec::onmessage: {}', JSON.stringify( e ) );
                };

                log.info( 'Spec::posting: {}', JSON.stringify( opts ) );
                w.postMessage( opts );
            } catch ( e ) {
                log.error( e )
            }
        } );

        waits( 100 );

        runs( function () {
            expect( this.success ).toBe(true);
        } );
    } );

} );
