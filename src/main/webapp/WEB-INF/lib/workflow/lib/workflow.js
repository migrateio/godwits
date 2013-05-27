/**
 * # Module workflow/workflow
 */
var log = require( 'ringo/logging' ).getLogger( module.id );
var {SwfClient} = require( './swfClient' );
var {WorkerPoller} = require( './workerPoller' );
var {DeciderPoller} = require( './deciderPoller' );


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
     * Adds a DeciderPoller to the internal list of pollers. The lifecycle of these
     * pollers will be tied to the lifecycle of this Workflow instance.
     *
     * @param {DeciderPoller|Array} deciderPoller
     * @param {Function} [resolveDecisionModule] A function that will be passed a
     * DecisionTask and replies with the module path to load the decision logic
     */
    function registerDecider( taskListName, resolveDecisionModule ) {
        log.debug( 'Workflow::registerDecider, {}', JSON.stringify( arguments ) );

        // Pollers are cached using the task list name as the key.
        var poller = deciderPollers[taskListName];

        // This may be the first time the poller is accessed. In that case we will create
        // a new poller and track it in the registry.
        if ( !poller ) {
            log.debug( 'Registering new DeciderPoller for taskList [{}]', taskListName );
            // Instantiate a new worker.
            poller = new DeciderPoller( taskListName, swfClient, resolveDecisionModule );

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
            log.debug( 'Registering new WorkerPoller for taskList [{}]', taskListName );
            poller = new WorkerPoller( taskListName, swfClient );
            workerPollers[taskListName] = poller;
        }
        [].concat( workerModuleIds ).forEach( function ( workerModuleId ) {
            log.debug( 'Registering activity worker [{}]', workerModuleId );
            poller.registerWorker( workerModuleId );
        } );
    }

    /**
     * Starts an execution of the workflow type in the specified domain using the
     * provided workflowId and input data.
     *
     * Each execution runs independently and you can provide each with its own set of
     * input data. When an execution is started, Amazon SWF schedules the initial
     * decision task. In response, your decider begins generating decisions which
     * initiate worker tasks. Execution continues until your decider makes a decision
     * to close the execution.
     *
     * Valid options that may be submitted along with the execution workflow are:
     *
     * **workflowId** {String}
     * > The user defined identifier associated with the workflow execution. You can
     * > use this to associate a custom identifier with the workflow execution. You may
     * > specify the same identifier if a workflow execution is logically a restart of
     * > a previous execution. You cannot have two open workflow executions with the
     * > same workflowId at the same time.
     * > >
     * > The specified string must not start or end with whitespace. It must not
     * > contain a : (colon), / (slash), | (vertical bar), or any control characters
     * > (\u0000-\u001f | \u007f - \u009f). Also, it must not contain the literal
     * > string "arn".
     *
     * **workflowName** {String}
     * > The name of the workflow type to start.
     *
     * **workflowVersion** {String}
     * > The version of the workflow type to start.
     *
     * _childPolicy_ {String}
     * > If set, specifies the policy to use for the child workflow executions of this
     * > workflow execution if it is terminated, by calling the
     * > TerminateWorkflowExecution action explicitly or due to an expired timeout. This
     * > policy overrides the default child policy specified when registering the
     * > workflow type using RegisterWorkflowType. The supported child policies are:
     * > > TERMINATE: the child executions will be terminated.
     * > > REQUEST_CANCEL: a request to cancel will be attempted for each child execution
     * > > by recording a WorkflowExecutionCancelRequested event in its history. It is up
     * > > to the decider to take appropriate actions when it receives an execution
     * > > history with this event.
     * > > ABANDON: no action will be taken. The child executions will continue to run.
     * > Note: A child policy for this workflow execution must be specified either as a
     * > default for the workflow type or through this parameter. If neither this
     * > parameter is set nor a default child policy was specified at registration time
     * > then a fault will be returned.
     *
     * _domain_ {String}
     * > The name of the domain in which the workflow execution is created. Typically
     * > this field is used to override the default domain specified when creating the
     * > workflow.
     *
     * _tagList_ {Array[String]}
     * > The list of tags to associate with the workflow execution. You can specify a
     * > maximum of 5 tags. You can list workflow executions with a specific tag by
     * > calling ListOpenWorkflowExecutions or ListClosedWorkflowExecutions and
     * > specifying a TagFilter.
     *
     * _taskListName_ {String}
     * > The task list to use for the decision tasks generated for this workflow
     * > execution. This overrides the defaultTaskList specified when registering the
     * > workflow type.
     * >
     * > **Note** A task list for this workflow execution must be specified either as a
     * > default for the workflow type or through this parameter. If neither this
     * > parameter is set nor a default task list was specified at registration time then
     * > a fault will be returned.
     *
     * _executionStartToCloseTimeout_ {String}
     * > The total duration for this workflow execution. This overrides the
     * > defaultExecutionStartToCloseTimeout specified when registering the workflow
     * > type. The duration is specified in seconds. The valid values are integers
     * > greater than or equal to 0. Exceeding this limit will cause the workflow
     * > execution to time out. Unlike some of the other timeout parameters in Amazon
     * > SWF, you cannot specify a value of "NONE" for this timeout; there is a one-year
     * > max limit on the time that a workflow execution can run.
     * >
     * > Note: An execution start-to-close timeout must be specified either through this
     * > parameter or as a default when the workflow type is registered. If neither this
     * > parameter nor a default execution start-to-close timeout is specified, a fault
     * > is returned.
     *
     * _taskStartToCloseTimeout_ {String}
     * > The total duration for this workflow execution. This overrides the
     * > defaultExecutionStartToCloseTimeout specified when registering the workflow
     * > type. The duration is specified in seconds. The valid values are integers
     * > greater than or equal to 0. Exceeding this limit will cause the workflow
     * > execution to time out. Unlike some of the other timeout parameters in Amazon
     * > SWF, you cannot specify a value of "NONE" for this timeout; there is a one-year
     * > max limit on the time that a workflow execution can run.
     * >
     * > Note: An execution start-to-close timeout must be specified either through this
     * > parameter or as a default when the workflow type is registered. If neither this
     * > parameter nor a default execution start-to-close timeout is specified, a fault
     * > is returned.
     *
     * @param {Object} [options] A list of options that will affect the process execution
     * @param {Object} input A JSON representation of the workflow execution state
     * @return {String} A Run Id that is used to identify this workflow execution
     */
    function startWorkflow( options, input ) {
        log.info( 'Workflow::startWorkflow, arg count: {}, {}',
            arguments.length, JSON.stringify( arguments ) );
        return swfClient.startWorkflow.apply( this, Array.slice( arguments ) );
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
        Object.keys( workerPollers ).forEach( function ( key ) {
            workerPollers[key].start();
        } );
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
        Object.keys( workerPollers ).forEach( function ( key ) {
            workerPollers[key].stop();
        } );
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
        Object.keys( workerPollers ).forEach( function ( key ) {
            workerPollers[key].shutdown();
        } );
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

        if ( typeof workflowType !== 'object' ) throw {
            status : 400,
            message : 'Workflow instance requires a [workflowType] parameter as an object.'
        };
        if ( typeof workflowType.name !== 'string' ) throw {
            status : 400,
            message : 'WorkflowType parameter requires a [name] parameter as a string.'
        };
        if ( typeof workflowType.version !== 'string' ) throw {
            status : 400,
            message : 'WorkflowType parameter requires a [version] parameter as a string.'
        };
        if ( typeof accessKey !== 'string' ) throw {
            status : 400,
            message : 'Workflow instance requires an [accessKey] parameter as a string.'
        };
        if ( typeof secretKey !== 'string' ) throw {
            status : 400,
            message : 'Workflow instance requires an [secretKey] parameter as a string.'
        };

        swfClient = new SwfClient( workflowType, accessKey, secretKey );
        log.debug( 'Preparing to register workflowtype: {}', JSON.stringify( workflowType ) );

        var result = swfClient.registerWorkflowType( workflowType ).wait( 5000 );
        log.debug( 'Completed the registration of workflowtype: {}, result: {}',
            JSON.stringify( workflowType ), JSON.stringify( result ) );
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
        startWorkflow : startWorkflow,

        // Gotta be a better way than exposing this for testing purposes only (spies)
        swfClient : swfClient,

        start : start,
        stop : stop,
        shutdown : shutdown,

        toJSON : toJSON,
        toString : toString
    }

};



