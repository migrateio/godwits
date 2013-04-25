var log = require( 'ringo/logging' ).getLogger( module.id );

var {AmazonSimpleWorkflowClient} = Packages.com.amazonaws.services.simpleworkflow;
var {
    RegisterActivityTypeRequest, RegisterWorkflowTypeRequest, StartWorkflowExecutionRequest,
    TaskList, TypeAlreadyExistsException, WorkflowType
    } = Packages.com.amazonaws.services.simpleworkflow.model;
var {BasicAWSCredentials} = Packages.com.amazonaws.auth;

/**
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
 * todo: Will the Workflow object be the proxy for all api calls? Does the client need
 * to be exposed?
 *
 * The object also maintains a collection of DeciderPollers and WorkerPollers. The
 * primary reason for keeping these references is so that the dev can start/stop the
 * workflow and all attached deciders and workers will have their lifecycles tied to the
 * workflow.
 *
 * @type {Workflow}
 * @constructor
 *
 * @param {Object} workflowType The JSON representation of an SWF Workflow Type
 * @param {String} accessKey The AWS access key for an authorized workflow account
 * @param {String} secretKey The AWS secret key for an authorized workflow account
 */
exports.Workflow = Object.subClass( {

    init : function ( workflowType, accessKey, secretKey ) {
        log.debug( 'Workflow:init{}', JSON.stringify( arguments ) );
        this.workflowType = workflowType;

        log.debug( "Workflow::init, establishing AWS SWF Client using access key: {}, secret key: {}",
            accessKey, secretKey );
        var credentials = new BasicAWSCredentials( accessKey, secretKey );
        this.swfClient = new AmazonSimpleWorkflowClient( credentials );

        // We will be keeping hold of the various workflow components
        this.deciderPollers = [];
        this.workerPollers = [];

        this.registerWorkflowType( workflowType );
    },

    getDomain : function () {
        return this.workflowType.domain;
    },

    /**
     * Registers a workflow with Amazon's SWF service. The options object will
     * contain the following properties:
     * {
     *      domain: '',                 // The name of the domain in which to register the workflow type.
     *      name: '',                   // The name of the workflow type.
     *      version: '',                // The version number for the workflow type.
     *      defaultChildPolicy: '',     // Default policy for child workflow executions:
     *                                     TERMINATE, REQUEST_CANCEL, ABANDON
     *      taskListName: '',           // The default task list to use for this workflow's decision tasks.
     *      description: '',            // Textual description of the workflow type.
     *      timeout: {
     *          taskStartToClose: '',   // The default maximum duration of decision tasks for this workflow type.
     *          executionStartToClose: ''   // The default maximum duration for executions of this workflow type.
     *      }
     * }
     * @param options
     */
    registerWorkflowType : function ( options ) {
        log.debug( 'Workflow::registerWorkflow[{}]', JSON.stringify( options ) );
        if ( !options.defaultChildPolicy ) options.defaultChildPolicy = 'TERMINATE';
        this.workflowType = new WorkflowType().withName( options.name ).withVersion( options.version );
        this.taskList = new TaskList().withName( options.taskListName );
        var request = new RegisterWorkflowTypeRequest()
            .withDomain( options.domain )
            .withDefaultChildPolicy( options.defaultChildPolicy )
            .withName( options.name )
            .withVersion( options.version )
            .withDescription( options.description )
            .withDefaultTaskStartToCloseTimeout( options.timeout.taskStartToClose.toString() )
            .withDefaultExecutionStartToCloseTimeout( options.timeout.executionStartToClose.toString() )
            .withDefaultTaskList( this.taskList );
        try {
            this.swfClient.registerWorkflowType( request );
        } catch ( e if e
        .
        javaException instanceof TypeAlreadyExistsException
        )
        {
            log.info( 'Workflow [{}/{}] has already been registered in domain [{}].', options.name, options.version, options.domain );
        }
    },

    /**
     * Starts an execution of the workflow type in the specified domain using the
     * provided workflowId and input data.
     *
     * Each execution runs independently and you can provide each with its own set of
     * input data. When an execution is started, Amazon SWF schedules the initial
     * decision task. In response, your decider begins generating decisions which
     * initiate activity tasks. Execution continues until your decider makes a decision
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
     * _tagList_ {Array[String]}
     * > The list of tags to associate with the workflow execution. You can specify a
     * > maximum of 5 tags. You can list workflow executions with a specific tag by
     * > calling ListOpenWorkflowExecutions or ListClosedWorkflowExecutions and
     * > specifying a TagFilter.
     *
     * _timeout.executionStartToClose_ {String}
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
     * _timeout.taskStartToClose {String}
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
     * @param {Object} options A list of options that will affect the process execution
     * @param {Object} input A JSON representation of the workflow execution state
     * @return {String} A Run Id that is used to identify this workflow execution
     */
    executeWorkflow : function ( options, input ) {
        log.debug( 'Workflow::executeWorkflow, {}', JSON.stringify( [options, input] ) );
        var workflowType = new WorkflowType()
            .withName( options.workflowName ).withVersion( options.workflowVersion );
        var request = new StartWorkflowExecutionRequest()
            .withDomain( this.workflowType.domain )
            .withInput( JSON.stringify( input ) )
            .withWorkflowId( options.workflowId )
            .withTaskList( this.taskList )
            .withWorkflowType( workflowType );
        if ( options.childPolicy ) request.setChildPolicy( options.childPolicy );
        if ( options.tagList ) request.setTagList( options.tagList );
        if ( options.timeout.executionStartToClose ) request.setExecutionStartToClose( options.executionStartToClose );
        if ( options.timeout.taskStartToClose ) request.setTaskStartToClose( options.taskStartToClose );

        var run = this.swfClient.startWorkflowExecution( request );
        return run.getRunId();
    },

    /**
     * Registers a new activity type along with its configuration settings in the
     * specified domain. (@see http://goo.gl/R2qD9)
     *
     * Valid options are:
     *
     * **name** {String}
     * > The name of the activity type within the domain.
     *
     * **version** {String}
     * > The version of the activity type.
     *
     * _timeout.heartbeat_ {String}
     * > If set, specifies the default maximum time before which a worker processing a
     * > task of this type must report progress by calling RecordActivityTaskHeartbeat.
     * > If the timeout is exceeded, the activity task is automatically timed out. This
     * > default can be overridden when scheduling an activity task using the
     * > ScheduleActivityTask Decision. If the activity worker subsequently attempts to
     * > record a heartbeat or returns a result, the activity worker receives an
     * > UnknownResource fault. In this case, Amazon SWF no longer considers the activity
     * > task to be valid; the activity worker should clean up the activity task.
     * >
     * > The valid values are integers greater than or equal to 0. An integer value can
     * > be used to specify the duration in seconds while NONE can be used to specify
     * > unlimited duration.
     *
     * _timeout.scheduleToClose_ {String}
     * > If set, specifies the default maximum duration for a task of this activity type.
     * > This default can be overridden when scheduling an activity task using the
     * > ScheduleActivityTask Decision.
     * >
     * > The valid values are integers greater than or equal to 0. An integer value can
     * > be used to specify the duration in seconds while NONE can be used to specify
     * > unlimited duration.
     *
     * _timeout.scheduleToStart_ {String}
     * > If set, specifies the default maximum duration that a task of this activity type
     * > can wait before being assigned to a worker. This default can be overridden when
     * > scheduling an activity task using the ScheduleActivityTask Decision.
     * >
     * > The valid values are integers greater than or equal to 0. An integer value can
     * > be used to specify the duration in seconds while NONE can be used to specify
     * > unlimited duration.
     *
     * _timeout.startToClose_ {String}
     * > If set, specifies the default maximum duration that a worker can take to process
     * > tasks of this activity type. This default can be overridden when scheduling an
     * > activity task using the ScheduleActivityTask Decision.
     * >
     * > The valid values are integers greater than or equal to 0. An integer value can
     * > be used to specify the duration in seconds while NONE can be used to specify
     * > unlimited duration.
     *
     * _description_
     * > A textual description of the activity type.
     *
     * _taskList_
     * > If set, specifies the default task list to use for scheduling tasks of this
     * > activity type. This default task list is used if a task list is not provided
     * > when a task is scheduled through the ScheduleActivityTask Decision.
     *
     *
     *
     * @param {Object} options Configuration options for the RegisterActivityType action
     */
    registerActivityType : function ( options ) {
        log.debug( 'Workflow::registerActivityType', JSON.stringify( options ) );
        var request = new RegisterActivityTypeRequest()
            .withDomain( this.workflowType.domain )
            .withName( options.name )
            .withVersion( options.version );
        if ( options.description ) request.setDescription( options.description );
        if ( options.timeout && options.timeout.heartbeat )
            request.setDefaultTaskHeartbeatTimeout( options.timeout.heartbeat );
        if ( options.timeout && options.timeout.scheduleToClose )
            request.setDefaultTaskScheduleToCloseTimeout( options.timeout.scheduleToClose );
        if ( options.timeout && options.timeout.scheduleToStart )
            request.setDefaultTaskScheduleToStartTimeout( options.timeout.scheduleToStart );
        if ( options.timeout && options.timeout.startToClose )
            request.setTaskStartToCloseTimeout( options.timeout.startToClose );
        if (options.taskList) {
            var taskList = new TaskList().withName( options.taskList );
            request.setDefaultTaskList( taskList );
        }
        try {
            this.getSwfClient().registerActivityType( request );
        } catch ( e if e.javaException instanceof TypeAlreadyExistsException ) {
            log.debug( 'Nothing to see here. Expected if task already is registered.' );
        }
    },

    /**
     * Adds a DeciderPoller (or array of DeciderPollers) to the internal list of
     * pollers. The lifecycle of these pollers will be tied to the lifecycle of this
     * Workflow instance.
     *
     * @param {DeciderPoller|Array} deciderPoller
     */
    addDeciderPoller : function ( deciderPoller ) {
        log.debug( 'Workflow::addDeciderPoller, {}', JSON.stringify( deciderPoller ) );
        this.deciderPollers = this.deciderPollers.concat( deciderPoller );
    },

    /**
     * Adds a WorkerPoller (or array of WorkerPollers) to the internal list of pollers.
     * The lifecycle of the workers are bound to the lifecycle of this workflow instance.
     * Each WorkerPoller will also have it's ActivityType registered with SWF.
     *
     * @param {WorkerPoller|Array} workerPoller
     */
    addWorkerPoller : function ( workerPoller ) {
        log.debug( 'Workflow::addWorkerPoller, {}', JSON.stringify( workerPoller ) );
        this.registerActivityType( workerPoller.activityType );
        this.workerPollers = this.workerPollers.concat( workerPoller );
    },

    /**
     * Returns the AWS SWF client so other processes may make calls against the engine.
     *
     * @return {AmazonSimpleWorkflowClient} The authenticated SWF client
     */
    getSwfClient : function () {
        return this.swfClient;
    },

    toJSON : function () {
        return {
            workflow : this.workflowType
        }
    },

    toString : function () {
        return java.lang.String.format( 'Workflow[domain:%s, name:%s, version:%s]',
            this.workflowType.domain, this.workflowType.name, this.workflowType.version );
    },

    /**
     * Start the workflow by ensuring that each decider and worker poller is started.
     */
    start : function () {
        this.deciderPollers.forEach( function ( poller ) {
            poller.start();
        } );
        this.workerPollers.forEach( function ( poller ) {
            poller.start();
        } );
    },

    /**
     * Stop the workflow by ensuring that each decider and worker poller is stopped.
     */
    stop : function () {
        this.deciderPollers.forEach( function ( poller ) {
            poller.stop();
        } );
        this.workerPollers.forEach( function ( poller ) {
            poller.stop();
        } );
    },

    /**
     * Shutdown the workflow by ensuring that each decider and worker poller is shutdown.
     */
    shutdown : function () {
        this.deciderPollers.forEach( function ( poller ) {
            poller.shutdown();
        } );
        this.workerPollers.forEach( function ( poller ) {
            poller.shutdown();
        } );
    }
} );



