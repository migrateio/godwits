var log = require( 'ringo/logging' ).getLogger( module.id );
var {Decider} = require( 'workflow/decider' );

describe( 'Decider', function () {

    it( 'returns a promise', function ( done ) {
        var decider = new Decider( 'test/deciders/simple-decider', [] );
        expect( typeof decider.then === 'function' ).toBe( true );
        decider.then( function () {
            done();
        } );
    }, 2000 );

    it( 'will be in initialized state after starting workflow', function ( done ) {
        var decider = new Decider( 'test/deciders/simple-decider', [
            {
                "eventId" : 1,
                "eventTimestamp" : 1326592619.474,
                "eventType" : "WorkflowExecutionStarted",
                "workflowExecutionStartedEventAttributes" : {
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
            }
        ] );

        decider.then( function ( data ) {
            done();
//            log.info( 'Promise returned: {}', JSON.stringify( data ) );
            expect( data.fsm.state ).toEqual( 'initialized' );
            expect( data.decisions ).toBeArray();
            expect( data.decisions.length ).toEqual( 1 );
            expect( data.decisions[0].type ).toEqual( 'ScheduleActivityTask' );
            expect( data.decisions[0].activityId ).toBeDefined();
            expect( data.decisions[0].activityType.name ).toEqual( 'load-customer' );
            expect( data.decisions[0].input ).toEqual( { userId : '123abc' } );
        } );
    }, 1000 );

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