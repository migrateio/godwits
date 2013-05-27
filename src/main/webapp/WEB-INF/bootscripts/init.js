/**
 * ## Bootscript - Initializer
 *
 * This bootscript will initialize the Hazelcast server instance used for this
 * web application.
 */
var log = require( 'ringo/logging' ).getLogger( 'bootstrap/init' );

log.info( 'Initializing the hazelcast instance for the application.' );
require( 'hazelstore' ).init();
