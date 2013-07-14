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
                    "source" : {
                        "service" : "flickr",
                        "auth" : {
                            "username" : "jcook@gmail.com",
                            "accessToken" : "access_jsd8as32h373fhasa8",
                            "refreshToken" : "refresh_is812nms0an38dbcuz73"
                        }
                    },
                    "destination" : {
                        "service" : "picasa",
                        "auth" : {
                            "username" : "jcook@gmail.com",
                            "accessToken" : "access_jsd8as32h373fhasa8",
                            "refreshToken" : "refresh_is812nms0an38dbcuz73"
                        }
                    },
                    "content" : [
                        "media"
                    ],
                    "action" : {},
                    "status" : {
                        "completion" : 0,
                        "state" : "pending"
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
                // Watch the job to see when the job is ready to be submitted
                $scope.$watch(
                    function () {
                        return $scope.job.source && $scope.job.source.service
                            && $scope.job.destination && $scope.job.destination.service
                            && $scope.job.content && $scope.job.content.length > 0;
                    },
                    function ( newValue ) {
                        if ( !$scope.job.status ) $scope.job.status = {};
                        $scope.job.status.state = newValue ? 'pending' : '';
//                        $log.info( 'Watching for state', newValue, $scope.job );
                    }
                );

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
//                    $log.info( 'Toggling drawer, old detailName:', $scope.detailName,
//                        'new detailName:', detailName );

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
//                        $log.info( 'oauthLink', scope );

                        var success = function ( data ) {
                            scope.serviceObj.service = scope.serviceDef.name;
                            scope.serviceObj.auth = {
                                username : data.params.userinfo.email,
                                accessToken : data.access.access_token,
                                refreshToken : data.access.refresh_token
                            };
                            scope.toggle();
                            jobCtrl.broadcast( JOB_DRAWER_TOGGLE );
                        };

                        var failure = function () {
                            scope.errorMsg = 'Failed to authenticate with service.';
                        };

                        $timeout( function () {
                            success( {
                                params : {
                                    userinfo : {
                                        email : 'jcook@gmail.com'
                                    }
                                },
                                access : {
                                    access_token : 'access_jsd8as32h373fhasa8',
                                    refresh_token : 'refresh_is812nms0an38dbcuz73'
                                }
                            } );
                        }, 1500 );

//                        mioServices.oauthLink( scope.serviceDef.name )
//                            .then( success, failure );
                    };

                    scope.oauthUnlink = function () {
//                        $log.info( 'oauthUnlink', scope );

//                        mioServices.oauthUnlink(
//                          scope.serviceDef.name, scope.serviceObj.auth.refreshToken
//                        );
                        scope.serviceObj = {};
                        scope.toggle();
                        jobCtrl.broadcast( JOB_DRAWER_TOGGLE );
                    };

                    scope.submit = function () {
                        jobCtrl.authenticate( service.service.name, scope.auth ).then(
                            function () {
//                                $log.info( 'mioJobService, save auth', scope );
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
//                            $log.info( 'mioJobContent, updating content intersection', availableContent );
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

    /**
     * ## Directive mio-job-action
     *
     * _A directive which will monitor changes to the job and submit to the server for a
     * `preauth` object when the job details are modified and it is called upon. The
     * screen may display a busy indicator while the directive is calling the server._
     *
     * The UI control object we build will determine which of four different purchase
     * views are displayed. Possible permutation ingredients are:
     *
     * * promotion (edu|full)
     *   Indicates whether the job's source account is an edu account or full (non-edu)
     *
     * * max (true|false)
     *   Indicates whether the user has been charged the max amount for the invoice ($15)
     *
     * * due (0|5|10|15)
     *   The amount due will depend on the promotion type and how much has been charged
     *   against the invoice.
     *
     * That leaves us with 16 permutations, so we have to decide what is important to the
     * user in order to make a purchase decision. Obviously the `due` amount will be
     * displayed. If the user has selected an edu account, we will want to let them know
     * about the special $5 price for edu source accounts.
     *
     * Some unanswered questions:
     * 1. Does the user want to know that they have maxed out an invoice and all future
     *    jobs will be at no charge? Should this be shown after payment and job
     *    submission?
     * 2. If the user is charged $10, should we explain that they are being charged $15,
     *    but because of an earlier edu payment, their balance is only $10?
     * 3. If the user is charged for two .edu accounts for $5/each, is it worth telling
     *    them that another $5 will allow them to transfer from any non-edu account?
     * 4. Is the due amount of $0 a special condition? Should we tell the user that
     *    no payment is necessary or just submit the job?
     *
     * **full**
     * > The user has selected a non-edu source and the full price of $15 is charged.
     *
     * **edu-partial**
     * > The user has selected an edu source and they will be charged $5 for this job.
     *   They have not yet reached the $15 max.
     *
     * **edu-full**
     * > The user has selected an edu source and they will be charged $5 for this job and
     *   they have reached the $15 max.
     *
     * **zero**
     * > The user's job is due no money because their invoice has been maxed out at $15.
     *
     *
     */
    mod.directive( 'mioJobAction', ['$log', 'mioServices',
        function ( $log, mioServices ) {
            return {
                require : '^mioJob',
                restrict : 'MACE',
                scope : {
                    job : '=mioJobRef'
                },
                templateUrl : '/partials/job/job-action.html',
                link : function ( scope, element, attrs, jobCtrl ) {
                    // The preauth object will hold properties that tell what is needed
                    // to submit the job. If the preauth object has yet to be returned
                    // from the server, pending will be 'true'.
                    scope.preauth = {
                        pending: true
                    };

                    // If the job has changed, we will update the preauth object in
                    // the scope to reflect the new settings.
                    var jobChanged = function() {
                        mioServices.preauthJob( scope.job ).then(
                            function success( result ) {
                                scope.preauth = result.data;
                                scope.preauth.last4 = '1234';
                                scope.preauth.cardType = 'MasterCard';

                                // edu
//                                    scope.preauth.payment.promotion = 'edu';
//                                    scope.preauth.payment.amounts.due = 500;

                                // zero
//                                scope.preauth.payment.amounts.due = 0;

                                // error
                                scope.preauth.error = {
                                    message: 'The job as defined overlaps with other \
                                        running jobs.',
                                    tooltip: '',
                                    jobs: [
                                        { jobId: '123', content: ['mails', 'contacts']},
                                        { jobId: '321', content: ['documents', 'mails', 'media']},
                                        { jobId: '987', content: ['mails']},
                                        { jobId: '000', content: ['mails', 'contacts', 'calendars', 'documents', 'media']}
                                    ]
                                };

                                if (!scope.preauth.error) {
                                    var dest = mioServices.getService( scope.job.destination.service );
                                    var due = Math.floor( scope.preauth.payment.amounts.due / 100 );
                                    var max = Math.floor( scope.preauth.payment.amounts.charged / 100 );
                                    var expires = scope.preauth.payment.expiresFmt;

                                    // Create the view details
                                    if ( scope.preauth.payment.amounts.due === 0 ) {
                                        // No payment is necessary.
                                        scope.preauth.view = {
                                            headline : 'You are paid in full!',
                                            tooltip : 'Thanks for using our service. \
                                        You may migrate any number source accounts \
                                        to your ' + dest.fullname + ' account for \
                                        no additional fees until ' + expires + '.',
                                            caption : 'Our servers are standing by for \
                                            your job.',
                                            amount : '$0'
                                        };
                                    } else {
                                        if ( scope.preauth.payment.promotion === 'edu' ) {
                                            // User is paying for an educational migrate
                                            scope.preauth.view = {
                                                headline : 'Education discount!',
                                                tooltip : 'We will migrate all of the \
                                            content from your EDU account to your ' +
                                                    dest.fullname + ' account for the low \
                                            price of $' + due + '. For a 30-day \
                                            period ending on ' + expires + ' you \
                                            will be able to re-run this job as many \
                                            times as you like.',
                                                caption : 'Students and educators save today.',
                                                amount : '$' + due
                                            };
                                        } else {
                                            // User is paying for a full migrate
                                            scope.preauth.view = {
                                                headline : 'Ready to migrate!',
                                                tooltip : 'We will migrate all of the \
                                            data from any number of source accounts \
                                            to your ' + dest.fullname + ' account \
                                            for the low price of $' + due + '. For \
                                            a 30-day period ending on ' + expires +
                                                    ' you will be able to re-run this job as \
                                                  many times as you like. You may also \
                                                  create new jobs to move other accounts \
                                                  to your ' + dest.fullname + ' account \
                                            for no additional cost.',
                                                caption : 'Sit back while we do the heavy \
                                            lifting for you.',
                                                amount : '$' + due
                                            };
                                        }

                                    }
                                }

                                $log.info( 'Preauth', scope.preauth );
                            },
                            function error( result ) {
                                if ( result.status === 401 ) {
                                    $log.info( 'Will be authenticating', result );
                                    scope.preauth = {
                                        auth: true
                                    };
                                }
                            }
                        );
                    };

                    // Job watcher returns a string value which will change if any
                    // value on the job's source, destination or content properties
                    // are modified. It basically constructs a JSON string of the
                    // props.
                    var jobWatcher = function() {
                        var isComplete = scope.job
                            && scope.job.destination && scope.job.destination.service
                            && scope.job.destination.auth && scope.job.destination.auth.username
                            && scope.job.source && scope.job.source.service
                            && scope.job.source.auth && scope.job.source.auth.username
                            && scope.job.content && scope.job.content.length > 0;
                        if (isComplete) return JSON.stringify( {
                            destination: scope.job.destination,
                            source: scope.job.source,
                            content: scope.job.content
                        } );
                        return '';
                    };

                    scope.$watch(jobWatcher, jobChanged);

                    scope.purchase = function () {
                        $log.info( 'Payment submission:', arguments );
                        var amount = parseInt( scope.ui.amount );

                        var success = function(result) {
                            $log.info( 'Result:', result );

                            if (typeof result.id !== 'string') {
                                // Can this happen. How should we handle it? What are the
                                // error conditions?
                            }

                            mioServices.submitJob( job, result.id ).then(
                                function success() {

                                },
                                function error() {
                                    // Perhaps another job was submitted before this one
                                    // and payment is off or overlap has occurred. Tell
                                    // the user.
                                }
                            );
                        };

                        StripeCheckout.open({
                            // todo: Need a way to transfer server-side data to client
                            key:         'pk_test_47piF2jdDs2jCkzclRy4HwWz',
                            address:     false,
                            amount:      amount * 100,
                            currency:    'usd',
                            name:        'Migrate IO',
                            description: 'Migration Job ( $' + amount + ' )',
                            panelLabel:  'Pay',
                            image:       '/img/icons/app-icon-128.png',
                            token:       success
                        });
                    }
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
    mod.directive( 'mioTabBtnAccount', ['$log', '$timeout',
        function ( $log, $timeout ) {
            return {
                require : '^mioJob',
                restrict : 'ACE',
                scope : {
                    account : '=mioAccount',
                    label : '@mioAccountType'
                },
                template : '\
                    <div class="mio-box" data-mio-box="pane">\
                        <div class="mio-face" data-mio-face="plus" \
                                data-ng-animate="{show: \'right-show\', hide: \'left-hide\'}">\
                            <a data-ng-click="select()" class="btn btn-trans">\
                                <table><tr>\
                                    <td><i class="icon-plus-sign"/></td>\
                                     <td><span class="text">Add {{label}} account</span></td>\
                                 </tr></table>\
                            </a>\
                        </div>\
                        <div class="mio-face" data-mio-face="delete" \
                                data-ng-animate="{show: \'top-show\', hide: \'top-hide\'}">\
                            <table><tr>\
                                <td><a data-ng-click="del()" class="btn btn-danger">Delete?</a></td>\
                                 <td><a data-ng-click="cancel()" class="btn btn-info">Cancel</a></td>\
                             </tr></table>\
                        </div>\
                        <div class="mio-face" data-mio-face="service" \
                                data-ng-animate="{show: \'left-show\', hide: \'left-hide\'}">\
                            <a data-ng-click="select()" class="btn btn-trans">\
                                <table>\
                                    <tr><td><img data-ng-src="/img/services/{{account.service}}.png" /></td></tr>\
                                    <tr><td><span class="lbl">{{account.auth.username|regex:"(.*)@"}}</span></td></tr>\
                                </table>\
                            </a>\
                            <div class="remove" data-ng-show="pane === \'service\'" \
                                    data-ng-click="remove()" data-ng-animate="\'fader\'">\
                                <i class="icon-remove-sign"></i>\
                            </div>\
                        </div>\
                    </div>\
                ',
                link : function ( scope, element, attrs, jobCtrl ) {
                    element.addClass( scope.label );

                    scope.$watch('account', function() {
                        scope.pane = scope.account && scope.account.service ? 'service' : 'plus';
                    }, true);

                    scope.cancel = function () {
                        scope.pane = 'service';
                    };

                    scope.remove = function () {
                        scope.pane = 'delete';
                    };

                    scope.del = function () {
                        scope.account = {};
                    };

                    scope.select = function () {
                        jobCtrl.broadcast( JOB_DRAWER_TOGGLE, scope.label );
                    };

/*
                    function changePane() {
                        var panes = ['service', 'delete', 'plus'];
                        scope.pane = panes[Math.floor(Math.random() * 3)];
                        $timeout( changePane, 2000 );
                    }
                    $timeout( changePane, 2000 );
*/
                }
            }
        }]
    );

    /**
     * ```html
     * <div class="mio-tab-btn-action" data-mio-data="job.status"></div>
     * ```
     */
    mod.directive( 'mioTabBtnAction', ['$log',
        function ( $log ) {
            return {
                require : '^mioJob',
                restrict : 'ACE',
                scope : {
                    job : '=mioData'
                },
                template : '\
                    <div>\
                        <a class="btn btn-trans" data-ng-click="select()" \
                            data-ng-class=" { disabled : !job.status.state } " >\
                            <table><tr>\
                                <td><span class="icon-stack">\
                                    <i class="icon-circle icon-stack-base"></i>\
                                    <i class="icon-right-triangle icon-light"></i>\
                                </span></td>\
                                <td><span class="text">Migrate</span></td>\
                             </tr></table>\
                        </a>\
                    </div>\
                ',
                link : function ( scope, element, attrs, jobCtrl ) {
                    // The text which is on the button will depend on the particular
                    // state of the job.
                    switch ( scope.job.status.state || 'pending' ) {
                        case 'pending':
                            scope.label = 'Migrate';
                            break;
                        case 'active':
                            scope.label = 'Cancel';
                            break;
                        case 'error':
                            scope.label = 'Migrate';
                            break;
                        case 'completed':
                            scope.label = 'Run Again';
                            break;
                        default:
                            scope.label = 'Migrate';
                    }

                    var icon = element.find( '.icon-stack' );
                    function expandIcon() {
                        icon.removeClass("icon-spin-0");
                        //noinspection SillyAssignmentJS
                        icon.get(0).offsetWidth = icon.get(0).offsetWidth;
                        icon.addClass("icon-spin-90");
                    }
                    function collapseIcon() {
                        icon.removeClass("icon-spin-90");
                        //noinspection SillyAssignmentJS
                        icon.get(0).offsetWidth = icon.get(0).offsetWidth;
                        icon.addClass("icon-spin-0");
                    }

                    scope.open = false;
                    scope.$watch('open', function(newValue, oldValue) {
                        if (newValue === oldValue) return;
                        if (newValue) expandIcon(); else collapseIcon();
                    } );

                    scope.select = function () {
                        expandIcon();
                        jobCtrl.broadcast( JOB_DRAWER_TOGGLE, 'action' );
                        scope.open = !scope.open;
                    };

                    scope.$on( JOB_SERVICES_CLOSEALL, function () {
                        if (scope.open) {
                            scope.open = false;
                        }
                    } );
                }
            }
        }]
    );

})( jQuery, angular );

