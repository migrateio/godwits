var log = require( 'ringo/logging' ).getLogger( module.id );

var {EmailService} = require( 'ses' );
var {trimpathString} = require( 'trimpath' );
var {merge} = require( 'ringo/utils/objects' );


var service = module.singleton( 'emailService', function () {
    var {props} = require( 'utility' );
    var accessKey = props['aws.email.access_key'];
    var secretKey = props['aws.email.secret_key'];
    return new EmailService( {
        from : '"Migrate IO" <no-reply@migrate.io>'
    }, accessKey, secretKey );
} );


function sendEmail( template, obj ) {
    var emailText, emailHtml;

    var from = props[template + '.from'];
    var subject = props[template + '.subject'];

    var emailTextTemplate = props[template + '.text'];
    if ( emailTextTemplate )
        emailText = trimpathString( emailTextTemplate, obj );

    var emailHtmlTemplate = props[template + '.html'];
    if ( emailHtmlTemplate )
        emailHtml = trimpathString( emailHtmlTemplate, obj );

    var opts = merge( obj, {
        htmlBody : emailHtml,
        textBody : emailText,
        subject : subject,
        from : from
    } );

    service.send( opts );
}

/**
 * Sends the welcome email to the user.
 * {
 *     token: '',
 *      link: {
 *          confirm: 'url',
 *          support: 'url',
 *      }
 *  }
 *
 * @param template
 * @param obj
 */
exports.sendWelcomeEmail = function ( token, user ) {
    log.info( 'Sending welcome to ', JSON.stringify( user ) );
    var confirm = props['server.web.url'] + 'verify/' + user.id + '?token=' + token;
    var opts = {
        to : user.email.address,
        token : token,
        link : {
            support : props['support.web.url'],
            confirm : confirm
        }
    };
    sendEmail( 'email.welcome', opts );
};

