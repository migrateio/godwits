var log = require('ringo/logging').getLogger(module.id);
var response = require( 'ringo/jsgi/response' );

exports.middleware = function error(next, app) {

    return function error(request) {
        try {
            return next(request);
        } catch (error if error.status && error.message) {
            log.error( error );
            return response.error().json( error );
        } catch (e) {
            log.error( e );
            return response.error().json({
                status: 500,
                message: e.toString()
            });
        }
    };
};
