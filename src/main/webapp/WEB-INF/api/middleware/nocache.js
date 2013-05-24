var {Headers} = require('ringo/utils/http');

exports.middleware = function ( next, app ) {

    return function ( req ) {

        var result = next( req );
        var headers = Headers( result.headers );
        headers.set( 'Expires', '-1' );
        return result;
    }
};