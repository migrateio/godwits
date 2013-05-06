// # Module workflow/deciderPoller
var log = require( 'ringo/logging' ).getLogger( module.id );
var {Decider} = require( './decider' );
/**
 * ## DeciderPoller
 *
 * The DeciderPoller is an object which will run in its own thread and react to
 * events published by Amazon Simple Workflow.
 *
 * <a href="http://goo.gl/z2VVo" target="_blank"><img src="http://goo.gl/z2VVo" width="100%"/></a>
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
function DeciderPoller( taskListName, deciderModuleId, swfClient ) {

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
     * ### **start**
     * Starts the polling loop.
     */
    function start() {
        log.debug( 'start()' );
        polling = true;
    }

    /**
     * ### **stop**
     * Stops the polling loop.
     */
    function stop() {
        log.debug( 'stop()' );
        polling = false;
    }

    /**
     * ### **shutdown**
     * Shuts down the polling loop and terminates once all workers have completed.
     */
    function shutdown() {
        log.debug( 'shutdown()' );
        shuttingDown = true;
        polling = false;
    }

    function error() {
        log.error( 'DeciderPoller::poll, ERROR:', e );
        log.error( 'DeciderPoller::poll, ERROR:', JSON.stringify( arguments ) );
    }

    /**
     * ### _poll_
     *
     */
    var poll = java.lang.Runnable( {
        run : function () {
            log.debug( 'DeciderPoller::poll, entry' );
            while ( !shuttingDown ) {
                while ( polling ) {
                    log.debug( 'DeciderPoller::poll, is polling' );
                    var task = swfClient
                        .pollForDecisionTask( { taskListName : taskListName } )
                        .wait();

                    log.info( 'DeciderPoller::poll, task: {}', JSON.stringify( task ) );
                    if ( task && task.taskToken ) {
                        startTask( task );
                    }

                    if ( shuttingDown ) {
                        if ( workerCount === 0 )
                            log.info( 'DeciderPoller [{}] is terminated', taskListName );
                        break;
                    }
                }
                java.lang.Thread.sleep( 1000 );
            }
        }
    } );

    /*
        function poll() {
            log.debug( 'DeciderPoller::poll, entry' );
            if ( polling ) {
                log.debug( 'DeciderPoller::poll, is polling' );
                var task = swfClient
                    .pollForDecisionTask( { taskListName : taskListName } )
                    .wait();

                log.info( 'DeciderPoller::poll, task: {}', JSON.stringify( task ) );
                if (task.taskToken) {
                    startTask( task );
                }

                if (shuttingDown && workerCount === 0 ) {
                    log.info( 'DeciderPoller [{}] is terminated', taskListName );
                }

                if (!shuttingDown) setTimeout( poll, 0 );
            }
        }
    */

    /**
     * ### _deciderSuccess_
     *
     * Called when the Decider finishes with a decision. Each decision will result in one or
     * more actions being returned. These actions will be represented by JSON objects and
     * there can be one or and array of them.
     *
     * Decisions will be an array of JSON objects, such as these:
     *
     * ```js
     * [
     *     {   type : 'CancelTimer',
     *         timerId : ''
     *     },
     *     {   type : 'CancelWorkflowExecution',
     *         details : ''
     *     },
     *     {   type : 'CompleteWorkflowExecution',
     *         result : ''
     *     },
     *     {   type : 'ContinueAsNewWorkflowExecution',
     *         childPolicy : '',
     *         executionStartToCloseTimeout : '',
     *         taskStartToCloseTimeout : ''
     *         input : '',
     *         tagList : [''],
     *         taskListName : '',
     *         workflowTypeVersion : ''
     *     },
     *     {   type : 'FailWorkflowExecution',
     *         details : '',
     *         reason : ''
     *     },
     *     {   type : 'RecordMarker',
     *         details : '',
     *         markerName : ''
     *     },
     *     {   type : 'RequestCancelActivityTask',
     *         activityId : '',
     *     },
     *     {   type : 'RequestCancelExternalWorkflowExecution',
     *         control : '',
     *         runId : '',
     *         workflowId : ''
     *     },
     *     {   type : 'ScheduleActivityTask',
     *         activityId : '',
     *         activityType : { name : '', version : '' },
     *         control : '',
     *         heartbeatTimeout : '',
     *         input : '',
     *         scheduleToStartTimeout : '',
     *         scheduleToCloseTimeout : '',
     *         startToCloseTimeout : ''
     *         taskListName : ''
     *     },
     *     {   type : 'SignalExternalWorkflowExecution',
     *         control : '',
     *         input : '',
     *         runId : '',
     *         signalName : '',
     *         workflowId : ''
     *     },
     *     {   type : 'StartChildWorkflowExecution',
     *         childPolicy : '',
     *         control : '',
     *         executionStartToCloseTimeout : '',
     *         taskStartToCloseTimeout : ''
     *         input : '',
     *         tagList : [''],
     *         taskList : '',
     *         workflowId : '',
     *         workflowType : {
     *             name : '',
     *             version : ''
     *         }
     *     },
     *     {   type : 'StartTimer',
     *         control : '',
     *         startToFireTimeout : ''
     *         timerid : ''
     *     }
     * ];
     * ```
     *
     * @param {Object} task The original decision task pulled from the task list
     * @param {Array} decisions The resulting decisions generated by the FSM
     */
    function deciderSuccess( task, decisions ) {
        log.info( 'DeciderPoller::deciderSuccess, task results in decisions: {}',
            JSON.stringify( decisions ) );
        swfClient.respondDecisionTaskCompleted( {
            decisions : decisions,
            executionContext : decisions.executionContext,
            taskToken : task.taskToken
        } ).wait( 5000 );
    }

    /**
     * ### _deciderError_
     *
     * There is no failure condition for a decision task. If we get here, then there is a
     * serious problem with our decision object.
     *
     * @param {Object} task The original decision task pulled from the task list
     */
    function deciderError( task ) {
        log.fatal( 'Should not have a failure condition possible from the Decider. ' +
            'Fix it and write more tests! Task: {}', task );
    }

    /**
     * ### _startTask_
     *
     * We have polled for a decision task and received one. Now we initialize the decider
     * worker and feed it the decision which contains the execution workflow so far. Once the
     * worker has decided the next course of action, it will pass us back a list of
     * subsequent tasks to send to SWF.
     *
     * @param {Object} task The decider task returned from polling the task list.
     */
    function startTask( task ) {
        log.info( 'DeciderPoller::startTask: Num workers: {}, task: {}',
            workerCount, JSON.stringify( task, null, 4 ) );
        // Increment the number of workers we have spawned
        workerCount++;

        // Create a Decider object which will evaluate the Decider Task
        var decider = new Decider( deciderModuleId, task.events );
        decider
            .then( function ( e ) {
                // When the worker successfully completes, we are passed an array of
                // decisions.
                deciderSuccess( task, e.decisions );
            }, function () {
                // In the case of an error,
                deciderError( task );
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
     * ### <init>
     *
     * The constructor for the class which will spin up a background thread to initiate
     * the polling of SWF for new decision tasks.
     *
     * @param {String} taskListName The name of the task list for the decision tasks
     * @param {String} deciderModuleId The module name of the decider for this poller.
     * @param {Workflow} swfClient The swfClient object in which this poller resides.
     */
    function init( taskListName, deciderModuleId, swfClient ) {
        if ( !deciderModuleId ) throw {
            status : 400,
            message : 'DeciderPoller requires property [deciderModuleId]'
        };
        if ( !swfClient ) throw {
            status : 400,
            message : 'DeciderPoller requires property [swfClient]'
        };
        if ( !taskListName ) throw {
            status : 400,
            message : 'DeciderPoller requires property [taskListName]'
        };

        var threadName = 'deciderPoller-' + taskListName;
        log.debug( 'DeciderPoller::init, starting decider poller thread: {}', threadName );
        new java.lang.Thread( poll, threadName ).start();
    }

    init( taskListName, deciderModuleId, swfClient );

    return {
        start : start,
        stop : stop,
        shutdown : shutdown
    }
}
exports.DeciderPoller = DeciderPoller;



