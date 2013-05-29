var log = require( 'ringo/logging' ).getLogger( module.id );

exports.middleware = function ( next, app ) {

    var response = require( 'ringo/jsgi/response' );

    return function ( req ) {

        var servletRequest = req.env.servletRequest;

        var hasRole = req.hasRole = function ( roles ) {
            return [].concat( roles ).some( function ( role ) {
                return servletRequest.isUserInRole( role );
            } );
        };

        req.hasAllRoles = function ( roles ) {
            return [].concat( roles ).every( function ( role ) {
                return servletRequest.isUserInRole( role );
            } );
        };

        req.isNotAdmin = function () {
            return !hasRole( 'ROLE_ADMIN' );
        };

        req.isAdmin = function () {
            return hasRole( 'ROLE_ADMIN' );
        };

        req.isUser = function (id) {
            return getUsername() === id;
        };

        var getUsername = req.getUsername = function () {
            var principal = servletRequest.getUserPrincipal();
            return principal ? principal.name : null;
        };

        req.isAuthenticated = function () {
            return !!servletRequest.getUserPrincipal();
        };


        function checkCondition() {
            return true;
        }


        /**
         * Returns a 403 error if the current request does not satisfy the authorization
         * requirements.
         *
         * @param {String|Array} [roles]
         * @param {Boolean} [condition]
         * @return {*}
         */
        req.allow = function ( condition ) {
            if ( !condition )  throw {
                status : 403,
                message : 'Access is forbidden'
            }
        };

        return next( req );
    }
};