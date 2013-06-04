(function ( $, ng ) {
    var jobs = ng.module( 'migrate.jobs', [] );

    jobs.controller( 'jobs-controller', [ '$log', '$scope', '$jobs',
        function ( $log, $scope, $jobs ) {

            function pick( a ) {
                var index = Math.floor( Math.random() * a.length );
                return a[index];
            }

            function newJob() {
                $scope.job = {
                    source : {
                        account : pick( ['google', 'microsoft', 'yahoo', 'imap'] )
                    }
                }
            }

            function newSource() {
                $scope.job.source.account = pick( ['google', 'microsoft', 'yahoo', 'imap'] );
            }

            $scope.$watch( 'job.source.account', function ( newValue ) {
                $log.info( 'Job source changed: ', newValue );
            } );

            $scope.newJob = newJob;
            $scope.newSource = newSource;
            newJob();
        }
    ] );

    jobs.controller( 'mioJobController', ['$log', '$scope', '$timeout',
        function ( $log, $scope, $timeout ) {

            var transtionEnd = 'transitionend webkitTransitionEnd oTransitionEnd otransitionend MSTransitionEnd';

            var blocks = $scope.blocks = [
                {
                    name : 'source',
                    selected : false
                },
                {
                    name : 'destination',
                    selected : false
                },
                {
                    name : 'content',
                    selected : false
                },
                {
                    name : 'action',
                    selected : false
                },
                {
                    name : 'status',
                    selected : false
                }
            ];

            function getBlockByName( name ) {
                for ( var i = 0, c = blocks.length; i < c; i++ ) {
                    if ( name === blocks[i].name ) return $scope.blocks[i];
                }
                return null;
            }

            function closeThen( func ) {
                if ( $scope.open ) {
                    $scope.open = false;
                    $timeout( func, 300 );
                } else {
                    func();
                }
            }

            $scope.select = function ( block ) {
                closeThen( function () {
                    var wasSelected = block.selected;
                    ng.forEach( blocks, function ( block ) {
                        block.selected = false;
                    } );
                    if ( !wasSelected ) {
                        block.selected = true;
                        $scope.open = true;
                    } else {
                        $scope.open = false;
                    }
                } );
            };

            // Controls whether the detail row is shown or not
            $scope.open = false;

            this.getBlockByName = getBlockByName;
        }] );

    jobs.directive( 'mioJob', ['$log', '$parse', function ( $log, $parse ) {
        return {
            restrict : 'MACE',
            transclude : false,
            replace : true,
            controller : 'mioJobController',
            scope : {
                job : '=mioJob'
            },
            templateUrl : '/partials/job/job.html',
            link : function ( scope, element, attrs, jobController ) {
            }
        }
    } ] );


    jobs.directive( 'mioJobDetail', ['$log', '$timeout', function ( $log, $timeout ) {
        return {
            require : '^mioJob',
            restrict : 'MACE',
            scope : false,
            controller : 'mioJobController',
            link : function ( scope, element, attrs, jobCtrl ) {
                // Get a reference to the block with which we are associated. Note: the
                // `getBlockByName()` function must return $scope.block, not this.block.
                scope.block = jobCtrl.getBlockByName( attrs['mioJobDetail'] );
            }
        }
    }] );


    jobs.factory( '$jobs', [ '$log', '$http', function ( $log, $http ) {


        function loadInProgress() {
            $log.info( 'Loading any jobs in progress' );
            return $http.get( '/api/jobs/' );
        }


        return {
            loadInProgress : loadInProgress
        }

    } ] );

})( jQuery, angular );

