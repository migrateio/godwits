/**
 * @fileOverview
 * The ActivityPoller is a Worker object which will run in its own thread and react to
 * events published by Amazon Simple Workflow.
 *
 * 1. The Poller will continuously poll SWF for pending activity tasks on the provided
 *    task list.
 * 2. When a task has been received, the Poller will:
 *     1. Identify the activity type of the task
 *     2. Lookup the ActivityWorker module associated with the activity type.
 *     3. Instantiate the new Activity worker
 *     4. Attach a listener to the Worker to be notified in the event of success or
 *        failure
 * 3. When the Poller is notified of a Worker completion
 *     1. Notify SWF of the Workers completion status (whether success or error)
 *     2. Remove the Worker from the internal queue
 * 4. In the event of a shutdown message from the workflow:
 *     1. The Poller will cease to poll SWF for new tasks
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
 * Maintains a collection of ActivityWorkers. These workers are stored in the map using
 * a key = activityType.name + '/' + activityType.version. To register the worker, this
 * module will accept a postMessage.
 *
 *     this.postMessage( {
 *         activityType: {
 *             name: '',
 *             version: ''
 *         },
 *         worker: worker
 *     } )
 *
 * @type {Object}
 */
var registry = {};

/**
 * @param e
 */
function onmessage( e ) {
    log.info( 'onmessage: {}', JSON.stringify( arguments ) );

    if ( !e.data || !e.data.command )
        throw { status : 400, message : 'Invalid message. No command specified.'};

    switch ( e.data.command ) {
        case 'start':
            taskListName = taskListName || data.taskListName;
            workflow = workflow || data.workflow;
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
        case 'registerWorker':
            if ( !e.data.activityType || !e.data.activityType.name)
                throw {
                    status : 400,
                    message : 'Command [registerWorker] requires property [activityType.name].'
                };
            if ( !e.data.activityType || !e.data.activityType.version)
                throw {
                    status : 400,
                    message : 'Command [registerWorker] requires property [activityType.version].'
                };
            if ( !e.data.worker )
                throw {
                    status : 400,
                    message : 'Command [registerWorker] requires property [worker].'
                };
            var key = e.data.activityType.name + '/' + e.data.activityType.version;
            registry[key] = e.data.worker;
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
    while ( !shuttingDown ) {
        while ( polling ) {
            var task = workflow.pollForActivityTask( {
                taskListName : taskListName
            } );
            if ( task ) startTask( task );
        }
        java.lang.Thread.sleep( 1000 );
    }
}

/**
 * Called when the worker finishes with a task. Each task will result in a JSON response
 * which is passed along to SWF and included in the execution workflow history.
 *
 * @param {Object} task
 * @param {Object} data
 */
function workerSuccess( task, data ) {
    workflow.respondActivityTaskCompleted( {
        result: JSON.stringify( data ),
        taskToken: task.taskToken
    } );
}

/**
 * An exception thrown in the worker will trigger this handler. The exception will be a
 * JSON object (data) and will expose the following properties (which are optional).
 *
 * _cancelled_ {Boolean}
 * > True if the worker has been cancelled, false if a fault was found.
 *
 * _details_ {String}
 * > Optional detailed information about the failure.
 *
 * _reason_ {String}
 * > Description of the error that may assist in diagnostics. Note: this property is only
 * > used if cancelled is false.
 *
 * @param {Object} task
 * @param {Object} data
 */
function workerError( task, data ) {
    if (data.cancelled) {
        workflow.respondActivityTaskCanceled( {
            details: data.details,
            taskToken: task.taskToken
        } );
    } else {
        workflow.respondActivityTaskFailed( {
            details: data.details,
            reason: data.reason,
            taskToken: task.taskToken
        } );
    }
}

/**
 * Looks up the task's activity type to match it with a registered ActivityWorker. If
 * that worker is found it is returned.
 *
 * @param task
 */
function getActivityWorker( task ) {
    var key = task.activityType.name + '/' + task.activityType.version;
    var worker = registry[key] || null;
    if (!worker)
        workerError( task, {
            reason: 'The activity poller did not have a worker for activity type ['
                + key + ']' } );
    return worker;
}

function startTask( task ) {
    var activityWorker = getActivityWorker( task );
    if (activityWorker) {
        var worker = new WorkerPromise( activityWorker, task );
        var heartbeat = new Worker( 'workflow/heartbeat' );
        heartbeat.postMessage( { taskToken: task.taskToken } );
        workerCount++;
        worker
            .then( function() {
                workerSuccess( task, e.data );
            }, function() {
                workerError( task, e.data );
            })
            .then( function () {
                heartbeat.terminate();
                workerCount--;
                if (shuttingDown && workerCount === 0) {
                    source.postMessage( { code : 200, message : 'Ready to terminate'} );
                }
            });
    }
}

setTimeout( poll, 0 );



