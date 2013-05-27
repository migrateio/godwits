var log = require( 'ringo/logging' ).getLogger( module.id );

exports.logic = function ( emit, ) {
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
                    this.transition( 'identification' );
                }
            },

            identification : {
                _onEnter : function () {
                    log.info( 'identification::onEnter: job: {}', JSON.stringify( this.job ) );
                    emit(
                        scheduleActivityTask( 'loadUser', { userId : this.job.userId } )
                    );
                }
            }
        }
    }
};

