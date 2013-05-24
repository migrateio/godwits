
exports.middleware = function (next, app) {

    return function (req) {

        var servletRequest = req.env.servletRequest;

        req.isUserInRole = function(role) {
            return servletRequest.isUserInRole( role );
        };

        req.getUsername = function() {
            var principal = servletRequest.getUserPrincipal();
            return principal ? principal.name : null;
        };

        req.isAuthenticated = function() {
            return !!servletRequest.getUserPrincipal();
        };

        return next(req);
    }
};