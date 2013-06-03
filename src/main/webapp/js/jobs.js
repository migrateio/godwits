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

    jobs.controller( 'mioJobController', ['$log', '$scope', function ( $log, $scope ) {

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

        $scope.select = function selectBlock( block ) {
            var wasSelected = block.selected;
            ng.forEach( blocks, function ( block ) {
                block.selected = false;
            } );
            if (!wasSelected) block.selected = true;
        };

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


    /**
     * The job-row represents the tier-1 row of 5 blocks arranged left-to-right which contain
     * the source, destination, content, action and progress blocks. The job-row appears top
     * most with the other views stacked behind it. When the blocks in the job-row are
     * interacted with, the tier-2 rows will slide down. Most of this transitional behavior
     * is tied to the "active" class being set on one of the job-row's block elements.
     *
     *
     */
    /*
     jobs.directive( 'jobRow', ['$log', function ( $log ) {
     return {
     require: '^jobStack',
     restrict : 'MACE',
     scope: {
     showRow: '='
     },
     link : function ( scope, element, attrs, jobCtrl ) {
     // All of the direct `li` descendants of the `ul` element
     var blocks = element.children( 'li' );

     // Blocks will toggle on/off their `active` class. A new block being
     // marked active will toggle off other blocks which are active.
     blocks.on( 'click', function () {
     var isActive = $( this ).hasClass( 'active' );
     blocks.removeClass( 'active' );
     if ( !isActive ) {
     $( this ).addClass( 'active' );
     scope.showRow( 'kathy' );
     }
     } );

     }
     }
     }] );

     */

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

