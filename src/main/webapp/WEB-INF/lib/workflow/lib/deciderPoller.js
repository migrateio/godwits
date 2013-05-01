var log = require( 'ringo/logging' ).getLogger( module.id );

/**
 * # DeciderPoller
 *
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
function DeciderPoller( taskListName, workflow ) {

    /**
     * Indicates whether the poller is trying to shutdown.
     * @type {Boolean}
     */
    var shuttingDown = false;

    /**
     * Indicates whether the polling loop is still operating.
     * @type {Boolean}
     */
    var polling = false;

    /**
     * Keeps track of the number of outstanding workers. 0 indicates there are no worker
     * processes running.
     *
     * @type {Number}
     */
    var workerCount = 0;

    /**
     * **start()**
     * Starts the polling loop.
     */
    function start() {
        polling = true;
    }

    /**
     * **stop()**
     * Stops the polling loop.
     */
    function stop() {
        polling = false;
    }

    /**
     * **shutdown()**
     * Shuts down the polling loop and terminates once all workers have completed.
     */
    function shutdown() {
        shuttingDown = true;
        polling = false;
    }

    /**
     * ### _poll_
     *
     */
    function poll() {
        if ( polling ) {
            var task = workflow.pollForDecisionTask( {
                taskListName : taskListName
            } );
            if ( task ) startTask( task );
        }
        if ( !shuttingDown ) setTimeout( poll, 1000 );

        // Might be able to shutdown here if no tasks are pending
        else if ( workerCount === 0 ) {
            log.info( 'Passing message back from deciderPoller that we are ready to terminate' );
            source.postMessage( { status : 200, message : 'Ready to terminate'} );
        }
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
    function workerSuccess( task, decisions ) {
        workflow.respondDecisionTaskCompleted( {
            decisions : decisions,
            executionContext : decisions.executionContext,
            taskToken : task.taskToken
        } );
    }

    /**
     * There is no failure condition for a decision task. If we get here, then there is a
     * serious problem with our decision object.
     *
     * @param task
     * @param data
     */
    function workerError( task ) {
        log.fatal( 'Should not have a failure condition possible from the Decider. ' +
            'Fix it and write more tests! Task: {}', task );
    }

    /**
     * ## startTask
     *
     * We have polled for a decision task and received one. Now we initialize the decider
     * worker and feed it the decision which contains the execution workflow so far. Once the
     * worker has decided the next course of action, it will pass us back a list of
     * subsequent tasks to send to SWF.
     *
     * @param {Object} task The decider task returned from polling the task list.
     */
    function startTask( task ) {
        log.info( 'DeciderPoller::startTask: {}', JSON.stringify( task ) );
        // Increment the number of workers we have spawned
        workerCount++;

        // Create a worker
        var worker = new WorkerPromise( deciderModuleId, task );
        worker
            .then( function ( e ) {
                // When the worker successfully completes, we are passed an array of
                // decisions.
                workerSuccess( task, e.decisions );
            }, function () {
                // In the case of an error,
                workerError( task );
            } )
            .then( function () {
                workerCount--;
                if ( shuttingDown ) {
                    if ( workerCount === 0 )
                        log.info( 'DeciderPoller::terminated' );
                    else
                        log.info( 'DeciderPoller::finalizing, ' +
                            'waiting on {} workers to finish', workerCount );
                }
            } );
    }

    /**
     * ### Constructor
     *
     * The constructor for the class which will spin up a background thread to initiate
     * the polling of SWF for new decision tasks.
     *
     * @param {String} deciderModuleId The module name of the decider for this poller.
     * @param {String} taskListName The name of the task list for the decision tasks
     * @param {Workflow} workflow The workflow object in which this poller resides.
     */
    function init( deciderModuleId, taskListName, workflow ) {
        log.info( 'DeciderPoller::init:{}', JSON.stringify( arguments ) );

        if ( !deciderModuleId ) throw {
            status : 400,
            message : 'DeciderPoller requires property [deciderModuleId].'
        };
        if ( !workflow ) throw {
            status : 400,
            message : 'DeciderPoller requires property [workflow].'
        };
        if ( !taskListName ) throw {
            status : 400,
            message : 'DeciderPoller requires property [taskListName].'
        };

        setTimeout( poll, 0 );
    }

    init();

    return {
        start : start,
        stop : stop,
        shutdown : shutdown
    }
}
exports.DeciderPoller = DeciderPoller;



