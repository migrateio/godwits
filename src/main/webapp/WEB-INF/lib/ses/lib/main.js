var log = require( 'ringo/logging' ).getLogger( module.id );
var {merge} = require( 'utility' );

var {Body, Content, Destination, Message, SendEmailRequest} = Packages.com.amazonaws.services.simpleemail.model;
var {BasicAWSCredentials} = Packages.com.amazonaws.auth;
var {AmazonSimpleEmailServiceAsyncClient} = Packages.com.amazonaws.services.simpleemail;

const CHARSET = 'UTF-8';    // // Not sure I should assume this. Email is 7-bit ASCII.

/**
 *
 * @param {Object} [emailOptions]
 * @param {String} accessKey
 * @param {String} secretKey
 * @return {Object} The email service ready to send emails
 */
exports.EmailService = function ( emailOptions, accessKey, secretKey ) {

    var args = Array.prototype.slice.call( arguments, 0 );
    emailOptions = typeof args[0] === 'object' ? args.shift() : {};
    accessKey = args.shift();
    secretKey = args.shift();


    function createMessage( options ) {
        var subject = new Content( options.subject || '' ).withCharset( CHARSET );

        var body = new Body();
        if ( options.textBody )
            body.setText( new Content( options.textBody ).withCharset( CHARSET ) );

        if ( options.htmlBody )
            body.setHtml( new Content( options.htmlBody ).withCharset( CHARSET ) );

        return new Message()
            .withSubject( subject )
            .withBody( body );
    }

    function createDestination( opts ) {
        var destination = new Destination();

        if ( opts.bcc ) destination.setBccAddresses.call( destination, [].concat( opts.bcc ) );
        if ( opts.cc ) destination.setCcAddresses.call( destination, [].concat( opts.cc ) );
        if ( opts.to ) destination.setToAddresses.call( destination, [].concat( opts.to ) );

        return destination;
    }

    /**
     * Compose and send an email
     *
     * {
     *     "from" : "sender@example.com",
     *     "to" : "receiver@example.com",
     *     "cc" : "copied@example.com",
     *     "bcc": "blank-copied@example.com",
     *     "subject" : "Test",
     *     "htmlBody" : "<b>Hello</b>",
     *     "textBody" : "Hello",
     *     "replyTo" : "reply@example.com",
     *     // These are not supported...
     *     "tag" : "Invitation",
     *     "headers" : [{ "Name" : "CUSTOM-HEADER", "Value" : "value" }]
     *  }
     *
     * @param {Object} options
     */
    function send( options ) {
        var opts = merge( {}, options, emailOptions );

        function validate( prop ) {
            if ( !opts[prop] ) throw {
                status : 400,
                message : 'Emails are required to have a [' + prop + '] parameter.'
            };
        }

        ['from', 'to', 'subject'].forEach( validate );
        if ( !opts.textBody && !opts.htmlBody ) throw {
            status : 400,
            message : 'Emails are required to have a body [textBody] or [htmlBody] parameter.'
        };

        var message = createMessage( opts );
        var destination = createDestination( opts );
        var request = new SendEmailRequest()
            .withDestination( destination )
            .withMessage( message )
            .withReturnPath( opts.replyTo || opts.from )
            .withSource( opts.from );

        if ( opts.replyTo )
            request.setReplyToAddresses.call( request, [].concat( opts.replyTo ) );

        var result = client.sendEmailAsync( request );
        return result;
    }


    function init( accessKey, secretKey ) {
        log.debug( "EmailService::init, establishing AWS SES Client using " +
            "access key: {}, secret key: {}", accessKey, secretKey );
        var credentials = new BasicAWSCredentials( accessKey, secretKey );
        return new AmazonSimpleEmailServiceAsyncClient( credentials );
    }

    var client = init( accessKey, secretKey );

    // todo: Use Spring's MimeMessageHelper class to build email with attachment capability.

    return {
        send : send
    }
};
