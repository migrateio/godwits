(function () {
    "use strict";

    var mod = angular.module( 'spring-security', ['angular-auth'] );

    mod.factory( 'authListeners',
        ['$rootScope', '$location', 'authEvents',
            function ( $rootScope, $location, authEvents ) {

                var originalUrl = $location.url();

                $rootScope.on( authEvents.EVENT_LOGIN_REQUIRED, function () {
                    $location.url( '#/signin.html' );
                } );

                $rootScope.on( authEvents.EVENT_LOGIN_CONFIRMED, function () {
                    if (originalUrl) $location.url( originalUrl );
                    originalUrl = null;
                } );
            }
        ]
    );

    /**
     * Controller that can be used on the client to get authentication details about the
     * current user and push them into scope.
     */
    mod.controller( 'auth-me', ['$log', '$rootScope', '$scope', '$http', 'authService',

        function ( $log, $rootScope, $scope, $http, authService ) {

            $scope.authenticated = false;

            $rootScope.$on(authService.events.EVENT_LOGOUT_CONFIRMED, function() {
                $scope.authenticated = false;
                $log.info( 'Setting $scope.authenticated to false' );
            });

            $rootScope.$on(authService.events.EVENT_LOGIN_CONFIRMED, function() {
                $scope.authenticated = true;
                $log.info( 'Setting $scope.authenticated to true' );
            });

            /**
             * Signs the user out using the spring security conventions, and broadcasts
             * the result to all listeners.
             */
            $scope.signout = function() {
                $log.info( 'Attempting logout of the user' );
                $http.get( 'j_spring_security_logout' ).then(function() {
                    $log.info( 'Logout succeeds' );
                    authService.logout();
                });
            };

            /**
             * We will make an attempt to call an api method on the server which will
             * go through the security filter, but will not trigger a 401 exception if
             * the user is not yet authenticated. If the user is authenticated, this call
             * will return the user's name, email address and roles.
             */
            function passiveAuth() {
                $log.info( 'Attempting passive authentication of the user' );
                $http.get('/api/auth/' ).success(function(data) {
                    $log.info( 'Result of /api/auth/', JSON.stringify(data) );
                    $scope.authenticated = data.isAuthenticated;
                });
            }

            // If the user hasn't explicity authenticated at some point, let's try a
            // passive auth attempt.
            if (!$scope.authenticated) passiveAuth();
        }
    ] );

    mod.controller( 'spring-auth-controller',
        ['$log', '$rootScope', '$scope', '$http', 'authService',
            function ( $log, $rootScope, $scope, $http, authService ) {

                $scope.username = 'admin@migrate.io';
                $scope.password = 'secret';
                $scope.remember = false;
                $scope.showSignInError = false;

                $scope.submit = function () {
                    $scope.showSignInError = false;

                    var success = function ( data ) {
                        $log.info( 'Response from auth request:', JSON.stringify( data ) );
                        switch ( data.status || data ) {
                            case 'AUTH_SUCCESS' :
                                authService.loginConfirmed( data.user );
                                break;
                            case 'AUTH_INACTIVE' :
                                // todo: Handle case where user has not yet verified their email address
                                break;
                            case 'AUTH_BAD_CREDENTIALS' :
                                $scope.signInErrorMessage = 'Your email address or password isn\'t correct. Please try again.';
                                $scope.showSignInError = true;
                                break;
                            default :
                                $scope.signInErrorMessage = 'Unknown error occurred while signing in. This isn\'t your fault, it is ours. We are on it.';
                                $scope.showSignInError = true;
                                break;
                        }
                    };

                    var config = {
                        headers : {
                            'Content-Type' : 'application/x-www-form-urlencoded; charset=UTF-8'
                        }
                    };

                    var data = {
                        j_username : $scope.username,
                        j_password : $scope.password,
                        _spring_security_remember_me : $scope.remember
                    };

                    $log.info( 'Data:', data );

                    $http.post( '/j_spring_security_check', $.param(data), config )
                        .success( success )
                        .error( function () {
                            $scope.signInErrorMessage = 'Unknown error occurred while signing in. This isn\'t your fault, it is ours. We are on it.';
                            $scope.showSignInError = true;
                            $log.error( 'Error while authenticating to Spring', arguments );
                        } );
                }

            }
        ]
    );

})();