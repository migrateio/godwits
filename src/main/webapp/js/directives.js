angular.module( "template/valid/tooltip.html", [] ).run(
    ["$templateCache",
        function ( $templateCache ) {
            $templateCache.put( "template/valid/tooltip.html", ' \
                <div class="tooltip validation right in"> \
                    <div class="tooltip-arrow"></div> \
                    <div class="tooltip-inner" ng-transclude> \
                    &nbsp; \
                    </div> \
                </div>' );
        }
    ]
);


var mod = angular.module( 'migrate.directives', [ 'template/valid/tooltip.html' ] );

/**
 * ## Directive validtip
 *
 * This directive allows for a tooltip popup to be tied to an input control and displayed
 * when there is an angular validation error associated with the model which drives the
 * input control.
 *
 * The position of the tooltip is determined at runtime for proper orientation.
 *
 * The <validtip> element may contain one or more content blocks to indicate the specific
 * type of error that is raised.
 *
 * The input field associated with <validtip> is passed in as a text string which
 * references the name of the form element.
 */
mod.directive( 'validtip', [ '$log', '$timeout', '$position',
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
            replace : true,
            scope: false,
            transclude : true,
            priority : 10,
            link : function link( scope, element, attrs ) {
                var $element = $( element );

                scope.show = false;

                var target = attrs.validtip || attrs.dataValidtip || attrs.xValidtip;
                if ( !target ) throw 'Directive [validtip] requires a reference to ' +
                    'the input field with which it is associated';

                // Get the input field referenced by the 'input-target' attribute
                var inputField = getEleByName( target );
                if ( !inputField || inputField.length != 1) throw 'Directive [validtip] references a form input ' +
                    'field with a value of [' + target + '] but reference not found.';

                var showIfInvalid = function(ifUnfocused) {
                    var isDirty = inputField.hasClass('ng-dirty');
                    var isInvalid = inputField.hasClass('ng-invalid');
                    var isFocus = !ifUnfocused && inputField.is(':focus');
//                    $log.info( isDirty, isInvalid, isFocus, !ifUnfocused );
                    if (isDirty && isInvalid && isFocus) $element.fadeIn( 'fast' );
                    else $element.fadeOut( 'fast' );
                };

                // Watch for changes to the model
                inputField.on('propertychange keyup input paste', function (e) {
                    showIfInvalid();
                });

                inputField.blur(function() {
                    showIfInvalid();
                });

                var placement = function () {
                    // Get the position of the input field. Note: $position will throw an
                    // exception if DOM is not ready.
//                    var position = inputField.position();
                    var position = inputField.offset();
                    position.width = inputField.outerWidth();
                    position.height = inputField.outerHeight();

//                    $log.info( 'Input position', position );
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

                // Can't just go after the position of the input field. It's not set yet.
                $timeout( placement, 1000 );
                $element.appendTo( 'body' );
                showIfInvalid();
            }
        }
    }
] );

// The following functionality is a custom-based poly-fill placeholder for AngularJS
// @example  <input id="weight" name="weight" type="number" default-text="lbs" min="50" max="500" required />
// For browsers lower than IE 10 the in-built placeholder functionality is used, otherwise
// the poly-fill is used.
// https://github.com/ferronrsmith/angularjs-placeholder
mod.directive( 'placeholder',
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
        }
    ] );

// This directive is applied to a password input field. We will create a clone of the
// input field and toggle between the original and the copy when the bound expression
// tells us to. The only difference between the two input fields is that the original
// is a password field, and the other is a text field.
mod.directive( 'passXray',
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
    ] );


mod.directive( 'eatClick', function () {
    return function ( scope, element, attrs ) {
        $( element ).click( function ( event ) {
            event.preventDefault();
        } );
    }
} );

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



