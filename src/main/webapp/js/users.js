var users = angular.module( 'migrate-users', [] );

users.factory( '$users', [ '$log', '$http', function ( $log, $http ) {


    function getByEmail( email ) {
        $log.info( 'Loading user by email address: ', email );
        return $http.get( '/api/users/signin/' + encodeURIComponent( email ) );
    }


    return {
        getByEmail : getByEmail
    }

} ] );


