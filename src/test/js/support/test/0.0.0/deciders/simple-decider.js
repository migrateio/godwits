'use strict';

var log = require( 'ringo/logging' ).getLogger( module.id );

exports.logic = function ( actions) {

    var workflowId, runId, job, user, errors = [], decisions = [];

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
                    if (!job) throw {
                        status: 400,
                        message: 'No job was included in workflow task'
                    };
                },
                next: function() {
                    log.debug( 'uninitialized::next' );
                    decisions.push(
                        actions.scheduleActivityTask( 'load-user', '0.0.5', {
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
                            this.transition( 'payment' );
                            break;
                        case 404:
                            errors.push( result.message );
                            this.transition( 'finalize' );
                            break;
                        default:
                            throw {
                                status: 400,
                                message: 'Unexpected status [' + result.status + '] ' +
                                    'from workflow state uninitialized::ActivityTaskCompleted'
                            }
                    }
                }
            },

            payment : {
                _onEnter : function () {
                    log.debug( 'payment::onEnter' );
                    this.transition( 'finalize' );
                }
            },

            finalize : {
                _onEnter : function() {
                    log.debug( 'finalize::onEnter' );
                },
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

