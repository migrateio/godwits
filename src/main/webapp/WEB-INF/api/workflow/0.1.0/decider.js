var log = require( 'ringo/logging' ).getLogger( module.id );

exports.logic = function () {
    return {
        initialState : 'uninitialized',
        states : {
            uninitialized : {
                _onEnter : function () {
                    log.info( 'uninitialized::onEnter: {}', JSON.stringify( arguments ) );
                },
                WorkflowExecutionStarted : function ( event ) {
                    log.info( 'uninitialized::WorkflowExecutionStarted: {}', JSON.stringify( arguments ) );
                    this.job = event.input;
                    // Do the initialization work here
                    this.transition( 'initialized' );
                }
            },

            initialized : {
                _onEnter : function () {
                    log.info( 'initialized::onEnter: job: {}', JSON.stringify( this.job ) );
                    emit(
                        scheduleActivityTask( 'loadCustomer', { userId : this.job.userId } )
                    );
                }
            }
        }
    }
};

