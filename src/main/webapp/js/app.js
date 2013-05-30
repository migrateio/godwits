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
            redirectTo : '/'
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

// http://stackoverflow.com/questions/14859266/input-autofocus-attribute/14859639#14859639
angular.module( 'ng' ).directive( 'ngFocus', function ( $timeout ) {
    return {
        link : function ( scope, element, attrs ) {
            scope.$watch( attrs.ngFocus, function ( val ) {
                if ( angular.isDefined( val ) && val ) {
                    $timeout( function () {
                        element[0].select();
                        element[0].focus();
                    } );
                }
            }, true );

            element.bind( 'blur', function () {
                if ( angular.isDefined( attrs.ngFocusLost ) ) {
                    scope.$apply( attrs.ngFocusLost );

                }
            } );
        }
    };
} );