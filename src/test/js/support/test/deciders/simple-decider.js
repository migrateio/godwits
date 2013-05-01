var log = require( 'ringo/logging' ).getLogger( module.id );

exports.logic = function (emit, actions) {
    return {
        initialState : 'uninitialized',
        states : {
            uninitialized : {
                _onEnter : function () {
                    log.info( 'uninitialized::onEnter' );
                },
                WorkflowExecutionStarted : function ( event ) {
                    log.info( 'uninitialized::WorkflowExecutionStarted' );
                    this.job = event.input;
                    // Do the initialization work here
                    this.transition( 'initialized' );
                }
            },

            initialized : {
                _onEnter : function () {
                    log.info( 'initialized::onEnter' );
                    emit(
                        actions.scheduleActivityTask( 'load-customer', {
                            userId : this.job.userId
                        } )
                    );
                }
            }
        }
    }
};

