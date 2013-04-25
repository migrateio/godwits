var log = require('ringo/logging').getLogger(module.id);

var {
    PollForDecisionTaskRequest, TaskList
    } = Packages.com.amazonaws.services.simpleworkflow.model;
var ISO_FORMAT = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");

exports.DeciderPoller = Object.subClass({
    init: function (workflow, taskListName, threadCount, aDecider) {
        log.debug('DeciderPoller::init, {}', JSON.stringify(arguments));
        this.workflow = workflow;
        this.taskList = new TaskList().withName(taskListName);
        this.swfClient = this.workflow.getSwfClient();

        this.Decider = aDecider;

        // Create a thread pool containing at most <threadCount> decider threads doing their thing.
        // When more than <threadCount> runnables are added, the runnables will queue to be executed
        // as other threads complete.
        this.pool = java.util.concurrent.Executors.newFixedThreadPool(threadCount);

        // Some serious gymnastics to make sure the 'this' scope is not lost when
        // run() is executed by new thread. Only took a day to figure this out. --jc
        var runnable = { run: function () {
            this.run()
        }.bind(this) };
        var poolRunner = new java.lang.Runnable(runnable);
        this.poolThread = new java.lang.Thread(poolRunner);
        this.poolThread.setName('decider/' + taskListName + '/poll');

        this.count = 0;
    },

    /**
     * Convert the ActivityTask into a JSON object and pull its full
     * execution history if necessary.
     *
     * @param task
     */
    extractFullTask: function (request, task) {
        var result = {
            events: [],
            previousStartedEventId: task.getPreviousStartedEventId(),
            startedEventId: task.getStartedEventId(),
            taskToken: task.getTaskToken()
        };

        if (task.getWorkflowExecution() != null) {
            result.workflowExecution = {
                runId: task.getWorkflowExecution().getRunId(),
                workflowId: task.getWorkflowExecution().getWorkflowId()
            };
        }

        if (task.getWorkflowType() != null) {
            result.workflowType = {
                name: task.getWorkflowType().getName(),
                version: task.getWorkflowType().getVersion()
            }
        }

        /**
         * Just converting Java object to JSON object.
         * @todo This is why we should make the REST calls ourselves.
         *
         * @param result
         * @param task
         */
        var processEvents = function (result, task) {
            var events = task.getEvents().toArray().forEach(function (event) {
                var e = {
                    eventType: event.getEventType(),
                    eventId: event.getEventId(),
                    eventTimestamp: ISO_FORMAT.format(event.getEventTimestamp())
                };

                // The attributes for this event are retrieved by calling a getter
                // made from the event type name
                var attrs = event['get' + e.eventType + 'EventAttributes']();
                Object.keys(attrs).forEach(function (key) {
                    // We only care about properties that don't start with 'with'...
                    if (/^with/.test(key)) return;
                    // ... but have a 'withXXX' match
                    if (!attrs['with' + key.charAt(0).toUpperCase() + key.slice(1)]) return;
                    log.info('DeciderPoller::processEvents, eventType: {}, key: {}', e.eventType, key);
                    var value = attrs[key];
                    // If value is null, bail now
                    if (value == null) {
                        log.warn('DeciderPoller::processEvents, eventType: {}, key: {}, value: null',
                            e.eventType, key);
                        return;
                    }
                    if (key === 'activityType' || key === 'workflowType') {
                        value = {
                            name: value.getName(),
                            version: value.getVersion()
                        }
                    } else
                    if (key === 'taskList') {
                        value = {
                            name: value.getName()
                        }
                    } else
                    if (key === 'input') {
                        value = JSON.parse(value);
                    } else
                    if (key === 'tagList') {
                        var a = value.toArray();
                        value = [];
                        for (var i = 0; i < a.length; i++) {
                            value.push('' + a[i]);
                        }
                    } else
                    if (key === 'workflowExecution' || key === 'externalWorkflowExecution' || key === 'parentWorkflowExecution') {
                        value = {
                            runId: value.getRunId(),
                            workflowId: value.getWorkflowId()
                        }
                    }
                    e[key] = value;
                    JSON.stringify(e);
                });
                result.events.push(e);
            });
        };

        // Keep polling for the rest of the events, if there are any
        processEvents(result, task);
        while (task.getNextPageToken()) {
            task = this.swfClient.pollForDecisionTask(request);
            processEvents(result, task);
        }

        return result;
    },


    poll: function () {
        log.debug('DeciderPoller::poll, polling for decider from tasklist [{}/{}]',
            this.workflow.getDomain(), this.taskList.name);

        var request = new PollForDecisionTaskRequest()
            .withMaximumPageSize(100)
            .withReverseOrder(true)
            .withDomain(this.workflow.getDomain())
            .withTaskList(this.taskList);

        var task = this.swfClient.pollForDecisionTask(request);

        task = this.extractFullTask(request, task);

        return task;
    },

    run: function () {
        log.debug('DeciderPoller::run, beginning to poll for deciders from tasklist [{}]', this.taskList.name);
        while (true) {
            try {
                var task = this.poll();
                if (task.taskToken) {
                    log.debug('DeciderPoller::run, retrieved task: [{}/{}]', task.workflowType, task.taskToken);
                    var runnable = { run: function () {
                        var decider = new this.Decider(this.workflow, task);
                        decider.run();
                    }.bind(this) };
//                    var runnable = new java.lang.Runnable(decider);
                    var poolRunner = new java.lang.Runnable(runnable);
                    this.pool.submit(poolRunner);
                }
                java.lang.Thread.sleep(20000);
            } catch (e) {
                log.error('Error occurred while polling for task', e);
            }
        }
    },

    toString: function () {
        return 'DeciderPoller[workflow:' + this.workflow + ', taskListName:' + this.taskList.name + ']';
    },

    start: function () {
        log.debug('DeciderPoller::start, starting thread pool');
        this.poolThread.start();
    },

    stop: function () {

    },

    shutdown: function () {

    }
});


