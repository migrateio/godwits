var {Workflow} = require( 'workflow/workflow' );

describe( 'Workflow', function () {

    var decider;
    var async = new AsyncSpec( this );

    beforeEach( function () {
    } );


    it( 'will throw an exception if instantiated without aws credentials', function ( done ) {
        expect(function () {
            new Workflow( {} );
        } ).toThrow();
    } );

    it( 'will throw an exception if instantiated without a workflowType object', function ( done ) {
        expect(function () {
            new Workflow( 'nogood', 'accessKey', 'secretKey' );
        } ).toThrow();
    } );


    it( 'will throw an exception if instantiated with invalid aws credentials', function ( done ) {
        expect(function () {
            new Workflow( workflowType, 'accessKey', 'secretKey' );
        } ).toThrow();
    } );

    it( 'will throw an exception if instantiated with invalid aws credentials', function ( done ) {
        var workflow = new Workflow( workflowType,
            'AKIAIIQOWQM6FFLQB2EQ', 'ItTa0xaI9sey2SEGGEN8yVcA5slN95+qmNrf1TMd' );
        expect( workflow ).toBeDefined();
    } );

} );

var workflowType = {
    domain : 'dev-migrate',
    defaultChildPolicy : 'TERMINATE',
    defaultTaskListName : 'transfer-decisions',
    description : 'The primary workflow used for a transfer Run.',
    defaultExecutionStartToCloseTimeout : '2592000', // 1 month
    defaultTaskStartToCloseTimeout : 'NONE'
};