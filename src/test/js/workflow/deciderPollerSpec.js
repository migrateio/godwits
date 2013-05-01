var log = require( 'ringo/logging' ).getLogger( module.id );
var {DeciderPoller} = require( 'workflow/deciderPoller' );

describe( 'DeciderPoller', function () {

    describe( 'should have proper init values', function () {

        var deciderModuleId = 'test/deciders/simple-decider';
        var taskListName = 'test.migrate.decider';

        it( 'should not be created without a valid deciderModuleId property', function () {
            expect( function() {
                try {
                    new DeciderPoller( undefined, taskListName, {} );
                } catch ( e ) {
                    log.error( 'Error', e );
                }
            } ).toThrow('DeciderPoller requires property [deciderModuleId].');
        });

        xit( 'should not be created without a taskListName property', function ( done ) {
            var poller = new DeciderPoller( undefined, {} );
            poller.onerror = function ( e ) {
                expect( e.data.status ).toEqual( 400 );
                expect( e.data.message ).toMatch( /\[taskListName\]/ );
                done();
            };
        }, 100 );

        xit( 'should not be created without a workflow property', function ( done ) {
            var poller = new DeciderPoller( taskListName, undefined );
            poller.onerror = function ( e ) {
                log.info( 'onerror: ' + JSON.stringify( e ) );
                expect( e.data.status ).toEqual( 400 );
                expect( e.data.message ).toMatch( /\[workflow\]/ );
                done();
            };
        }, 100 );

    } );
} );
