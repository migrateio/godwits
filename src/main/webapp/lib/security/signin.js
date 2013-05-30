(function ( ng ) {
    'use strict';

    var mod = ng.module( 'migrate-signin', ['migrate-users'] );

    mod.controller( 'signin-controller', ['$scope', '$users',
        function ( $scope, $users ) {
            $scope.signup = {
                email : 'jim@poolpicks.com',
                firstname : '',
                token : '',
                password : '',
                alert : ''
            };
            $scope.phase = 'email';
            $scope.state = {
                phase: 'email',
                stats: null
            };
        }
    ] );


    mod.controller( 'signin-email-controller', ['$log', '$scope', '$users',
        function ( $log, $scope, $users ) {

            // todo: test if submit() calls the proper subController
            $scope.submitEmail = function () {
                $log.info( 'Checking user email:', $scope.signup.email );
                $users.getByEmail( $scope.signup.email )
                    .error( function ( response, status ) {
                        if (status === 404) {
                            // 404 is actually OK, this is a new user
                            $scope.state.phase = 'signup';
                        } else {
                            $scope.state.phase = 'error';
                        }
                    } )
                    .success( function ( response, status ) {
                        // An error may enter through this path
                        $log.info( 'Successful fetch of user', response );
                        $scope.state.stats = response.data;
                        $scope.state.phase = 'password';
                    } );
            }

        }
    ] );


})( angular );