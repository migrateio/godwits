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
 * Create the admin user account.
 */
users.create( {
    userId : 'admin',
    name : 'Admin',
    password : 'secret',
    email : {
        status : 'verified',
        address : 'admin@migrate.io'
    },
    roles : ['ROLE_ADMIN', 'ROLE_USER']
} );


// Delete before production
users.create( {
    userId : 'fred',
    name : 'Fred',
    password : 'secret',
    email : {
        status : 'verified',
        address : 'fred@poolpicks.com'
    },
    roles : ['ROLE_USER']
} );

