/**
 * @fileOverview
 * The DeciderPoller is a Worker object which will run in its own thread and react to
 * events published by Amazon Simple Workflow.
 *
 * 1. The DeciderPoller will continuously poll SWF for pending decisions.
 * 2. When a decision has been received, the Poller will:
 *     1. Instantiate a new Decider worker
 *     2. Place the new worker in an internal queue
 *     3. Attach a listener to the Worker to be notified in the event of success or
 *        failure
 * 3. When the Poller is notified of a Worker completion
 *     1. Notify SWF of the Workers completion status (whether success or error)
 *     2. Remove the Worker from the internal queue
 * 4. In the event of a shutdown message from the workflow:
 *     1. The Poller will cease to poll SWF for new decisions
 *     2. The Poller will continue to remove completed workers from the queue.
 *     3. When the queue is empty, the Poller will send ACK to workflow which will
 *        terminate the Poller.
 */

var log = require( 'ringo/logging' ).getLogger( module.id );

/**
 * Indicates whether the poller is trying to shutdown.
 * @type {Boolean}
 */
var shuttingDown = false;

/**
 * Indicates whether the polling loop is still operating.
 * @type {Boolean}
 */
var polling;

/**
 * Keeps track of the number of outstanding workers. 0 indicates there are no worker
 * processes running.
 *
 * @type {Number}
 */
var workerCount = 0;

/**
 * The name of the decifer module to load when decisions have to be made.
 *
 * @type {String}
 */

var decider = '';

/**
 * The name of the taskList this Poller will be retrieving decisions from.
 * @type {String}
 */
var taskListName;

/**
 * The workflow object associated with this Poller.
 * @type {Workflow}
 */
var workflow;

/**
 * A reference to the worker than spawned this one. Used to post messages back.
 * @type {Worker}
 */
var source;

/**
 * @param e
 */
function onmessage( e ) {
    log.info( 'onmessage: {}', JSON.stringify( arguments ) );

    if ( !e.data || !e.data.command )
        throw { status : 400, message : 'Invalid message. No command specified.'};

    switch ( e.data.command ) {
        case 'start':
            // todo: perhaps these 'or' comparisons should be flipped, but it we won't be
            // calling start more than once
            taskListName = taskListName || e.data.taskListName;
            workflow = workflow || e.data.workflow;
            decider = decider || e.data.decider;

            if ( !decider)
                throw { status : 400, message : 'Command [start] requires property [decider].'};
            if ( !workflow )
                throw { status : 400, message : 'Command [start] requires property [workflow].'};
            if ( !taskListName )
                throw { status : 400, message : 'Command [start] requires property [taskListName].'};

            polling = true;
            source = e.source;
            break;
        case 'stop':
            polling = false;
            break;
        case 'shutdown':
            shuttingDown = true;
            polling = false;
            break;
        default:
            var s = java.lang.String.format( 'onmessage, unknown command [%s]', e.data.command );
            throw { status : 400, message : s};
    }
}

/**
 *
 */
function poll() {
    if (polling) {
        var task = workflow.pollForDecisionTask( {
            taskListName : taskListName
        } );
        if ( task ) startTask( task );
    }
    if (!shuttingDown) setTimeout( poll, 1000 );
}

/**
 * Called when the Decider finishes with a decision. Each decision will result in one or
 * more actions being returned. These actions will be represented by JSON objects and
 * there can be one or and array of them.
 *
 * e.data {Object|Array}
 *     [
 *         {   type : 'CancelTimer',
 *             timerId : ''
 *         },
 *         {   type : 'CancelWorkflowExecution',
 *             details : ''
 *         },
 *         {   type : 'CompleteWorkflowExecution',
 *             result : ''
 *         },
 *         {   type : 'ContinueAsNewWorkflowExecution',
 *             childPolicy : '',
 *             executionStartToCloseTimeout : '',
 *             taskStartToCloseTimeout : ''
 *             input : '',
 *             tagList : [''],
 *             taskListName : '',
 *             workflowTypeVersion : ''
 *         },
 *         {   type : 'FailWorkflowExecution',
 *             details : '',
 *             reason : ''
 *         },
 *         {   type : 'RecordMarker',
 *             details : '',
 *             markerName : ''
 *         },
 *         {   type : 'RequestCancelActivityTask',
 *             activityId : '',
 *         },
 *         {   type : 'RequestCancelExternalWorkflowExecution',
 *             control : '',
 *             runId : '',
 *             workflowId : ''
 *         },
 *         {   type : 'ScheduleActivityTask',
 *             activityId : '',
 *             activityType : { name : '', version : '' },
 *             control : '',
 *             heartbeatTimeout : '',
 *             input : '',
 *             scheduleToStartTimeout : '',
 *             scheduleToCloseTimeout : '',
 *             startToCloseTimeout : ''
 *             taskListName : ''
 *         },
 *         {   type : 'SignalExternalWorkflowExecution',
 *             control : '',
 *             input : '',
 *             runId : '',
 *             signalName : '',
 *             workflowId : ''
 *         },
 *         {   type : 'StartChildWorkflowExecution',
 *             childPolicy : '',
 *             control : '',
 *             executionStartToCloseTimeout : '',
 *             taskStartToCloseTimeout : ''
 *             input : '',
 *             tagList : [''],
 *             taskList : '',
 *             workflowId : '',
 *             workflowType : {
 *                 name : '',
 *                 version : ''
 *             }
 *         },
 *         {   type : 'StartTimer',
 *             control : '',
 *             startToFireTimeout : ''
 *             timerid : ''
 *         }
 *     ];
 *
 * @param e
 */
function workerSuccess( task, data ) {
    workflow.respondDecisionTaskCompleted( {
        decisions: data.decisions || [],
        executionContext: data.executionContext,
        taskToken: task.taskToken
    } );
}

/**
 * There is no failure condition for a decision task. If we get here, then there is a
 * serious problem with our decision object.
 *
 * @param task
 * @param data
 */
function workerError( task, data ) {
    log.fatal( 'Should not have a failure condition possible from the Decider. ' +
        'Write more tests! Task Token: {}, Error: {}',
        task.taskToken, JSON.stringify( data ) );
}

function startTask( task ) {
    log.info( 'DeciderPoller::startTask: {}', JSON.stringify( task ) );
    var worker = new WorkerPromise( decider, task );
    workerCount++;
    worker
        .then( function() {
            workerSuccess( task, e.data );
        }, function() {
            workerError( task, e.data );
        })
        .then( function () {
            workerCount--;
            if (shuttingDown && workerCount === 0) {
                source.postMessage( { code : 200, message : 'Ready to terminate'} );
            }
        });
}

setTimeout( poll, 0 );



