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

    var mod = ng.module( 'migrate-signin', ['migrate-users', 'spring-security'] );

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
                userId: '',
                remember: false
            };

            var vinegar = $scope.signup.vinegar =
                Math.floor( Math.random() * 10000 ).toString();

            $scope.isSexNoDinner = function () {
                return $scope.signup.vinegar !== vinegar
            };
            $scope.isTheHoneyGone = function () {
                return $scope.signup.honey !== '';
            };

            $log.info( 'Top-level controller:', $routeParams );
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
     *   2. Email a verification email to the user with the token.
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
                        $log.info( 'Signup response', response );
                        $scope.signup.userId = response.id;
                        $scope.state.phase = 'verify';
                    } );
            }

        }
    ] );


    /**
     * ## Controller - signin-verify-controller
     *
     * The user has been sent the verification email and now must enter the token from
     * that email. There isn't a "back" step here. The user may press the signin button
     * again to enter a different email address, but it is unlikely that they got here
     * by accidentally entering an incorrect email.
     *
     * This form also provides the user with the ability to re-send the verification
     * email.
     *
     * Outcomes
     * 1. The user will enter a token.
     *   1. Token is expired - same as user entering incorrect token (#3).
     *   2. Token is good and user is advanced to the 'secure' phase to select a password.
     *   3. Token is not valid. Error message appears and user may choose to resend token.
     */
    mod.controller( 'signin-verify-controller', ['$log', '$scope', '$users', '$compile', '$routeParams',
        function ( $log, $scope, $users, $compile, $routeParams ) {

            var messages = [
                '<span>Enter the token we sent to your email. <a data-ng-click="nextmsg()"> Can\'t find it?</a></span>',
                '<span>It may be in your junk or spam folder. <a data-ng-click="nextmsg()"> Still can\'t find it?</a></span>',
                '<span>OK, we\'ll try again. Click here to <a data-ng-click="nextmsg()">resend email.</a></span>',
                '<span>We have sent the email again. Give it a few minutes to arrive.</a></span>',
                '<span class="error">Token is incorrect or expired. If necessary, <a data-ng-click="nextmsg()">resend email.</a></span>'
            ].map( function ( message ) {
                    return $compile( message )( $scope );
                }
            );

            var msgIndex = 0;
            $scope.callout = messages[msgIndex];

            $scope.nextmsg = function () {
                msgIndex++;
                if ( msgIndex >= 3 ) {
                    $users.resendEmailToken( $scope.signup.email );
                }
                if (msgIndex > 4) msgIndex = 0;
                $scope.callout = messages[msgIndex];
            };

            // The user has entered a valid token. Check it out.
            $scope.submit = function () {
                $users.verifyToken( $scope.signup.userId, $scope.signup.token )
                    .error( function ( response, status ) {
                        $log.info( 'Verify token response: ', response, status );
                        if (status === 404) {
                            msgIndex = 4;
                            $scope.callout = messages[msgIndex];
                        }
                        else $scope.state.phase = 'error';
                    } )
                    .success( function ( response, status ) {
                        $scope.state.phase = 'secure';
                    } );
            };

            // This will take care of the case where the user verifies the token from
            // the direct link in the email that was sent to them.
            if ($routeParams.userId && $routeParams.token) {
                $scope.signup.userId = $routeParams.userId;
                $scope.signup.token = $routeParams.token;
                $scope.submit();
            }
        }
    ] );


    /**
     * ## Controller - signin-secure-controller
     *
     * The user has been verified and now all they must do is select a password for their
     * account. In addition to the user's password is a hidden field containing the
     * user's email verification token for security purposes. Also included is a honeypot
     * check to thwart bots and scripts.
     *
     * Outcomes
     * 1. The password and token are good and the user is advanced to the welcome phase.
     * 2. The token is no good, and a message prompts the user.
     */
    mod.controller( 'signin-secure-controller', ['$log', '$scope', '$users', '$compile', '$springService',
        function ( $log, $scope, $users, $compile, $springService ) {

            var messages = [
                '<span>Select a password to use on the site.</span>',
                '<span>There was a problem with your verify token. <a data-ng-click="nextmsg()">Try again</a></span>',
            ].map( function ( message ) {
                    return $compile( message )( $scope );
                }
            );

            var msgIndex = 0;
            $scope.callout = messages[msgIndex];

            $scope.nextmsg = function () {
                msgIndex++;
                if ( msgIndex > 1 ) {
                    $scope.signup.password = '';
                    $scope.state.phase = 'signup';
                }
                $scope.callout = messages[msgIndex];
            };

            $scope.showPass = true;
            $scope.togglePass = function() {
                $scope.showPass = !$scope.showPass;
                $scope.showhide = $scope.showPass ? 'icon-lock' : 'icon-unlock';
            };
            $scope.togglePass();

            // The user has entered a valid token. Check it out.
            $scope.submit = function () {
                // Check for malicious bots
                if ( $scope.isTheHoneyGone() ) {
                    $scope.signup.password = '';
                    $scope.state.phase = 'email';
                    return;
                }

                $users.choosePassword( $scope.signup.userId, $scope.signup.token, $scope.signup.password )
                    .error( function ( response, status ) {
                        $scope.signup.password = '';
                        $scope.state.phase = 'email';
                    } )
                    .success( function ( response, status ) {
                        var success = function ( response, status ) {
                            $scope.signup.password = '';
                            if (response.status !== 'AUTH_SUCCESS')
                                $scope.state.phase = 'error';
                            // The auth event is listened for and the path will be updated
                        };

                        var error = function ( response, status ) {
                            $scope.signup.password = '';
                            $scope.state.phase = 'email';
                        };

                        $springService.authenticate( $scope.signup.email, $scope.signup.password, false )
                            .then(success, error);
                    } );
            }
        }
    ] );


    /**
     * ## Controller - signin-password-controller
     *
     * The user has been through the verification process and has a password. Just let
     * them sign in now.
     *
     * Outcomes
     * 1. The password is valid, proceed to original destination or home.
     * 2. The password is invalid, let them know.
     */
    mod.controller( 'signin-password-controller', ['$log', '$scope', '$users', '$compile', '$springService',
        function ( $log, $scope, $users, $compile, $springService ) {

            var messages = [
                '<span></span>',
                '<span class="error">Incorrect password. Forget? <a data-ng-click="nextmsg()">Recover it now.</a></span>',
            ].map( function ( message ) {
                    return $compile( message )( $scope );
                }
            );

            var msgIndex = 0;
            $scope.callout = messages[msgIndex];

            $scope.nextmsg = function () {
                msgIndex++;
                if ( msgIndex > 1 ) {
                    $scope.signup.password = '';
                }
                $scope.callout = messages[msgIndex];
            };

            // When the user modifies the password, remove the "incorrect password" msg
            $scope.$watch('signup.password', function(newValue, oldValue) {
                if (newValue != '') {
                    var msgIndex = 0;
                    $scope.callout = messages[msgIndex];
                }
            });

            $scope.showPass = true;
            $scope.togglePass = function() {
                $scope.showPass = !$scope.showPass;
                $scope.showhide = $scope.showPass ? 'icon-lock' : 'icon-unlock';
            };
            $scope.togglePass();

            // The user has entered a valid token. Check it out.
            $scope.submit = function () {
                // Check for malicious bots
                if ( $scope.isTheHoneyGone() ) {
                    $scope.signup.password = '';
                    $scope.state.phase = 'email';
                    return;
                }

                var success = function ( response, status ) {
                    $log.info( 'Success handler: ', response, status );
                    $scope.signup.password = '';
                };

                var error = function ( response, status ) {
                    $log.info( 'Error handler: ', response, status );
                    $scope.signup.password = '';
                    if (response === 'AUTH_BAD_CREDENTIALS') {
                        var msgIndex = 1;
                        $scope.callout = messages[msgIndex];
                    }
                    else $scope.state.phase = 'error';
                };

                $springService.authenticate( $scope.signup.email, $scope.signup.password, $scope.signup.remember )
                    .then( success, error );
            }
        }
    ] );

    /**
     * ## Controller - signin-verification-controller
     *
     * The user is using an external link to verify their password.
     *
     * Outcomes
     * 1. The password is valid, proceed to original destination or home.
     * 2. The password is invalid, let them know.
     */
    mod.controller( 'signin-verification-controller', ['$log', '$scope', '$users', '$compile', '$springService',
        function ( $log, $scope, $users, $compile, $springService ) {

            $log.info( 'In the verification controller' );

            var success = function ( response, status ) {
                $log.info( 'Success handler: ', response, status );
                $scope.signup.password = '';
            };

            var error = function ( response, status ) {
                $log.info( 'Error handler: ', response, status );
                $scope.signup.password = '';
                if (response === 'AUTH_BAD_CREDENTIALS') {
                    var msgIndex = 1;
                    $scope.callout = messages[msgIndex];
                }
                else $scope.state.phase = 'error';
            };

//            $springService.authenticate( $scope.signup.email, $scope.signup.password, $scope.signup.remember )
//                .then( success, error );
            }
    ] );


})( angular );