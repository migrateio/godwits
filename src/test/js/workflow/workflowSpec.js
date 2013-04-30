var {Workflow} = require( 'workflow/workflow' );

describe( 'Workflow', function () {

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

    it( 'will create a proper workflow object', function () {
        var workflow = new Workflow( workflowType,
            'AKIAIIQOWQM6FFLQB2EQ', 'ItTa0xaI9sey2SEGGEN8yVcA5slN95+qmNrf1TMd' );
        expect( workflow ).toBeDefined();
        expect( workflow.start ).toBeFunction();
    } );

} );

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
