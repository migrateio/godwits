/**
 * #Module workflow/decider
 *
 */
var log = require( 'ringo/logging' ).getLogger( module.id );
var {Deferred} = require( 'ringo/promise' );
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
 * > **todo:** Create decoupling between this class and the
 * > FSM configuration. Move this class into the workflow
 * > library and keep the FSM info with the domain's
 * > business logic.
 *
 * @param {String} deciderModuleId The module id for the decider to use.
 * @param {Array} events An array of workflow execution history events from SWF
 * @return {Promise} The eventual result will be an array of decisions (in JSON format)
 */
exports.Decider = function ( deciderModuleId, events ) {

    /**
     * ### _emit()_
     *
     * Broadcast the decisions created by the pass through the FSM.
     *
     * @param {Array|Object} decisions A decision or decisions to broadcast to listeners.
     */
    function emit( decisions ) {
        machina.emit( 'decision', [].concat( decisions ) );
    }

    var decisionActions = {
        /**
         * ### _cancelTimer()_
         *
         * Cancels a previously started timer and records a TimerCanceled event in the
         * history.
         */
        cancelTimer : function () {
        },

        /**
         * ### _cancelWorkflowExecution()_
         *
         * Closes the workflow execution and records a WorkflowExecutionCanceled event in the
         * history.
         */
        cancelWorkflowExecution : function () {
        },

        /**
         * ### _completeWorkflowExecution()_
         *
         * Closes the workflow execution and records a WorkflowExecutionCompleted event in
         * the history .
         */
        completeWorkflowExecution : function () {
        },

        /**
         * ### _continueAsNewWorkflowExecution()_
         *
         * Closes the workflow execution and starts a new workflow execution of the same type
         * using the same workflow id and a unique run Id. A WorkflowExecutionContinuedAsNew
         * event is recorded in the history.
         */
        continueAsNewWorkflowExecution : function () {
        },

        /**
         * ### _failWorkflowExecution()_
         *
         * Closes the workflow execution and records a WorkflowExecutionFailed event in the
         * history.
         */
        failWorkflowExecution : function () {
        },

        /**
         * ### _recordMarker()_
         *
         * Records a MarkerRecorded event in the history. Markers can be used for adding
         * custom information in the history for instance to let deciders know that they do
         * not need to look at the history beyond the marker event.
         */
        recordMarker : function () {
        },

        /**
         * ### _requestCancelActivityTask()_
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
         * ### _requestCancelExternalWorkflowExecution()_
         *
         * Requests that a request be made to cancel the specified external workflow
         * execution and records a RequestCancelExternalWorkflowExecutionInitiated event in
         * the history.
         */
        requestCancelExternalWorkflowExecution : function () {
        },

        /**
         * ### _scheduleActivityTask()_
         *
         * Schedules an activity task.
         *
         * @param {String} activityName
         * @param {String} [activityVersion]
         * @param {Object} input
         * @param {Object} [control]
         */
        scheduleActivityTask : function ( activityName, activityVersion, input, control ) {
            log.info( 'Decider::scheduleActivityTask, {}', JSON.stringify( arguments ) );
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
                control : JSON.stringify( control ),
                input : JSON.stringify( input )
            };
        },

        /**
         * ### _signalExternalWorkflowExecution()_
         *
         * Requests a signal to be delivered to the specified external workflow execution and
         * records a SignalExternalWorkflowExecutionInitiated event in the history.
         */
        signalExternalWorkflowExecution : function () {
        },

        /**
         * ### _startChildWorkflowExecution()_
         *
         * Requests that a child workflow execution be started and records a
         * StartChildWorkflowExecutionInitiated event in the history.The child workflow
         * execution is a separate workflow execution with its own history.
         */
        startChildWorkflowExecution : function () {
        },

        /**
         * ### _startTimer()_
         *
         * Starts a timer for this workflow execution and records a TimerStarted event in the
         * history. This timer will fire after the specified delay and record a TimerFired
         * event.
         */
        startTimer : function () {
        }
    };

    /**
     * ### _replay()_
     *
     * Replays the SWF Execution History through the FSM. In actuality, we replay
     * each of the executions from the history, except for the last one.
     *
     * So, how will this work. Obviously we do not want the replay of events to
     * actually trigger a re-execution of various worker tasks. We basically want the
     * events to move the FSM through its states until it gets through all of the
     * history. Then we need to decide what to do next.
     *
     * @param {Array} events List of events from SWF
     */
    function replay( events, deferred ) {
        var event, resolution;
        log.info( 'Decider::replay, replaying {} event(s)', events.length );

        // Loop through all events in the workflow execution, except for the current one.
        // The fsm will 'emit' messages for each decision, but no one is listening to
        // them.
        while ( events.length > 1 ) {
            event = events.shift();
            fsm.handle( event.eventType, event );
        }

        // Next we will process the most recent event if there is one. We will want to
        // listen to any messages emitted by the FSM at this point because the last event
        // will create decisions that we will be returning from our promise.
        event = events.shift();
        if ( event ) {
            // Create a listener and register it with the FSM
            machina.on( 'decision', resolution = function ( decisions ) {
                log.info( 'FSM Decisions: {}', JSON.stringify( arguments ) );
                // todo: Pretty sure the caller is never going to need the fsm. may remove
                // and replace with just the fsm state_
                deferred.resolve( {fsm : fsm, decisions : decisions} );
            } );
            try {
                log.info( 'Decider::replay, handling primary event: {}',
                    JSON.stringify( event ) );
                fsm.handle( event.eventType, event );
            } finally {
                // Be sure to remove our listener.
                machina.off( 'decision', resolution );
            }
        } else {
            // If there are no events, then there cannot be any decisions. Returning an
            // empty array.
            deferred.resolve( {fsm : fsm, decisions : []} );
        }
    }

    /**
     * ### Constructor
     * Load the decider module and initialize the FSM based on the logic() function it
     * exports.
     *
     * @param {String} deciderModuleId The module id for the decider to use.
     */
    function init( deciderModuleId ) {
        log.debug( 'Decider::init, {}', JSON.stringify( arguments ) );
        var decider = require( deciderModuleId );

        if ( !decider ) throw {
            status : 400,
            message : 'Decider must be instantiated with a valid [deciderModuleId] parameter'
        };
        if ( !decider || typeof decider.logic != 'function' ) throw {
            status : 400,
            message : 'Module [' + deciderModuleId + '] must export the function [logic]'
        };

        log.info( 'Decider::init, initializing FSM' );
        return new machina.Fsm( decider.logic( emit, decisionActions ) );
    }

    // Instantiate the FSM based on the contents of the decider module.
    var fsm = init( deciderModuleId );
    log.info( 'Decider::init, FSM initialized' );

    // The Decision class is a Promise, so callers can invoke the then() function to
    // asynchronously obtain the resulting decisions.
    var deferred = new Deferred();

    // Convert events json to Event objects
    events = [].concat( events ).map( function ( event ) {
        return new Event( event );
    } );

    // Pop off events that pertain to decision tasks
    while (events.length > 0 && /DecisionTaskStarted|DecisionTaskScheduled/
        .test(events[events.length-1].eventType)) events.pop();

    log.debug( 'Decider::init, kicking off timer to replay events' );
    new java.lang.Thread( new java.lang.Runnable( {
        run : function () {
            replay( [].concat( events ), deferred );
        }
    } ) ).start();

    return deferred.promise;
};

/**
 * ## Event
 * A convenience wrapper for working with execution history events from Amazon SWF.
 *
 * @param {Object} event The JSON representation of a workflow execution history event.
 * @return {Object}
 */
function Event( event ) {

    var input;

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
            if ( input ) return input;
            if ( /WorkflowExecutionStarted/.test( event.eventType ) ) {
                log.info( 'Event::input, event: {}', JSON.stringify( event ) );
                input = event.WorkflowExecutionStartedEventAttributes.input;
            }
            return input;
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

