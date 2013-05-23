angular.module( 'migrateApp', ['ui.bootstrap', 'spring-security', 'migrate.directives'] )
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
        } ]
/*
)

    .config( ['$rootScope', '$window', '$location',
    function ( $rootScope, $window, $location ) {
        $rootScope.$on( '$routeChangeSuccess', function ( event ) {
            $window._gaq.push( ['_trackPageview', $location.path()] );
        } );
    }]
*/
);

angular.module( "template/valid/tooltip.html", [] ).run(
    ["$templateCache",
        function ( $templateCache ) {
            $templateCache.put( "template/valid/tooltip.html", ' \
                <div class="tooltip right in"> \
                    <div class="tooltip-arrow"></div> \
                    <div class="tooltip-inner" ng-transclude> \
                    &nbsp; \
                    </div> \
                </div>' );
        }
    ]
);


angular.module( 'migrate.directives', [ 'template/valid/tooltip.html' ] )
    .directive( 'validTooltip', [ '$compile', '$timeout', '$parse', '$position', '$log',
    function ( $compile, $timeout, $parse, $position, $log ) {

        function getEleByName(names, ele) {
            if (typeof names === 'string') names = names.split( '.' );
            if (names.length === 0) return ele;
            var name = names.shift();
            return getEleByName( names, $( '[name="' + name + '"]', ele ) );
        }

        return {
            restrict: 'EA',
            templateUrl: 'template/valid/tooltip.html',
            scope: true,
            replace: true,
            transclude: true,
            link: function link ( scope, element, attrs ) {
                var $element = $(element);

                var target = attrs.inputTarget;
                if (!target) throw 'Directive [valid-tooltip] requires attribute [input-target]';

                // This expression will determine when the tooltip is shown/hidden
                var expression = target + '.$dirty && ' + target + '.$invalid';

                // Get the input field referenced by the 'input-target' attribute
                var inputField = getEleByName( target );
                if (!target) throw 'Directive [valid-tooltip] has attribute \
                    [input-target] with a value of [' + target + '] but reference not \
                    found.';

                var placement = function() {
                    // Get the position of the input field.
                    var position = $position.position( inputField );

                    // Get the height and width of the tooltip so we can center it.
                    var ttWidth = $element.width();
                    var ttHeight = $element.height();

                    // Calculate the tooltip's top and left coordinates to center it with
                    // this directive.
                    var ttPosition = {
                        top: (position.top + position.height / 2 - ttHeight / 2) + 'px',
                        left: (position.left + position.width) + 'px'
                    };

//                    $log.info( 'Input position', position, ttHeight, ttPosition );
                    // Now set the calculated positioning.
                    $element.css( ttPosition );
//                    $element.hide();
                };

                // Set the initial positioning.
                $element.css({ top: -5000, left: 0 });
                inputField.after( $element );

                // Can't just go after the position of the input field. It's not set yet.
                $timeout( placement, 0 );

/*
                scope.$watch(expression, function(newValue, oldValue) {
                    if (newValue) {
                        placement();
                        // Show the tooltip
                        $element.fadeIn();
                    } else {
                        // Hide the tooltip
                        $element.hide();
                    }
                });
*/
            }
        }
    }
] );


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



