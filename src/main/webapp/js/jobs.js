(function ( $, ng ) {
    var JOB_SERVICES_CLOSEALL = 'job:services:close-all';
    var JOB_SERVICES_CLOSED = 'job:services:closed';
    var JOB_DRAWER_TOGGLE = 'job:drawer:open';

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

                function intersect( a, b ) {
                    a = ng.copy( a );
                    for ( var i = a.length - 1; i >= 0; i-- ) {
                        var index = b.indexOf( a[i] );
                        if ( index < 0 ) a.splice( i, 1 );
                    }
                    return a;
                }

                this.authenticate = function ( serviceName, options ) {
                    return mioServices.authenticate( serviceName, options );
                };

                /**
                 * Based on the source and destination services, calculate the content types
                 * which they both have in common.
                 */
                this.getContentIntersection = function () {
                    var sourceName = $scope.job && $scope.job.source && $scope.job.source.service || '';
                    var destName = $scope.job && $scope.job.destination && $scope.job.destination.service || '';

                    var result = !sourceName || !destName
                        ? [] : mioServices.contentIntersection( sourceName, destName );

                    // Now that we know what content options are available, we need to
                    // remove any content in the current job that is no longer available
                    $scope.job.content = intersect( $scope.job.content, result );
                    return result;
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
                    var otherService = $scope.job && $scope.job[otherTarget] && $scope.job[otherTarget].service;
                    return mioServices.getServices( serviceTarget, otherService );
                };

                /**
                 * Takes care of transitioning between detail names. If detail name is set,
                 * the drawer will close. If detail name is the same as the current one, the
                 * drawer will stay closed. If the drawer is different than the current one,
                 * it will reopen to reveal the new drawer.
                 */
                $scope.detailName = '';
                $scope.$on( JOB_DRAWER_TOGGLE, function ( e, detailName ) {
                    $log.info( 'Toggling drawer, old detailName:', $scope.detailName,
                        'new detailName:', detailName );

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
                } );

                $scope.ui = {};
                $scope.ui.open = false;

                var broadcast = this.broadcast = function ( event, data ) {
//                    $log.info( 'Broadcasting: ', event, data );
                    $scope.$broadcast( event, data );
                };

                // If I could guarantee this event got called first, I could do a check
                // to see if div.service.active exists or not before imposing a 300ms
                // delay.
                $scope.$on( JOB_SERVICES_CLOSEALL, function () {
                    $timeout( function () {
                        broadcast( JOB_SERVICES_CLOSED );
                    }, 300 );
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
//                    $log.info( 'mioJobScroller, scope', scope );

                    var region = element.parent().find( 'ul' );
                    var interval = 950;
                    var increment = scope.dir === 'right' ? -interval : interval;

                    var paging = false;

                    function scroll() {
                        if ( paging ) {
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

    /**
     * ## Directive mio-job-services
     *
     * This component isn't a major UI directive, although it sets up the left/right
     * scrollers and iterates over the viable services to display. It's real strength is
     * it will watch the job, and any time the source or destination accounts change, it
     * will determine the new set of appropriate services for the situation.
     *
     * Keep in mind that all services are always returned, but those that are no longer
     * appropriate are flagged with a boolean property 'valid'. A service is only valid
     * if it contains content types which match one or more of the content types of the
     * recipricol account.
     *
     * ```html
     *     <div class="job-detail"
     *          data-mio-job-services="source" data-mio-job-ref="job">
     * ```
     */
    mod.directive( 'mioJobServices', ['$log', '$compile',
        function ( $log, $compile ) {
            return {
                require : '^mioJob',
                restrict : 'MACE',
                scope : {
                    job : '=mioJobRef',
                    accountType : '@mioJobServices'
                },
                templateUrl : '/partials/job/job-services.html',
                link : function ( scope, element, attrs, jobCtrl ) {
//                    $log.info( 'mioJobServices', scope );
                    var reciprocalAccount = scope.accountType === 'source'
                        ? scope.job['destination'] : scope.job['source'];

                    scope.$watch(
                        function () {
                            return reciprocalAccount ? reciprocalAccount.service : '';
                        },
                        function () {
                            scope.services = jobCtrl.getServices( scope.accountType );
                        } );
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
    mod.directive( 'mioJobService', ['$log', '$timeout', 'mioServices',
        function ( $log, $timeout, mioServices ) {
            return {
                require : '^mioJob',
                restrict : 'MACE',
                scope : {
                    serviceDef : '=mioJobService',
                    serviceObj : '=mioJobServiceRef'
                },
                templateUrl : '/partials/job/job-service.html',
                link : function ( scope, element, attrs, jobCtrl ) {
//                    $log.info( 'mioJobService', scope );
                    // We will show the authenticated user's username if this is the
                    // service with which they authenticated
                    scope.username = scope.serviceDef.name === scope.serviceObj.service
                        ? scope.serviceObj.auth.username : '';

                    // These identifications are needed for scrolling
                    var serviceListItemEle = element.parent();
                    var serviceListEle = serviceListItemEle.parent();
                    var slideEle = element.find( 'div.job-auth' );
                    var serviceEle = element.find( 'div.service' );

                    // We will create a class to apply for the various number of blocks
                    // The expanded version will occupy.
                    var expandedWidth = 0;

                    function calcBlockSize() {
                        var numBlocks = (Math.floor( slideEle.width() / 190 ) + 1);
                        expandedWidth = 190 * numBlocks;
                        var blockSize = 'block' + (numBlocks + 1);
                        serviceEle.addClass( blockSize );
                    }

                    /**
                     * Since only one service can be open at a time, the service that is
                     * closing can calculate the new left for the service list element.
                     */
                    function closeService() {
                        // If we are already closed, then there isn't much to do.
                        if ( scope.active ) {
                            // Get the width of the service element with the expansion
                            var width = serviceListEle.width();
                            // Get the width with the expansion closed (as it will be)
                            var newWidth = width - expandedWidth;
                            // The contracted width may leave the scrolling element too
                            // far to the left, so we will need to adjust.
                            var pos = serviceListEle.position();
                            var newLeft = pos.left < 950 - newWidth
                                ? 950 - newWidth : pos.left;

                            // Now contract the expanded area and adjust the left
                            scope.active = false;
                            serviceListEle.css( 'left', newLeft + 'px' );
                        }
                    }

                    /**
                     * When an element is expanded, we want it to end up in the left-most
                     * column except in cases near the end of the list where the
                     * left-most column would exceed the width of the list. So, we will
                     * scroll the element to the "most left" that we can take it and
                     * still remain visible.
                     */
                    function openService() {
                        if ( willBeActive ) {
                            // Now that all elements are collapsed we can measure
                            var width = serviceListEle.width();

                            // The width of this element is about to grow; we need to
                            // take the future size into consideration
                            width = width + expandedWidth;

                            // We want to set the list's left equal to the item's offset
                            var pos = serviceListItemEle.position();
                            var left = -pos.left;

                            // If that is less than the max left, we will constrain it
                            if ( left < 950 - width ) left = 950 - width;
                            serviceListEle.css( 'left', left + 'px' );

                            var input = slideEle.find( 'input' ).first();
                            if ( input ) {
                                input.focus();
                                input.select();
                            }
                        }
                        scope.active = willBeActive;
                        willBeActive = false;
                    }

                    scope.$on( JOB_SERVICES_CLOSEALL, closeService );
                    scope.$on( JOB_SERVICES_CLOSED, openService );

                    var willBeActive = false;
                    scope.active = false;
                    scope.toggle = function () {
                        // Need to delay this calculation until the DOM elements are
                        // visible. If someone is clicking on a button, we are good.
                        if ( expandedWidth === 0 ) calcBlockSize();

                        willBeActive = !scope.active;
                        // Send out the signal to close any open elements
                        jobCtrl.broadcast( JOB_SERVICES_CLOSEALL );
                    };


                    /**
                     * Returns true if this is the service associated with the job, and
                     * whether the user has completed the authentication information.
                     */
                    scope.hasCredentials = function () {
                        if ( scope.serviceDef.auth === 'password' ) {
                            var auth = scope.serviceObj && scope.serviceObj.auth;
                            return auth && auth.username && auth.password;
                        }
                        return false;
                    };


                    scope.oauthLink = function () {
                        $log.info( 'oauthLink', scope );
                        mioServices.oauthLink( scope.serviceDef.name ).then(
                            function success( data ) {
                                scope.serviceObj.service = scope.serviceDef.name;
                                scope.serviceObj.auth = {
                                    username : data.params.userinfo.email,
                                    accessToken: data.access.access_token,
                                    refreshToken: data.access.refresh_token
                                };
                                scope.toggle();
                                jobCtrl.broadcast( JOB_DRAWER_TOGGLE );
                            },
                            function failure() {
                                scope.errorMsg = 'Failed to authenticate with service.';
                            }
                        );
                    };

                    scope.submit = function () {
                        jobCtrl.authenticate( service.service.name, scope.auth ).then(
                            function () {
                                $log.info( 'mioJobService, save auth', scope );
                                scope.serviceObj.service = scope.serviceDef.name;
                                if ( scope.serviceDef.auth === 'password' ) {
                                    scope.serviceObj.auth = {
                                        username : scope.auth.username,
                                        password : scope.auth.password
                                    }
                                }
                                scope.toggle();
                                jobCtrl.broadcast( JOB_DRAWER_TOGGLE );
                            },
                            function ( msg ) {
                                scope.errorMsg = msg || 'Bad username or password';
                            }
                        );
                    };

                    scope.unlink = function () {
                        delete scope.serviceObj.service;
                        delete scope.serviceObj.auth;
                        scope.auth.password = '';
                    };


                    var authObj = scope.serviceObj && scope.serviceObj.auth || {};
                    scope.auth = {
                        username : authObj.username || '',
                        password : 'secret'
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

                    scope.showPassword = false;
                    scope.togglePass = function () {
                        scope.showPassword = !scope.showPassword;
                    };

                }
            }
        }]
    );

    mod.directive( 'mioJobContent', ['$log', '$parse', '$compile',
        function ( $log, $parse, $compile ) {
            return {
                require : '^mioJob',
                restrict : 'MACE',
                scope : {
                    content : '=mioJobContent',
                    job : '=mioJobRef'
                },
                templateUrl : '/partials/job/job-content.html',
                link : function ( scope, element, attrs, jobCtrl ) {

                    // We will maintain a list of available content based on the chosen
                    // source and destination accounts. This available content will have
                    // to be updated whenever the source and destination change.
                    var availableContent = [];
                    scope.$watch( function () {
                            var source = scope.job.source && scope.job.source.service || '';
                            var dest = scope.job.destination && scope.job.destination.service || '';
                            return source + '/' + dest;
                        }, function () {
                            availableContent = jobCtrl.getContentIntersection();
                            $log.info( 'mioJobContent, updating content intersection', availableContent );
                        }
                    );

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
                                {{tab.auth.username|regex:"(.*)@"}} \
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
                        <div class="remove" data-ng-show="tab.service">\
                            <i data-ng-click="remove" class="icon-remove-sign"></i>\
                        </div>\
                    </div>',
                link : function ( scope, element, attrs, jobCtrl ) {
//                    $log.info( 'mioJobBtnService', scope.tab, element );

                    scope.remove = function () {
                        delete scope.tab.service;
                        delete scope.tab.auth;
                    };
                }
            }
        }]
    );

    /**
     * ## Directive - mioJobBtnContent
     *
     * _The button displayed in the content column of the job tabs bar._
     *
     * ```html
     * <div class="mio-tab-btn-content" data-mio-data="job.content"></div>
     * ```
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
    mod.directive( 'mioTabBtnContent', ['$log', '$parse', '$compile',
        function ( $log, $parse, $compile ) {
            return {
                require : '^mioJob',
                restrict : 'MACE',
                scope : {
                    content : '=mioData'
                },
                template : '\
                    <a class="btn btn-trans" data-ng-click="select()">\
                        <table><tr>\
                            <td><span class="icons"></span></td>\
                            <td><span class="text"></span></td>\
                        </tr></table>\
                    </a>',
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
                        $log.info( 'mioJobBtnContent, content', scope.content, scope.content.length );

                        var spanIcon = element.find( 'span.icons' );
                        var spanText = element.find( 'span.text' );

                        // No content
                        if ( !content || content.length === 0 ) {
                            spanIcon.empty()
                                .append( '<i class="icon-plus-sign icon-2x"/>' );
                            spanText.empty().append( 'Choose content' );
                        } else
                        // We have some type of content to display
                        if ( content ) {
                            spanIcon.empty();
                            spanText.empty();

                            // Add all icons
                            for ( i = 0; i < content.length; i++ ) {
                                spanIcon.append(
                                    ng.element( '<i class="icon-2x"/>' )
                                        .addClass( iconName[content[i]] )
                                );
                            }

                            // Add text only if there is one or two items
                            if ( content.length < 3 ) {
                                spanText.append( textName[content[0]] );
                                if ( content.length > 1 )
                                    spanText.append( '<br/>' )
                                        .append( textName[content[1]] );
                            }
                        }
                    }

                    scope.$watch( 'content', function () {
                        redrawContent( scope.content );
                    }, true );

                    scope.select = function () {
                        jobCtrl.broadcast( JOB_DRAWER_TOGGLE, 'content' );
                    };
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


    // <div class="mio-tab-btn-account" mio-account="jobs[0].source" mio-account-type="source"/>
    mod.directive( 'mioTabBtnAccount', ['$log',
        function ( $log ) {
            return {
                require : '^mioJob',
                restrict : 'ACE',
                scope : {
                    account : '=mioAccount',
                    label : '@mioAccountType'
                },
                template : '\
                    <div style="display: none;" data-ng-show="show(\'add\')" class="pane" data-ng-animate="\'slider\'">\
                        <a data-ng-click="select()" class="btn btn-trans">\
                            <table><tr>\
                                <td><i class="icon-plus-sign"/></td>\
                                 <td><p class="lbl">Add {{label}} account</p></td>\
                             </tr></table>\
                        </a>\
                    </div>\
                    <div style="display: none;" data-ng-show="show(\'del\')" class="pane" data-ng-animate="\'slider\'">\
                        <table><tr>\
                            <td><a data-ng-click="del()" class="btn btn-danger">Delete?</a></td>\
                             <td><a data-ng-click="cancel()" class="btn btn-info">Cancel</a></td>\
                         </tr></table>\
                    </div>\
                    <div style="display: none;" data-ng-show="show(\'svc\')" class="pane" data-ng-animate="\'slider\'">\
                        <a data-ng-click="select()" class="btn btn-trans">\
                            <table>\
                                <tr><td><img data-ng-src="/img/services/{{account.service}}.png" /></td></tr>\
                                <tr><td><p>jcook@</p></td></tr>\
                            </table>\
                        </a>\
                        <div style="display: none;" data-ng-show="show(\'svc\')" data-ng-click="remove()" class="remove" data-ng-animate="\'fader\'">\
                            <i class="icon-remove-sign"></i>\
                        </div>\
                    </div>\
                ',
                link : function ( scope, element, attrs, jobCtrl ) {
                    element.addClass( scope.label );
                    scope.deleting = false;

                    scope.show = function ( pane ) {
                        if ( pane === 'add' ) return !scope.account.service;
                        if ( pane === 'del' ) return scope.account.service && scope.deleting;
                        if ( pane === 'svc' ) return scope.account.service && !scope.deleting;
                    };

                    scope.cancel = function () {
                        scope.deleting = false;
                    };

                    scope.remove = function () {
                        scope.deleting = true;
                    };

                    scope.del = function () {
                        scope.deleting = false;
                        scope.account = {};
                    };

                    scope.select = function () {
                        jobCtrl.broadcast( JOB_DRAWER_TOGGLE, scope.label );
                    };
                }
            }
        }]
    )
})( jQuery, angular );

