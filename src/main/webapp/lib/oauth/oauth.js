(function ( ng, undefined ) {
    'use strict';

    angular.module( "template/oauth.html", [] ).run(
        ["$templateCache",
            function ( $templateCache ) {
                $templateCache.put( "template/oauth.html", ' \
                <a class="btn btn-primary" ng-click="link(job_id, service)"> \
                    Link to {{service}}\
                </a>' );
            }
        ]
    );

    var oauth = ng.module( 'migrate-oauth', ['template/oauth.html'] );

    oauth.directive( 'oauthLink', ['$http', function ( $http ) {
        return {
            restrict : 'A',
            templateUrl : 'template/oauth.html',
            transclude : true,
            controller : 'oauthCtrl',
            scope: {},
            link : function link( scope, element, attrs ) {
                scope.service = attrs.oauthLink;
                scope.job_id = 'test';
            }
        };
    }] );

    oauth.controller( 'oauthCtrl', ['$scope', '$http', '$window', '$log',
        function ( $scope, $http, $window, $log ) {

        $scope.link = function ( job_id, service ) {

            var url = ['.', 'api', 'oauth', job_id, service].join( '/' );

            $http.get( url )
                .success( function ( data ) {
                    $window.open( data.url, '_blank', 'height=600,width=450' );
                } );

            window.callback = function ( data ) {
                $log.info('callback firing with params ' + data);
                return;
            };
        }
    }] );

})( window.angular );

