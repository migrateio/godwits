var log = require( 'ringo/logging' ).getLogger( module.id );
var {DeciderPoller} = require( 'workflow/deciderPoller' );

describe( 'DeciderPoller', function () {

    var deciderModuleId = 'test/deciders/simple-decider';
    var taskListName = 'test.migrate.decider';

    describe( 'should have proper init values', function () {

        it( 'should not be created without a taskListName property', function () {
            expect(function () {
                new DeciderPoller( undefined, {}, deciderModuleId );
            } ).toThrow( 'DeciderPoller requires property [taskListName]' );
        } );

        it( 'should not be created without a swfClient property', function () {
            expect(function () {
                new DeciderPoller( taskListName, undefined, deciderModuleId );
            } ).toThrow( 'DeciderPoller requires property [swfClient]' );
        } );

    } );

    describe( 'should be able to control polling behavior', function () {

        var decider, swfClient;

        var start = function () {
            decider.start();
        };

        beforeEach( function () {
            swfClient = {
                pollForDecisionTask: function() {
                    // return fake promise
                    return {
                        wait: function() {
                            return null;
                        }
                    }
                }
            };
            spyOn(swfClient, 'pollForDecisionTask' ).andCallThrough();
            decider = new DeciderPoller( taskListName, swfClient, deciderModuleId );
        } );

        afterEach( function () {
            decider.shutdown();
        } );

        it( 'should be able to start polling', function () {
            runs( start );
            waitsFor( function () {
                return swfClient.pollForDecisionTask.wasCalled;
            }, 'pollForDecisionTask to be called', 1000 );
        } );

        it( 'should be able to stop polling', function () {
            // Start it up and make sure it is polling
            runs( start );
            waitsFor( function () {
                return swfClient.pollForDecisionTask.wasCalled;
            }, 'pollForDecisionTask to be called', 1000 );
            runs( function () {
                decider.stop();
            } );
            waits( 1200 );
            runs( function () {
                swfClient.pollForDecisionTask.reset();
            } );
            waits( 1200 );
            runs( function () {
                expect( swfClient.pollForDecisionTask ).not.toHaveBeenCalled();
            } )
        } );

        it( 'should be able to stop polling', function () {
            // Start it up and make sure it is polling
            runs( start );
            waitsFor( function () {
                return swfClient.pollForDecisionTask.wasCalled;
            }, 'pollForDecisionTask to be called', 1000 );
            runs( function () {
                decider.stop();
            } );
            waits( 1200 );
            runs( start );
            waitsFor( function () {
                return swfClient.pollForDecisionTask.wasCalled;
            }, 'pollForDecisionTask to be called', 1000 );
        } );
    } );
} );
