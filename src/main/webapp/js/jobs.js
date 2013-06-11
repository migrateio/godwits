(function ( $, ng ) {
    var JOB_SERVICES_CLOSEALL = 'job:services:close-all';
    var JOB_SERVICES_CLOSED = 'job:services:closed';

    var mod = ng.module( 'migrate-jobs', ['migrate-services'] );

    mod.controller( 'mio-jobs-controller', [ '$log', '$scope',
        function ( $log, $scope ) {

            var random = function ( len ) {
                return Math.floor( Math.random() * len )
            };

            function newJob() {
                return {
                    jobId : '' + (random( 1000 ) + 1000),
                    source : {},
                    destination : {},
                    content : [],
                    action : {},
                    status : {
                        completion : 0.00
                    }
                };
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

    mod.controller( 'mio-job-controller',
        ['$log', '$scope', '$timeout', '$element', 'mioServices',
            function ( $log, $scope, $timeout, $element, mioServices ) {

                this.authenticate = function ( serviceName, options ) {
                    return mioServices.authenticate( serviceName, options );
                };


                /**
                 * Based on the source and destination services, calculate the content types
                 * which they both have in common.
                 */
                this.getContentIntersection = function () {
                    var sourceName = $scope.job.source;
                    var destName = $scope.job.destination;
                    if ( !sourceName || !destName ) return [];

                    return mioServices.contentIntersection( sourceName, destName );
                };


                /**
                 * Using the mioService, get a list of services that are appropriate for the
                 * given service target (ie 'source' or 'destination'). When fetching the
                 * services, we also pass back the 'opposite' service if the user has made a
                 * selection. When mioServices returns the list of services appropriate for
                 * the serviceTarget, it will flag whether each service is compatible or
                 * incompatible with the 'opposite' service.
                 *
                 * @param {String} serviceTarget Either 'source' or 'destination'
                 * @returns {Array} List of all services for serviceTarget.
                 */
                this.getServices = function ( serviceTarget ) {
                    var otherTarget = serviceTarget === 'source' ? 'destination' : 'source';
                    var otherService = $scope.job && $scope.job[otherTarget];

                    return mioServices.getServices( serviceTarget, otherService );
                };

                /**
                 * Takes care of transitioning between detail names. If detail name is set,
                 * the drawer will close. If detail name is the same as the current one, the
                 * drawer will stay closed. If the drawer is different than the current one,
                 * it will reopen to reveal the new drawer.
                 */
                $scope.detailName = '';
                this.toggleDetailName = function ( detailName ) {
                    // Give the ui animation time to close the drawer if it was open
                    var delay = $scope.ui.open ? 200 : 0;

                    // We will always close the drawer
                    $scope.ui.open = false;

                    var newDetailName = $scope.detailName === detailName ? '' : detailName;
                    $element.removeClass( $scope.detailName );

                    if ( newDetailName ) {
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

                var broadcast = this.broadcast = function ( event, data ) {
                    $log.info( 'Broadcasting: ', event, data );
                    $scope.$broadcast( event, data );
                };

                // If I could guarantee this event got called first, I could do a check
                // to see if div.service.active exists or not before imposing a 300ms
                // delay.
                $scope.$on( JOB_SERVICES_CLOSEALL, function () {
                    $timeout(function() {
                        broadcast( JOB_SERVICES_CLOSED );
                    }, 300);
                } );
            }]
    );

    mod.directive( 'mioJob', ['$log', '$parse',
        function ( $log, $parse ) {
            return {
                restrict : 'MACE',
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


    mod.directive( 'mioJobTabs', ['$log', '$parse', '$compile',
        function ( $log, $parse, $compile ) {
            return {
                require : '^mioJob',
                restrict : 'MACE',
                scope : {
                    job : '=mioJobTabs'
                },
                templateUrl : '/partials/job/job-tabs.html',
                link : function ( scope, element, attrs, jobCtrl ) {
//                    $log.info( 'mioJobTabs scope', scope );
                }
            }
        }]
    );

    mod.directive( 'mioJobTab', ['$log', '$parse', '$compile',
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
                    element.addClass( detailName );

                    function beginEdit() {
                        original = ng.copy( scope.tab );
                    }

                    function select() {
                        if ( jobCtrl.detailName !== detailName ) {
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

    mod.directive( 'mioJobScroller', ['$log', '$timeout',
        function ( $log, $timeout ) {
            return {
                require : '^mioJob',
                restrict : 'MACE',
                replace : true,
                scope : {
                    services : '=mioJobScroller',
                    dir : '@mioJobScrollerDir'
                },
                templateUrl : '/partials/job/job-scroller.html',
                link : function ( scope, element, attrs, jobCtrl ) {
                    $log.info( 'mioJobScroller, scope', scope );

                    var region = element.parent().find( 'ul' );
                    var interval = 950;
                    var increment = scope.dir === 'right' ? -interval : interval;

                    var paging = false;
                    function scroll() {
                        if (paging) {
                            paging = false;
                            // The width has to be calculated each time because of expanding
                            // and contracting elements.
                            var width = region.width();
                            var left = parseInt( region.css( 'left' ) );
                            left = left + increment;
                            if ( left > 0 ) left = 0;
                            if ( left < interval - width ) left = interval - width;
                            region.css( 'left', left + 'px' );
                        }
                    }

                    scope.page = function () {
                        paging = true;
                        jobCtrl.broadcast( JOB_SERVICES_CLOSEALL );
                    };

                    scope.$on( JOB_SERVICES_CLOSED, scroll );
                }
            }
        }]
    );

    mod.directive( 'mioJobServices', ['$log', '$compile',
        function ( $log, $compile ) {
            return {
                require : '^mioJob',
                restrict : 'MACE',
                scope : {
                    job : '=mioJobServicesRef',
                    dataName : '@mioJobServices'
                },
                templateUrl : '/partials/job/job-services.html',
                link : function ( scope, element, attrs, jobCtrl ) {
                    scope.services = jobCtrl.getServices( scope.dataName );
                }
            }
        }]
    );

    /**
     * The service object controls whether the service element is expanded to show
     * authentication information or closed. When expanded, the service block tries to
     * slide to the left-most position it can occupy while remaining visible.
     *
     * The actual desired interaction is thus:
     *
     * 1. User selects a service block
     * 2. All service blocks close (contract)
     * 3. If our current service is to expand it simultaneously:
     *     1. Expands its auth block
     *     2. Slides to the left-most position
     *
     */
    mod.directive( 'mioJobService', ['$log', '$timeout',
        function ( $log, $timeout ) {
            return {
                require : '^mioJob',
                restrict : 'MACE',
                scope : {
                    serviceDef : '=mioJobService',
                    serviceObj : '=mioJobServiceRef'
                },
                templateUrl : '/partials/job/job-service.html',
                link : function ( scope, element, attrs, jobCtrl ) {

                    // These identifications are needed for scrolling
                    var serviceEle = element.parent();
                    var serviceListEle = serviceEle.parent();

                    /**
                     * When an element is expanded, we want it to end up in the left-most
                     * column except in cases near the end of the list where the
                     * left-most column would exceed the width of the list. So, we will
                     * scroll the element to the "most left" that we can take it and
                     * still remain visible.
                     */
                    var scrollingLeft = false;
                    scope.$on( JOB_SERVICES_CLOSED, function () {
                        $log.info( 'Job services closed' );
                        if ( scrollingLeft ) {
                            scrollingLeft = false;
                            // Now that all elements are collapsed we can measure
                            var width = serviceListEle.width();
                            $log.info( 'Width:', width );
                            // We want to set the list's left equal to the item's offset
                            var pos = serviceEle.position();
                            var left = -pos.left;
                            // If that is less than the max left, we will constrain it
                            if ( left < 950 - width ) left = 950 - width;
                            serviceListEle.css( 'left', left + 'px' );
                        }
                    } );

                    var authObj = scope.serviceObj && scope.serviceObj.auth || {};
                    scope.auth = {
                        username : authObj.username || '',
                        password : ''
                    };

                    // Keep track of an error message which will be displayed in the view
                    scope.errorMsg = '';
                    // Reset the error message when the user changes the username or
                    // password.
                    scope.$watch( function () {
                        return scope.auth.username + '/' + scope.auth.password;
                    }, function () {
                        scope.errorMsg = '';
                    } );

                    scope.submit = function () {
                        jobCtrl.authenticate( service.service.name, scope.auth ).then(
                            function () {
                                $log.info( 'mioJobService, save auth', scope.auth );
                            },
                            function ( msg ) {
                                scope.errorMsg = msg || 'Bad username or password';
                            }
                        );
                    };

                    scope.showPassword = false;
                    scope.togglePass = function () {
                        scope.showPassword = !scope.showPassword;
                    };

                    scope.active = false;
                    scope.soonToBeActive = false;
                    scope.toggle = function () {
                        // Need to do this little trick to because the event sometimes
                        // fires first, and sometimes fires last, regardless of the order
                        // of the next two lines.
                        scope.soonToBeActive = !scope.active;
                        scrollingLeft = true;
                        jobCtrl.broadcast( JOB_SERVICES_CLOSEALL );
                    };

                    scope.$on( JOB_SERVICES_CLOSEALL, function () {
                        scope.active = scope.soonToBeActive;
                        scope.soonToBeActive = false;
                    } );
                }
            }
        }]
    );

    mod.directive( 'mioJobContent', ['$log', '$parse', '$compile',
        function ( $log, $parse, $compile ) {
            return {
                require : '^mioJob',
                restrict : 'MACE',
                scope : {content : '=mioJobContent'},
                templateUrl : '/partials/job/job-content.html',
                link : function ( scope, element, attrs, jobCtrl ) {
                    var availableContent = jobCtrl.getContentIntersection();

                    // Because of IE8, we can't use indexOf...
                    function indexOf( arr, name ) {
                        for ( var i = arr.length - 1; i >= 0; i-- )
                            if ( arr[i] === name ) return i;
                        return -1;
                    }

                    function contains( arr, name ) {
                        return indexOf( arr, name ) >= 0;
                    }

                    scope.available = function ( name ) {
                        return contains( availableContent, name );
                    };

                    scope.selected = function ( name ) {
                        var result = contains( scope.content, name );
//                        $log.info( 'Is ' + name + ' in ', scope.content, result );
                        return result;
                    };

                    scope.toggle = function ( name ) {
                        if ( scope.available( name ) ) {
                            if ( scope.selected( name ) ) {
                                // Remove the name from content
                                scope.content.splice( indexOf( scope.content, name ), 1 );
                            } else {
                                // Add the name to content
                                scope.content.push( name );
                            }
                        }
                    };
                }
            }
        }]
    );

    mod.directive( 'mioJobAction', ['$log', '$parse', '$compile',
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

    mod.directive( 'mioJobStatus', ['$log', '$parse', '$compile',
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

    mod.directive( 'mioJobDetail', ['$log', '$parse', '$compile',
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


    mod.directive( 'mioJobBtnService', ['$log', '$parse', '$compile',
        function ( $log, $parse, $compile ) {
            return {
                require : '^mioJob',
                restrict : 'MACE',
                scope : {
                    tab : '=mioJobBtnService',
                    tabType : '@tabType'
                },
                replace : true,
                template : '\
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
//                    $log.info( 'mioJobBtnService', scope.tab, element );
                    function redraw( tab ) {
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
    mod.directive( 'mioJobBtnContent', ['$log', '$parse', '$compile',
        function ( $log, $parse, $compile ) {
            return {
                require : '^mioJob',
                restrict : 'MACE',
                scope : {content : '=mioJobBtnContent'},
                template : '\
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
                            mails : 'Email',
                            calendars : 'Calendars',
                            contacts : 'Contacts',
                            documents : 'Documents',
                            media : 'Media Files'
                        },
                        iconName = {
                            mails : 'icon-envelope-alt',
                            calendars : 'icon-calendar',
                            contacts : 'icon-user',
                            documents : 'icon-file',
                            media : 'icon-picture'
                        };

                    function redrawContent( content ) {
//                        $log.info( 'mioJobBtnContent, content', scope.content, scope.content.length );

                        if ( content && content.length > 0 ) {
                            var iconSpan = element.find( 'span.icons' ).empty();
                            for ( i = 0; i < content.length; i++ ) {
//                                iconSpan.append( imageHtml.replace( /\{name\}/ig, content[i] ) );
                                var icon = ng.element( '<i class="icon-2x"/>' )
                                    .addClass( iconName[content[i]] );
                                iconSpan.append( icon );
//                                $log.info('Added icon: ', content, content[i])
                            }
                            var iconText = element.find( 'span.text' )
                                .empty()
                                .css( 'width', 'auto' );
                            if ( content && content.length < 3 ) {
                                iconText
                                    .css( 'width', '100%' )
                                    .append( textName[content[0]] );
                                if ( content.length > 1 )
                                    iconText.append( '<br/>' ).append( textName[content[1]] );
                            }
                        }
                    }

                    scope.$watch( 'content', function () {
                        redrawContent( scope.content );
                    }, true );
                }
            }
        }]
    );

    mod.filter( 'regex', function () {
        return function ( input, regex ) {
            var value = new RegExp( regex ).exec( input );
            return value && value[1] ? value[1] : input;
        }
    } );

})( jQuery, angular );

