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


var mod = angular.module( 'migrate-directives', [ 'template/valid/tooltip.html' ] );

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
            scope : false,
            transclude : true,
            priority : 10,
            link : function link( scope, element, attrs ) {
                var $element = $( element );

                scope.show = false;

                var target = attrs.validtip || attrs.dataValidtip || attrs.xValidtip;
                if ( !target ) throw 'Directive [validtip] requires a reference to ' +
                    'the input field with which it is associated';

                // Get the input field referenced by the 'input-target' attribute
                var inputField = $( 'input[name="' + target + '"]', $element.parents( 'form' ) );
                if ( !inputField || inputField.length != 1 ) throw 'Directive [validtip] references a form input ' +
                    'field with a value of [' + target + '] but reference not found.';

                var showIfInvalid = function ( ifUnfocused ) {
                    var isDirty = inputField.hasClass( 'ng-dirty' );
                    var isInvalid = inputField.hasClass( 'ng-invalid' );
                    var isFocus = !ifUnfocused && inputField.is( ':focus' );
//                    $log.info( isDirty, isInvalid, isFocus, !ifUnfocused );
                    if ( isDirty && isInvalid && isFocus ) $element.fadeIn( 'fast' );
                    else $element.hide();
                };

                // Watch for changes to the model
                inputField.on( 'propertychange keyup input paste', function ( e ) {
                    showIfInvalid();
                } );

                inputField.blur( function () {
                    showIfInvalid();
                } );

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

mod.directive( 'myTransclude', function () {
    return {
        compile : function ( tElement, tAttrs, transclude ) {
            return function ( scope, iElement, iAttrs ) {
                transclude( scope.$new(), function ( clone ) {
                    iElement.append( clone );
                } );
            };
        }
    };
} );

/**
 * Works by using Method 3 for vertical centering as found on:
 * http://blog.themeforest.net/tutorials/vertical-centering-with-css/
 *
 * Needs accompanying css:
 *   .va-floater    {float:left; height:50%; margin-bottom:-120px;}
 *   .va-content    {clear:both; height:240px; position:relative;}
 *
 */
mod.directive( 'verticalCenter', function () {
    return {
        restrict : 'AC',
        /*
         replace: true,
         template : ' \
         <div> \
         <div style="display:inline-block; vertical-align:middle; height:100%;"></div> \
         <div style="display:inline-block; vertical-align:middle; white-space:normal;" ng-transclude></div> \
         </div>',
         */
        template : ' \
            <div style="display: table; width: 100%; height: 100%"> \
                <div style="display: table-cell; vertical-align:middle;" my-transclude> \
                </div>\
            </div>',
        transclude : true,
        scope : false
    }
} );


mod.controller( 'mio-scroller-controller',
    ['$log', '$scope', '$timeout', '$element',
        function ( $log, $scope, $timeout, $element ) {
            $scope.items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];


        }
    ]
);

/**
 * ## Directive mio-scroller
 *
 * A fixed width slotted scroller will contain any number of mio-scrollee elements. The
 * scroller will allow the scrollee's to be paged horizontally and the user may scroll
 * them left or right.
 *
 * The scroller is considered a "slotted scroller" because it is broken up into a number
 * of fixed-width slots which are specified as a property on the component. The scroller
 * will provide events for paging, but also the ability to align a particular scrollee
 * on a specific slot number. The supported events are:
 *
 * * `'mio-scroller.position', 'scrollee selector', slot number`<br/>
 *   Immediately positions the indicated scrollee at the indicated slot number.
 * * `'mio-scroller.move', 'scrollee selector', slot number`<br/>
 *   Animates ('slides') the indicated scrollee to the indicated slot number.
 * * `'mio-scroller.page', 'left' || 'right'`<br/>
 *   Animates the page of scrollees to the right or left as indicated.
 * * `'mio-scroller.expand', 'scrollee selector', [slot number]`<br/>
 *   Expands the selected scrollee while maintaining the scrollee in view. If a slot
 *   number is provided, the scrollee will end up left-justified into that slot.
 *
 * The complication to this component is that the scrollee's can change width. When a
 * scrollee expands, the scroller will ensure that the entire scrollee remains in view.
 * A contraction may require the scroller to shift the scrollees accordingly.
 *
 */
mod.directive( 'mioScroller',
    [ '$compile', '$timeout', '$parse', '$position', '$log',
        function ( $compile, $timeout, $parse, $position, $log ) {
            return {
                restrict : 'ACE',
                scope : {
                    slots : '@mioScrollerSlots'
                },
                replace : false,
                controller : 'mio-scroller-controller',
                link : function ( scope, element, attrs ) {
                    // Our scroller element is our rock. It stays put where it is.
                    var rock = element.css( {
                        position : 'relative',
                        overflow : 'hidden'
                    } );

                    // The scroller element which will be absolutely positioned and
                    // will be positioned left and right. Inline block with no wrap will
                    // allow the scroller to keep all scrolllees in one line and
                    // expand/collapse as the scrollees do.
                    var scroller = $( '<div/>' ).css( {
                        position : 'absolute',
                        display : 'inline-block',
                        whiteSpace : 'nowrap'
                    } );
                    element.wrapInner( scroller )

                    // Remove whitespace between scrollee elements (inline-block effect)
                    scroller.contents().filter(function () {
                        return (this.nodeType == 3 && !/\S/.test( this.nodeValue ));
                    } ).remove();

                    // The number of slots coupled with the width of the element will
                    // give us the left positions of each scrollee
                    var slots = parseInt( scope.slots );
                }
            }
        }
    ]
);

mod.directive( 'mioScrollee',
    [ '$compile', '$timeout', '$parse', '$position', '$log',
        function ( $compile, $timeout, $parse, $position, $log ) {
            return {
                require : '^mioScroller',
                restrict : 'ACE',
                scope : {
                    slotNum : '@mioSlotNum',
                    slotWidth : '@mioSlotWidth',
                    slotHeight : '@mioSlotHeight'
                },
                link : function ( scope, element, attrs ) {
                    var slot = {
                        num : parseInt( scope.slotNum ),
                        width : parseInt( scope.slotWidth ),
                        height : parseInt( scope.slotHeight )
                    };

                    element.css( {
                        display : 'inline-block'
                    } );

                    // Remove whitespace between scrollee elements (inline-block effect)
                    element.contents().filter(function () {
                        return (this.nodeType == 3 && !/\S/.test( this.nodeValue ));
                    } ).remove();

                    // Inside of the scrollee are two divs. The first is fixed and
                    // visible, while the second will expand when requested and start
                    // life compacted.
                    var content = element.children().first().css( {
                        display : 'inline-block',
                        whiteSpace : 'nowrap',
                        width : '180px',
                        height : '80px'
                    } );
                    var expando = element.children().last().css( {
                        display : 'inline-block',
                        overflow : 'hidden',
                        textAlign : 'right'
                    } );

                    var expansionWidth =
                        (Math.floor(expando.width() / slot.width) + 1 ) * slot.width;
                    expando.width( 0 );

                    function expand() {
                        expando.css( {
                            width: expansionWidth + 'px'
                        } );
                    }

                    function contract() {
                        expando.css( {
                            width: '0'
                        } );
                    }

                    scope.toggle = function() {
                        if (expando.width() > 0) contract(); else expand();
                    };
                }
            }
        }
    ]
);


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



