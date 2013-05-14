processQueue : function ( type ) {
    ...
    _.each( toProcess, function ( item ) {
        this.handle.apply( this, item.args );
    }, this );
    this.steadyState.apply(this);
}