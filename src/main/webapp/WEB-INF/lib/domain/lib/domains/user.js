var log = require( 'ringo/logging' ).getLogger( module.id );

var {format} = java.lang.String;

/**
 * # User _(Domain Object)_
 *
 * ## Constructor
 *
 * ### Parameters
 *
 * **json** The json representation of a job.
 */
exports.User = function ( user ) {
    if (user && user.isDomain) return user;

    function getCustomerId( service ) {
        return  user && user.services && user.services[service]
            && user.services[service].customerId;
    }

    function isVerified() {
        return user && user.email && user.email.address
            && user.email.status === 'verified';
    }

    function exposeProps() {
        Object.keys( user || {} ).forEach( function ( prop ) {
            obj[prop] = user[prop];
        } );
    }

    var obj = {
        getCustomerId: getCustomerId,
        isVerified: isVerified,
        isDomain: true,
        toJSON : function toJSON() {
            return user;
        }
    };

    Object.keys( user ).forEach( function ( prop ) {
        obj[prop] = user[prop];
    } );

    return obj;
};