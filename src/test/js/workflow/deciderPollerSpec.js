var log = require( 'ringo/logging' ).getLogger( module.id );
var {DeciderPoller} = require( 'workflow/deciderPoller' );

describe( 'DeciderPoller', function () {

    var deciderModuleId = 'test/deciders/simple-decider';
    var taskListName = 'test.migrate.decider';

    describe( 'should have proper init values', function () {

        it( 'should not be created without a valid deciderModuleId property', function () {
            expect(function () {
                new DeciderPoller( undefined, taskListName, {} );
            } ).toThrow( 'DeciderPoller requires property [deciderModuleId]' );
        } );

        it( 'should not be created without a taskListName property', function () {
            expect(function () {
                new DeciderPoller( deciderModuleId, undefined, {} );
            } ).toThrow( 'DeciderPoller requires property [taskListName]' );
        } );

        it( 'should not be created without a workflow property', function () {
            expect(function () {
                new DeciderPoller( deciderModuleId, taskListName, undefined );
            } ).toThrow( 'DeciderPoller requires property [workflow]' );
        } );

    } );

    describe( 'should be able to control polling behavior', function () {

        var decider, workflow = {
            pollForDecisionTask : function () {
            }
        };

        var start = function () {
            decider.start();
        };
        var stop = function () {
            decider.start();
        };

        beforeEach( function () {
            spyOn( workflow, 'pollForDecisionTask' );
            decider = new DeciderPoller( deciderModuleId, taskListName, workflow );
        } );

        afterEach( function () {
            decider.shutdown();
        } );

        it( 'should be able to start polling', function () {
            runs( start );
            waitsFor( function () {
                return workflow.pollForDecisionTask.wasCalled;
            }, 'pollForDecisionTask to be called', 1000 );
        } );

        it( 'should be able to stop polling', function () {
            // Start it up and make sure it is polling
            runs( start );
            waitsFor( function () {
                return workflow.pollForDecisionTask.wasCalled;
            }, 'pollForDecisionTask to be called', 1000 );
            runs( function () {
                decider.stop();
                workflow.pollForDecisionTask.reset();
            } );
            waits( 1200 );
            runs( function () {
                expect( workflow.pollForDecisionTask ).not.toHaveBeenCalled();
            } )
        } );

        it( 'should be able to stop polling', function () {
            // Start it up and make sure it is polling
            runs( start );
            waitsFor( function () {
                return workflow.pollForDecisionTask.wasCalled;
            }, 'pollForDecisionTask to be called', 1000 );
            runs( function () {
                decider.stop();
            } );
            waits( 1200 );
            runs( start );
            waitsFor( function () {
                return workflow.pollForDecisionTask.wasCalled;
            }, 'pollForDecisionTask to be called', 1000 );
        } );
    } );
});
