var log = require('ringo/logging').getLogger(module.id);

var {
    ActivityTask, ActivityType, PollForActivityTaskRequest, TaskList, WorkflowExecution
    } = Packages.com.amazonaws.services.simpleworkflow.model;
var {stats} = require('utility');

var THRESHOLD_LOW_MEM = 1000000;
var THRESHOLD_HIGH_CPU = 70;
var THROTTLE_TIMEOUT = 30 * 1000;


var WorkerPoller = exports.WorkerPoller = Object.subClass({

    init: function (workflow, Worker) {
        log.debug('WorkerPoller::init{}', JSON.stringify(arguments));

        this.workflow = workflow;
        this.Worker = Worker;

        if (!Worker.activityType) throw 'WorkerPoller::init, Worker [' + Worker.constructor.name +
            '] is missing a static activityType property.';
        this.activityType = Worker.activityType;

        this.taskList = new TaskList().withName(this.activityType.taskListName);

        // The WorkerPoller will spawn as many Worker threads as it can, therefore
        // it is run as a single threaded object which will spawn numerous subthreads.
        var runner = { run: function() {this.run()}.bind(this) };
        var runnable = new java.lang.Runnable(runner);
        this.poller = new java.lang.Thread(runnable);
        this.poller.setName('worker/' + this.activityType.name + '/poll');
    },

    /**
     * Returns true if polling is available at the moment. If polling is not available
     * the function will sleep for a pre-determined amount of time.
     */
    canPoll: function() {
        // Pause a moment so workers don't get created too quickly
        java.lang.Thread.sleep(10000);
        var stat = stats();
        var memoryAvail = stat.jvm.mem.free > THRESHOLD_LOW_MEM;
        var cpuAvail = stat.system.cpu.load5 < THRESHOLD_HIGH_CPU;
        return cpuAvail && memoryAvail;
    },

    run: function() {
        while (true) {
            if (this.canPoll()) {
                log.debug('WorkerPoller::run, polling tasks in [{}/{}].',
                        this.workflow.getDomain(), this.taskList);

                var request = new PollForActivityTaskRequest()
                    .withDomain(this.workflow.getDomain())
                    .withTaskList(this.taskList)
                    .withIdentity(this.activityType.name);
                var task = this.workflow.getSwfClient().pollForActivityTask(request);

//                var task = this.createFake(this.activityType);

                // If there is a task token, then we have a task to process. Spin it off
                // for the Worker to handle
                if (task.taskToken) {
                    var jsonTask = this.convertTask(task);
                    log.info('WorkerPoller::run, preparing task for processing: {}', JSON.stringify(jsonTask, null, 4));
                    new this.Worker(this.workflow, this.activityType, jsonTask);
                }
            } else {
                log.debug('Pausing while jobs process and resources lighten.');
                java.lang.Thread.sleep(THROTTLE_TIMEOUT);
            }
        }
    },

    createFake: function(config) {
        var job = {
            from: [
                {
                    service: 'imap',
                    username: 'pete@oldservice.com',
                    password: 'secret'
                }
            ],
            to: {
                service: 'gmail',
                username: 'pete@poolpicks.com',
                password: 'secret'
            }
        };
        var activityType = new ActivityType()
            .withName(config.name)
            .withVersion(config.version);
        var workflowExecution = new WorkflowExecution()
            .withRunId('48D2E00A7')
            .withWorkflowId('987654');
        return new ActivityTask()
            .withActivityId("ABCDEF")
            .withActivityType(activityType)
            .withInput(JSON.stringify(job))
            .withStartedEventId(1234567890)
            .withTaskToken("TOKEN123")
            .withWorkflowExecution(workflowExecution);

    },

    /**
     * Creates a JSON representation of the SWF ActivityTask object. Not absolutely
     * necessary, but it does cleanup on a few elements. It will be nice if we don't
     * have to include a reference to the WorkflowExecution Java object.
     *
     * @param task
     * @return {Object}
     * @constructor
     */
    convertTask: function(task) {
        return {
            activityId: task.activityId,
            input: JSON.parse(task.input || {}),
            startedEventId: task.startedEventId,
            taskToken: task.taskToken,
            activityType: {
                name: task.activityType.name,
                version: task.activityType.version
            },
            workflowExecution: {
                runId: task.workflowExecution.runId,
                workflowId: task.workflowExecution.workflowId
            }
        }
    },

    start: function () {
        this.poller.start();
    },

    stop: function () {

    },

    shutdown: function () {

    }
});

