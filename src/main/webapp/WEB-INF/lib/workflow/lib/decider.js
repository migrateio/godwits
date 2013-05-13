/**
 * #Module workflow/decider
 *
 */
var log = require( 'ringo/logging' ).getLogger( module.id );
var {Deferred} = require( 'ringo/promise' );
var {merge} = require( 'ringo/utils/objects' );
var {config, uuid} = require( 'utility' );
var machina = require( 'machinajs' )();

log.info( 'UUID: {}', typeof uuid );

/**
 * ##Decider
 *
 * The Decider processes the workflow history from SWF and returns a set of decisions as
 * determined by the finite state machine at its core. From the perspective of the
 * [DeciderPoller](./deciderPoller.js.html), the Decider is a Promise.
 *
 * #### Usage
 *
 * ```js
 * var decider = new Decider( history ).then(
 *   function( jsonTask ) {
 *     // instatiate a worker that will perform the next
 *     // task in the workflow
 *   }
 * );```
 *
 * A new Decider will be instantiated with the full workflow history events for the
 * current stage of a workflow.
 *
 * ```js
 *    var decider = new Decider( events );
 * ```
 *
 * A Decider is a promise, so while the history is being analyzed, the caller waits
 * patiently for a response.
 *
 * ```js
 * decider.then(
 *     function( jsonDecisions ) {
 *         // loop thru each decision and add them to SWF
 *     }
 * );
 * ```
 * [Constructor](#construct)
 */
exports.Decider = function ( task, resolveDecisionModule ) {

    /**
     * ### _decisionActions_
     *
     * These actions are called from the decision logic to generate the JSON structures
     * which will represent the resulting decisions from this Decider class. One or more
     * of these decisions will be passed to the [`emit()`](#emit) function on their way
     * to Amazon SWF.
     *
     * @type {Object}
     */
    var decisionActions = {
        /**
         * #### _cancelTimer_
         *
         * Cancels a previously started timer and records a TimerCanceled event in the
         * history.
         */
        cancelTimer : function () {
        },

        /**
         * #### _cancelWorkflowExecution_
         *
         * Closes the workflow execution and records a WorkflowExecutionCanceled event in
         * the history.
         */
        cancelWorkflowExecution : function ( errors ) {
            return {
                type : 'CancelWorkflowExecution',
                details : JSON.stringify( errors )
            }
        },

        /**
         * #### _completeWorkflowExecution_
         *
         * Closes the workflow execution and records a WorkflowExecutionCompleted event
         * in the history .
         */
        completeWorkflowExecution : function ( summary ) {
            return {
                type : 'CompleteWorkflowExecution',
                result : JSON.stringify( summary || {} )
            }
        },

        /**
         * #### _continueAsNewWorkflowExecution_
         *
         * Closes the workflow execution and starts a new workflow execution of the same type
         * using the same workflow id and a unique run Id. A WorkflowExecutionContinuedAsNew
         * event is recorded in the history.
         */
        continueAsNewWorkflowExecution : function () {
        },

        /**
         * #### _failWorkflowExecution_
         *
         * Closes the workflow execution and records a WorkflowExecutionFailed event in the
         * history.
         */
        failWorkflowExecution : function ( reason, details ) {
            return {
                type : 'FailWorkflowExecution',
                details : JSON.stringify( details || {} ),
                reason : reason
            }
        },

        /**
         * #### _recordMarker_
         *
         * Records a MarkerRecorded event in the history. Markers can be used for adding
         * custom information in the history for instance to let deciders know that they do
         * not need to look at the history beyond the marker event.
         */
        recordMarker : function () {
        },

        /**
         * #### _requestCancelActivityTask_
         *
         * Attempts to cancel a previously scheduled activity task. If the activity task was
         * scheduled but has not been assigned to a worker, then it will be canceled. If the
         * activity task was already assigned to a worker, then the worker will be informed
         * that cancellation has been requested in the response to
         * RecordActivityTaskHeartbeat.
         */
        requestCancelActivityTask : function () {
        },

        /**
         * #### _requestCancelExternalWorkflowExecution_
         *
         * Requests that a request be made to cancel the specified external workflow
         * execution and records a RequestCancelExternalWorkflowExecutionInitiated event in
         * the history.
         */
        requestCancelExternalWorkflowExecution : function () {
        },

        /**
         * #### _scheduleActivityTask_
         *
         * Schedules an activity task.
         *
         * @param {String} activityName
         * @param {String} [activityVersion]
         * @param {Object} input
         * @param {Object} [control]
         */
        scheduleActivityTask : function ( activityName, activityVersion, input, control ) {
            // Process the arguments to take care of optional parameters
            var args = Array.prototype.slice.call( arguments, 0 );
            activityName = args.shift();
            activityVersion = typeof args[0] === 'object' ? config.version : args.shift();
            input = args.shift();
            control = args.shift();


            // Create a JSON representation of the ScheduleActivityTask
            return {
                type : 'ScheduleActivityTask',
                activityId : uuid(),
                activityType : { name : activityName, version : activityVersion },
                control : control ? JSON.stringify( control ) : undefined,
                input : JSON.stringify( input )
            };
        },

        /**
         * #### _signalExternalWorkflowExecution_
         *
         * Requests a signal to be delivered to the specified external workflow execution and
         * records a SignalExternalWorkflowExecutionInitiated event in the history.
         */
        signalExternalWorkflowExecution : function () {
        },

        /**
         * #### _startChildWorkflowExecution_
         *
         * Requests that a child workflow execution be started and records a
         * StartChildWorkflowExecutionInitiated event in the history.The child workflow
         * execution is a separate workflow execution with its own history.
         */
        startChildWorkflowExecution : function () {
        },

        /**
         * #### _startTimer_
         *
         * Starts a timer for this workflow execution and records a TimerStarted event in the
         * history. This timer will fire after the specified delay and record a TimerFired
         * event.
         */
        startTimer : function () {
        }
    };

    /**
     * ### _run_
     *
     * @param fsm
     * @param task
     * @param deferred
     */
    function run( task, deciderModuleId, deferred ) {

        /**
         * ### _initFsm_
         * Load the decider module and initialize the FSM based on the logic() function it
         * exports.
         *
         * @param {String} deciderModuleId The module id for the decider to use.
         */
        function initFsm( deciderModuleId ) {
            var decider = require( deciderModuleId );

            if ( !decider ) throw {
                status : 400,
                message : 'Decider must be instantiated with a valid [deciderModuleId] parameter'
            };
            if ( !decider || typeof decider.logic != 'function' ) throw {
                status : 400,
                message : 'Module [' + deciderModuleId + '] must export the function [logic]'
            };

            return new machina.Fsm( decider.logic( decisionActions ) );
        }

        return {
            run : function () {
                try {
                    log.info( 'Decider::run, FSM processing execution history, ' +
                        'decider: {}', deciderModuleId );
                    var resolution;
                    // Instantiate the FSM based on the logic of the decider module.
                    var fsm = initFsm( deciderModuleId );

                    // Replays the SWF Execution History through the FSM. At the end of
                    // this process the state machine will be in a determinable state.
                    var events = [].concat( task.events ).map( function ( event ) {
                        var e = new Event( task, event );
                        fsm.handle( e.eventType, e );
                    } );

                    // Any decisions that are forthcoming from the FSM will be triggered
                    // when invoking the 'next' handler. When that happens, we are
                    // listening for the result and resolving our promise.
                    fsm.on( 'decision', resolution = function ( decisions ) {
                        deferred.resolve( decisions );
                    } );

                    // Create a listener and register it with the FSM
                    try {
                        // Now, we have to figure out what decisions will be necessary to
                        // move to the next state. We accomplish this by passing the 'next'
                        // message to the FSM handler.
                        fsm.handle( 'next' );

                    } finally {
                        // Be sure to remove our listener.
                        fsm.off( 'decision', resolution );
                    }
                } catch ( e ) {
                    var message = e.message || e.toString();
                    log.error( 'Decider::run', message );
                    deferred.resolve( e, true );
                }
            }
        }
    }

    /**
     * ### _getDeciderModulePath_
     *
     * The name of the decider's logic model is held in a module that exports a JSON
     * object under a property named 'logic'. This object encapsulates all of the
     * decision logic that drives the FSM.
     *
     * The actual path to the decider depends on the name of the current workflow and its
     * version number. In practice, you may have several different versions of the same
     * workflow object operating on decision tasks. For this reason, we are using the
     * workflowType object of the DecisionTask to guide us to create the path to the
     * decision module.
     *
     * ```js
     * task = {
     *   events: [ ... ],
     *   workflowType: {
     *       name: 'io.migrate.transfers',
     *       version: '1.0.5'
     *   }
     * }```
     *
     * With this workflowType, the default path to the decision module is:
     *     'workflow/io.migrate.transfers/1.0.5/decider.js'
     *
     * Because it may be helpful to override this default path, a function can be
     * supplied in the constructor (`resolveDecisionModule(DecisionTask)`) that will be
     * used if present.
     *
     * @param task
     */
    function getDeciderModulePath( task, resolveDecisionModule ) {
        // The name of the decider module is determined by convention unless overriden
        if ( typeof resolveDecisionModule !== 'function' ) {
            var path = [];
            path.push( 'workflow' );
            path.push( task.workflowType.name );
            path.push( task.workflowType.version );
            path.push( 'decider' );
            return path.join( '/' );
        } else {
            return resolveDecisionModule.call( this, task );
        }
    }

    /**
     * ### _construct_
     *
     * The Decider object has a short lifespan. It is instantiated and passed a
     * DecisionTask. From that point on, it has one purpose &emdash; decide what to do
     * next.
     *
     * The return value is a Promise, and upon successful resolution the Promise will
     * return an array of SWF decisions in the form of JSON objects.
     *
     * **Parameters**
     *
     * **task** {DecisionTask}
     * > The DecisionTask containing the execution history events and specific proeprties
     * > which descibe the current workflow and task at hand.
     *
     * _resolveDecisionModule_  {Function|String}
     * > An optional function which will resolve the module id of the decision logic for
     * > this particular workflow task. (see [`getDeciderModule()`](#getdecidermodulepath))
     * > May also be passed as String value to indicate the resolved module id.
     *
     */
    function init( task, resolveDecisionModule ) {
        // Get the module path
        var deciderModuleId = typeof resolveDecisionModule === 'function'
            ? getDeciderModulePath( task, resolveDecisionModule )
            : resolveDecisionModule;
        log.debug( 'Decider::init, moduleId: {}', deciderModuleId);

        // The Decision class is a Promise, so callers can invoke the then() function to
        // asynchronously obtain the resulting decisions.
        var deferred = new Deferred();

        // Spin up a thread to do process the events
        new java.lang.Thread( new java.lang.Runnable(
            run( task, deciderModuleId, deferred )
        ) ).start();

        // Eventually (very quickly), the Decider will complete and return its decisions.
        return deferred.promise;
    }

    return init( task, resolveDecisionModule )
};

/**
 * ## Event
 * A convenience wrapper for working with execution history events from Amazon SWF.
 *
 * @param {Object} event The JSON representation of a workflow execution history event.
 * @return {Object}
 */
function Event( task, event ) {

    var input, attrs;

    if ( typeof event !== 'object' ) throw { status : 400,
        message : 'Event constructor requires parameter [event] as JSON object.'
    };

    event = merge( {
        previousStartedEventId : task.previousStartedEventId,
        startedEventId : task.startedEventId,
        taskToken : task.taskToken,
        workflowExecution : task.workflowExecution,
        workflowType : task.workflowType
    }, event );

    var obj = {
        toString : function () {
            return JSON.stringify( event );
        },
        toJSON : function () {
            return JSON.stringify( event );
        }
    };

    Object.defineProperty( obj, 'input', {
        get : function () {
            if ( !input ) {
                if ( /WorkflowExecutionStarted/.test( event.eventType ) ) {
                    input = event.WorkflowExecutionStartedEventAttributes.input;
                } else {
                    input = {}
                }
            }
            return input;
        }
    } );

    Object.defineProperty( obj, 'attrs', {
        get : function () {
            if ( !attrs ) {
                if ( /WorkflowExecutionStarted/.test( event.eventType ) ) {
                    attrs = event.WorkflowExecutionStartedEventAttributes;
                }
                else if ( /ActivityTaskCompleted/.test( event.eventType ) ) {
                    attrs = event.ActivityTaskCompletedEventAttributes;
                }
                else attrs = {};
            }
            return attrs;
        }
    } );

    Object.defineProperty( obj, 'eventType', {
        get : function () {
            return event.eventType;
        }
    } );

    Object.defineProperty( obj, 'json', { value : event, configurable : true } );

    return obj;
}

