/**
 * ## Bootscript - Seed Data
 *
 * Any seed data required for our application to execute is bootstrapped during this
 * script's execution.
 */
var domain = require( 'domain' );
var users = new domain.Users();

/**
 * Create the admin user account. Passwords are SHA-256.
 * Password: 'secret'
 */
users.create( {
    id : 'admin',
    name: 'Admin',
    password: '2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b',
    email : {
        status: 'verified',
        address : 'admin@migrate.io'
    },
    roles: ['ROLE_ADMIN', 'ROLE_USER']
} );

