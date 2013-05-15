'use strict';


angular.module('migrate', []).
    config(['$routeProvider', function($routeProvider) {

    $routeProvider.when('/', {
        templateUrl: 'partials/home.html'
    });
    $routeProvider.when('/signin', {
        templateUrl: 'partials/signin.html'
    });
    $routeProvider.when('/migrations', {
        templateUrl: 'partials/signin.html'
    });
    $routeProvider.when('/about', {
        templateUrl: 'partials/signin.html'
    });
    $routeProvider.otherwise({
        redirectTo: '/'
    });
}]);