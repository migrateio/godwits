'use strict';


angular.module( 'migrate', ['spring-security'] )
    .config( ['$routeProvider',
    function ( $routeProvider ) {

        $routeProvider.when( '/', {
            templateUrl : 'partials/home.html'
        } );
        $routeProvider.when( '/signin', {
            templateUrl : 'partials/signin.html'
        } );
        $routeProvider.when( '/jobs', {
            templateUrl : 'partials/jobs.html'
        } );
        $routeProvider.otherwise( {
            redirectTo : '/'
        } );
    }] )

    .config( ['$locationProvider',
    function ( $locationProvider ) {
        $locationProvider.html5Mode( false );
    }] );