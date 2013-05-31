/**
 * # Module migrate-signin
 *
 * Dependencies:
 *
 * * migrate-users
 *
 * This module uses several child controllers to manage the sign in/up process.
 */
(function ( ng ) {
    'use strict';

    var mod = ng.module( 'migrate-signin', ['migrate-users'] );

    /**
     * ## Controller - signin-controller
     *
     * The parent controller maintains the global state elements for the sign in/up
     * process.
     *
     * The spam token is generated and used on successive form submissions where a
     * server-side action will result. This won't keep a determined attack, but will
     * require a GET request before POSTing.
     */
    mod.controller( 'signin-controller', ['$log', '$scope', '$users', '$routeParams', '$location',
        function ( $log, $scope, $users, $routeParams, $location ) {
            $scope.signup = {
                email : 'jim@poolpicks.com',
                firstname : '',
                honey : '',
                token: '',
                userId: ''
            };

            var vinegar = $scope.signup.vinegar =
                Math.floor( Math.random() * 10000 ).toString();

            $scope.isSexNoDinner = function () {
                return $scope.signup.vinegar !== vinegar
            };
            $scope.isTheHoneyGone = function () {
                return $scope.signup.honey !== '';
            };

            $scope.state = {
                phase : $routeParams.phase || 'email'
            };
            $scope.$watch( 'state.phase', function ( value ) {
//                var newPath = '/signin/' + value;
//                $log.info( 'Location path', $location.path(), 'New path: ', newPath );
//                if ($location.path() !== newPath)
//                    $location.path( newPath );
            } );
        }
    ] );


    /**
     * ## Controller - signin-email-controller
     *
     * The first phase of the authentication process begins with the entry of the user's
     * email address. Once that is accomplished, we will need to take a look at the
     * user's record to determine the next steps.
     *
     * 1. If the user record is found:
     *   1. If the email is not verified, proceed to phase 'verify'.
     *   2. If a password has not been selected, proceed to phase 'verify'. You may have
     *      thought we would proceed to 'secure' phase? Actually, this would create a
     *      security problem since a user may have verified his token and not selected a
     *      password. Then another user can come in with the email address of the prior
     *      user and skip the verify token step to proceed directly to password
     *      selection. We will have to ask the user to re-verify his token.
     *   3. If the user record has been completed, proceed to phase 'password'.
     * 2. If the user record is _not_ found:
     *   1. Proceed to phase 'signup'
     */
    mod.controller( 'signin-email-controller', ['$log', '$scope', '$users',
        function ( $log, $scope, $users ) {

            $scope.submit = function () {
                $log.info( 'Checking user email:', $scope.signup.email );
                $users.getByEmail( $scope.signup.email )
                    .error( function ( response, status ) {
                        if ( status === 404 ) {
                            // 404 is actually OK, this is a new user
                            $scope.state.phase = 'signup';
                        } else {
                            $scope.state.phase = 'error';
                        }
                    } )
                    .success( function ( response, status ) {
                        $log.info( 'User signin status:', response );
                        // If the user's signin status is complete, then direct them to
                        // enter their password, otherwise we need them to verify their
                        // token.
                        $scope.signup.userId = response.id;
                        $scope.state.phase = response.complete
                            ? 'password' : 'verify';
                    } );
            }

        }
    ] );

    /**
     * ## Controller - signin-signup-controller
     *
     * The user has provided an email address which is not recognized in our system. We
     * will ask the user for their first name.
     *
     * There are two actions:
     *
     * 1. The user misentered the email address or wants to enter a different address.
     *    They will press the back indicator to go to the "email" phase.
     * 2. The user provides the first name and proceeds. We will:
     *   1. Create a user record and a token associated with the record.
     *   2. Email a welcome email to the user with the token.
     *   3. Advance to a token page where the user can manually enter the token.
     */
    mod.controller( 'signin-signup-controller', ['$log', '$scope', '$users',
        function ( $log, $scope, $users ) {

            $scope.back = function () {
                $scope.state.phase = 'email';
            };

            $scope.submit = function () {
                // Check for malicious bots
                if ( $scope.isSexNoDinner() || $scope.isTheHoneyGone() ) {
                    $scope.state.phase = 'email';
                    return;
                }

                $users.createUserRecord( $scope.signup.email, $scope.signup.firstname )
                    .error( function ( response, status ) {
                        $scope.state.phase = 'error';
                    } )
                    .success( function ( response, status ) {
                        $scope.state.phase = 'verify';
                    } );
            }

        }
    ] );


    /**
     * ## Controller - signin-verify-controller
     *
     * The user has provided an email address which we have found
     *
     * There are two actions:
     *
     * 1. The user misentered the email address or wants to enter a different address.
     *    They will press the back indicator to go to the "email" phase.
     * 2. The user provides the first name and proceeds. We will:
     *   1. Create a user record and a token associated with the record.
     *   2. Email a welcome email to the user with the token.
     *   3. Advance to a token page where the user can manually enter the token.
     */
    mod.controller( 'signin-verify-controller', ['$log', '$scope', '$users', '$compile',
        function ( $log, $scope, $users, $compile ) {

            var messages = [
                '<span>Enter the token we sent to your email. <a data-ng-click="nextmsg()"> Can\'t find it?</a></span>',
                '<span>It may be in your junk or spam folder. <a data-ng-click="nextmsg()"> Still can\'t find it?</a></span>',
                '<span>OK, we\'ll try again. Click here to <a data-ng-click="nextmsg()">resend email.</a></span>',
                '<span>We have sent the email again. Give it a few minutes to arrive.</a></span>'
            ].map( function ( message ) {
                    return $compile( message )( $scope );
                }
            );

            var msgIndex = 0;
            $scope.callout = messages[msgIndex];

            $scope.nextmsg = function () {
                msgIndex++;
                if ( msgIndex === 4 ) {
                    $users.resendEmailToken( $scope.signup.email );
                }
                if (msgIndex > 4) msgIndex = 0;
                $scope.callout = messages[msgIndex];
            };

            // The user has entered a valid token. Check it out.
            $scope.submit = function () {
                $users.verifyToken( $scope.signup.userId, $scope.signup.token )
                    .error( function ( response, status ) {

                    } )
                    .success( function ( response, status ) {
                        $scope.state.phase = 'secure';
                    } );
            }
        }
    ] );


})( angular );