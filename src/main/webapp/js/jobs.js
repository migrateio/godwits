var jobs = angular.module( 'migrate.jobs', [] );

jobs.controller( 'jobs-controller', [ '$log', '$scope', '$jobs',
    function ( $log, $scope, $jobs ) {

        $jobs.loadInProgress()
            .success( function ( data ) {
                $log.info( 'Received data', data );
//                $scope.$apply(function() {
//                    $scope.jobs = data;
//                });
                $scope.jobs = JSON.stringify(data);
            } )
            .error( function ( data ) {
                $log.error( 'Whaaa!', data );
            } );

        $scope.$watch( 'jobs', function ( newValue, oldValue ) {
            $log.info( '$scope.jobs has been updated.', newValue, oldValue );
        } );
    }
] );

jobs.factory( '$jobs', [ '$log', '$http', function ( $log, $http ) {


    function loadInProgress() {
        $log.info( 'Loading any jobs in progress' );
        return $http.get( '/api/jobs/' );
    }


    return {
        loadInProgress : loadInProgress
    }

} ] );


