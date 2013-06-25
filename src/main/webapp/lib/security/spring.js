(function () {
    "use strict";

    var mod = angular.module( 'spring-security', ['angular-auth'] )
        .run( ['$log', '$rootScope', '$location', 'authEvents',
        /**
         * ## Module spring-security setup
         *
         * This code block will listen for authentication events and keep track of the
         * url that was present at the time authentication was triggered. When
         * authentication is complete, it will make sure the user's path is updated to
         * point to its original destination, or the home page if none was discovered.
         */
        function ( $log, $rootScope, $location, authEvents ) {

            var originalPath;

            $rootScope.$on( authEvents.EVENT_LOGIN_REQUIRED, function (e, path) {
                // If the original path is going to be something that starts with /signin
                // then we will just redirect to home when finished.
                originalPath = /^\/signin/i.test( path ) ? '/' : path;
                $location.path( '/signin' );
            } );

            $rootScope.$on( authEvents.EVENT_LOGIN_CONFIRMED, function () {
                if ( originalPath ) $location.path( originalPath );
                else $location.path( '/' );
                originalPath = null;
            } );

            $rootScope.$on( authEvents.EVENT_LOGOUT_CONFIRMED, function () {
                $location.path( '/' );
            } );
        } ]
    );

    /**
     * Controller that can be used on the client to get authentication details about the
     * current user and push them into scope.
     */
    mod.controller( 'auth-me', ['$log', '$rootScope', '$scope', '$http', 'authService',

        function ( $log, $rootScope, $scope, $http, authService ) {

            $scope.authenticated = false;

            $rootScope.$on( authService.events.EVENT_LOGOUT_CONFIRMED, function () {
                $scope.authenticated = false;
                $log.info( 'Setting $scope.authenticated to false' );
            } );

            $rootScope.$on( authService.events.EVENT_LOGIN_CONFIRMED, function () {
                $scope.authenticated = true;
                $log.info( 'Setting $scope.authenticated to true' );
            } );

            /**
             * Signs the user out using the spring security conventions, and broadcasts
             * the result to all listeners.
             */
            $scope.signout = function () {
                $log.info( 'Attempting logout of the user' );
                $http.get( 'j_spring_security_logout' ).then( function () {
                    $log.info( 'Logout succeeds' );
                    authService.logout();
                } );
            };

            /**
             * We will make an attempt to call an api method on the server which will
             * go through the security filter, but will not trigger a 401 exception if
             * the user is not yet authenticated. If the user is authenticated, this call
             * will return the user's name, email address and roles.
             */
            function passiveAuth() {
                $log.info( 'Attempting passive authentication of the user' );
                $http.get( '/api/auth/' ).success( function ( data ) {
                    $log.info( 'passiveAuth::result of /api/auth/', JSON.stringify( data ) );
                    $scope.authenticated = data.isAuthenticated;

                    // Even a passive login check can result in an authenticated user
                    if (data.isAuthenticated) {
                        authService.loginConfirmed( data.user );
                    }
                } );
            }

            // If the user hasn't explicity authenticated at some point, let's try a
            // passive auth attempt.
            if ( !$scope.authenticated ) passiveAuth();
        }
    ] );

    mod.factory( '$springService',
        ['$log', '$q', '$http', 'authService',
            function ( $log, $q, $http, authService ) {


                function authenticate (email, password, remember) {
                    var deferred = $q.defer();

                    var success = function ( data ) {
                        $log.info( 'Response from auth request:', JSON.stringify( data ) );
                        switch ( data.status || data ) {
                            case 'AUTH_SUCCESS' :
                                authService.loginConfirmed( data.user );
                                deferred.resolve( data.user );
                                break;
                            case 'AUTH_INACTIVE' :
                                deferred.reject( data.status || data );
                                break;
                            case 'AUTH_BAD_CREDENTIALS' :
                                deferred.reject( data.status || data );
                                break;
                            default :
                                deferred.reject( data.status || data );
                                break;
                        }
                    };

                    var config = {
                        headers : {
                            'Content-Type' : 'application/x-www-form-urlencoded; charset=UTF-8'
                        }
                    };

                    var data = {
                        j_username : email,
                        j_password : password,
                        _spring_security_remember_me : remember
                    };

                    $log.info( 'Data:', data );

                    $http.post( '/j_spring_security_check', $.param( data ), config )
                        .success( success )
                        .error( function () {
                            success( 'AUTH_ERROR' );
                        } );

                    return deferred.promise;
                }

                return {
                    authenticate: authenticate
                }
            }
        ] );
})();