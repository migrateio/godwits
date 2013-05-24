angular.module( 'migrateApp', [
    'ui.bootstrap', 'spring-security', 'migrate.directives', 'migrate.jobs',
    'angular-google-analytics'] )
    .config( ['$routeProvider',
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
    } ] )

    .config( ['AnalyticsProvider',
    function ( AnalyticsProvider ) {
        var production = /(www\.)*migrate\.io/i.test(window.location.hostname);
        var ga = production ? 'UA-41014735-2' : 'UA-41014735-1';

        AnalyticsProvider.setAccount( ga );
        AnalyticsProvider.trackPages( true );
    }]
);

// Released under MIT license: http://www.opensource.org/licenses/mit-license.php
var placeholderSupport = ("placeholder" in document.createElement( "input" ));
function applyPlaceholders( ele ) {
    if ( placeholderSupport ) return;
    if ( !ele ) ele = $( 'body' );
    $( '[placeholder]', ele ).focus(function () {
        var input = $( this );
        if ( input.val() == input.attr( 'placeholder' ) ) {
            input.val( '' );
            input.removeClass( 'placeholder' );
        }
    } ).blur(function () {
            var input = $( this );
            if ( input.val() == '' || input.val() == input.attr( 'placeholder' ) ) {
                input.addClass( 'placeholder' );
                input.val( input.attr( 'placeholder' ) );
            }
        } ).blur().parents( 'form' ).submit( function () {
            $( this ).find( '[placeholder]' ).each( function () {
                var input = $( this );
                if ( input.val() == input.attr( 'placeholder' ) ) {
                    input.val( '' );
                }
            } )
        } );
}



