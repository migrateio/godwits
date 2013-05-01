var {Workflow} = require( 'workflow/workflow' );

describe( 'Workflow', function () {

    describe('requires valid initialization parameters', function() {
        beforeEach( function () {
        } );


        it( 'will throw an exception if instantiated without aws credentials', function () {
            expect(function () {
                new Workflow( {} );
            } ).toThrow('Workflow instance requires an [accessKey] parameter as a string.');
        } );

        it( 'will throw an exception if instantiated without a workflowType object', function () {
            expect(function () {
                new Workflow( 'nogood', 'accessKey', 'secretKey' );
            } ).toThrow('Workflow instance requires a [workflowType] parameter as an object.');
        } );


        it( 'will throw an exception if instantiated with invalid aws credentials', function () {
            expect(function () {
                new Workflow( workflowType, 'accessKey', 'secretKey' );
            } ).toThrow('com.amazonaws.AmazonServiceException: The security token included in the request is invalid');
        } );
    });

    describe('will instantiate and decider registration', function() {

        var workflow;

        beforeEach( function() {
            workflow = new Workflow( workflowType, accessKey, secretKey );
        });

        afterEach( function() {
            workflow.shutdown();
        });

        it( 'will create a proper workflow object', function () {
            expect( workflow ).toBeDefined();
            expect( workflow.start ).toBeFunction();
        } );

        it( 'should allow deciders to be registered', function () {
            workflow.registerDecider( deciderTaskList, 'test/deciders/simple-decider' );
        } );
    })
} );


var accessKey = 'AKIAIIQOWQM6FFLQB2EQ';
var secretKey = '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';
var deciderTaskList = 'test/tasklist/decider';
var workflowType = {
    domain : 'dev-migrate',
    name: 'io.migrate.transfers',
    version: 'v0.1.0',
    defaultChildPolicy : 'TERMINATE',
    defaultTaskListName : 'transfer-decisions',
    description : 'The primary workflow used for a transfer Run.',
    defaultExecutionStartToCloseTimeout : '2592000', // 1 month
    defaultTaskStartToCloseTimeout : 'NONE'
};
