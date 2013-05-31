var users = angular.module( 'migrate-users', [] );

users.factory( '$users', [ '$log', '$http', function ( $log, $http ) {


    function getByEmail( email ) {
        $log.info( 'Loading user by email address: ', email );
        return $http.get( '/api/users/signin/' + encodeURIComponent( email ) );
    }

    function createUserRecord( email, firstname ) {
        return $http.post( '/api/users/signup', {
            name: firstname,
            email: {
                address: email
            }
        } );
    }

    function resendEmailToken( email ) {
        return $http.post( '/api/users/resendToken/'+ email );
    }



    return {
        createUserRecord: createUserRecord,
        getByEmail : getByEmail,
        resendEmailToken: resendEmailToken
    }

} ] );


