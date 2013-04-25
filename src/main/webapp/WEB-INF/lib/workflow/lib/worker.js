var log = require('ringo/logging').getLogger(module.id);

var {
    RecordActivityTaskHeartbeatRequest
    } = Packages.com.amazonaws.services.simpleworkflow.model;


/**
 * The base class for activity workers accepts a json object representing the
 * ActivityTask object.
 *
 * This class will take care of the Java routines needed to support the task
 * including heartbeat.
 *
 * The class executes itself in its own thread in addition to kicking off a
 * separate heartbeat thread.
 *
 * @param {Object} task
 * @constructor
 */
var ActivityWorker = exports.ActivityWorker = Object.subClass({
    init: function(workflow, activityType, task) {
        log.debug('ActivityWorker::init{}', JSON.stringify([workflow, activityType, task]));
        this.workflow = workflow;
        this.activityType = activityType;
        this.task = task;

        // Determine heartbeat (in seconds)
        this.heartbeat = parseInt(this.activityType.timeout.heartbeat);
        if (isNaN(this.heartbeat)) this.heartbeat = 60;
        this.heartbeat = new ActivityHeartbeat(workflow, this, this.heartbeat);

        // Kick off this class in a new thread.
        var runner = { run: function() {this.run()}.bind(this) };
        var runnable = new java.lang.Runnable(runner);
        this.thread = new java.lang.Thread(runnable);
        this.thread.setName('worker/' + this.activityType.name + '/' + this.task.activityId);
        this.thread.start();
    },

    run: function() {
        log.info('ActivityWorker::run, processing task: {}', this.task);
        this.heartbeat.start();
        try {
            var result = this.doWork();
            // Result will be an error condition or else the success output
            if (result.error) {
                // todo: Report error condition
                log.error('ActivityWorker::run, worker [{}] completed with an error [{}]',
                    this, JSON.stringify(result.error));
            } else {
                // todo: Report the success condition
                log.debug('ActivityWorker::run, worker [{}] completed successfully [{}]',
                    this, JSON.stringify(result));
            }
        } catch (e) {
            // todo: Report failed task execution
            log.error('ActivityWorker::run, worker [{}] completed with an exception', this, e);
        } finally {
            this.heartbeat.destroy();
        }
    },

    getActivityId: function() {
        return this.task.activityId;
    },

    getToken: function() {
        return this.task.taskToken;
    },

    toString: function() {
        return 'ActivityWorker[' + this.task.activityId + ']';
    },

    // Override these functions in subclass

    doWork: function() {
        java.lang.Thread.sleep(30 * 1000);
    },

    getPercentComplete: function() {
        return '0';
    }
});

ActivityWorker.activityType = {
    /*  Here is where you create your activity type definition
     name: 'mySampleWorker',
     version: '0.1.0',
     taskList: 'myTaskList',
     description: 'Receives a task, processes it, and returns a result.',
     timeout: {
         heartbeat: '60',
         scheduleToStart: '1800',
         scheduleToClose: '5400',
         startToClose: '600'
     }
     */
};

function ActivityHeartbeat(workflow, worker, heartbeat) {
    log.debug('ActivityHeartbeat::init,{}', JSON.stringify(arguments));

    var running = true;
    var beating = false;

    // Setup the heartbeat interval to less than 1/2 the requested heartbeat time.
    // This should make sure that only one missed heartbeat does not kill a task.
    heartbeat = heartbeat * 0.45 * 1000;

    function beat() {
        if (!beating) return;
        var request = new RecordActivityTaskHeartbeatRequest()
            .withDetails(worker.getPercentComplete())  // Percent complete
            .withTaskToken(worker.getToken());
        log.debug('ActivityHeartbeat::beat, Thump thump [{}]', request.toString());
//        var response = this.workflow.getSwfClient().recordActivityTaskHeartbeat(request);
//        response.getCancelRequested();
    }

    var heartbeatThread = new java.lang.Thread(new java.lang.Runnable({
        run: function() {
            try {
                while (running) {
                    beat();
                    try {
                        log.debug('ActivityHeartbeat::run, sleeping for {}.', heartbeat);
                        java.lang.Thread.sleep(heartbeat);
                    } catch (e) {
                        // Sleepytime interruptus, no worries
                    }
                }
            } finally {
                log.debug('ActivityHeartbeat::run, heartbeat thread is interrupted.');
            }
        }
    }));

    heartbeatThread.setName('worker/' + worker.activityId + '/beat');

    return {
        start: function() {
            beating = true;
            heartbeatThread.start();
            log.debug('ActivityHeartbeat::start, starting heartbeat [{}]', worker);
        },
        stop: function() {
            beating = false;
            log.debug('ActivityHeartbeat::stop, stopping heartbeat [{}]', worker);
        },
        destroy: function() {
            beating = false;
            running = false;
            log.debug('ActivityHeartbeat::destroy, killing heartbeat [{}]', worker);
            heartbeatThread.interrupt();
        }
    }
}