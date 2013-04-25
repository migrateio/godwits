var log = require('ringo/logging').getLogger(module.id);

var ImapService = require('../../imap/mail/imap').ImapService;

exports.Service = ImapService.subClass({
    init: function () {
        this._super();
    },
    connect: function(opts) {
        Object.extend(opts, {
            hostname: 'imap.google.com'
        });
        this._super(opts);
    },
    read: function(folder, from, to) {
        this._super(folder, from, to);
    },
    write: function(folder, messages) {
        this._super(folder, messages);
    },
    getFolders: function() {
        this._super();
    },
    writeFolders: function(folders) {
        this._super(folders);
    }
});