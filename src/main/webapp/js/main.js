require.config( {
    paths : {
        'jquery' : '/lib/jquery/jquery-2.0.0.min.js',
        'angular' : '/lib/angular-1.1.4/angular.min.js',
        'ui-bootstrap' : '/lib/angular-ui/bootstrap/ui-bootstrap-0.3.0.min.js'
    },
    'baseUrl' : '/js',
    'shim' : {
        'angular' : {
            'exports' : 'angular'
        }
    },
    'priority' : [
        'angular'
    ]
} );


require([
    'jquery', 'angular', 'app'
], function($, ng, app) {
    'use strict';
    $(function() {
        var $html = $( 'html' );
        ng.bootstrap( $html, [app( 'name' )] );

        // More info: https://groups.google.com/forum/#!msg/angular/yslVnZh9Yjk/MLi3VGXZLeMJ
        $html.addClass( 'ng-app' );
    });
});

<!-- HTML5 shim, for IE6-8 support of HTML5 elements -->
<!--[if lt IE 9]>
<script src="lib/html5shiv/js/html5shiv.js"></script>
    <![endif]-->
    <!--[if lte IE 8]>
<script src="/lib/angular-ui/ui-utils/angular-ui-utils-ieshiv.min.js"></script>
    <![endif]-->
    <script src="lib/security/auth.js"></script>
    <script src="lib/security/spring.js"></script>
    <script src="js/app.js"></script>
    <script>
    (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
        (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
        m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
    })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-41014735-1', 'migrate.io');
ga('send', 'pageview');

</script>
