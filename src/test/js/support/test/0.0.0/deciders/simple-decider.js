var log = require( 'ringo/logging' ).getLogger( module.id );

exports.logic = function (emit, actions) {

    var job;

    return {
        initialState : 'uninitialized',
        states : {
            uninitialized : {
                _onEnter : function () {
                    log.info( 'uninitialized::onEnter' );
                },
                WorkflowExecutionStarted : function ( event ) {
                    log.info( 'uninitialized::WorkflowExecutionStarted' );
                    job = event.input;
                    // Do the initialization work here
                    this.transition( 'identification' );
                }
            },

            identification : {
                _onEnter : function () {
                    log.info( 'identification::onEnter' );
                    emit(
                        actions.scheduleActivityTask( 'load-user', {
                            userId : job.userId
                        } )
                    );
                }
            }
        }
    }
};

