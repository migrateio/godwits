/**
 * # Module workflow/swfClient
 */
var log = require( 'ringo/logging' ).getLogger( module.id );
var {Deferred} = require( 'ringo/promise' );

var {AmazonSimpleWorkflowClient} = Packages.com.amazonaws.services.simpleworkflow;
var {BasicAWSCredentials} = Packages.com.amazonaws.auth;

var ISO_FORMAT = new java.text.SimpleDateFormat( "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'" );

var {
    ActivityType, Decision,
    DescribeWorkflowExecutionRequest, PollForDecisionTaskRequest,
    PollForActivityTaskRequest, RecordActivityTaskHeartbeatRequest,
    RegisterActivityTypeRequest, RegisterWorkflowTypeRequest,
    RequestCancelWorkflowExecutionRequest,
    RespondActivityTaskCompletedRequest, RespondActivityTaskFailedRequest,
    RespondActivityTaskCanceledRequest, RespondDecisionTaskCompletedRequest,
    StartWorkflowExecutionRequest, TaskList, TypeAlreadyExistsException,
    UnknownResourceException, WorkflowExecution, WorkflowType
    } = Packages.com.amazonaws.services.simpleworkflow.model;


/**
 * ## SwfClient
 *
 * Encapsulates the Amazon SWF client into a promise for multithreading.
 *
 * @constructor
 */
function SwfClient( workflowOptions, accessKey, secretKey ) {

    var swfClient;

    /**
     * ### _registerWorkflowType_
     *
     * Registers a new workflow type and its configuration settings in the specified
     * domain. The retention period for the workflow history is set by the RegisterDomain
     * action.The options object will contain the following properties:
     *
     * **domain** {String}
     * > The name of the domain in which the workflow execution is created.
     *
     * **name** {String}
     * > The name of the workflow type.
     *
     * **version** {String}
     * > The version of the workflow type.
     *
     * _defaultChildPolicy_ {String}
     * > If set, specifies the default policy to use for the child workflow executions
     * > when a workflow execution of this type is terminated, by calling the
     * > TerminateWorkflowExecution action explicitly or due to an expired timeout. This
     * > default can be overridden when starting a workflow execution using the
     * > StartWorkflowExecution action or the StartChildWorkflowExecution Decision.
     * > The supported child policies are:
     *
     * > * **TERMINATE**: the child executions will be terminated.
     * > * **REQUEST_CANCEL**: a request to cancel will be attempted for each child
     * >   execution by recording a WorkflowExecutionCancelRequested event in its
     * >   history. It is up to the decider to take appropriate actions when it receives
     * >   an execution history with this event.
     * > * **ABANDON**: no action will be taken. The child executions will continue to run.
     *
     * _defaultTaskListName_ {String}
     * > If set, specifies the default task list to use for scheduling decision tasks for
     * > executions of this workflow type. This default is used only if a task list is
     * > not provided when starting the execution through the StartWorkflowExecution
     * > Action or StartChildWorkflowExecution Decision.
     *
     * _description_ {String}
     * > Textual description of the workflow type.
     *
     * _defaultExecutionStartToCloseTimeout_ {String}
     * > If set, specifies the default maximum duration for executions of this workflow
     * > type. You can override this default when starting an execution through the
     * > StartWorkflowExecution Action or StartChildWorkflowExecution Decision.
     * >
     * > The duration is specified in seconds. The valid values are integers greater than
     * > or equal to 0. Unlike some of the other timeout parameters in Amazon SWF, you
     * > cannot specify a value of "NONE" for defaultExecutionStartToCloseTimeout; there
     * > is a one-year max limit on the time that a workflow execution can run. Exceeding
     * > this limit will always cause the workflow execution to time out.
     *
     * _defaultTaskStartToCloseTimeout_ {String}
     * > If set, specifies the default maximum duration of decision tasks for this
     * > workflow type. This default can be overridden when starting a workflow execution
     * > using the StartWorkflowExecution action or the StartChildWorkflowExecution
     * > Decision.
     * >
     * > The valid values are integers greater than or equal to 0. An integer value can
     * > be used to specify the duration in seconds while NONE can be used to specify
     * > unlimited duration.
     *
     * @param {Object} options The options are listed above.
     */
    function registerWorkflowType( options ) {
        function requires( prop ) {
            if ( !options[prop] ) throw {
                status : 400,
                message : 'RegisterWorkflowTypeRequest requires a [' + prop + '] property'
            }
        }

        ['domain', 'name', 'version'].forEach( requires );

        var request = new RegisterWorkflowTypeRequest()
            .withDomain( options.domain )
            .withName( options.name )
            .withVersion( options.version );

        if ( options.defaultTaskListName ) {
            var taskList = new TaskList().withName( options.defaultTaskListName );
            request.setDefaultTaskList( taskList );
        }
        if ( options.defaultChildPolicy )
            request.setDefaultChildPolicy( options.defaultChildPolicy );
        if ( options.description )
            request.setDescription( options.description );
        if ( options.defaultExecutionStartToCloseTimeout )
            request.setDefaultExecutionStartToCloseTimeout(
                options.defaultExecutionStartToCloseTimeout
            );
        if ( options.defaultTaskStartToCloseTimeout )
            request.setDefaultTaskStartToCloseTimeout( options.defaultTaskStartToCloseTimeout );

        try {
            log.debug( 'swfClient.registerWorkflowType( {} )', request );
            swfClient.registerWorkflowType( request );
//            } catch ( e if e.javaException instanceof TypeAlreadyExistsException ) {
        } catch ( e if e
    .
        javaException instanceof TypeAlreadyExistsException
    )
        {
        }
    }

    /**
     * ### _startWorkflow_
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
        // Account for the optional `options` parameter.
        var args = Array.slice( arguments );
        options = args.length > 1 ? args.shift() : {};
        input = args.shift() || {};

        // We will auto-generate a workflowId if one is not provided, and the Workflow
        // object's name and version number are used if not specified.
        var workflowId = options.workflowId || java.util.UUID.randomUUID().toString();
        var workflowName = options.workflowName || workflowOptions.name;
        var workflowVersion = options.workflowVersion || workflowOptions.version;

        var workflowType = new WorkflowType()
            .withName( workflowName )
            .withVersion( workflowVersion );

        var request = new StartWorkflowExecutionRequest()
            .withWorkflowId( workflowId )
            .withWorkflowType( workflowType );

        request.setDomain( options.domain || workflowOptions.domain );

        if ( options.taskListName ) {
            var taskList = new TaskList().withName( options.defaultTaskListName );
            options.setTaskList( taskList );
        }

        if ( input ) request.setInput( JSON.stringify( input ) );

        if ( options.childPolicy ) request.setChildPolicy( options.childPolicy );
        if ( options.tagList ) request.setTagList( options.tagList );
        if ( options.executionStartToCloseTimeout )
            request.setExecutionStartToCloseTimeout( options.executionStartToCloseTimeout );
        if ( options.taskStartToCloseTimeout )
            request.setTaskStartToCloseTimeout( options.taskStartToCloseTimeout );

        log.debug( 'swfClient.startWorkflowExecution( {} )', request );
        var run = swfClient.startWorkflowExecution( request );
        return {
            runId : run.runId,
            workflowId : workflowId
        }
    }

    /**
     * ### _registerActivityType_
     *
     * Registers a new worker type along with its configuration settings in the
     * specified domain. (@see http://goo.gl/R2qD9)
     *
     * Valid options are:
     *
     * **name** {String}
     * > The name of the activity type within the domain.
     *
     * _defaultTaskHeartbeatTimeout_ {String}
     * > If set, specifies the default maximum time before which a activity processing a
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
     * _defaultTaskScheduleToCloseTimeout_ {String}
     * > If set, specifies the default maximum duration for a task of this activity type.
     * > This default can be overridden when scheduling an activity task using the
     * > ScheduleActivityTask Decision.
     * >
     * > The valid values are integers greater than or equal to 0. An integer value can
     * > be used to specify the duration in seconds while NONE can be used to specify
     * > unlimited duration.
     *
     * _defaultTaskScheduleToStartTimeout_ {String}
     * > If set, specifies the default maximum duration that a task of this activity type
     * > can wait before being assigned to a worker. This default can be overridden when
     * > scheduling an activity task using the ScheduleActivityTask Decision.
     * >
     * > The valid values are integers greater than or equal to 0. An integer value can
     * > be used to specify the duration in seconds while NONE can be used to specify
     * > unlimited duration.
     *
     * _defaultTaskStartToCloseTimeout_ {String}
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
     * _domain_ {String}
     * > The name of the domain in which the workflow execution is created. Typically
     * > this field is used to override the default domain specified when creating the
     * > workflow.
     *
     * _taskListName_
     * > If set, specifies the default task list to use for scheduling tasks of this
     * > activity type. This default task list is used if a task list is not provided
     * > when a task is scheduled through the ScheduleActivityTask Decision.
     *
     * _version_ {String}
     * > The version of the activity type. Will use the Workflow object's version number
     * > if one is not provided.
     *
     * @param {Object} options Configuration options for the RegisterActivityType action
     */
    function registerActivityType( options ) {
        // The Workflow object's name and version number are used if not specified.
        var version = options.version || workflowOptions.version;
        var domain = options.domain || workflowOptions.domain;

        if ( !options.name ) throw {
            status : 400,
            message : 'RegisterActivityTypeRequest requires a [name] property'
        };

        var request = new RegisterActivityTypeRequest()
            .withDomain( domain )
            .withName( options.name )
            .withVersion( options.version );

        if ( options.description ) request.setDescription( options.description );

        if ( options.taskListName ) {
            var taskList = new TaskList().withName( options.taskListName );
            request.setDefaultTaskList( taskList );
        }
        if ( options.defaultTaskHeartbeatTimeout )
            request.setDefaultTaskHeartbeatTimeout( options.defaultTaskHeartbeatTimeout );
        if ( options.defaultTaskScheduleToCloseTimeout )
            request.setDefaultTaskScheduleToCloseTimeout( options.defaultTaskScheduleToCloseTimeout );
        if ( options.defaultTaskScheduleToStartTimeout )
            request.setDefaultTaskScheduleToStartTimeout( options.defaultTaskScheduleToStartTimeout );
        if ( options.defaultTaskStartToCloseTimeout )
            request.setDefaultTaskStartToCloseTimeout( options.defaultTaskStartToCloseTimeout );

        try {
            log.debug( 'swfClient.registerActivityType( {} )', request );
            swfClient.registerActivityType( request );
//            } catch ( e if e.javaException instanceof TypeAlreadyExistsException ) {
        } catch ( e if e
    .
        javaException instanceof TypeAlreadyExistsException
    )
        {
        }
    }

    /**
     * ### _pollForActivityTask_
     *
     * Used by workers to get an ActivityTask from the specified activity taskList. This
     * initiates a long poll, where the service holds the HTTP connection open and
     * responds as soon as a task becomes available. The maximum time the service holds
     * on to the request before responding is 60 seconds. If no task is available within
     * 60 seconds, the poll will return an empty result. An empty result, in this
     * context, means that an ActivityTask is returned, but that the value of taskToken
     * is an empty string. If a task is returned, the worker should use its type to
     * identify and process it correctly. (@see http://goo.gl/C0diS)
     *
     * Valid options are:
     *
     * **taskListName** {String}
     * > Specifies the task list to poll for activity tasks.
     *
     * _domain_ {String}
     * > The name of the domain containing the task lists to poll. Typically this field
     * > is used to override the default domain specified when creating the workflow.

     * _identity_ {String}
     * > Identity of the worker making the request, which is recorded in the
     * > ActivityTaskStarted event in the workflow history. This enables diagnostic
     * > tracing when problems arise. The form of this identity is user defined.
     *
     * @param {Object} options The options are listed above.
     */
    function pollForActivityTask( options ) {
        if ( !options.taskListName ) throw {
            status : 400,
            message : 'PollForActivityTaskRequest requires a [taskListName] property'
        };

        var taskList = new TaskList().withName( options.taskListName );

        var request = new PollForActivityTaskRequest()
            .withDomain( options.domain || workflowOptions.domain )
            .withTaskList( taskList );
        if ( options.identity ) request.setIdentity( options.identity );

        log.debug( 'swfClient.pollForActivityTask( {} )', request );
        var task = swfClient.pollForActivityTask( request );
        if ( !task.taskToken ) return null;
        return convertActivityTaskToJson( task );
    }

    /**
     * ### _pollForDecisionTask_
     *
     * Used by deciders to get a DecisionTask from the specified decision taskList. A
     * decision task may be returned for any open workflow execution that is using the
     * specified task list. The task includes a paginated view of the history of the
     * workflow execution. The decider should use the workflow type and the history to
     * determine how to properly handle the task.
     *
     * This action initiates a long poll, where the service holds the HTTP connection
     * open and responds as soon a task becomes available. If no decision task is
     * available in the specified task list before the timeout of 60 seconds expires, an
     * empty result is returned. An empty result, in this context, means that a
     * DecisionTask is returned, but that the value of taskToken is an empty string.
     * (@see http://goo.gl/C0diS)
     *
     * Valid options are:
     *
     * **domain** {String}
     * > The name of the domain containing the task lists to poll. Defaults to workflow's
     * > domain.
     *
     * **taskListName** {String}
     * > Specifies the task list to poll for decision tasks.
     *
     * _identity_ {String}
     * > Identity of the decider making the request, which is recorded in the
     * > DecisionTaskStarted event in the workflow history. This enables diagnostic
     * > tracing when problems arise. The form of this identity is user defined.
     *
     * _maximumPageSize_ {String}
     * > The maximum number of history events returned in each page. The default is 100,
     * > but the caller can override this value to a page size smaller than the default.
     * > You cannot specify a page size greater than 100. Note that the number of events
     * > may be less than the maxiumum page size, in which case, the returned page will
     * > have fewer results than the maximumPageSize specified.
     *
     * _nextPageToken_ {String}
     * > If on a previous call to this method a NextPageToken was returned, the results
     * > are being paginated. To get the next page of results, repeat the call with the
     * > returned token and all other arguments unchanged.
     * >
     * > **Note:** The nextPageToken returned by this action cannot be used with
     * > GetWorkflowExecutionHistory to get the next page. You must call
     * > PollForDecisionTask again (with the nextPageToken) to retrieve the next page of
     * > history records. Calling PollForDecisionTask with a nextPageToken will not
     * > return a new decision task.
     *
     * _reverseOrder_ {String}
     * > When set to true, returns the events in reverse order. By default the results
     * > are returned in ascending order of the eventTimestamp of the events.
     *
     * @param {Object} options The options are listed above.
     * @param {Boolean} fullHistory If true, the execution history is returned complete
     * @return {Object} Returns a json representation of the task, or null if no task
     */
    function pollForDecisionTask( options, fullHistory ) {
        if ( !options.taskListName ) throw {
            status : 400,
            message : 'PollForDecisionTaskRequest requires a [taskListName] property'
        };

        var taskList = new TaskList().withName( options.taskListName );

        var request = new PollForDecisionTaskRequest()
            .withDomain( options.domain || workflowOptions.domain )
            .withTaskList( taskList );

        if ( options.identity ) request.setIdentity( options.identity );
        if ( options.maximumPageSize ) request.setMaximumPageSize( options.maximumPageSize );
        if ( options.nextPageToken ) request.setNextPageToken( options.nextPageToken );
        if ( options.reverseOrder ) request.setReverseOrder( options.reverseOrder );

        var task = swfClient.pollForDecisionTask( request );
        if ( !task.taskToken ) return null;

        if ( fullHistory ) completeDeciderHistory( request, task );

        return convertDeciderTaskToJson( task );
    }

    /**
     * ### _requestCancelWorkflowExecution_
     *
     * Records a WorkflowExecutionCancelRequested event in the currently running workflow
     * execution identified by the given domain, workflowId, and runId. This logically
     * requests the cancellation of the workflow execution as a whole. It is up to the
     * decider to take appropriate actions when it receives an execution history with
     * this event.
     *
     * **Note** If the runId is not specified, the WorkflowExecutionCancelRequested event
     * is recorded in the history of the current open workflow execution with the
     * specified workflowId in the domain.
     * **Note** Because this action allows the workflow to properly clean up and
     * gracefully close, it should be used instead of TerminateWorkflowExecution when
     * possible. (@see http://goo.gl/a1Buu)
     *
     * Valid options are:
     *
     * **workflowId** {String}
     * > The workflowId of the workflow execution to cancel.
     *
     * _domain_ {String}
     * > The name of the domain containing the workflow execution to cancel. Will use the
     * > domain of the current workflow if not specified.
     *
     * _runId_ {String}
     * > The runId of the workflow execution to cancel.
     *
     * @param {Object} options The options are listed above.
     */
    function requestCancelWorkflowExecution( options ) {
        if ( !options.workflowId ) throw {
            status : 400,
            message : 'CancelWorkflowExecutionRequest requires a [workflowId] property'
        };

        var domain = options.domain || workflowOptions.domain;

        var request = new RequestCancelWorkflowExecutionRequest()
            .withDomain( domain )
            .withWorkflowId( options.workflowId );
        if ( options.runId ) request.setRunId( runId );

        log.debug( 'swfClient.requestCancelWorkflowExecution( {} )', request );
        swfClient.requestCancelWorkflowExecution( request );
    }

    /**
     * ### _respondActivityTaskCompleted_
     *
     * Used by workers to tell the service that the ActivityTask identified by the
     * taskToken completed successfully with a result (if provided). The result appears
     * in the ActivityTaskCompleted event in the workflow history.
     * (@see http://goo.gl/GvXuZ)
     *
     * Valid options are:
     *
     * **taskToken** {String}
     * > The taskToken from the ActivityTask.
     *
     * _result_ {String}
     * > The result of the activity task. It is a free form string that is implementation
     * > specific.
     *
     * @param {Object} options The options are listed above.
     */
    function respondActivityTaskCompleted( options ) {
        if ( !options.taskToken ) throw {
            status : 400,
            message : 'RespondActivityTaskCompletedRequest requires a [taskToken] property'
        };

        var request = new RespondActivityTaskCompletedRequest()
            .withTaskToken( options.taskToken );
        if ( options.result ) request.setResult( JSON.stringify( options.result ) );

        log.debug( 'swfClient.respondActivityTaskCompleted( {} )', request );
        swfClient.respondActivityTaskCompleted( request );
    }

    /**
     * ### _respondActivityTaskFailed_
     *
     * Used by workers to tell the service that the ActivityTask identified by the
     * taskToken has failed with reason (if specified). The reason and details appear in
     * the ActivityTaskFailed event added to the workflow history.
     * (@see http://goo.gl/Yqxvq)
     *
     * Valid options are:
     *
     * **taskToken** {String}
     * > The taskToken from the ActivityTask.
     *
     * _details_ {String}
     * > Optional detailed information about the failure.
     *
     * _reason_ {String}
     * > Description of the error that may assist in diagnostics.
     *
     * @param {Object} options The options are listed above.
     */
    function respondActivityTaskFailed( options ) {
        if ( !options.taskToken ) throw {
            status : 400,
            message : 'RespondActivityTaskFailedRequest requires a [taskToken] property'
        };

        var request = new RespondActivityTaskFailedRequest()
            .withTaskToken( options.taskToken );
        if ( options.details ) request.setDetails( options.details );
        if ( options.reason ) request.setReason( options.reason );

        try {
            log.debug( 'swfClient.respondActivityTaskFailed( {} )', request );
            swfClient.respondActivityTaskFailed( request );
        } catch ( e if e
    .
        javaException instanceof UnknownResourceException
    )
        {
            log.debug( 'Perhaps the resource has already failed because of timeout.' );
        }
    }

    /**
     * ### _respondActivityTaskCanceled_
     *
     * Used by workers to tell the service that the ActivityTask identified by the
     * taskToken was successfully canceled. Additional details can be optionally provided
     * using the details argument.
     *
     * These details (if provided) appear in the ActivityTaskCanceled event added to the
     * workflow history.
     *
     * **Important** Only use this operation if the canceled flag of a
     * RecordActivityTaskHeartbeat request returns true and if the activity can be safely
     * undone or abandoned. (@see http://goo.gl/lJdF0)
     *
     * Valid options are:
     *
     * **taskToken** {String}
     * > The taskToken from the ActivityTask.
     *
     * _details_ {String}
     * > Optional detailed information about the cancelure.
     *
     * @param {Object} options The options are listed above.
     */
    function respondActivityTaskCanceled( options ) {
        if ( !options.taskToken ) throw {
            status : 400,
            message : 'RespondActivityTaskCanceledRequest requires a [taskToken] property'
        };

        var request = new RespondActivityTaskCanceledRequest()
            .withTaskToken( options.taskToken );
        if ( options.details ) request.setDetails( options.details );

        log.debug( 'swfClient.respondActivityTaskCanceled( {} )', request );
        swfClient.respondActivityTaskCanceled( request );
    }

    /**
     * _respondDecisionTaskCompleted()
     *
     * Used by deciders to tell the service that the DecisionTask identified by the
     * taskToken has successfully completed. The decisions argument specifies the list of
     * decisions made while processing the task.
     *
     * A DecisionTaskCompleted event is added to the workflow history. The
     * executionContext specified is attached to the event in the workflow execution
     * history. (@see http://goo.gl/fnHLW)
     *
     * Valid options are:
     *
     * **taskToken** {String}
     * > The taskToken from the DecisionTask.
     *
     * _executionContext_ {String}
     * > User defined context to add to the workflow execution.
     *
     * _decisions_ {Array}
     * > The list of decisions (possibly empty) made by the decider while processing this
     * > decision task. (@see http://goo.gl/FFL8j)
     *
     * > Potential JSON decisions are:
     * >     [
     * >         {   type : 'CancelTimer',
     * >             timerId : ''
     * >         },
     * >         {   type : 'CancelWorkflowExecution',
     * >             details : ''
     * >         },
     * >         {   type : 'CompleteWorkflowExecution',
     * >             result : ''
     * >         },
     * >         {   type : 'ContinueAsNewWorkflowExecution',
     * >             childPolicy : '',
     * >             executionStartToCloseTimeout : '',
     * >             taskStartToCloseTimeout : ''
     * >             input : '',
     * >             tagList : [''],
     * >             taskListName : '',
     * >             workflowTypeVersion : ''
     * >         },
     * >         {   type : 'FailWorkflowExecution',
     * >             details : '',
     * >             reason : ''
     * >         },
     * >         {   type : 'RecordMarker',
     * >             details : '',
     * >             markerName : ''
     * >         },
     * >         {   type : 'RequestCancelActivityTask',
     * >             activityId : '',
     * >         },
     * >         {   type : 'RequestCancelExternalWorkflowExecution',
     * >             control : '',
     * >             runId : '',
     * >             workflowId : ''
     * >         },
     * >         {   type : 'ScheduleActivityTask',
     * >             activityId : '',
     * >             activityType : { name : '', version : '' },
     * >             control : '',
     * >             heartbeatTimeout : '',
     * >             input : '',
     * >             scheduleToStartTimeout : '',
     * >             scheduleToCloseTimeout : '',
     * >             startToCloseTimeout : ''
     * >             taskListName : ''
     * >         },
     * >         {   type : 'SignalExternalWorkflowExecution',
     * >             control : '',
     * >             input : '',
     * >             runId : '',
     * >             signalName : '',
     * >             workflowId : ''
     * >         },
     * >         {   type : 'StartChildWorkflowExecution',
     * >             childPolicy : '',
     * >             control : '',
     * >             executionStartToCloseTimeout : '',
     * >             taskStartToCloseTimeout : ''
     * >             input : '',
     * >             tagList : [''],
     * >             taskList : '',
     * >             workflowId : '',
     * >             workflowType : {
     * >                 name : '',
     * >                 version : ''
     * >             }
     * >         },
     * >         {   type : 'StartTimer',
     * >             control : '',
     * >             startToFireTimeout : ''
     * >             timerid : ''
     * >         }
     * >     ];
     *
     * @param {Object} options The options are listed above.
     */
    function respondDecisionTaskCompleted( options ) {
        if ( !options.taskToken ) throw {
            status : 400,
            message : 'RespondDecisionTaskCompletedRequest requires a [taskToken] property'
        };

        // Convert each of the Json decisions to actual Decision objects
        var decisions = [].concat( options.decisions ).map( function ( decision ) {
            var result = convertDecisionFromJson( decision );
            if ( result == null )
                log.warn( 'Unable to convert JSON to Decision: {}', JSON.stringify( decision ) );
            return result;
        }.bind( this ) );

        // Remove any decisions that were not converted properly
        decisions = decisions.filter( function ( decision ) {
            return decision != null;
        } );

        var request = new RespondDecisionTaskCompletedRequest()
            .withTaskToken( options.taskToken );
        if ( decisions ) request.setDecisions( decisions );
        if ( options.executionContext ) request.setExecutionContext( options.executionContext );

        log.debug( 'swfClient.respondDecisionTaskCompleted( {} )', request );
        swfClient.respondDecisionTaskCompleted( request );
    }

    /**
     * _recordActivityTaskHeartbeat()
     *
     * Used by activity to report to the service that the ActivityTask
     * represented by the specified taskToken is still making progress. The worker can
     * also (optionally) specify details of the progress, for example percent complete,
     * using the details parameter. This action can also be used by the worker as a
     * mechanism to check if cancellation is being requested for the activity task. If a
     * cancellation is being attempted for the specified task, then the boolean
     * cancelRequested flag returned by the service is set to true.
     * (@see http://goo.gl/DVMJp)
     *
     * Valid options are:
     *
     * **taskToken** {String}
     * > The taskToken from the ActivityTask.
     *
     * _details_ {String}
     * > If specified, contains details about the progress of the task.
     *
     * @param {Object} options The options are listed above.
     * @return {Boolean} True if the workflow is requesting the activity to be cancelled
     */
    function recordActivityTaskHeartbeat( options ) {
        if ( !options.taskToken ) throw {
            status : 400,
            message : 'RecordActivityTaskHeartbeatRequest requires a [taskToken] property'
        };

        var request = new RecordActivityTaskHeartbeatRequest()
            .withTaskToken( options.taskToken );
        if ( options.details ) request.setDetails( options.details );

        log.debug( 'swfClient.recordActivityTaskHeartbeat( {} )', request );
        var response = swfClient.recordActivityTaskHeartbeat( request );
        return response.isCancelRequested();
    }

    function describeWorkflowExecution( options ) {
        if ( !options.domain ) throw {
            status : 400,
            message : 'DescribeWorkflowExecutionRequest requires a [domain] property'
        };

        if ( !options.runId ) throw {
            status : 400,
            message : 'DescribeWorkflowExecutionRequest requires a [runId] property'
        };

        if ( !options.workflowId ) throw {
            status : 400,
            message : 'DescribeWorkflowExecutionRequest requires a [workflowId] property'
        };

        var execution = new WorkflowExecution()
            .withWorkflowId( options.workflowId )
            .withRunId( options.runId );

        var request = new DescribeWorkflowExecutionRequest()
            .withDomain( options.domain || workflowOptions.domain )
            .withExecution( execution );

        log.debug( 'swfClient.describeWorkflowExecution( {} )', request );
        var response = swfClient.describeWorkflowExecution( request );
        return convertExecutionToJson( response );
    }


    function convertExecutionToJson( detail ) {
        var result = {};

        // WorkflowExecutionDetail::WorkflowExecutionConfiguration
        var config = detail.executionConfiguration;
        result.executionConfiguration = {
            childPolicy : config.childPolicy,
            executionStartToCloseTimeout : config.executionStartToCloseTimeout,
            taskList : {
                name : config.taskList.name
            },
            taskStartToCloseTimeout : config.taskStartToCloseTimeout
        };

        // WorkflowExecutionDetail::WorkflowExecutionInfo
        var info = detail.executionInfo;
        result.executionInfo = {
            execution : {
                runId : (info.execution && info.execution.runId) || null,
                workflowId : (info.execution && info.execution.workflowId) || null
            },
            workflowType : {
                name : info.workflowType.name,
                version : info.workflowType.version
            },
            startTimestamp : info.startTimestamp
                ? new Date( info.startTimestamp ).toISOString() : null,
            closeTimestamp : info.closeTimestamp
                ? new Date( info.closeTimestamp ).toISOString() : null,
            executionStatus : info.executionStatus,
            closeStatus : info.closeStatus,
            parent : info.parent ? {
                runId : info.parent.runId,
                workflowId : info.parent.workflowId
            } : null,
            tagList : [],
            cancelRequested : info.isCancelRequested()
        };
        for ( var i = info.tagList.iterator(); i.hasNext(); ) {
            result.executionInfo.tagList.push( i.next() );
        }

        // WorkflowExecutionDetail::WorkflowExecutionOpenCounts
        var open = detail.openCounts;
        result.open = {
            openActivityTasks : open.openActivityTasks,
            openDecisionTasks : open.openDecisionTasks,
            openTimers : open.openTimers,
            openChildWorkflowExecutions : open.openChildWorkflowExecutions
        };

        result.latestActivityTaskTimestamp = detail.latestActivityTaskTimestamp
            ? new Date( detail.latestActivityTaskTimestamp ).toISOString() : null;
        result.latestExecutionContext = detail.latestExecutionContext;

        return result;
    }


    /**
     * ### _convertDecisionFromJson_
     *
     * Uses Java package naming conventions to build the Java Decision object which
     * corresponds with the Json definition.
     *
     * @param decisionJson
     * @return {Decision}
     */
    function convertDecisionFromJson( decisionJson ) {
        function loadClass( root, parts ) {
            var next = root[parts.shift()];
            return parts.length == 0 ? next : loadClass( next, parts );
        }

//        log.debug( 'Decider::createDecision[{}]', JSON.stringify( decisionJson ) );
        if ( !decisionJson.type ) return null;

        var attrName = decisionJson.type + 'DecisionAttributes';
        var className = 'com.amazonaws.services.simpleworkflow.model.' + attrName;
        var classParts = className.split( '.' );
        var classDef = loadClass( Packages, classParts );
//        log.debug( 'Decider::createDecision, classDef[{}]', classDef );
        var clazz = new classDef();
        if ( !clazz ) return null;

        Object.keys( decisionJson ).forEach( function ( prop ) {
            if ( prop === 'type' ) return;
            var value = decisionJson[prop];
            if ( prop === 'taskListName' ) {
                prop = 'taskList';
                value = new TaskList().withName( value );
            } else if ( prop === 'activityType' ) {
                value = new ActivityType().withName( value.name ).withVersion( value.version );
            } else if ( prop === 'workflowType' ) {
                value = new WorkflowType().withName( value.name ).withVersion( value.version );
            }
            prop = 'set' + prop.charAt( 0 ).toUpperCase() + prop.slice( 1 );
            clazz[prop]( value );
        } );

        var decision = new Decision();
        decision['setDecisionType']( decisionJson.type );
        decision['set' + attrName]( clazz );
        return decision;
    }

    /**
     * ### _completeDeciderHistory_
     *
     * Iterate over the pages of task events to retrieve the full execution history.
     *
     * @param {PollForDecisionTaskRequest} request
     * @param {DecisionTask} task
     */
    function completeDeciderHistory( request, task ) {
        var nextTask = task;

        while ( nextTask.nextPageToken ) {
            request.setNextPageToken( nextTask.nextPageToken );
            nextTask = swfClient.pollForDecisionTask( request );
            task.events.addAll( nextTask.events );
        }
    }

    /**
     * ### _convertDeciderTaskToJson_
     *
     * Convert the DecisionTask into a JSON object.
     *
     * @param {DecisionTask} task
     */
    function convertDeciderTaskToJson( task ) {
        var result = {
            events : [],
            previousStartedEventId : task.getPreviousStartedEventId(),
            startedEventId : task.getStartedEventId(),
            taskToken : task.getTaskToken()
        };

        if ( task.getWorkflowExecution() != null ) {
            result.workflowExecution = {
                runId : task.getWorkflowExecution().getRunId(),
                workflowId : task.getWorkflowExecution().getWorkflowId()
            };
        }

        if ( task.getWorkflowType() != null ) {
            result.workflowType = {
                name : task.getWorkflowType().getName(),
                version : task.getWorkflowType().getVersion()
            }
        }

        /**
         * Just converting Java object to JSON object.
         *
         * @todo This is why we should make the REST calls ourselves.
         */
        task.getEvents().toArray().forEach( function ( event ) {
            var e = {
                eventType : event.getEventType(),
                eventId : event.getEventId(),
                eventTimestamp : new Date( event.getEventTimestamp() ).toISOString()
            };

            // The attributes for this event are retrieved by calling a getter
            // made from the event type name
            var attrName = e.eventType + 'EventAttributes';
            var attrs = event['get' + attrName]();
            e[attrName] = {};

            Object.keys( attrs ).forEach( function ( key ) {
                // We only care about properties that don't start with 'with'...
                if ( /^with/.test( key ) ) return;
                // ... but have a 'withXXX' match
                if ( !attrs['with' + key.charAt( 0 ).toUpperCase() + key.slice( 1 )] ) return;
//                log.info( 'SwfClient::processEvents, eventType: {}, key: {}', e.eventType, key );
                var value = attrs[key];
                // If value is null, bail now
                if ( value == null || value === 'undefined' ) {
//                    log.debug( 'SwfClient::processEvents, eventType: {}, key: {}, value: null',
//                        e.eventType, key );
                    return;
                }
                if ( key === 'activityType' || key === 'workflowType' ) {
                    value = {
                        name : value.getName(),
                        version : value.getVersion()
                    }
                } else if ( key === 'taskList' ) {
                    value = {
                        name : value.getName()
                    }
                } else if ( /input|result|control/.test(key) ) {
                    value = JSON.parse( value );
                } else if ( key === 'tagList' ) {
                    var a = value.toArray();
                    value = [];
                    for ( var i = 0; i < a.length; i++ ) {
                        value.push( '' + a[i] );
                    }
                } else if ( key === 'workflowExecution' || key === 'externalWorkflowExecution' || key === 'parentWorkflowExecution' ) {
                    value = {
                        runId : value.getRunId(),
                        workflowId : value.getWorkflowId()
                    }
                }
                e[attrName][key] = value;
            } );

            result.events.push( e );
        } );

        return result;
    }

    /**
     * ### _convertActivityTaskToJson_
     * Convert the ActivityTask into a JSON object.
     *
     * @param {ActivityTask} task
     */
    function convertActivityTaskToJson( task ) {
        return {
            taskToken : task.getTaskToken(),
            activityType : {
                name : task.activityType.name,
                version : task.activityType.version
            },
            input : task.input,
            startedEventId : task.startedEventId,
            workflowExecution : {
                runId : task.workflowExecution.runId,
                workflowId : task.workflowExecution.workflowId
            }
        };
    }

    swfClient = module.singleton( 'swfClient', function () {
        log.debug( "SwfClient::init, establishing AWS SWF Client using " +
            "access key: {}, secret key: {}", accessKey, secretKey );
        var credentials = new BasicAWSCredentials( accessKey, secretKey );
        return new AmazonSimpleWorkflowClient( credentials );
    } );

    function threadIt( f, args ) {
        var deferred = new Deferred();

        new java.lang.Thread( new java.lang.Runnable( {
            run : function () {
                try {
                    log.debug( 'SwfClient::{}', f.name, JSON.stringify( args ) );
                    var result = f.apply( this, args );
                    log.debug( 'SwfClient::{}, result: {}', f.name, JSON.stringify( result ) );
                    deferred.resolve( result );
                } catch ( e ) {
                    log.error( 'SwfClient::{}, error', f.name, e );
                    deferred.resolve( {message : e.message || e.toString() }, true );
                }
            }
        } ) ).start();

        return deferred.promise;
    }

    return {
        registerWorkflowType : function () {
            return threadIt( registerWorkflowType, arguments );
        },
        startWorkflow : function () {
            return threadIt( startWorkflow, arguments );
        },
        registerActivityType : function () {
            return threadIt( registerActivityType, arguments );
        },
        pollForActivityTask : function () {
            return threadIt( pollForActivityTask, arguments );
        },
        pollForDecisionTask : function () {
            return threadIt( pollForDecisionTask, arguments );
        },
        requestCancelWorkflowExecution : function () {
            return threadIt( requestCancelWorkflowExecution, arguments );
        },
        respondActivityTaskCompleted : function () {
            return threadIt( respondActivityTaskCompleted, arguments );
        },
        respondActivityTaskFailed : function () {
            return threadIt( respondActivityTaskFailed, arguments );
        },
        respondActivityTaskCanceled : function () {
            return threadIt( respondActivityTaskCanceled, arguments );
        },
        respondDecisionTaskCompleted : function () {
            return threadIt( respondDecisionTaskCompleted, arguments );
        },
        recordActivityTaskHeartbeat : function () {
            return threadIt( recordActivityTaskHeartbeat, arguments );
        },
        describeWorkflowExecution : function () {
            return threadIt( describeWorkflowExecution, arguments );
        }

    }
}
exports.SwfClient = SwfClient;