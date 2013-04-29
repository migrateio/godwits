var log = require( 'ringo/logging' ).getLogger( module.id );
var {Deferred} = require( 'ringo/promise' );
var {config, uuid} = require( 'utility' );

/**
 * The Decider processes the workflow history from SWF and determines what is the next
 * course of action.
 *
 * The Decider is a Promise, so it will be used in the following way.
 *
 * 1. When our DeciderPoller retrieves a DecisionTask from SWF, it will include the full
 *    execution workflow history of a job.
 * 2. A new Decider will be instantiated with the workflow history.
 *
 *         var decider = new Decider( history );
 * 3. A Decider is a promise, so while the history is being analyzed, the caller waits
 *    patiently for a response.
 *
 *         var decider = new Decider( history ).then(
 *             function( jsonTask ) {
 *                 // instatiate a worker that will perform the next task in the workflow
 *             }
 *         );
 * 4. When the response is received by the decider, it will include a JSON object that
 *    indicates which activity worker to instantiate and the input to feed to it.
 *
 * @param {Array} events
 * @return {Object}
 * @constructor
 */
exports.Decider = function ( events ) {

    /**
     *
     * @param {String} activityName
     * @param {String} [activityVersion]
     * @param {Object} input
     * @param {Object} [control]
     */
    function scheduleTask(activityName, activityVersion, input, control) {
        log.info( 'Arguments: {}', JSON.stringify( arguments ) );
        var args = Array.prototype.slice.call( arguments, 0 );
        log.info( 'Args: {}', JSON.stringify( args ) );

        activityName = args.shift();
        activityVersion = typeof args[0] === 'object' ? config.version : args.shift();
        input = args.shift();
        control = args.shift();

        log.info( 'Params: {}', JSON.stringify( [activityName, activityVersion, input, control] ) );

        var task = {
            type : 'ScheduleActivityTask',
            activityId : uuid(),
            activityType : { name : activityName, version : activityVersion },
            control : control,
            input : input
        };
        log.info( 'Emitting task: {}', JSON.stringify( task ) );
        machina.emit( 'task', task );
    }

    var machina = require( 'machinajs' )();

    // todo: Perhaps the decider should extend machina.Fsm?
    var fsm = new machina.Fsm( {
        initialState : 'uninitialized',
        states : {
            uninitialized : {
                _onEnter : function () {
                    log.info( 'uninitialized::onEnter: {}', JSON.stringify( arguments ) );
                },
                WorkflowExecutionStarted : function ( event ) {
                    log.info( 'uninitialized::WorkflowExecutionStarted: {}', JSON.stringify( arguments ) );
                    this.job = event.input;
                    // Do the initialization work here
                    this.transition( 'initialized' );
                }
            },

            initialized : {
                _onEnter : function () {
                    log.info( 'initialized::onEnter: {}', JSON.stringify( arguments ) );
                    log.info( 'initialized::onEnter: job: {}', JSON.stringify( this.job ) );
                    scheduleTask( 'loadCustomer', { userId : this.job.userId } );
                }
            }
        }
    } );

    // Convert events json to Events
    events = [].concat(events).map(function(event) {
        return new Event( event );
    });

    var deferred = new Deferred();

    /**
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
    function replay( events ) {
        log.info( 'Replaying events: {}', JSON.stringify( events ) );
        var event;
        while ( events.length > 1 ) {
            event = events.shift();
            fsm.handle( event.eventType, event );
        }
        machina.on( 'task', function ( task ) {
            log.info( 'Received callback: {}', JSON.stringify( arguments ) );
            deferred.resolve( {fsm : fsm, task : task} );
        } );
        event = events.shift();
        log.info( 'Processing event: {}', JSON.stringify( event ) );
        if ( event ) {
            fsm.handle( event.eventType, event );
        }
        else deferred.resolve( {} );
    }

    setTimeout( function () {
        replay( [].concat( events ) );
    }, 0 );

    return deferred.promise;
};


function Event(event) {

    var input;

    var obj = {
        toString: function() {
            return JSON.stringify( event );
        },
        toJSON: function() {
            return JSON.stringify( event );
        }
    };

    Object.defineProperty(obj, 'input', {
        get: function() {
            if (input) return input;
            if (/WorkflowExecutionStarted/.test(event.eventType)) {
                input = event.workflowExecutionStartedEventAttributes.input;
            }
            return input;
        }
    });
    Object.defineProperty(obj, 'eventType', {
        get: function() {
            return event.eventType;
        }
    });
    Object.defineProperty(obj, 'json', { value: event, configurable: true });

    return obj;
}

