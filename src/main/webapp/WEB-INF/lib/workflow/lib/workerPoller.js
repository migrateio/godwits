/**
 * # Module workflow/workerPoller
 */
var log = require( 'ringo/logging' ).getLogger( module.id );

/**
 * ## WorkerPoller
 *
 * The WorkerPoller is an object which will run in its own thread and react to
 * events published by Amazon Simple Workflow.
 *
 * 1. The Poller will con`tinuously poll SWF for pending activity tasks on the provided
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
function WorkerPoller( taskListName, workflow ) {

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
     * ### **registerWorker()**
     *
     * The Activity Worker identified by moduleId is registered as an activity with SWF and
     * entered into the registry of activity workers maintained by this class.
     *
     * @param {String} moduleId The module id for an activity worker
     */
    function registerWorker( moduleId ) {
        var worker = require( moduleId );
        if ( !worker ) throw {
            status : 400,
            message : 'The worker module [' + moduleId
                + '] could not be resolved to a physical module.'
        };
        var type = worker.ActivityType;
        if ( !type ) throw {
            status : 400,
            message : 'The worker module [' + moduleid + '] must export property [ActivityType]'
        };
        if ( !type.name )
            throw {
                status : 400,
                message : 'Command [registerWorker] requires property [ActivityType.name].'
            };
        if ( !type.version )
            throw {
                status : 400,
                message : 'Command [registerWorker] requires property [ActivityType.version].'
            };

        // Register the ActivityType with Amazon SWF
        workflow.registerActivityType( type );

        // Store the moduleId so we can instantiate this module as a Worker later
        var key = type.name + '/' + type.version;
        registry[key] = moduleId;
    }

    function start() {
        polling = true;
    }

    function stop() {
        polling = false;
    }

    function shutdown() {
        shuttingDown = true;
        polling = false;
    }

    /**
     * ### _poll()_
     *
     * Will poll for activity tasks from the task list as long as polling is true until
     * shutting down is set to false.
     */
    function poll() {
        if ( polling ) {
            var task = workflow.pollForActivityTask( {
                taskListName : taskListName
            } );
            if ( task ) startTask( task );
        }
        if ( !shuttingDown ) setTimeout( poll, 1000 );

        // Might be able to shutdown here if no tasks are pending
        else if ( workerCount === 0 ) {
            log.info( 'WorkerPoller [{}] is terminated', taskListName );
        }
    }

    /**
     * ### _workerSuccess()_
     *
     * Called when the worker finishes with a task. Each task will result in a JSON
     * response which is passed along to SWF and included in the execution workflow
     * history.
     *
     * @param {Object} task The original workflow task that triggered the worker thread
     * @param {Object} data The result of the task's operation in JSON format
     */
    function workerSuccess( task, data ) {
        workflow.respondActivityTaskCompleted( {
            result : JSON.stringify( data ),
            taskToken : task.taskToken
        } );
    }

    /**
     * ### _workerError()_
     *
     * An exception thrown in the worker will trigger this handler. The exception will be
     * a JSON object (data) and will expose the following properties (which are
     * optional).
     *
     * _cancelled_ {Boolean}
     * > True if the worker has been cancelled, false if a fault was found.
     *
     * _details_ {String}
     * > Optional detailed information about the failure.
     *
     * _reason_ {String}
     * > Description of the error that may assist in diagnostics. Note: this property is
     * > only used if cancelled is false.
     *
     * @param {Object} task The original workflow task that triggered the worker thread
     * @param {Object} data Optional data that can be included in an error response
     */
    function workerError( task, data ) {
        if ( data.cancelled ) {
            workflow.respondActivityTaskCanceled( {
                details : data.details,
                taskToken : task.taskToken
            } );
        } else {
            workflow.respondActivityTaskFailed( {
                details : data.details,
                reason : data.reason,
                taskToken : task.taskToken
            } );
        }
    }

    /**
     * ### _getActivityWorker()_
     *
     * Looks up the task's activity type to match it with a registered ActivityWorker. If
     * that worker is found it is returned.
     *
     * @param {Object} task The original workflow task that triggered the worker thread
     */
    function getActivityWorker( task ) {
        var key = task.activityType.name + '/' + task.activityType.version;
        var workerModule = registry[key] || null;
        log.info( 'Obtaining worker from registry {}, key: {}',
            workerModule ? 'succeeded' : 'failed', key );
        if ( !workerModule )
            workerError( task, {
                reason : 'The activity poller did not have a worker for activity type ['
                    + key + ']' } );
        return workerModule;
    }

    /**
     * ### _startTask()_
     *
     * Uses the information in the activity task to locate the appropriate worker module
     * and instantiate it with the task data. A heartbeat thread is also started which
     * will continue to beat until the worker thread has completed or errored.
     *
     * @param {Object} task The workflow task retrieved from the task list
     */
    function startTask( task ) {
        var workerModule = getActivityWorker( task );
        if ( workerModule ) {
            workerCount++;
            var worker = new WorkerPromise( workerModule, task );
            var heartbeat = new Worker( 'workflow/heartbeat' );
            heartbeat.postMessage( { taskToken : task.taskToken } );
            worker
                .then( function () {
                    workerSuccess( task, e.data );
                }, function () {
                    workerError( task, e.data );
                } )
                .then( function () {
                    heartbeat.terminate();
                    workerCount--;
                    if ( shuttingDown && workerCount === 0 ) {
                        log.info( 'WorkerPoller [{}] is terminated', taskListName );
                    }
                } );
        }
    }

    /**
     * ### Constructor
     *
     * @param {String} taskListName The name of the taskList from which this poller will
     * be retrieving activity tasks.
     * @param {Workflow} workflow The workflow object associated with this poller.
     */
    function init( taskListName, workflow ) {
        if ( !workflow )
            throw { status : 400, message : 'WorkerPoller requires property [workflow]'};
        if ( !taskListName )
            throw { status : 400, message : 'WorkerPoller requires property [taskListName]'};
        setTimeout( poll, 0 );
    }
    init( taskListName, workflow)
}
exports.WorkerPoller = WorkerPoller;



