(function (ng) {
    'use strict';

/*
    ng.module( 'partials/signin/signinform.html', [] ).run(
        ['$templateCache', '$log',
        function ( $templateCache ) {
            $templateCache.put( '/partials/signin/signin.html', ' \
                <div class="signin"> \
                    <ng-include src="/partials/signin/email.html" />\
                    <ng-include src="/partials/signin/signup.html" />\
                    <ng-include src="/partials/signin/verify.html" />\
                    <ng-include src="/partials/signin/secure.html" />\
                    <ng-include src="/partials/signin/expire.html" />\
                    <ng-include src="/partials/signin/password.html" />\
                    <ng-include src="/partials/signin/welcome.html" />\
                </div>\
                ' );
        }
    ]
    );
*/

    var mod = ng.module( 'migrate-signin', [] );

    mod.controller('signin-controller', ['$scope',
        function($scope) {
            $scope.user = {
                email: '',
                firstname: '',
                token: '',
                password: '',
                alert: ''
            };
            $scope.phase = 'email';
        }
    ]);



})(angular);