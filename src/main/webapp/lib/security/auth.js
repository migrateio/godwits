/**
 * ## Module spring-security
 *
 * AngularJS module for working with Spring Security
 *
 * Much code taken from
 * <https://github.com/witoldsz/angular-http-auth/blob/master/src/http-auth-interceptor.js>
 * @license HTTP Auth Interceptor Module for AngularJS
 * (c) 2012 Witold Szczerba
 * License: MIT
 *
 */

(function () {
    'use strict';

    var mod = angular.module( 'angular-auth', ['http-auth-buffer'] );

    mod.constant( 'authEvents', {
        'EVENT_LOGIN_REQUIRED' : 'event:login-required',
        'EVENT_LOGIN_CONFIRMED' : 'event:login-confirmed',
        'EVENT_LOGOUT_CONFIRMED' : 'event:logout-confirmed',
        'EVENT_NOT_AUTHORIZED' : 'event:not-authorized'
    } );

    mod.factory( 'authService', ['$rootScope', '$http', 'httpBuffer', 'authEvents',
        function ( $rootScope, $http, httpBuffer, authEvents ) {

            var user = null;

            return {
                loginConfirmed : function ( data ) {
                    user = data;
                    $rootScope.$broadcast( authEvents.EVENT_LOGIN_CONFIRMED, data );
                    httpBuffer.retryAll();
                },
                user : function () {
                    return user;
                },
                logout : function () {
                    $rootScope.$broadcast( authEvents.EVENT_LOGOUT_CONFIRMED );
                    user = null;
                },
                events : authEvents
            }
        }] );

    mod.config( ['$httpProvider', function ( $httpProvider ) {
        var authInterceptor = ['$rootScope', '$q', 'httpBuffer', 'authEvents', '$location',
            function ( $rootScope, $q, httpBuffer, authEvents, $location ) {
                var success = function ( response ) {
                    return response;
                };

                var error = function ( response ) {
                    // If the user is not authenticated, we will track the request to be
                    // replayed
                    if ( response.status === 401 ) {
                        var deferred = $q.defer();
                        httpBuffer.append( response.config, deferred );
                        $rootScope.$broadcast( authEvents.EVENT_LOGIN_REQUIRED, $location.path() );
                        return deferred.promise;
                    }
                    // No need to replay the requests that result in a 403
                    if ( response.status === 403 ) {
                        $rootScope.$broadcast( authEvents.EVENT_NOT_AUTHORIZED );
                    }
                    return $q.reject( response );
                };

                return function ( promise ) {
                    return promise.then( success, error );
                }
            }
        ];

        $httpProvider.responseInterceptors.push( authInterceptor );
    }] );

    /**
     * Private module, an utility, required internally by 'http-auth-interceptor'.
     */
    angular.module( 'http-auth-buffer', [] )

        .factory( 'httpBuffer', ['$injector', function ( $injector ) {
        /** Holds all the requests, so they can be re-requested in future. */
        var buffer = [];

        /** Service initialized later because of circular dependency problem. */
        var $http;

        function retryHttpRequest( config, deferred ) {
            function successCallback( response ) {
                deferred.resolve( response );
            }

            function errorCallback( response ) {
                deferred.reject( response );
            }

            $http = $http || $injector.get( '$http' );
            $http( config ).then( successCallback, errorCallback );
        }

        return {
            /**
             * Appends HTTP request configuration object with deferred response attached
             * to buffer.
             */
            append : function ( config, deferred ) {
                buffer.push( {
                    config : config,
                    deferred : deferred
                } );
            },

            /**
             * Retries all the buffered requests clears the buffer.
             */
            retryAll : function () {
                var request;
                while ( request = buffer.shift() ) {
                    retryHttpRequest( request.config, request.deferred );
                }
            }
        };
    }] );
})();