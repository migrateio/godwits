var {Workflow} = require( 'workflow/workflow' );
var {WorkerPoller} = require( 'workflow/workerPoller' );

describe( 'Workflow', function () {

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
            expect( workflow.start ).toEqual(jasmine.any(Function));
        } );

        it( 'should allow deciders to be registered', function () {
            workflow.registerDecider( deciderTaskList, 'test/deciders/simple-decider' );
        } );
    } );

    describe( 'will instantiate and worker registration', function () {

        var workflow;

        beforeEach( function () {
            workflow = new Workflow( workflowType, accessKey, secretKey );
            spyOn( workflow, 'registerActivityType' );
        } );

        afterEach( function () {
            workflow.shutdown();
        } );

        it( 'will allow a single worker to be registered', function () {
            workflow.registerWorkers( workerTaskList, activities.loadCustomer );
            var activity = require( activities.loadCustomer );
            expect( activity ).toBeDefined();
            expect( activity.ActivityType ).toBeDefined();
            expect( workflow.registerActivityType )
                .toHaveBeenCalledWith( activity.ActivityType );
        } );

        it( 'will allow a multiple workers to be registered', function () {
            var workers = [
                activities.loadCustomer, activities.authPayment,
                activities.capturePayment
            ];
            workflow.registerWorkers( workerTaskList, workers );
            workers.forEach(function(worker) {
                var activity = require( worker );
                expect( activity ).toBeDefined();
                expect( activity.ActivityType ).toBeDefined();
                expect( workflow.registerActivityType )
                    .toHaveBeenCalledWith( activity.ActivityType );
            });
        } );
    } )
} );


var accessKey = 'AKIAIIQOWQM6FFLQB2EQ';
var secretKey = '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';
var workerTaskList = 'test/0.0.0/tasklist/worker';
var deciderTaskList = 'test/0.0.0/tasklist/decider';
var activities = {
    loadCustomer: 'test/0.0.0/workers/load-customer',
    authPayment: 'test/0.0.0/workers/auth-payment',
    capturePayment: 'test/0.0.0/workers/capture-payment'
};
var workflowType = {
    domain : 'dev-migrate',
    name : 'io.migrate.transfers',
    version : '0.0.0',
    defaultChildPolicy : 'TERMINATE',
    defaultTaskListName : 'transfer-decisions',
    description : 'The primary workflow used for a transfer Run.',
    defaultExecutionStartToCloseTimeout : '2592000', // 1 month
    defaultTaskStartToCloseTimeout : 'NONE'
};
