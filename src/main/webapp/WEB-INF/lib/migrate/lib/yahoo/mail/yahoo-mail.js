var log = require('ringo/logging').getLogger(module.id);

var ImapService = require('../../imap/mail/imap').ImapService;

exports.Service = ImapService.subClass({
    connect: function() {
        Object.extend(this.opts, {
            hostname: 'imap.mail.yahoo.com',
            props: {
                'mail.imap.yahoo.guid': '1'
            }
        });
        this._super(this.opts);
    }
});