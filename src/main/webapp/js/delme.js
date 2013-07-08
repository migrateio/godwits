var mod = angular.module( 'plunker', [] );

mod.controller( 'ParentController',
    ['$log', '$scope', '$timeout', '$element',
        function ( $log, $scope, $timeout, $element ) {
            $scope.data = {
                one : 'one',
                two : 'two',
                three : 'three',
                four : 'four'
            }
        }
    ]
);

mod.controller( 'boxStimula',
    ['$log', '$scope', '$element',
        function ( $log, $scope, $element ) {

        }
    ]
);

mod.controller( 'boxController',
    ['$log', '$scope', '$element',
        function ( $log, $scope, $element ) {
            $log.info( 'boxController:', $scope );

            var faces = {};
            var box;

            $scope.registerBox = function ( _box ) {
                box = _box;
            };

            $scope.registerFace = function ( id, face ) {
                faces[id] = face;
            };

            $scope.face = '';
            $scope.dim = false;

            $scope.$watch( 'face', function ( newValue, oldValue ) {
                $log.info( 'boxController, face change from', oldValue, 'to', newValue );
                if ( faces[oldValue] ) faces[oldValue].hide();
                if ( faces[newValue] ) faces[newValue].show();
            } );

            $scope.$watch( 'dim', function ( newValue, oldValue ) {
                $log.info( 'boxController, dim change from', oldValue, 'to', newValue );
                if ( newValue && box && box.dim ) box.dim();
                if ( !newValue && box && box.undim ) box.undim();
            } );
        }
    ]
);

mod.directive( 'box', [ '$log', '$timeout', function ( $log, $timeout ) {
    return {
        restrict : 'A',
        scope : {},
        replace : false,
        link : function ( scope, element, attrs ) {
            var dimmer = angular
                .element( '<div class="dimmer"></div>' )
                .prependTo( element );

            var dim = function () {
                dimmer.css( {opacity : 0.3} );
            };
            var undim = function () {
                dimmer.css( {opacity : 0} );
            };
            scope.registerBox( { dim : dim, undim : undim} );
        }
    };
} ] );

mod.directive( 'face', [ '$log', '$timeout', function ( $log, $timeout ) {
    return {
        restrict : 'A',
        scope : false,
        link : function ( scope, element, attrs ) {
            element.hide();
            scope.registerFace( attrs['face'], {
                    hide : function () {
                        element.hide()
                    },
                    show : function () {
                        element.show();
                    }
                }
            );
        }
    };
} ] );

