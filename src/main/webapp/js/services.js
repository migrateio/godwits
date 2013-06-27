(function ( $, ng ) {

    var services = [
        {
            name : 'aol',
            fullname : 'AOL',
            auth : 'password',
            format : {
                username : {
                    placeholder : 'Screen Name',
                    msg : 'Enter your AOL Screen Name with or without "@aol.com"'
                }
            },
            content : ['mails', 'calendars', 'contacts']
        },
        {
            name : 'flickr',
            fullname : 'Flickr',
            auth : 'oauth',
            content : ['media']
        },
        {
            name : 'picasa',
            fullname : 'Picasa',
            auth : 'oauth',
            content : ['media']
        },
        {
            name : 'comcast',
            fullname : 'Comcast',
            auth : 'password',
            content : ['mails']
        },
        {
            name : 'exchange',
            fullname : 'Microsoft Exchange',
            auth : 'exchange',
            content : ['mails']
        },
        {
            name : 'google',
            fullname : 'Google',
            auth : 'oauth',
            content : ['mails', 'calendars', 'contacts', 'documents', 'media']
        },
        {
            name : 'hotmail',
            fullname : 'Hotmail',
            auth : 'password',
            content : ['mails', 'calendars', 'contacts']
        },
        {
            name : 'imap',
            fullname : 'IMAP',
            auth : 'password',
            content : ['mails']
        },
        {
            name : 'outlook',
            fullname : 'MS Outlook',
            auth : 'oauth',
            content : ['mails', 'calendars', 'contacts']
        },
        {
            name : 'outlookpst',
            fullname : 'Outlook PST',
            auth : 'file',
            content : ['mails', 'calendars', 'contacts']
        },
        {
            name : 'skydrive',
            fullname : 'SkyDrive',
            auth : 'oauth',
            content : ['documents', 'media']
        },
        {
            name : 'twc',
            fullname : 'TWC/RoadRunner',
            auth : 'password',
            content : ['mails']
        },
        {
            name : 'yahoo',
            fullname : 'Yahoo!',
            auth : 'oauth',
            content : ['mails', 'contacts']
        }
    ];

    var sourceServices = [].concat( services );
    var destServices = [].concat( services );

    // Remove services from destination which are not valid as destinations
    for ( var i = destServices.length - 1; i >= 0; i-- ) {
        var service = destServices[i];
        if ( /outlookpst/ig.test( service.name ) )
            destServices.splice( i, 1 );
    }

    function getServiceByName( name ) {
        for ( var i = 0, c = services.length; i < c; i++ ) {
            if ( services[i].name === name ) return services[i];
        }
        return null;
    }

    function intersect( a, b ) {
        a = ng.copy( a );
        for ( var i = a.length - 1; i >= 0; i-- ) {
            var index = b.indexOf( a[i] );
            if ( index < 0 ) a.splice( i, 1 );
        }
        return a;
    }

    var mod = ng.module( 'migrate-services', [] );

    mod.factory( 'mioServices', [ '$log', '$http', '$timeout', '$q', '$window', 'authService',
        function ( $log, $http, $timeout, $q, $window, authService ) {
            /**
             * Attempts an authentication against the specified service. Returns a
             * promise indicating success or failure.
             *
             * Options will vary depending on the service.
             *
             * * password service w/ known host (ie aol, comcast)
             *     * username
             *     * password
             * * password service w/ unknown host (ie imap, exchange)
             *     * hostname
             *     * username
             *     * password
             * * oauth service
             *     * jobId
             *     * service type (source or destination)
             *
             * @param {String} service The name of the service
             * @param {Object} [options] Credentials or other information needed to auth
             */
            function authenticate( service, options ) {
                var deferred = $q.defer();
                $timeout( function () {
                    if ( options && options.password === 'secret' )
                        deferred.resolve();
                    else
                        deferred.reject();
                }, 2000 );
                return deferred.promise;
            }

            /**
             * Returns the content types in common between the source and destination
             * accounts.
             *
             * @param {String} sourceName The name of the source service type
             * @param {String} destinationName The name of the destination service type
             * @return {Array} The content types that both services have in common or an
             * empty array if none.
             */
            function contentIntersection( sourceName, destinationName ) {
                var source = getServiceByName( sourceName );
                var destination = getServiceByName( destinationName );
                if ( !source || !destination ) return [];
                return intersect( source.content, destination.content );
            }


            /**
             * Returns a list of service objects suitable for the 'source' or
             * 'destination' account as indicated by serviceTarget parameter. Each object
             * returned will also be flagged as suitable based on the content types
             * common between each service and the 'otherService' already selected (if
             * any).
             *
             * @param {String} serviceTarget Name of the service type 'source' or
             * 'destination'
             * @param {String} [otherService] Name of the service selected already;
             * ie 'google', 'flickr'
             */
            function getServices( serviceTarget, otherService ) {
                var targetService = serviceTarget === 'source'
                    ? sourceServices : destServices;

                // Build the array to return
                var result = [].concat( targetService );
                ng.forEach( result, function ( item ) {
                    item.valid = true;
                } );

                // If there is no reciprocal account yet, all services are valid
                if ( !otherService ) return result;

                // Otherwise, we will get the content types that are in play by the
                // selection of the other account and set the valid flag accordingly
                var service = getServiceByName( otherService ) || {};
                var otherContent = service.content || [];

                ng.forEach( result, function ( service ) {
                    result.valid = otherContent.length > 0
                        ? intersect( service.content, otherContent ).length > 0
                        : true
                } );
                return result;
            }

            function oauthLink( service ) {
                var deferred = $q.defer();
                var url = ['.', 'api', 'oauth', service].join( '/' );

                $.ajax({
                    url:      url,
                    async:    false,
                    dataType: "json",
                    success:  function(data) {
                        $window.open( data.url, '_blank', 'height=650,width=480' );
                    },
                    error: function() {
                        deferred.reject( {
                            status : 500,
                            message : 'Failed to obtain URL for service oauth.'
                        } );
                    }
                });

//                todo: Track window popup close and send reject()
                window.callback = function ( data ) {
                    // todo: Define a result for error condition
//                    if ( data.status !== 200 ) deferred.reject( {
//                        status : data.status,
//                        message : ''
//                    } );
                    $log.info( 'callback firing with params ' + data );
                    deferred.resolve( data );
                };

                return deferred.promise;
            }

            function preauthJob( job ) {
                var user = authService.user();
                $log.info( 'Authenticated user: ', user );

                // If the user has not yet authenticated, the call to the server to
                // preauth the job is not necessary. We will return a "faked" 401
                // response so the UI can kick off a custom authentication routine.
                if (!user) {
                    var deferred = $q.defer();
                    deferred.reject({ status: 401 });
                    return deferred.promise;
                }

                return $http.post( '/api/users/' + user.userId + '/jobs/preauth', job );
            }

            function submitJob( job, token ) {
                var deferred = $q.defer();

                var user = authService.user();
                if (!user) {
                    deferred.reject({ status: 401 });
                }

                var payload = {
                    job: job,
                    payment: {
                        service: stripe,
                        token: token
                    }
                };


                $http.post( '/api/users/' + user.userId + '/jobs/submit', payload ).then(
                    function success( response ) {
                        $log.info( 'Job submission response:', response );
                        deferred.resolve( response.data );
                    },
                    function error( response ) {
                        deferred.reject( response );
                    }
                );

                return deferred.promise;
            }


            // Functions exposed by mioServices
            return {
                authenticate : authenticate,
                contentIntersection : contentIntersection,
                getServices : getServices,
                oauthLink : oauthLink,
                preauthJob : preauthJob,
                submitJob : submitJob
            }

        } ] );

})( jQuery, angular );

