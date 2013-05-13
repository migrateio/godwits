var log = require( 'ringo/logging' ).getLogger( module.id );
var {WorkerPoller} = require( 'workflow/workerPoller' );

describe( 'WorkerPoller', function () {

    var taskListName = 'test.migrate.decider';
    var deciderModuleId = 'test/0.0.0/deciders/simple-decider';

    describe( 'should have proper init values', function () {

        it( 'should not be created without a taskListName property', function () {
            expect(function () {
                new WorkerPoller( undefined, {} );
            } ).toThrow( 'WorkerPoller requires property [taskListName]' );
        } );

        it( 'should not be created without a swfClient property', function () {
            expect(function () {
                new WorkerPoller( taskListName, undefined );
            } ).toThrow( 'WorkerPoller requires property [swfClient]' );
        } );

    } );

    describe( 'should be able to control polling behavior', function () {

        var decider, swfClient;

        var start = function () {
            decider.start();
        };

        beforeEach( function () {
            swfClient = {
                pollForActivityTask: function() {
                    // return fake promise
                    return {
                        wait: function() {
                            return null;
                        }
                    }
                }
            };
            spyOn(swfClient, 'pollForActivityTask' ).andCallThrough();
            decider = new WorkerPoller( taskListName, swfClient );
        } );

        afterEach( function () {
            decider.shutdown();
        } );

        it( 'should be able to start polling', function () {
            runs( start );
            waitsFor( function () {
                return swfClient.pollForActivityTask.wasCalled;
            }, 'pollForDecisionTask to be called', 1000 );
        } );

        it( 'should be able to stop polling', function () {
            // Start it up and make sure it is polling
            runs( start );
            waitsFor( function () {
                return swfClient.pollForActivityTask.wasCalled;
            }, 'pollForDecisionTask to be called', 1000 );
            runs( function () {
                decider.stop();
            } );
            waits( 1200 );
            runs( function () {
                swfClient.pollForActivityTask.reset();
            } );
            waits( 1200 );
            runs( function () {
                expect( swfClient.pollForActivityTask ).not.toHaveBeenCalled();
            } )
        } );

        it( 'should be able to restart polling', function () {
            // Start it up and make sure it is polling
            runs( start );
            waitsFor( function () {
                return swfClient.pollForActivityTask.wasCalled;
            }, 'pollForDecisionTask to be called', 1000 );
            runs( function () {
                decider.stop();
            } );
            waits( 1200 );
            runs( start );
            waitsFor( function () {
                return swfClient.pollForActivityTask.wasCalled;
            }, 'pollForDecisionTask to be called', 1000 );
        } );
    } );
} );
