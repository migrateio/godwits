var log = require( 'ringo/logging' ).getLogger( module.id );

var ImapService = require( '../../imap/mail/imap' ).ImapService;

var {merge} = require( 'ringo/utils/objects' );

exports.Service = ImapService.subClass( {
    init : function ( opts ) {
        this.opts = merge( opts, {
            hostname : 'imap.mail.yahoo.com',
            props : {
                'mail.imap.yahoo.guid' : '1'
            }
        } );
        this._super( this.opts );
    }
} );