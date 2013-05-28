'use strict';

var log = require( 'ringo/logging' ).getLogger( module.id );

exports.logic = function ( actions ) {

    var workflowId, runId, job, user, errors = [], decisions = [],
        version = '0.0.6', successfulMigration = false;
    

    return {
        initialState : 'uninitialized',
<<<<<<< Updated upstream
        steadyState: function() {
=======
        steadyState : function () {
            log.debug( 'achieved steady state: ', JSON.stringify( decisions ) );
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream

                    if (!job) {
                        errors.push( 'No job was included in workflow task' );
                        this.transition( 'finalize' );
                    }
                    this.transition('initialize');
                }
            },
            'initialize': {
                _onEnter : function () {
                    log.debug( 'initialize::onEnter' );
                },
                next: function() {
=======
                    if ( !job ) throw {
                        status : 400,
                        message : 'No job was included in workflow task'
                    };
                },
                next : function () {
                    log.debug( 'uninitialized::next' );
>>>>>>> Stashed changes
                    decisions.push(
                        actions.scheduleActivityTask( 'load-user', version, {
                            userId : job.userId
                        } )
                    );
                },
                ActivityTaskCompleted : function ( event ) {
                    var result = event.attrs.result;
<<<<<<< Updated upstream
=======
                    log.debug( 'uninitialized::ActivityTaskCompleted: {}',
                        JSON.stringify( result ) );
>>>>>>> Stashed changes

                    switch ( result.status ) {
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
                _onEnter : function () {
                    log.debug( 'auth-payment::onEnter' );
                },
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
<<<<<<< Updated upstream
                            errors.push( 'Unexpected status [' + result.status + '] ' +
                                'from workflow state initialized::ActivityTaskCompleted' );
                            this.transition( 'finalize' );
                    }
                }
            },

            'migrate' : {
                _onEnter : function () {
                    log.debug( 'migrate::onEnter' );
                },
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
                _onEnter : function () {
                    log.debug( 'analyze-results::onEnter' );
                },
                next: function() {
                    decisions.push(
                        actions.scheduleActivityTask( 'analyze-results', version )
                    );
                },
                ActivityTaskCompleted: function(event) {
                    var result = event.attrs.result;

                    switch (result.status) {
                        case 200:
                            successfulMigration = result.data.successRate > 0.95;
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
                _onEnter : function () {
                    log.debug( 'report::onEnter' );
                },
                next: function() {
                    decisions.push(
                        actions.scheduleActivityTask( 'report', version )
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
                _onEnter : function () {
                    log.debug( 'capture-payment::onEnter' );
                },
                next: function() {
                    decisions.push(
                        actions.scheduleActivityTask( 'capture-payment', version )
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
=======
                            throw {
                                status : 400,
                                message : 'Unexpected status [' + result.status + '] ' +
                                    'from workflow state uninitialized::ActivityTaskCompleted'
                            }
>>>>>>> Stashed changes
                    }
                }
            },

            'invoice' : {
                _onEnter : function () {
                    log.debug( 'invoice::onEnter' );
                },
                next: function() {
                    decisions.push(
                        actions.scheduleActivityTask( 'invoice', version )
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

<<<<<<< Updated upstream
            'finalize' : {
=======
            finalize : {
>>>>>>> Stashed changes
                _onEnter : function () {
                    log.debug( 'finalize::onEnter' );
                },
                next : function () {
                    if ( errors.length > 0 ) {
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

