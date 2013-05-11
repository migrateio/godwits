var log = require( 'ringo/logging' ).getLogger( module.id );
var {Workflow} = require( 'workflow/workflow' );
var {WorkerPoller} = require( 'workflow/workerPoller' );

xdescribe( 'Workflow', function () {

    describe( 'requires valid initialization parameters', function () {
        beforeEach( function () {
        } );

        it( 'will throw an exception if instantiated without aws credentials', function () {
            expect(function () {
                new Workflow( {} );
            } ).toThrow( 'Workflow instance requires an [accessKey] parameter as a string.' );
        } );

        it( 'will throw an exception if instantiated without a workflowType object', function () {
            expect(function () {
                new Workflow( 'nogood', 'accessKey', 'secretKey' );
            } ).toThrow( 'Workflow instance requires a [workflowType] parameter as an object.' );
        } );

        it( 'will throw an exception if instantiated with invalid aws credentials', function () {
            expect(function () {
                new Workflow( workflowType, 'accessKey', 'secretKey' );
            } ).toThrow( 'com.amazonaws.AmazonServiceException: The security token included in the request is invalid' );
        } );
    } );

    describe( 'will instantiate and decider registration', function () {

        var workflow;

        beforeEach( function () {
            workflow = new Workflow( workflowType, accessKey, secretKey );
        } );

        afterEach( function () {
            workflow.shutdown();
        } );

        it( 'will create a proper workflow object', function () {
            expect( workflow ).toBeDefined();
            expect( workflow.start ).toEqual( jasmine.any( Function ) );
        } );

        it( 'should allow deciders to be registered', function () {
            workflow.registerDecider( deciderTaskList, deciderModuleId );
        } );
    } );

    describe( 'will instantiate and worker registration', function () {

        var workflow;

        beforeEach( function () {
            workflow = new Workflow( workflowType, accessKey, secretKey );
            spyOn( workflow.swfClient, 'registerActivityType' );
        } );

        afterEach( function () {
            workflow.shutdown();
        } );

        it( 'will allow a single worker to be registered', function () {
            workflow.registerWorkers( workerTaskList, activities.loadUser );
            var activity = require( activities.loadUser );
            expect( activity ).toBeDefined();
            expect( activity.ActivityType ).toBeDefined();
            expect( workflow.swfClient.registerActivityType )
                .toHaveBeenCalledWith( activity.ActivityType );
        } );

        it( 'will allow a multiple workers to be registered', function () {
            var workers = [
                activities.loadUser, activities.authPayment,
                activities.capturePayment
            ];
            workflow.registerWorkers( workerTaskList, workers );
            workers.forEach( function ( worker ) {
                var activity = require( worker );
                expect( activity ).toBeDefined();
                expect( activity.ActivityType ).toBeDefined();
                expect( workflow.swfClient.registerActivityType )
                    .toHaveBeenCalledWith( activity.ActivityType );
            } );
        } );
    } )
} );


describe( 'Workflow', function () {

    var workflow;

    beforeEach( function () {
        workflow = new Workflow( workflowType, accessKey, secretKey );
        expect( workflow ).toBeDefined();
        spyOn( workflow.swfClient, 'registerActivityType' ).andCallThrough();
        var workers = [
            activities.loadUser, activities.authPayment,
            activities.doWork, activities.capturePayment
        ];
        workflow.registerWorkers( workerTaskList, workers );
        workflow.registerDecider( deciderTaskList, function() {
            return deciderModuleId;
        } );
        expect( workflow.swfClient.registerActivityType.calls.length ).toEqual( 4 );
        workflow.start();
    } );

    afterEach( function () {
        workflow.shutdown();
    } );

    it( 'will simulate an actual workflow', function ( done ) {
        var result = workflow.startWorkflow( job ).wait( 10000 );
        log.info( 'Workflow started: {}', JSON.stringify( result ) );

        expect( result.runId ).toEqual( jasmine.any( String ) );
        expect( result.workflowId ).toEqual( jasmine.any( String ) );

        function checkForDone() {
//            log.info( 'Retrieving executions status' );
            var execution = workflow.swfClient.describeWorkflowExecution( {
                domain : workflowType.domain,
                workflowId : result.workflowId,
                runId : result.runId
            } ).wait( 10000 );
//            log.info( 'Execution Status: {}', JSON.stringify( execution, null, 4 ) );
            if ( execution && execution.executionInfo.executionStatus === 'CLOSED' ) {
                done();
            }
            setTimeout( checkForDone, 10000 );
        }

        log.info( 'Starting to check for done' );
        setTimeout( checkForDone, 0 );

    }, 100000 );
} );

var accessKey = 'AKIAIIQOWQM6FFLQB2EQ';
var secretKey = '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';
var workerTaskList = 'test-tasklist-worker';
var deciderTaskList = 'test-tasklist-decider';
var deciderModuleId = 'test/0.0.0/deciders/simple-decider';
var activities = {
    loadUser : 'test/0.0.0/workers/load-user',
    authPayment : 'test/0.0.0/workers/auth-payment',
    doWork : 'test/0.0.0/workers/do-work',
    capturePayment : 'test/0.0.0/workers/capture-payment'
};
var workflowType = {
    domain : 'dev-migrate',
    name : 'io.migrate.transfers',
    version : '0.0.3',
    defaultChildPolicy : 'TERMINATE',
    defaultTaskListName : deciderTaskList,
    description : 'The primary workflow used for a transfer Run.',
    defaultExecutionStartToCloseTimeout : '2592000', // 1 month
    defaultTaskStartToCloseTimeout : 'NONE'
};

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

