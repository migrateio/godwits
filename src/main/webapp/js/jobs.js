(function ( $, ng ) {
    var uiModel = {
        source : [
            {
                name: ''
            },
            {
                name : 'flickr',
                auth : 'oauth',
                content : ['media']
            },
            {
                name : 'picasa',
                auth : 'oauth',
                content : ['media']
            },
            {
                name : 'aol',
                auth : 'password',
                content : ['mails', 'calendars', 'contacts']
            },
            {
                name : 'comcast',
                auth : 'password',
                content : ['mails']
            },
            {
                name : 'exchange',
                auth : 'exchange',
                content : ['mails']
            },
            {
                name : 'google',
                auth : 'oauth',
                content : ['mails', 'calendars', 'contacts', 'documents', 'media']
            },
            {
                name : 'hotmail',
                auth : 'password',
                content : ['mails', 'calendars', 'contacts']
            },
            {
                name : 'imap',
                auth : 'password',
                content : ['mails']
            },
            {
                name : 'outlook',
                auth : 'oauth',
                content : ['mails', 'calendars', 'contacts']
            },
            {
                name : 'outlookpst',
                auth : 'file',
                content : ['mails', 'calendars', 'contacts']
            },
            {
                name : 'skydrive',
                auth : 'oauth',
                content : ['documents', 'media']
            },
            {
                name : 'twc',
                auth : 'password',
                content : ['mails']
            },
            {
                name : 'yahoo',
                auth : 'oauth',
                content : ['mails', 'contacts']
            }
        ],
        destination : [
            {
                name: ''
            },
            {
                name : 'flickr',
                auth : 'oauth',
                content : ['media']
            },
            {
                name : 'picasa',
                auth : 'oauth',
                content : ['media']
            },
            {
                name : 'aol',
                auth : 'password',
                content : ['mails', 'calendars', 'contacts']
            },
            {
                name : 'comcast',
                auth : 'password',
                content : ['mails']
            },
            {
                name : 'exchange',
                auth : 'exchange',
                content : ['mails']
            },
            {
                name : 'google',
                auth : 'oauth',
                content : ['mails', 'calendars', 'contacts', 'documents', 'media']
            },
            {
                name : 'hotmail',
                auth : 'password',
                content : ['mails', 'calendars', 'contacts']
            },
            {
                name : 'imap',
                auth : 'password',
                content : ['mails']
            },
            {
                name : 'outlook',
                auth : 'oauth',
                content : ['mails', 'calendars', 'contacts']
            },
            {
                name : 'skydrive',
                auth : 'oauth',
                content : ['documents', 'media']
            },
            {
                name : 'twc',
                auth : 'password',
                content : ['mails']
            },
            {
                name : 'yahoo',
                auth : 'oauth',
                content : ['mails', 'contacts']
            }
        ]    };

    var jobs = ng.module( 'migrate.jobs', [] );

    jobs.controller( 'mio-jobs-controller', [ '$log', '$scope', '$jobs',
        function ( $log, $scope, $jobs ) {

            var random = function(len) {
                return Math.floor( Math.random() * len )
            };

            function combine(source, dest) {
                function intersect_safe(a, b) {
                    for (var i = a.length - 1; i >= 0; i--) {
                        var index = b.indexOf( a[i] );
                        if (index < 0) a.splice(i,1);
                    }
                    $log.info( 'Result:', a );
                    return a;
                }

                $log.info( 'Intersection', source, dest );
                return intersect_safe( source, dest );
            }

            function newJob() {
                var sourceService = uiModel.source[random(uiModel.source.length)];
                var destService = uiModel.destination[random(uiModel.destination.length)];

                var result = {
                    jobId: '' + (random(1000) + 1000),
                    source: {
                        service: sourceService.name || ''
                    },
                    destination: {
                        service: destService.name || ''
                    },
                    content: combine(sourceService.content || [], destService.content || []),
                    action: {
                    },
                    status: {
                        completion: 1.00
                    }
                };
                if (result.source.service) 
                    result.source.username = 'cherry.chevapravatdumrong@'
                        + result.source.service + '.com'; 
                if (result.destination.service) 
                    result.destination.username = 'cherry.chevapravatdumrong@'
                        + result.destination.service + '.com'; 
                return result;
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
        }
    ] );

    jobs.controller( 'mio-job-controller', ['$log', '$scope', '$timeout', '$element',
        function ( $log, $scope, $timeout, $element ) {
            $scope.detailName = '';

            /**
             * Takes care of transitioning between detail names. If detail name is set,
             * the drawer will close. If detail name is the same as the current one, the
             * drawer will stay closed. If the drawer is different than the current one,
             * it will reopen to reveal the new drawer.
             */
            this.toggleDetailName = function (detailName) {
                // Give the ui animation time to close the drawer if it was open
                var delay = $scope.ui.open ? 200 : 0;

                // We will always close the drawer
                $scope.ui.open = false;

                var newDetailName = $scope.detailName === detailName ? '' : detailName;
                $element.removeClass( $scope.detailName );

                if (newDetailName) {
                    $timeout( function () {
                        // Add the detail name to the element in order to control some
                        // downstream css styles.
                        $element.addClass( newDetailName );
                        $scope.detailName = newDetailName;
                        $scope.ui.open = true;
                    }, delay );
                } else {
                    $scope.detailName = newDetailName;
                }
            };

            $scope.ui = {};
            $scope.ui.open = false;
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
                link : function ( scope, element, attrs, jobCtrl ) {
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
                    $log.info( 'mioJobTab scope', scope );
                    var original = {};
                    var detailName = attrs['mioDetailName'];
                    element.addClass(detailName);

                    function beginEdit() {
                        original = ng.copy( scope.tab );
                    }

                    function select() {
                        if (jobCtrl.detailName !== detailName) {
                            beginEdit();
                        }
                        jobCtrl.toggleDetailName( detailName );
                    }

                    function cancel() {
                        scope.tab = ng.copy( original );
                    }

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
                    scope.availableContent = ['mails', 'contacts', 'calendars;

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
                }
            }
        }]
    );


    jobs.directive( 'mioJobBtnService', ['$log', '$parse', '$compile',
        function ( $log, $parse, $compile ) {
            return {
                require : '^mioJob',
                restrict : 'MACE',
                scope : {
                    tab: '=mioJobBtnService',
                    tabType: '@tabType'
                },
                replace: true,
                template: '\
                        <div>\
                            <div ng-if="tab.service" class="service-button">\
                                <span class="icons"> \
                                    <img data-ng-src="/img/services/{{tab.service}}.png" /> \
                                </span> \
                                <span class="text"> \
                                    {{tab.username|regex:"(.*)@"}} \
                                </span>\
                            </div>\
                            <div ng-if="!tab.service" class="icons-button">\
                                <span class="icons"> \
                                     <i class="icon-plus-sign icon-2x"></i> \
                                </span> \
                                <span class="text"> \
                                     Add {{tabType}} account \
                                </span>\
                            </div>\
                        </div>',
                link : function ( scope, element, attrs, jobCtrl ) {
                    $log.info( 'mioJobBtnService', scope.tab, element );
                    function redraw(tab) {
                    }

                    scope.$watch( 'tab', redraw );
                }
            }
        }]
    );

    /**
     * ## Directive - mioJobBtnContent
     *
     * This button has several different appearances based on how many selections have
     * been made by the user and the status of the source and destination account.
     *
     * * **No source or no destination** - Present the 'plus' icon and the text
     *   "Add content"
     * * **No items selected** - Present the 'plus' icon and the text "Add content"
     * * **One or two items selected** - Present icons for the selected items and text
     *   to describe each icon.
     * * **Three or more items selected** - Display icons only with no text.
     *
     * Note: the choices made for source and destination will impact which content
     * options are available to the user. This component is not concerned with that
     * logic, and it will render the choices present in the `job.content` property.
     */
    jobs.directive( 'mioJobBtnContent', ['$log', '$parse', '$compile',
        function ( $log, $parse, $compile ) {
            return {
                require : '^mioJob',
                restrict : 'MACE',
                scope : {content: '=mioJobBtnContent'},
                template: '\
                        <div>\
                            <div ng-if="content.length > 0" class="icons-button">\
                                <span class="icons"> \
                                </span> \
                                <span class="text"> \
                                </span>\
                            </div>\
                            <div ng-if="content.length === 0" class="icons-button">\
                                <span class="icons"> \
                                     <i class="icon-plus-sign icon-2x"></i> \
                                </span> \
                                <span class="text"> \
                                     Add Content\
                                </span>\
                            </div>\
                        </div>',
                link : function ( scope, element, attrs, jobCtrl ) {
                    var i,
                        imageHtml = '<img alt="{name}" data-ng-src="/img/content/{name}.png" />',
                        textName = {
                            mails: 'Email',
                            calendars: 'Calendars',
                            contacts: 'Contacts',
                            documents: 'Documents',
                            media: 'Media Files'
                        },
                        iconName = {
                            mails: 'icon-envelope-alt',
                            calendars: 'icon-calendar',
                            contacts: 'icon-user',
                            documents: 'icon-file',
                            media: 'icon-picture'
                        };

                    $log.info( 'mioJobBtnContent, content', scope.content, scope.content.length );
                    function redrawContent(content) {
                        if (content && content.length > 0) {
                            var iconSpan = element.find( 'span.icons' );
                            for (i = 0; i < content.length; i++) {
//                                iconSpan.append( imageHtml.replace( /\{name\}/ig, content[i] ) );
                                var icon = ng.element( '<i class="icon-2x"/>' )
                                    .addClass( iconName[content[i]] );
                                iconSpan.append(icon);
                            }
                        }
                        var iconText = element.find( 'span.text' )
                            .css( 'width', 'auto' );
                        if (content && content.length < 3) {
                            iconText
                                .css( 'width', '100%' )
                                .append( textName[content[0]] );
                            if (content.length > 1)
                                iconText.append( '<br/>' ).append( textName[content[1]] );
                        }
                    }

                    scope.$watch( 'content', redrawContent );
                }
            }
        }]
    );

    jobs.filter('regex', function() {
        return function(input, regex) {
            var value = new RegExp(regex).exec(input);
            return value && value[1] ? value[1] : input;
        }
    });

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

