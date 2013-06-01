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

    function verifyToken( userId, token ) {
        return $http.post( '/api/users/' + userId + '/verify/'+ token );
    }

    function choosePassword( userId, token, password ) {
        return $http.post( '/api/users/' + userId + '/password', {
            token: token,
            password: password
        });
    }


    return {
        choosePassword: choosePassword,
        createUserRecord: createUserRecord,
        getByEmail : getByEmail,
        resendEmailToken: resendEmailToken,
        verifyToken: verifyToken
    }
} ] );


