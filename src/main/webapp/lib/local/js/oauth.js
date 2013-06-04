(function ( ng, undefined ) {
    'use strict';

    var migrate_oauth = ng.module( 'migrateIOApp', [] );

    migrate_oauth.config( function ( $routeProvider ) {
        $routeProvider.when( '/', {
            templateUrl : 'lib/local/partials/oauth_tester.html'
        } );
        $routeProvider.when( '/:id', {
            templateUrl : 'lib/local/partials/oauth_tester.html'
        } );
    } );

    migrate_oauth.controller( 'oauth_testing',
        ['$scope', '$log', '$http', '$window',
            function ( $scope, $log, $http, $window ) {

                $scope.services = [];
                $scope.messages = [];

                $http.get( './api/oauth/users/123' )
                    .success( function ( data ) {
                        $log.info( JSON.stringify( data, null, 4 ) );
                        for ( var i = 0; i < data.oauth.length; i++ ) {
                            var name = JSON.parse( data.oauth[i].params.state );
                            $scope.services.push( {
                                name : name.service,
                                accesskey : data.oauth[i].access.access_token
                            } );
                        }
                    } );

                $scope.login = function ( provider ) {
                    switch ( provider ) {
                        case 'google':
                            $log.info( 'Kicking off oauth process.' );

                            $http.get( './api/oauth/123/google/' )
                                .success( function ( data ) {
                                    $window.open( data.url, '_self' );
                                } );
                            break;
                        case 'yahoo':
                            $scope.services.push( {
                                name : 'Yahoo!',
                                accesskey : Math.random().toString( 36 ).substr( 2, 16 )
                            } );
                            break;
                        case 'ms':
                            $scope.services.push( {
                                name : 'Microsoft Live Connect',
                                accesskey : Math.random().toString( 36 ).substr( 2, 16 )
                            } );
                            break;
                    }
                };

                $scope.deauthorize = function ( i ) {
                    $http.get( 'https://accounts.google.com/o/oauth2/revoke?token=' + $scope.services[i].accesskey )
                        .success( function ( data ) {
                            $scope.services.splice( i, 1 );
                        } );
                };

            }] );

    /// things that are being typed ...
})( window.angular );