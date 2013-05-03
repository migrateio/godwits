/**
 * # Module workflow/workflow
 */
var log = require( 'ringo/logging' ).getLogger( module.id );
var {SwfClient} = require( './swfClient' );
var {WorkerPoller} = require( './workerPoller' );
var {DeciderPoller} = require( './deciderPoller' );

var {
    ActivityType, Decision, PollForDecisionTaskRequest, PollForActivityTaskRequest,
    RecordActivityTaskHeartbeatRequest,
    RegisterActivityTypeRequest, RegisterWorkflowTypeRequest,
    RespondActivityTaskCompletedRequest, RespondActivityTaskFailedRequest,
    RespondActivityTaskCanceledRequest,
    RespondDecisionTaskCompletedRequest, StartWorkflowExecutionRequest,
    TaskList, TypeAlreadyExistsException, WorkflowType
    } = Packages.com.amazonaws.services.simpleworkflow.model;


/**
 * ## Workflow
 *
 * An instance of this class is the embodiment of an SWF Workflow which is a distributed
 * application composed of coordination logic and tasks that run asynchronously across
 * multiple computing devices. When this class is constructed, a n AWS Workflow Type will
 * be registered. (@see http://goo.gl/p8aNf)
 *
 * This object will contain a reference to the AWS client which is the gateway for all
 * calls against the Amazon web service. As part of the object contructor the class will
 * invoke RegisterWorkflowType which will register the workflow type and its
 * configuration settings in the specified domain.
 *
 * The object also maintains a collection of DeciderPollers and WorkerPollers. The
 * primary reason for keeping these references is so that the dev can start/stop the
 * workflow and all attached deciders and workers will have their lifecycles tied to the
 * workflow.
 *
 * <a href="http://goo.gl/zZD30" target="_blank"><img src="http://goo.gl/zZD30" width="100%"/></a>
 *
 */
exports.Workflow = function ( workflowOptions, accessKey, secretKey ) {

    var swfClient;
    var workerPollers = {};
    var deciderPollers = {};

    /**
     * ### **registerDecider**
     *
     * Adds a DeciderPoller (or array of DeciderPollers) to the internal list of
     * pollers. The lifecycle of these pollers will be tied to the lifecycle of this
     * Workflow instance.
     *
     * @param {DeciderPoller|Array} deciderPoller
     */
    function registerDecider( taskListName, deciderModuleId ) {
        log.debug( 'Workflow::registerDecider, {}', JSON.stringify( arguments ) );

        // Pollers are cached using the task list name as the key.
        var poller = deciderPollers[taskListName];

        // This may be the first time the poller is accessed. In that case we will create
        // a new poller and track it in the registry.
        if (!poller) {
            log.info( 'Registering new DeciderPoller for taskList [{}]', taskListName );
            // Instantiate a new worker.
            poller = new DeciderPoller( taskListName, deciderModuleId, swfClient );

            // Add the poller to the registry.
            deciderPollers[taskListName] = poller;
        }
    }

    /**
     * ### **registerWorkers**
     *
     * Registers an Worker (or array of Workers) on the provided task list. The lifecycle
     * of the workers are bound to the lifecycle of this workflow instance. Each worker
     * will export a property named 'ActivityType' which will be registered with the SWF.
     *
     * @param {String} taskListName The name of the task list with which to register
     *                 workers.
     * @param {String|Array} workerModuleIds The module id of the worker to register (or array)
     */
    function registerWorkers( taskListName, workerModuleIds ) {
        log.debug( 'Workflow::registerWorkers, {}', JSON.stringify( arguments ) );
        var poller = workerPollers[taskListName];
        if ( !poller ) {
            log.info( 'Registering new WorkerPoller for taskList [{}]', taskListName );
            poller = new WorkerPoller( taskListName, swfClient );
            workerPollers[taskListName] = poller;
        }
        [].concat( workerModuleIds ).forEach( function ( workerModuleId ) {
            log.info( 'Registering activity worker [{}]', workerModuleId );
            poller.registerWorker( workerModuleId );
        } );
    }

    /**
     * ### **start**
     *
     * Start the workflow by ensuring that each decider and worker poller is started.
     */
    function start() {
        log.debug( 'start()' );
        Object.keys( deciderPollers ).forEach( function ( key ) {
            deciderPollers[key].start();
        } );
        Object.keys(workerPollers ).forEach(function(key) {
            workerPollers[key].start();
        });
    }

    /**
     * ### **stop**
     *
     * Stop the workflow by ensuring that each decider and worker poller is stopped.
     */
    function stop() {
        log.debug( 'stop()' );
        Object.keys( deciderPollers ).forEach( function ( key ) {
            deciderPollers[key].stop();
        } );
        Object.keys(workerPollers ).forEach(function(key) {
            workerPollers[key].stop();
        });
    }

    /**
     * ### **shutdown**
     *
     * Shutdown the workflow by ensuring that each decider and worker poller is shutdown.
     */
    function shutdown() {
        log.debug( 'shutdown()' );
        Object.keys( deciderPollers ).forEach( function ( key ) {
            deciderPollers[key].shutdown();
        } );
        Object.keys(workerPollers ).forEach(function(key) {
            workerPollers[key].shutdown();
        });
    }

    function toJSON() {
        return {
            workflow : workflowOptions
        }
    }

    function toString() {
        return java.lang.String.format( 'Workflow[domain:%s, name:%s, version:%s]',
            workflowOptions.domain, workflowOptions.name, workflowOptions.version );
    }

    /**
     * ### **init**
     *
     * Initializes the Workflow object. Creates the Amazon SWF client using the supplied
     * authentication credentials and registers the workflow type which is also passed
     * in.
     *
     * @param {Object} workflowOptions The JSON representation of an SWF Workflow Type
     * @param {String} accessKey The AWS access key for an authorized workflow account
     * @param {String} secretKey The AWS secret key for an authorized workflow account
     */
    function init( workflowType, accessKey, secretKey ) {
        log.debug( 'Workflow:init{}', JSON.stringify( arguments ) );

        if (typeof workflowType !== 'object') throw {
            status: 400,
            message: 'Workflow instance requires a [workflowType] parameter as an object.'
        };
        if (typeof workflowType.name !== 'string') throw {
            status: 400,
            message: 'WorkflowType parameter requires a [name] parameter as a string.'
        };
        if (typeof workflowType.version !== 'string') throw {
            status: 400,
            message: 'WorkflowType parameter requires a [version] parameter as a string.'
        };
        if (typeof accessKey !== 'string') throw {
            status: 400,
            message: 'Workflow instance requires an [accessKey] parameter as a string.'
        };
        if (typeof secretKey !== 'string') throw {
            status: 400,
            message: 'Workflow instance requires an [secretKey] parameter as a string.'
        };

        var swfClient = new SwfClient( workflowType, accessKey, secretKey );
        log.info( 'Preparing to register workflowtype: {}', JSON.stringify( workflowType ) );
        try {
            swfClient.registerWorkflowType( workflowType ).then(function() {
                log.info( 'Call done' );
            });
            log.info( 'Completed the registration of workflowtype: {}', JSON.stringify( workflowType ) );
        } catch ( e ) {
            log.error( 'Error while registering workflow', e );
        }
    }

    init( workflowOptions, accessKey, secretKey );

    /**
     * ### **API**
     *
     * #### Public APIs
     *
     * The public API for the Workflow object exposes the following functions.
     *
     * * [start](#start)
     * * [stop](#stop)
     * * [shutdown](#shutdown)
     * * [startWorkflow](#startWorkflow)
     * * [registerDecider](#registerDecider)
     * * [registerWorkers](#registerWorkers)
     *
     */
    return {
        registerDecider : registerDecider,
        registerWorkers : registerWorkers,

        start : start,
        stop : stop,
        shutdown : shutdown,

        toJSON : toJSON,
        toString : toString
    }

};



