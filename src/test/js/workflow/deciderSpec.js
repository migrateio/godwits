var log = require( 'ringo/logging' ).getLogger( module.id );
var {Decider} = require( 'workflow/decider' );

describe( 'Decider', function () {

    it( 'will be able to take its first baby step', function ( done ) {
        var decider = new Decider( { events: [
            {
                "eventId" : 1,
                "eventTimestamp" : 1326592619.474,
                "eventType" : "WorkflowExecutionStarted",
                "WorkflowExecutionStartedEventAttributes" : {
                    "input" : job,
                    "parentInitiatedEventId" : 0,
                    "tagList" : ["music purchase", "digital", "ricoh-the-dog"],
                    "taskList" : {
                        "name" : "specialTaskList"
                    },
                    "workflowType" : {
                        "name" : "customerOrderWorkflow",
                        "version" : "1.0"
                    }
                }
            }],
            workflowExecution: {
                workflowId: '',
                runId: ''
            }
        }, 'test/0.0.0/deciders/simple-decider' );

        expect( typeof decider.then === 'function' ).toBe( true );
        decider.then( function ( decisions ) {
            expect( decisions ).toBeArray();
            expect( decisions.length ).toEqual( 1 );
            expect( decisions[0].type ).toEqual( 'ScheduleActivityTask' );
            expect( decisions[0].activityId ).toBeDefined();
            expect( decisions[0].activityType.name ).toEqual( 'load-user' );
            expect( decisions[0].input ).toEqual( JSON.stringify({ userId : '123abc' }));
            done();
        } );
    }, 500 );

    var job = {
        jobId : '4N9w5',
        userId : '123abc',
        source : {
            service : 'yahoo',
            principal : 'oravecz@yahoo.com',
            credential : '<secret>',
            display : 'oravecz@yahoo.com'
        },
        destination : {
            service : 'google',
            principal : 'jcook@pykl.com',
            credential : '<secret>',
            display : 'jcook@pykl.com'
        },
        types : {
            email : true,
            contacts : true,
            documents : false,
            calendar : false,
            media : false
        },
        payment : {
            service : 'stripe',
            amount : 15,
            currency : 'usd',
            customer : 'cus_1Jf98WUwZxuKfj'
        }
    };

} );