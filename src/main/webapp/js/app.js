var app = angular.module( 'migrateApp', [
    'ui.bootstrap', 'spring-security', 'devbar',
    'migrate.directives', 'migrate.jobs', 'migrate-signin', 'migrate-users',
    'angular-google-analytics'] );

app.config( ['$routeProvider',
    function ( $routeProvider ) {

        $routeProvider.when( '/', {
            templateUrl : 'partials/home.html'
        } );
        $routeProvider.when( '/signup', {
            templateUrl : 'partials/signup.html'
        } );
        $routeProvider.when( '/signin/:phase/:userId/:token', {
            templateUrl : 'partials/signin.html'
        } );
        $routeProvider.when( '/signin/:phase', {
            templateUrl : 'partials/signin.html'
        } );
        $routeProvider.when( '/signin', {
            templateUrl : 'partials/signin.html'
        } );
        $routeProvider.when( '/signup', {
            templateUrl : 'partials/signup.html'
        } );
        $routeProvider.when( '/verify/:id', {
            templateUrl : 'partials/verify.html'
        } );
        $routeProvider.when( '/jobs', {
            templateUrl : 'partials/jobs.html'
        } );
        $routeProvider.when( '/profile', {
            templateUrl : 'partials/profile.html'
        } );
        $routeProvider.otherwise( {
            redirectTo : '/profile'
        } );
    }
] );

app.config( ['$locationProvider',
    function ( $locationProvider ) {
        $locationProvider.html5Mode( false );
    }
] );

app.config( ['AnalyticsProvider',
    function ( AnalyticsProvider ) {
        var production = /(www\.)*migrate\.io/i.test( window.location.hostname );
        var ga = production ? 'UA-41014735-2' : 'UA-41014735-1';

        AnalyticsProvider.setAccount( ga );
        AnalyticsProvider.trackPages( true );
    }
] );

function whichTransitionEvent() {
    var t;
    var el = document.createElement( 'fakeelement' );
    var transitions = {
        'transition' : 'transitionend',
        'OTransition' : 'oTransitionEnd',
        'MozTransition' : 'transitionend',
        'WebkitTransition' : 'webkitTransitionEnd'
    };

    for ( t in transitions ) {
        if ( el.style[t] !== undefined ) {
            return transitions[t];
        }
    }
}

