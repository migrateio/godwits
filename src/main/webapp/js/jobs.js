(function ( $, ng ) {
    var uiModel = {
        source : [
            {
                name : 'google',
                auth : 'oauth',
                types : ['mail', 'calendar', 'contacts', 'documents', 'media']
            },
            { name : 'imap',
                auth : 'password',
                types : ['mail']
            },
            { name : 'yahoo',
                auth : 'oauth',
                types : ['mail', 'contacts']
            },
            { name : 'microsoft',
                auth : 'oauth',
                types : ['mail', 'calendar', 'contacts', 'documents', 'media']
            },
            { name : 'skydrive',
                auth : 'oauth',
                types : ['documents', 'media']
            },
            { name : 'exchange',
                auth : 'exchange',
                types : ['mail']
            },
            { name : 'outlookpst',
                auth : 'file',
                types : ['mail', 'contacts', 'calendar']
            }
        ],
        destination : [
            {
                name : 'google',
                auth : 'oauth',
                types : ['mail', 'calendar', 'contacts', 'documents', 'media']
            },
            { name : 'imap',
                auth : 'password',
                types : ['mail']
            },
            { name : 'yahoo',
                auth : 'oauth',
                types : ['mail', 'contacts']
            },
            { name : 'microsoft',
                auth : 'oauth',
                types : ['mail', 'calendar', 'contacts', 'documents', 'media']
            },
            { name : 'skydrive',
                auth : 'oauth',
                types : ['documents', 'media']
            },
            { name : 'exchange',
                auth : 'exchange',
                types : ['mail']
            },
            { name : 'outlookpst',
                auth : 'file',
                types : ['mail', 'contacts', 'calendar']
            }
        ]    };

    var jobs = ng.module( 'migrate.jobs', [] );

    jobs.controller( 'mio-jobs-controller', [ '$log', '$scope', '$jobs',
        function ( $log, $scope, $jobs ) {

            var random = function(len) {
                return Math.floor( Math.random() * len )
            };

            function newJob() {
                return {
                    jobId: '' + (random(1000) + 1000),
                    source: {
                        service: uiModel.source[random(uiModel.source.length)].name
                    },
                    destination: {
                        service: uiModel.destination[random(uiModel.source.length)].name
                    },
                    content: {
                        types: ['email']
                    },
                    action: {
                    },
                    status: {
                        completion: 1.00
                    }
                }
            }

            function newJobs() {
                var jobs = [];
                for ( var i = 0, c = 2; i < c; i++ ) {
                    jobs.push( newJob() );
                }
                $scope.jobs = jobs;
            }

            $scope.newJobs = newJobs;
            newJobs();

            $log.info( 'mio-jobs-controller scope', $scope );
        }
    ] );

    jobs.controller( 'mio-job-controller', ['$log', '$scope', '$timeout', '$element',
        function ( $log, $scope, $timeout, $element ) {
            $log.info( 'mio-job-controller scope', $scope, 'element:', $element );

            var obj = {};

            $scope.open = false;
            $scope.detailName = '';

            /**
             * Takes care of transitioning between detail names. If detail name is set,
             * the drawer will close. If detail name is the same as the current one, the
             * drawer will stay closed. If the drawer is different than the current one,
             * it will reopen to reveal the new drawer.
             */
            this.toggleDetailName = function (detailName) {
                $scope.detailName = $scope.detailName === detailName ? '' : detailName;
            };
        }]
    );

    jobs.directive( 'mioJob', ['$log', '$parse',
        function ( $log, $parse ) {
            return {
                restrict : 'MACE',
                transclude : false,
                replace : true,
                controller : 'mio-job-controller',
                scope : {
                    job : '=mioJob'
                },
                templateUrl : '/partials/job/job.html',
                link : function ( scope, element, attrs, jobController ) {
                    $log.info( 'mioJob job', scope.job );
                }
            }
        } ] );


    jobs.directive( 'mioJobTabs', ['$log', '$parse', '$compile',
        function ( $log, $parse, $compile ) {
            return {
                require : '^mioJob',
                restrict : 'MACE',
                scope : {job : '=mioJobTabs'},
                templateUrl : '/partials/job/job-tabs.html',
                link : function ( scope, element, attrs, jobCtrl ) {
                    $log.info( 'mioJobTabs scope', scope );
                }
            }
        }]
    );

    jobs.directive( 'mioJobTab', ['$log', '$parse', '$compile',
        function ( $log, $parse, $compile ) {
            return {
                require : '^mioJob',
                restrict : 'MACE',
                scope : {
                    tab : '=mioJobTab'
                },
                link : function ( scope, element, attrs, jobCtrl ) {

                    var original = {};
                    var detailName = attrs['mioDetailName'];

                    function beginEdit() {
                        original = ng.copy( scope.tab );
                    }

                    function select() {
                        $log.info( 'Select()', jobCtrl.open );
                        if (!scope.selected) {
                            beginEdit();
                        }
                        scope.selected = !scope.selected;
                        jobCtrl.drawer( detailName, scope.selected );
                    }

                    function cancel() {
                        scope.tab = ng.copy( original );
                    }

                    scope.selected = false;
                    scope.select = select;
                }
            }
        }]
    );

    jobs.directive( 'mioJobServices', ['$log', '$parse', '$compile',
        function ( $log, $parse, $compile ) {
            return {
                require : '^mioJob',
                restrict : 'MACE',
                scope : {
                    dataName: '@mioJobServices'
                },
                templateUrl : '/partials/job/job-services.html',
                link : function ( scope, element, attrs, jobCtrl ) {
                    scope.services = uiModel[scope.dataName];
                    $log.info( 'mioJobServices services', scope.services );
                }
            }
        }] );

    jobs.directive( 'mioJobService', ['$log', '$parse', '$compile',
        function ( $log, $parse, $compile ) {
            return {
                require : '^mioJob',
                restrict : 'MACE',
                scope : {service : '=mioJobService'},
                templateUrl : '/partials/job/job-service.html',
                link : function ( scope, element, attrs, jobCtrl ) {
                    $log.info( 'mioJobService service', scope.service );
                }
            }
        }] );

    jobs.directive( 'mioJobContent', ['$log', '$parse', '$compile',
        function ( $log, $parse, $compile ) {
            return {
                require : '^mioJob',
                restrict : 'MACE',
                scope : {content : '=mioJobContent'},
                templateUrl : '/partials/job/job-content.html',
                link : function ( scope, element, attrs, jobCtrl ) {
                    $log.info( 'mioJobContent content', scope.content );
                }
            }
        }] );

    jobs.directive( 'mioJobAction', ['$log', '$parse', '$compile',
        function ( $log, $parse, $compile ) {
            return {
                require : '^mioJob',
                restrict : 'MACE',
                scope : {block : '=mioJobAction'},
                templateUrl : '/partials/job/job-action.html',
                link : function ( scope, element, attrs, jobCtrl ) {
                    $log.info( 'mioJobAction scope', scope );
                }
            }
        }] );

    jobs.directive( 'mioJobStatus', ['$log', '$parse', '$compile',
        function ( $log, $parse, $compile ) {
            return {
                require : '^mioJob',
                restrict : 'MACE',
                scope : {block : '=mioJobDetail'},
                templateUrl : '/partials/job/job-status.html',
                link : function ( scope, element, attrs, jobCtrl ) {
                    $log.info( 'mioJobStatus scope', scope );
                }
            }
        }] );

    jobs.directive( 'mioJobDetail', ['$log', '$parse', '$compile',
        function ( $log, $parse, $compile ) {
            return {
                require : '^mioJob',
                restrict : 'MACE',
                scope : {block : '=mioJobDetail'},
                link : function ( scope, element, attrs, jobCtrl ) {
                    $log.info( 'mioJobDetail scope', scope );
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

