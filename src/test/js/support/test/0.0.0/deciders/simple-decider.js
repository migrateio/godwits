'use strict';

var log = require( 'ringo/logging' ).getLogger( module.id );

exports.logic = function ( actions) {

    var workflowId, runId, job, user, errors = [], decisions = [],
        version = version, successfulMigration = false;
    

    return {
        initialState : 'uninitialized',
        steadyState: function() {
            log.debug( 'achieved steady state: ', JSON.stringify( decisions ) );
            this.emit( 'decision', decisions );
        },
        states : {
            uninitialized : {
                _onEnter : function () {
                    log.debug( 'uninitialized::onEnter' );
                },
                WorkflowExecutionStarted : function ( event ) {
                    log.debug( 'uninitialized::WorkflowExecutionStarted' );

                    workflowId = event.json.workflowExecution.workflowId;
                    runId = event.json.workflowExecution.runId;

                    job = event.input;

                    if (!job) {
                        errors.push( 'No job was included in workflow task' );
                        this.transition( 'finalize' );
                    }
                    this.transition('initialize');
                }
            },
            'initialize': {
                next: function() {
                    decisions.push(
                        actions.scheduleActivityTask( 'load-user', version, {
                            userId : job.userId
                        } )
                    );
                },
                ActivityTaskCompleted: function(event) {
                    var result = event.attrs.result;
                    log.debug( 'uninitialized::ActivityTaskCompleted: {}',
                        JSON.stringify( result ));

                    switch (result.status) {
                        case 200:
                            user = result.data;
                            this.transition( 'auth-payment' );
                            break;
                        case 404:
                            errors.push( result.message );
                            this.transition( 'finalize' );
                            break;
                        default:
                            errors.push( 'Unexpected status [' + result.status + '] ' +
                                'from workflow state uninitialized::ActivityTaskCompleted' );
                            this.transition( 'finalize' );
                    }
                }
            },

            'auth-payment' : {
                next: function() {
                    decisions.push(
                        actions.scheduleActivityTask( 'auth-payment', version, {
                            userId : job.userId
                        } )
                    );
                },
                ActivityTaskCompleted: function(event) {
                    var result = event.attrs.result;

                    switch (result.status) {
                        case 200:
                            this.transition( 'migrate' );
                            break;
                        case 404:
                            errors.push( result.message );
                            this.transition( 'finalize' );
                            break;
                        default:
                            errors.push( 'Unexpected status [' + result.status + '] ' +
                                'from workflow state initialized::ActivityTaskCompleted' );
                            this.transition( 'finalize' );
                    }
                }
            },

            'migrate' : {
                next: function() {
                    decisions.push(
                        actions.scheduleActivityTask( 'migrate', version, {
                            userId : job.userId
                        } )
                    );
                },
                ActivityTaskCompleted: function(event) {
                    var result = event.attrs.result;

                    switch (result.status) {
                        case 200:
                            this.transition( 'analyze-results' );
                            break;
                        default:
                            errors.push( 'Unexpected status [' + result.status + '] ' +
                                'from workflow state payment-authorized::ActivityTaskCompleted' );
                            this.transition( 'finalize' );
                    }
                }
            },

            'analyze-results' : {
                next: function() {
                    decisions.push(
                        actions.scheduleActivityTask( 'analyze-results', version )
                    );
                },
                ActivityTaskCompleted: function(event) {
                    var result = event.attrs.result;

                    switch (result.status) {
                        case 200:
                            successfulMigration = result.successRate > 0.95;
                            this.transition( 'report' );
                            break;
                        default:
                            errors.push( 'Unexpected status [' + result.status + '] ' +
                                'from workflow state migrated::ActivityTaskCompleted' );
                            this.transition( 'finalize' );
                    }
                }
            },

            'report' : {
                next: function() {
                    decisions.push(
                        actions.scheduleActivityTask( 'report', version, result )
                    );
                },
                ActivityTaskCompleted: function(event) {
                    var result = event.attrs.result;

                    switch (result.status) {
                        case 200:
                            if (successfulMigration) this.transition( 'capture-payment' );
                            else this.transition( 'invoice' );
                            break;
                        default:
                            errors.push( 'Unexpected status [' + result.status + '] ' +
                                'from workflow state migrated::ActivityTaskCompleted' );
                            this.transition( 'finalize' );
                    }
                }
            },

            'capture-payment' : {
                next: function() {
                    decisions.push(
                        actions.scheduleActivityTask( 'capture-payment', version, result )
                    );
                },
                ActivityTaskCompleted: function(event) {
                    var result = event.attrs.result;

                    switch (result.status) {
                        case 200:
                            this.transition( 'invoice' );
                            break;
                        default:
                            errors.push( 'Unexpected status [' + result.status + '] ' +
                                'from workflow state migrated::ActivityTaskCompleted' );
                            this.transition( 'finalize' );
                    }
                }
            },

            'invoice' : {
                next: function() {
                    decisions.push(
                        actions.scheduleActivityTask( 'invoice', version, result )
                    );
                },
                ActivityTaskCompleted: function(event) {
                    var result = event.attrs.result;

                    switch (result.status) {
                        case 200:
                            this.transition( 'finalize' );
                            break;
                        default:
                            errors.push( 'Unexpected status [' + result.status + '] ' +
                                'from workflow state migrated::ActivityTaskCompleted' );
                            this.transition( 'finalize' );
                    }
                }
            },

            'finalize' : {
                next: function() {
                    if (errors.length > 0) {
                        decisions.push(
                            actions.failWorkflowExecution( errors )
                        );
                        return;
                    }
                    decisions.push(
                        actions.completeWorkflowExecution()
                    );
                }
            }
        }
    }
};

