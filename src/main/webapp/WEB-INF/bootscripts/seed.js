/**
 * ## Bootscript - Seed Data
 *
 * Any seed data required for our application to execute is bootstrapped during this
 * script's execution.
 */
var domain = require( 'domain' );
var {props} = require( 'utility' );

var users = new domain.Users( props['environment'] );

/**
 * Create the admin user account. Passwords are BCrypt.
 * Password: 'secret'
 */
users.create( {
    id : 'admin',
    name : 'Admin',
    password : '$2a$10$Grfvl//Ag7f3eTR2lPJUgut0ABB76WsafqhjJIj4Aa.H3aDZ0oxRu',
    email : {
        status : 'verified',
        address : 'admin@migrate.io'
    },
    roles : ['ROLE_ADMIN', 'ROLE_USER']
} );


// Delete before production
users.create( {
    id : 'fred',
    name : 'Fred',
    password : '$2a$10$Grfvl//Ag7f3eTR2lPJUgut0ABB76WsafqhjJIj4Aa.H3aDZ0oxRu',
    email : {
        status : 'verified',
        address : 'fred@poolpicks.com'
    },
    roles : ['ROLE_USER']
} );

