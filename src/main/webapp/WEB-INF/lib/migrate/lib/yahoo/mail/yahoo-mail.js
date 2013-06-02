var log = require( 'ringo/logging' ).getLogger( module.id );

var ImapService = require( '../../imap/mail/imap' ).ImapService;

var {merge} = require( 'utility' );

exports.Service = ImapService.subClass( {
    init : function ( opts ) {
        this.opts = merge( {}, {
            hostname : 'imap.mail.yahoo.com',
            props : {
                'mail.imap.yahoo.guid' : '1'
            }
        }, opts );
        this._super( this.opts );
    }
} );