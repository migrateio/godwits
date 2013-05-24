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
    .directive( 'validTooltip', [ '$log', '$timeout', '$position',
    function ( $log, $timeout, $position ) {

        function getEleByName( names, ele ) {
            if ( typeof names === 'string' ) names = names.split( '.' );
            if ( names.length === 0 ) return ele;
            var name = names.shift();
            return getEleByName( names, $( '[name="' + name + '"]', ele ) );
        }

        return {
            restrict : 'EA',
            templateUrl : 'template/valid/tooltip.html',
            scope : true,
            replace : true,
            transclude : true,
            priority : 10,
            link : function link( scope, element, attrs ) {
                var $element = $( element );

                var target = attrs.inputTarget;
                if ( !target ) throw 'Directive [valid-tooltip] requires attribute [input-target]';

                // Get the input field referenced by the 'input-target' attribute
                var inputField = getEleByName( target );
                if ( !target ) throw 'Directive [valid-tooltip] has attribute \
                    [input-target] with a value of [' + target + '] but reference not \
                    found.';

                var placement = function () {
                    // Get the position of the input field.
                    var position = $position.position( inputField );

                    // Get the height and width of the tooltip so we can center it.
                    var ttWidth = $element.width();
                    var ttHeight = $element.height();

                    // Calculate the tooltip's top and left coordinates to center it with
                    // this directive.
                    var ttPosition = {
                        top : (position.top + position.height / 2 - ttHeight / 2) + 'px',
                        left : (position.left + position.width) + 'px'
                    };

                    // Now set the calculated positioning.
                    $element.css( ttPosition );
                };

                // Set the initial positioning.
                $element.css( { top : -5000, left : 0 } );
                inputField.after( $element );

                // Can't just go after the position of the input field. It's not set yet.
                $timeout( placement, 0 );

                /*              We could just sit here and watch for changes in our form validation
                 status, and show/hide the tooltip whenever the error status changes. But,
                 since the tooltip is a sibling to the input field, and the input field is
                 already marked up with classes to indicate errors, this step can be done
                 completely by css. We lose the fade effect, meh.
                 */

                // This expression will determine when the tooltip is shown/hidden.
//                 var expression = target + '.$invalid';
                /*
                 var expression = target + '.$dirty && ' + target + '.$invalid';

                 scope.$watch(expression, function(newValue, oldValue) {
                 console.log( 'expression change: ' + newValue + ', ' + oldValue );
                 if (newValue) {
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
    } ] )

    // The following functionality is a custom-based poly-fill placeholder for AngularJS
    // @example  <input id="weight" name="weight" type="number" default-text="lbs" min="50" max="500" required />
    // For browsers lower than IE 10 the in-built placeholder functionality is used, otherwise
    // the poly-fill is used.
    // https://github.com/ferronrsmith/angularjs-placeholder
    .directive( 'placeholder',
    ['$log', '$timeout',
    function ( $log, $timeout ) {
        $log.info( 'Support for placeholder? ', Modernizr.input.placeholder );
        if ( Modernizr.input.placeholder === true ) return {};
        return {
            link : function ( scope, elm, attrs ) {
                if ( attrs.type === 'password' ) {
                    return;
                }
                $timeout( function () {
                    $( elm ).val( attrs.placeholder ).focus(function () {
                        if ( $( this ).val() == $( this ).attr( 'placeholder' ) ) {
                            $( this ).val( '' );
                        }
                    } ).blur( function () {
                            if ( $( this ).val() == '' ) {
                                $( this ).val( $( this ).attr( 'placeholder' ) );
                            }
                        } );
                } );
            }
        };
    } ] )
    // This directive is applied to a password input field. We will create a clone of the
    // input field and toggle between the original and the copy when the bound expression
    // tells us to. The only difference between the two input fields is that the original
    // is a password field, and the other is a text field.
    .directive( 'passXray',
    [ '$compile', '$timeout', '$parse', '$position', '$log',
    function ( $compile, $timeout, $parse, $position, $log ) {

        return {
            restrict : 'A',
            scope : false,
            replace : false,
            transclude : false,
            link : function ( scope, element, attrs ) {
                var $password = $( element );
                if ( 'INPUT' !== $password.prop( 'tagName' ) )
                    throw 'Directive [pass-xray] must be applied to an input field';
                if ( 'password' !== $password.prop( 'type' ) )
                    throw 'Directive [pass-xray] must be applied to an input field of type="password"';

                var model = attrs['ngModel'];
                var cloneElement = function ( element ) {
                    $clone = $( "<input />" );
                    $clone.attr( {
                        'type' : 'text',
                        'ng-model' : model,
                        'class' : element.attr( 'class' ),
                        'style' : element.attr( 'style' ),
                        'size' : element.attr( 'size' ),
                        'name' : element.attr( 'name' ) + '-clone',
                        'placeholder' : element.attr( 'placeholder' ),
                        'tabindex' : element.attr( 'tabindex' )
                    } );

                    var ele = element;
                    $.each( ['required'], function ( index, a ) {
                        if ( element.attr( a ) ) $clone.attr( a, element.attr( a ) );
                    } );

                    return $( '<div/>' ).append( $clone ).html();
                };

                var newContent = cloneElement( $password );
                var newElement = $compile( newContent )( scope );
                var $cleartext = $( newElement ).insertAfter( $password );
                $password.attr( 'autocomplete', 'false' );

                // When the cleartext is flagged as dirty, we need to update the password
                // as dirty also.
                var original = $cleartext.val();
                $cleartext.on( 'propertychange keyup input paste', function ( e ) {
//                    console.log( 'Original: ' + original + ', current: ' + $cleartext.val() );
                    if ( original !== $cleartext.val() )
                        $password.addClass( 'ng-dirty' ).removeClass( 'ng-pristine' );
                } );

                var expression = attrs.passXray;
                scope.$watch( expression, function ( newValue, oldValue ) {
                    if ( newValue ) {
                        $password.hide();
                        $cleartext.show();
                        $cleartext.focus();
                    } else {
                        $password.show();
                        $cleartext.hide();
                        $password.focus();
                    }
                } );
            }
        }
    }
] )

;


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



