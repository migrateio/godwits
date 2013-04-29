var log = require( 'ringo/logging' ).getLogger( module.id );
var {Deferred} = require( 'ringo/promise' );

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

    var loadCustomer = function ( job ) {
        var customerId = job.customerId;
        return {
            id : job.customerId,
            name : 'Fred Flintstone',
            freshbooksId : '12345',
            stripeId : '67890'
        };
    };

    var machina = require( 'machinajs' )();

    // todo: Perhaps the decider should extend machina.Fsm?
    var fsm = new machina.Fsm( {
        initialState : 'uninitialized',
        states : {
            uninitialized : {
                _onEnter : function () {
                    log.info( 'uninitialized::onEnter: {}', JSON.stringify( arguments ) );
                },
                WorkflowExecutionStarted : function ( job ) {
                    log.info( 'uninitialized::WorkflowExecutionStarted: {}', JSON.stringify( arguments ) );
                    this.job = job;
                    // Do the initialization work here
                    this.transition( 'initialized' );
                }
            },

            initialized : {
                _onEnter : function () {
                    log.info( 'initialized::onEnter: {}', JSON.stringify( arguments ) );
                    machina.emit( 'task', {
                        type : 'ScheduleActivityTask',
                        activityId : '',
                        activityType : { name : '', version : '' },
                        control : '',
                        input : { customerId: this.job.customerId }
                    } );
                }
            }
        }
    } );

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


