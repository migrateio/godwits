/**
 * ## Module devbar
 *
 * AngularJS module to support the addition of a development debug bar
 *
 */

(function () {
    'use strict';

    angular.module( 'template/devbar.html', [] ).run(
        ['$templateCache', '$log',
            function ( $templateCache ) {
                $templateCache.put( 'template/devbar.html', ' \
                    <div class="devbar"> \
                        <p>\
                            Build: {{buildNumber}}\
                            <span><a href="#" eat-click ng-click="clearTemplateCache()" class="btn btn-mini">Clear Partials</a></span>\
                        </p> \
                        <div alert ng-repeat="alert in alerts" type="alert.type" close="closeAlert($index)">\
                            <span ng-bind-html-unsafe="alert.msg"></span>\
                        </div>\
                    </div>' );
            }
        ]
    );

    var mod = angular.module( 'devbar', ['angular-auth', 'template/devbar.html'] );

    mod.controller( 'devbar-controller', ['$rootScope', '$templateCache',
        function ( $scope, $templateCache ) {
        $scope.buildNumber = '123';

        $scope.alerts = [];

        $scope.closeAlert = function ( index ) {
            $scope.alerts.splice( index, 1 );
        };

        $scope.clearTemplateCache = function(){
            ['home','jobs','privacy','profile','signin','signup','terms','verify']
                .forEach(function(page) {
                    $templateCache.remove( '/partials/' + page + '.html' );
                });
        };

    }] );

    mod.directive( 'devBar',
        [ '$log', 'authEvents',
            function ( $log, authEvents ) {
                return {
                    restrict : 'A',
                    scope : false,
                    replace : true,
                    transclude : false,
                    templateUrl : 'template/devbar.html',
                    link : function ( scope, element, attrs ) {

                    }
                }
            }
        ]
    );

    mod.config( ['$httpProvider', function ( $httpProvider ) {
        var errorInterceptor = ['$log', '$rootScope',
            function ( $log, $rootScope ) {
                var success = function ( response ) {
                    return response;
                };

                var error = function ( response ) {
                    $log.info( 'Error', response );
                    if ( response.status === 500 && response.data) {
                        $rootScope.alerts.push( {
                            type : 'error',
                            msg : response.data.message
                        } );
                    }
                    return response;
                };

                return function ( promise ) {
                    return promise.then( success, error );
                }
            }
        ];

        $httpProvider.responseInterceptors.push( errorInterceptor );
    }] );
})();
