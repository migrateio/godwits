(function ( $, ng ) {

    var services = [
        {
            name : 'aol',
            auth : 'password',
            format : {
                username : {
                    placeholder : 'Screen Name',
                    msg : 'Enter your AOL Screen Name with or without "@aol.com"'
                }
            },
            protocol : {
                imap : {
                    host : 'imap.aol.com',
                    port : 993,
                    ssl : true
                },
                smtp : {
                    host : 'smtp.aol.com',
                    port : 587,
                    ssl : true
                }
            },
            content : ['mails', 'calendars', 'contacts']
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
        ng.forEach( services, function ( service ) {
            if ( service.name === name ) return service;
        } );
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

    mod.factory( 'mioServices', [ '$log', '$http', '$timeout', '$q',
        function ( $log, $http, $timeout, $q ) {
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
                    if (options && options.password === 'secret')
                        deferred.resolve();
                    else
                        deferred.reject();
                }, 4000 );
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
             * @param {String} otherService Name of the service selected already;
             * ie 'google', 'flickr'
             */
            function getServices( serviceTarget, otherService ) {
                var service = getServiceByName( otherService ) || {};
                var otherContent = service.content || [];

                var targetService = serviceTarget === 'source'
                    ? sourceServices : destServices;

                var result = [];
                ng.forEach( targetService, function ( service ) {
                    result.push( {
                        name : service.name,
                        content : service.content,
                        auth : service.auth,
                        valid : otherContent.length > 0
                            ? intersect( service.content, otherContent ).length > 0
                            : true
                    } );
                } );
                return result;
            }


            // Functions exposed by mioServices
            return {
                contentIntersection : contentIntersection,
                getServices : getServices,
                authenticate : authenticate
            }

        } ] );

})( jQuery, angular );

