var log = require('ringo/logging').getLogger(module.id);

var ImapService = require('../../imap/mail/imap').ImapService;

exports.Service = ImapService.subClass({
    connect: function() {
        Object.extend(this.opts, {
            hostname: 'imap.gmail.com'
        });
        this._super(this.opts);
    }
});