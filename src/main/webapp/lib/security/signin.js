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
     */
    mod.controller( 'signin-controller', ['$log', '$scope', '$users', '$routeParams', '$location',
        function ( $log, $scope, $users, $routeParams, $location ) {
            $scope.model = {
                email : 'jim@poolpicks.com',
                firstname : '',
                tokenId: '',
                userId: ''
            };

            $scope.state = {
                step : $routeParams.step || 'email'
            };

            $scope.$watch( 'state.step', function ( value ) {
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
     * The first step of the authentication process begins with the entry of the user's
     * email address. Once that is accomplished, we will need to take a look at the
     * user's record to determine the next steps.
     *
     * 1. If the user record is found:
     *   1. If the email is not verified, proceed to step 'verify'.
     *   2. If a password has not been selected, proceed to step 'verify'. You may have
     *      thought we would proceed to 'secure' step? Actually, this would create a
     *      security problem since a user may have verified his token and not selected a
     *      password. Then another user can come in with the email address of the prior
     *      user and skip the verify token step to proceed directly to password
     *      selection. We will have to ask the user to re-verify his token.
     *   3. If the user record has been completed, proceed to step 'password'.
     * 2. If the user record is _not_ found:
     *   1. Proceed to step 'signup'
     */
    mod.controller( 'signin-email-controller', ['$log', '$scope', '$users',
        function ( $log, $scope, $users ) {

            $scope.honey = '';

            $scope.submit = function () {
                // If a bot filled out the honeypot field, bail now.
                if ($scope.honey) return;

                $users.getByEmail( $scope.model.email )
                    .error( function ( response, status ) {
                        if ( status === 404 ) {
                            // 404 is actually OK, this is a new user
                            $scope.state.step = 'signup';
                        } else {
                            $scope.state.step = 'error';
                        }
                    } )
                    .success( function ( response, status ) {
                        $log.info( 'User signin status:', response );
                        // If the user's signin status is complete, then direct them to
                        // enter their password, otherwise we need them to verify their
                        // token.
                        $scope.model.userId = response.userId;
                        $scope.state.step = response.complete
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
     *    They will press the back indicator to go to the "email" step.
     * 2. The user provides the first name and proceeds. We will:
     *   1. Create a user record and a token associated with the record.
     *   2. Email a verification email to the user with the token.
     *   3. Advance to a token page where the user can manually enter the token.
     */
    mod.controller( 'signin-signup-controller', ['$log', '$scope', '$users',
        function ( $log, $scope, $users ) {

            $scope.honey = '';

            $scope.back = function () {
                $scope.state.step = 'email';
            };

            $scope.submit = function () {
                if (!$scope.model.firstname) return;

                if ($scope.honey) {
                    $scope.state.step = 'email';
                    return;
                }

                $users.createUserRecord( $scope.model.email, $scope.model.firstname )
                    .error( function ( response, status ) {
                        $scope.state.step = 'error';
                    } )
                    .success( function ( response, status ) {
                        $log.info( 'Signup response', response );
                        $scope.model.userId = response.userId;
                        $scope.state.step = 'verify';
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
     *   2. Token is good and user is advanced to the 'secure' step to select a password.
     *   3. Token is not valid. Error message appears and user may choose to resend token.
     */
    mod.controller( 'signin-verify-controller', ['$log', '$scope', '$users', '$compile', '$routeParams',
        function ( $log, $scope, $users, $compile, $routeParams ) {

            $scope.honey = '';
            $scope.msgindex = 0;

            var messages = [
                '<span>Enter the token we sent to your email. <a data-ng-click="nextmsg()"> Can\'t find it?</a></span>',
                '<span>Have you checked your junk or spam folder? <a data-ng-click="nextmsg()"> Still can\'t find it?</a></span>',
                '<span>OK, we\'ll try again. Click here to <a data-ng-click="nextmsg()">resend email.</a></span>',
                '<span>We have sent the email again. Give it a few minutes to arrive.</span>',
                '<span class="error">Token is incorrect or expired. If necessary, <a data-ng-click="nextmsg()">resend email.</a></span>'
            ].map( function ( message ) {
                    return $compile( message )( $scope );
                }
            );

            // Change the visible message when the index changes
            $scope.$watch('msgindex', function() {
                $scope.callout = messages[$scope.msgindex];
            });

            // Advance the next message. A couple of these advances mean the user wishes
            // to resend the email token.
            $scope.nextmsg = function () {
                if ( $scope.msgindex == 2 || $scope.msgindex == 4 ) {
                    $users.resendEmailToken( $scope.model.userId );
                }
                $scope.msgindex = $scope.msgindex === 4 ? 0 : $scope.msgindex + 1;
            };

            $scope.submit = function () {
                if ($scope.honey) {
                    $scope.state.step = 'email';
                    return;
                }
                if (!$scope.model.userId) return;
                if (!$scope.model.tokenId) return;

                $users.verifyToken( $scope.model.userId, $scope.model.tokenId )
                    .error( function ( response, status ) {
                        // If no token (or userid) was found, let the user know of the
                        // problem
                        if (status === 404) $scope.msgindex = 4;
                        else $scope.state.step = 'error';
                    } )
                    .success( function ( response, status ) {
                        $scope.state.step = 'secure';
                    } );
            };

            $log.info( 'Checking out route parameters:', $routeParams );
            // This will take care of the case where the user verifies the token from
            // the direct link in the email that was sent to them.
            if ($routeParams.userId && $routeParams.tokenId) {
                $scope.model.userId = $routeParams.userId;
                $scope.model.tokenId = $routeParams.tokenId;
                $scope.submit();
            }

            // In order to access this controller, we will have to know the userId. This
            // check takes care of direct jumps to this controller without needed
            // information.
            if (!$scope.model.userId) {
                $scope.state.step = 'email';
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
     * 1. The password and token are good and the user is advanced to the welcome step.
     * 2. The token is no good, and a message prompts the user.
     */
    mod.controller( 'signin-secure-controller', ['$log', '$scope', '$users', '$compile', '$springService',
        function ( $log, $scope, $users, $compile, $springService ) {

            // In order to access this controller, we must know the user and their
            // verification token.
            if (!$scope.model.tokenId) {
                $scope.state.step = 'verify';
                return;
            }
            if (!$scope.model.userId) {
                $scope.state.step = 'email';
                return;
            }
            $scope.password = '';

            $scope.msgindex = 0;
            var messages = [
                '<span>Select a password to use on the site.</span>',
                '<span>There was a problem with your verify token. <a data-ng-click="nextmsg()">Try again</a></span>',
            ].map( function ( message ) {
                    return $compile( message )( $scope );
                }
            );

            // Change the visible message when the index changes
            $scope.$watch('msgindex', function() {
                $scope.callout = messages[$scope.msgindex];
            });

            // Advance the next message. A couple of these advances mean the user wishes
            // to resend the email token.
            $scope.nextmsg = function () {
                $scope.state.step = 'verify';
            };

            $scope.showPass = true;
            $scope.togglePass = function() {
                $scope.showPass = !$scope.showPass;
                $scope.showhide = $scope.showPass ? 'icon-lock' : 'icon-unlock';
            };
            $scope.togglePass();

            // The user has entered a new password they would like to use
            $scope.submit = function () {
                if ($scope.honey) {
                    $scope.state.step = 'email';
                    return;
                }
                if (!$scope.password) return;
                if (!$scope.model.tokenId) return;

                // Update the user's password on the server
                $users.choosePassword( $scope.model.userId, $scope.model.tokenId, $scope.password )
                    .error( function ( response, status ) {
                        // If an error occurs (perhaps token is expired?)
                        $scope.password = '';
                        $scope.msgindex = 1;
                    } )
                    .success( function ( response, status ) {
                        // After a successful update of the password, we will attempt to
                        // authenticate the user instead of asking them to sign in.
                        var authSuccess = function ( response, status ) {
                            if (response.status !== 'AUTH_SUCCESS')
                                $scope.state.step = 'error';
                            // The auth event is listened for and the path will be updated
                        };

                        var authError = function ( response, status ) {
                            // If the authentication did not succeed, wtf? We
                            $scope.password = '';
                            $scope.state.step = 'email';
                        };

                        // Since it is possible for the scope model to not contain the
                        // user's email address (in cases when the verification link in
                        // the email is used), it's a good thing the choosePassword
                        // response has returned it.
                        $springService.authenticate(
                            response.email, $scope.password, false
                        ).then(authSuccess, authError);
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

            if (!$scope.model.email) {
                $scope.state.step = 'email';
                return;
            }
            $scope.password = '';
            
            $scope.msgindex = 0;
            var messages = [
                '<span>Enter your password or you can <a data-ng-click="nextmsg()">reset it</a> now.</span>',
                '<span class="error">Incorrect password. If forgotten <a data-ng-click="nextmsg()">reset it</a> now.</span>',
            ].map( function ( message ) {
                    return $compile( message )( $scope );
                }
            );

            // Change the visible message when the index changes
            $scope.$watch('msgindex', function() {
                $scope.callout = messages[$scope.msgindex];
            });

            // Advance the next message. A couple of these advances mean the user wishes
            // to resend the email token.
            $scope.nextmsg = function () {
                $scope.state.step = 'reset';
            };

            // When the user modifies the password, remove the "incorrect password" msg
            $scope.$watch('password', function(newValue) {
                if (newValue != '') $scope.msgindex = 0;
            });

            $scope.showPass = true;
            $scope.togglePass = function() {
                $scope.showPass = !$scope.showPass;
                $scope.showhide = $scope.showPass ? 'icon-lock' : 'icon-unlock';
            };
            $scope.togglePass();

            $scope.submit = function () {
                if ($scope.honey) {
                    $scope.state.step = 'email';
                    return;
                }
                if (!$scope.password) return;

                var success = function ( response, status ) {
                    $log.info( 'Success handler: ', response, status );
                    $scope.password = '';
                };

                var error = function ( response, status ) {
                    $log.info( 'Error handler: ', response, status );
                    $scope.password = '';
                    if (response === 'AUTH_BAD_CREDENTIALS') {
                        $scope.msgindex = 1;
                    }
                    else $scope.state.step = 'error';
                };

                $springService.authenticate(
                    $scope.model.email, $scope.password, $scope.remember
                ).then( success, error );
            }
        }
    ] );


    /**
     * ## Controller - signin-reset-controller
     *
     * Generate and send the user a link which they can use to start the email
     * verification process. This email link will be accepted by the verify link which
     * will proceed as if the user entered the verification code on her own.
     *
     */
    mod.controller( 'signin-reset-controller', ['$log', '$scope', '$users', '$compile',
        function ( $log, $scope, $users, $compile ) {

            $scope.email = $scope.model.email;

            $scope.msgindex = 0;
            var messages = [
                '<span>Enter your email and we will send you a link to reset your password.</span>',
                '<span class="error">Sorry, we don\'t recognize that email address.</span>',
            ].map( function ( message ) {
                    return $compile( message )( $scope );
                }
            );

            // Change the visible message when the index changes
            $scope.$watch('msgindex', function() {
                $scope.callout = messages[$scope.msgindex];
                $log.info( 'Callout: ', $scope.callout );
            });

            // When the user modifies the password, remove the "incorrect password" msg
            $scope.$watch('email', function(newValue) {
                if (newValue != '') $scope.msgindex = 0;
            });

            $scope.submit = function () {
                if ($scope.honey) {
                    $scope.state.step = 'email';
                    return;
                }
                if (!$scope.email) return;

                var success = function ( response, status ) {
                    $scope.state.step = 'resetmsg';
                };

                var error = function ( response, status ) {
                    $scope.msgindex = 1;
                };

                $users.generatePasswordReset( $scope.email )
                    .then( success, error );
            }
        }
    ] );



})( angular );