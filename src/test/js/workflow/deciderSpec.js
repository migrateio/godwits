var {Decider} = require( 'workflow/v0.1.0/decider' );

xdescribe( 'Decider', function () {

    var decider;
    var async = new AsyncSpec( this );

    beforeEach( function () {
    } );

    
    async.it( 'returns a promise', function (done) {
        try {
            var decider = new Decider([]);
            expect( typeof decider.then === 'function' ).toBe( true );
            decider.then( function () {
                done();
            } );
        } catch ( e ) {
            log.info( e );
        }
    } );

    async.it( 'will be in initialized state after starting workflow', function (done) {
        try {
            var decider = new Decider( [
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
                expect( data.fsm.state ).toEqual( 'initialized' );
                expect( data.task.type ).toEqual( 'ScheduleActivityTask' );
                expect( data.task.activityId ).toBeDefined();
                expect( data.task.activityType.name ).toEqual( 'loadCustomer' );
                expect( data.task.input ).toEqual( { userId : '123abc' } );
                done();
            } );
        } catch ( e ) {
            log.error( e );
        }
    } );

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