(function () {
    "use strict";

    var mod = angular.module( 'spring-security', ['angular-auth'] )
        .run( ['$log', '$rootScope', '$location', 'authEvents',
        function ( $log, $rootScope, $location, authEvents ) {

            var originalPath;

            $rootScope.$on( authEvents.EVENT_LOGIN_REQUIRED, function (e, path) {
                originalPath = path;
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
                    $log.info( 'Result of /api/auth/', JSON.stringify( data ) );
                    $scope.authenticated = data.isAuthenticated;
                } );
            }

            // If the user hasn't explicity authenticated at some point, let's try a
            // passive auth attempt.
            if ( !$scope.authenticated ) passiveAuth();
        }
    ] );

    mod.controller( 'signin-controller',
        ['$log', '$rootScope', '$scope', '$http', 'authService',
            function ( $log, $rootScope, $scope, $http, authService ) {

//                $scope.username = '';
//                $scope.password = '';
                $scope.username = 'admin@migrate.io';
                $scope.password = 'secret';
                $scope.remember = false;
                $scope.alerts = [];

                $scope.closeAlert = function ( index ) {
                    $scope.alerts.splice( index, 1 );
                };

                $scope.submit = function () {
                    $scope.alerts = [];

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
                                $scope.alerts.push( {
                                    type : 'error',
                                    msg : 'Your email address or password isn\'t correct. \
                                        Please try again.'
                                } );
                                break;
                            default :
                                $scope.alerts.push( {
                                    type : 'error',
                                    msg : 'Unknown error occurred while signing in. \
                                        This isn\'t your fault, it is ours. We are on it.'
                                } );
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

                    $http.post( '/j_spring_security_check', $.param( data ), config )
                        .success( success )
                        .error( function () {
                            success( 'AUTH_ERROR' );
                        } );
                }

            }
        ]
    );

    mod.controller( 'signup-controller',
        ['$log', '$rootScope', '$scope', '$http', '$location',
            function ( $log, $rootScope, $scope, $http, $location ) {

                $scope.firstname = '';
                $scope.email = '';
                $scope.alerts = [];

                $scope.closeAlert = function ( index ) {
                    $scope.alerts.splice( index, 1 );
                };

                $scope.submit = function () {
                    $scope.alerts = [];

                    var success = function ( data ) {
                        $log.info( 'Response from create user request:', JSON.stringify( data ) );
                        $location.path( '/verify/' + data.id + '?signup' );
                    };

                    var data = {
                        name: $scope.firstname,
                        email : {
                            address : $scope.email
                        }
                    };

                    $log.info( 'Data:', data );

                    $http.post( '/api/users/', data )
                        .success( success )
                        .error( function () {
                            $scope.alerts.push( {
                                type : 'error',
                                msg : 'We are unable to create your account at this time. \
                                        This isn\'t your fault, it is ours. We are on it.'
                            } );
                        } );
                }

            }
        ]
    );

})();