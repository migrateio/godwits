exports.middleware = function ( next, app ) {

    var response = require( 'ringo/jsgi/response' );

    return function ( req ) {

        var servletRequest = req.env.servletRequest;

        var isUserInRole = req.isUserInRole = function ( role ) {
            return [].concat( role ).some( function ( role ) {
                return servletRequest.isUserInRole( role );
            } );
        };

        req.getUsername = function () {
            var principal = servletRequest.getUserPrincipal();
            return principal ? principal.name : null;
        };

        req.isAuthenticated = function () {
            return !!servletRequest.getUserPrincipal();
        };

        /**
         * Returns a 403 error if the current request does not satisfy the authorization
         * requirements.
         *
         * @param {String|Array} [roles]
         * @param {Boolean} [condition]
         * @return {*}
         */
        req.allow = function (roles, condition) {
            var args = Array.prototype.slice.call( arguments, 0 );
            roles = /string|object/.test( typeof args[0] ) ? args.shift() : null;
            condition = /boolean/.test( typeof args[0] ) ? args.shift() : true;

            var allow = true;

            if ( allow && roles && !isUserInRole( roles ) ) allow = false;
            if ( allow && !condition ) allow = false;

            if (!allow)  return response.forbidden();
        };

        return next( req );
    }
};