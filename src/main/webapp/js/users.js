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

    function resendEmailToken( userId ) {
        return $http.post( '/api/users/' + userId + '/resendtoken' );
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

    function generateRecoveryToken( email ) {
        return $http.post( '/api/users/passwordreset', {
            email: email
        });
    }


    return {
        choosePassword: choosePassword,
        createUserRecord: createUserRecord,
        generateRecoveryToken: generateRecoveryToken,
        getByEmail : getByEmail,
        resendEmailToken: resendEmailToken,
        verifyToken: verifyToken
    }
} ] );


