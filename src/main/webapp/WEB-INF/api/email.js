var log = require( 'ringo/logging' ).getLogger( module.id );

var {EmailService} = require( 'ses' );
var {trimpathString} = require( 'trimpath' );
var {merge} = require( 'utility' );


//var service = module.singleton( 'emailService', function () {
    var {props} = require( 'utility' );
    var accessKey = props['aws.app.access_key'];
    var secretKey = props['aws.app.secret_key'];
    var service = new EmailService( {
        from : 'no-reply@migrate.io'
//        from : '"Migrate IO" <no-reply@migrate.io>'
    }, accessKey, secretKey );
//} );


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

    var opts = merge( {}, obj, {
        htmlBody : emailHtml,
        textBody : emailText,
        subject : subject,
        from : from
    } );

    return service.send( opts );
}

/**
 * Sends the verification email to the user.
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
exports.sendVerificationEmail = function ( token, user ) {
    var confirm = props['server.web.url'] + '#/signin/verify/' + user.id + '/' + token;
    var opts = {
//        to : 'success@simulator.amazonses.com',
//        to : 'suppressionlist@simulator.amazonses.com',
//        to : 'complaint@simulator.amazonses.com',
//        to : 'ooto@simulator.amazonses.com',
//        to : 'bounce@simulator.amazonses.com',
        to : user.email.address,
        token : token,
        link : {
            support : props['support.web.url'],
            confirm : confirm
        }
    };
    log.info( 'Sending verification email:', JSON.stringify( opts, null, 4 ) );
    return sendEmail( 'email.verification', opts );
};

