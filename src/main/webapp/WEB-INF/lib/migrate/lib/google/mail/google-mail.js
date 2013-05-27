var log = require('ringo/logging').getLogger(module.id);


var ImapService = require('../../imap/mail/imap').ImapService;

// since we extend **ImapService** we only need to extend connect with Gmail's hostname.
exports.Service = ImapService.subClass({
    connect: function() {
        Object.extend(this.opts, {
            hostname: 'imap.gmail.com'
        });
        this._super(this.opts);
    }
});