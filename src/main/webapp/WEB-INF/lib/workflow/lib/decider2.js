var log = require('ringo/logging').getLogger(module.id);

var Package = Packages.com.amazonaws.services.simpleworkflow.model;
var {
    ActivityType, Decision, RespondDecisionTaskCompletedRequest, TaskList, WorkflowType
    } = Packages.com.amazonaws.services.simpleworkflow.model;

exports.Decider = Object.subClass({

    init: function (workflow, task) {
        log.debug('Decider::init[{}/{}]', task.workflowType, task.taskToken);
        this.task = task;
        this.swfClient = workflow.getSwfClient();
    },

    createDecision: function (decisionDef) {
        function loadClass(root, parts) {
            var next = root[parts.shift()];
            return parts.length == 0 ? next : loadClass(next, parts);
        }
        log.debug('Decider::createDecision[{}]', JSON.stringify(decisionDef));
        if (!decisionDef.type) return null;

        var attrName = decisionDef.type + 'DecisionAttributes';
        var className = 'com.amazonaws.services.simpleworkflow.model.' + attrName;
        var classParts = className.split('.');
        var classDef = loadClass(Packages, classParts);
        log.debug('Decider::createDecision, classDef[{}]', classDef);
        var clazz = new classDef();
        if (!clazz) return null;

        Object.keys(decisionDef).forEach(function (prop) {
            if (prop === 'type') return;
            var value = decisionDef[prop];
            if (prop === 'taskListName') {
                prop = 'taskList';
                value = new TaskList().withName(value);
            } else if (prop === 'activityType') {
                value = new ActivityType().withName(value.name).withVersion(value.version);
            } else if (prop === 'workflowType') {
                value = new WorkflowType().withName(value.name).withVersion(value.version);
            }
            prop = 'set' + prop.charAt(0).toUpperCase() + prop.slice(1);
            clazz[prop](value);
        });

        var decision = new Decision();
        decision['setDecisionType'](decisionDef.type);
        decision['set' + attrName](clazz);
        return decision;
    },

    /**
     * This is where the work gets done. The Decider will return one or more
     * decisions by returning a JSON object (for a single decision), or a JSON
     * array for multiple decisions. Potential decisions are:
     *
     * return [
     *      {   type: 'CancelTimer',
     *          timerId: ''
     *      },
     *      {   type: 'CancelWorkflowExecution',
     *          details: ''
     *      },
     *      {   type: 'CompleteWorkflowExecution',
     *          result: ''
     *      },
     *      {   type: 'ContinueAsNewWorkflowExecution',
     *          childPolicy: '',
     *          executionStartToCloseTimeout: '',
     *          taskStartToCloseTimeout: ''
     *          input: '',
     *          tagList: [''],
     *          taskListName: '',
     *          workflowTypeVersion: ''
     *      },
     *      {   type: 'FailWorkflowExecution',
     *          details: '',
     *          reason: ''
     *      },
     *      {   type: 'RecordMarker',
     *          details: '',
     *          markerName: ''
     *      },
     *      {   type: 'RequestCancelActivityTask',
     *          activityId: '',
     *      },
     *      {   type: 'RequestCancelExternalWorkflowExecution',
     *          control: '',
     *          runId: '',
     *          workflowId: ''
     *      },
     *      {   type: 'ScheduleActivityTask',
     *          activityId: '',
     *          activityType: { name: '', version: '' },
     *          control: '',
     *          heartbeatTimeout: '',
     *          input: '',
     *          scheduleToStartTimeout: '',
     *          scheduleToCloseTimeout: '',
     *          startToCloseTimeout: ''
     *          taskListName: ''
     *      },
     *      {   type: 'SignalExternalWorkflowExecution',
     *          control: '',
     *          input: '',
     *          runId: '',
     *          signalName: '',
     *          workflowId: ''
     *      },
     *      {   type: 'StartChildWorkflowExecution',
     *          childPolicy: '',
     *          control: '',
     *          executionStartToCloseTimeout: '',
     *          taskStartToCloseTimeout: ''
     *          input: '',
     *          tagList: [''],
     *          taskList: '',
     *          workflowId: '',
     *          workflowType: {
     *              name: '',
     *              version: ''
     *          }
     *      },
     *      {   type: 'StartTimer',
     *          control: '',
     *          startToFireTimeout: ''
     *          timerid: ''
     *      }
     * ];
     */
    onDecide: function () {
        log.debug('Decider::onDecide[{}/{}]', this.task.workflowType, this.task.taskToken);
        return [];
    },

    /**
     * The Thread runner which will execute the decision by invoiking a subclasses' onDecide() function.
     * The onDecide object will have access to the instance-level this.task property. The result of
     * onDecide will be a single decision object, or an array of decision objects.
     */
    run: function () {
        log.debug('Decider::run, beginning decision process: {}', this);
        try {
            var result = this.onDecide();
            log.debug('Decider::run, decision [{}] completed successfully [{}]', this, JSON.stringify(result));

            var decisions = [].concat(result).map(function (decision) {
                var result = this.createDecision(decision);
                log.debug('Decider::run, created decision: {}', result);
                if (result == null)
                    log.warn('Unable to convert JSON to Decisiion: {}', JSON.stringify(decision));
                return result;
            }.bind(this));

            log.debug('Decider::run, Pre-filter for nulls, decisions: {}', decisions.toString());
            decisions = decisions.filter(function (decision) {
                return decision != null;
            });

            log.debug('Decider::run, Post-filter for nulls, decisions: {}', decisions.toString());

            if (decisions.length > 0) {
                log.debug('Decider::run, RespondDecisionTaskCompletedRequest, token[{}], decisions[{}]',
                    this.task.taskToken, decisions.toString());
                var request = new RespondDecisionTaskCompletedRequest()
                    .withDecisions(decisions)
                    .withTaskToken(this.task.taskToken);
                this.swfClient.respondDecisionTaskCompleted(request);
            }
        } catch (e) {
            // I belive the timeout value is the only way to register a decision failure
            log.error('Decider::run, decision [{}] completed with an exception', this, e);
        }
    },

    toString: function () {
        return this.constructor.name + '[' + this.task.taskToken + ']';
    },

    start: function () {

    },

    stop: function () {

    },

    shutdown: function () {

    }
});


