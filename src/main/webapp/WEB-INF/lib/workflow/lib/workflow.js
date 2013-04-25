var log = require('ringo/logging').getLogger(module.id);

var {AmazonSimpleWorkflowClient} = Packages.com.amazonaws.services.simpleworkflow;
var {
    RegisterActivityTypeRequest, RegisterWorkflowTypeRequest, StartWorkflowExecutionRequest,
    TaskList, TypeAlreadyExistsException, WorkflowType
    } = Packages.com.amazonaws.services.simpleworkflow.model;
var {BasicAWSCredentials} = Packages.com.amazonaws.auth;

/**
 * An instance of this class will be the embodiment of an SWF Workflow which is a
 * distributed application composed of coordination logic and tasks that run
 * asynchronously across multiple computing devices.
 *
 * This object will contain a reference to the AWS client which is the gateway for all
 * calls against the Amazon web service. As part of the object contructor the class will
 * invoke RegisterWorkflowType which will register the workflow type and its
 * configuration settings in the specified domain.
 *
 * @type {Workflow}
 * @constructor
 *
 * @param {Object} workflowType The JSON representation of an SWF Workflow Type
 */
exports.Workflow = Object.subClass({

    /**
     *
     * @param {Object} workflowType json to represent SWF workflow
     * @param accessKey
     * @param secretKey
     */
    init: function (workflowType, accessKey, secretKey) {
        log.debug('Workflow:init{}', JSON.stringify(arguments));
        this.options = workflowType;

        log.debug("Workflow::init, establishing AWS SWF Client using access key: {}, secret key: {}",
            accessKey, secretKey);
        var credentials = new BasicAWSCredentials(accessKey, secretKey);
        this.swfClient = new AmazonSimpleWorkflowClient(credentials);

        // We will be keeping hold of the various workflow components
        this.deciderPollers = [];
        this.workerPollers = [];

        this.registerWorkflowType(workflowType);
    },

    getDomain: function() {
        return this.options.domain;
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
    registerWorkflowType: function(options) {
        log.debug('Workflow::registerWorkflow[{}]', JSON.stringify(options));
        if (!options.defaultChildPolicy) options.defaultChildPolicy = 'TERMINATE';
        this.workflowType = new WorkflowType().withName(options.name).withVersion(options.version);
        this.taskList = new TaskList().withName(options.taskListName);
        var request = new RegisterWorkflowTypeRequest()
            .withDomain(options.domain)
            .withDefaultChildPolicy(options.defaultChildPolicy)
            .withName(options.name)
            .withVersion(options.version)
            .withDescription(options.description)
            .withDefaultTaskStartToCloseTimeout(options.timeout.taskStartToClose.toString())
            .withDefaultExecutionStartToCloseTimeout(options.timeout.executionStartToClose.toString())
            .withDefaultTaskList(this.taskList);
        try {
            this.swfClient.registerWorkflowType(request);
        } catch (e if e.javaException instanceof TypeAlreadyExistsException) {
            log.info('Workflow [{}/{}] has already been registered in domain [{}].', options.name, options.version, options.domain);
        }
    },

    executeWorkflow: function(options, input) {
        log.debug('Workflow::executeWorkflow, {}', JSON.stringify([options, input]));
        var workflowType = new WorkflowType()
            .withName(options.workflowName).withVersion(options.workflowVersion);
        var request = new StartWorkflowExecutionRequest()
            .withDomain(this.options.domain)
            .withInput(JSON.stringify(input))
            .withTaskList(this.taskList)
            .withWorkflowType(workflowType);
        if (options.childPolicy) request.setChildPolicy(options.childPolicy);
        if (options.tagList) request.setTagList(options.tagList);
        if (options.workflowName) request.setWorkflowName(options.workflowName);
        if (options.workflowId) request.setWorkflowId(options.workflowId);
        if (options.workflowVersion) request.setWorkflowVersion(options.workflowVersion);
        if (options.timeout.executionStartToClose) request.setExecutionStartToClose(options.executionStartToClose);
        if (options.timeout.taskStartToClose) request.setTaskStartToClose(options.taskStartToClose);

        var run = this.swfClient.startWorkflowExecution(request);
        return run.getRunId();
    },

    /**
     * Register the activity type with SWF
     * @param config
     */
    registerActivityType: function (config) {
        log.debug('Workflow::registerActivityType', JSON.stringify(config));
        var taskList = new TaskList().withName(config.taskList);
        var request = new RegisterActivityTypeRequest()
            .withDomain(this.options.domain)
            .withName(config.name)
            .withVersion(config.version)
            .withDescription(config.description)
            .withDefaultTaskHeartbeatTimeout(config.timeout.heartbeat || '120')
            .withDefaultTaskScheduleToCloseTimeout(config.timeout.scheduleToClose || '5400')
            .withDefaultTaskScheduleToStartTimeout(config.timeout.scheduleToStart || '1800')
            .withDefaultTaskStartToCloseTimeout(config.timeout.startToClose || '600')
            .withDefaultTaskList(taskList);
        try {
            this.getSwfClient().registerActivityType(request);
        } catch (e if e.javaException instanceof TypeAlreadyExistsException) {
            log.debug('Nothing to see here. Expected if task already is registered.');
        }
    },

    addDeciderPoller: function (deciderPoller) {
        log.debug('Workflow::addDeciderPoller, {}', deciderPoller);
        this.deciderPollers.push(deciderPoller);
    },

    addWorkerPoller: function (workerPoller) {
        log.debug('Workflow::addWorkerPoller, {}', workerPoller);
        this.registerActivityType(workerPoller.activityType);
        this.workerPollers.push(workerPoller);
    },

    getSwfClient: function () {
        return this.swfClient;
    },

    toJSON: function () {
        return {
            workflow: this.options
        }
    },

    toString: function () {
        return java.lang.String.format('Workflow[domain:%s, name:%s, version:%s]',
            this.options.domain, this.options.name, this.options.version);
    },

    start: function () {
        this.deciderPollers.forEach(function (poller) {
            poller.start();
        });
        this.workerPollers.forEach(function (poller) {
            poller.start();
        });
    },

    stop: function () {

    },

    shutdown: function () {

    }
});



