'use strict';

var log = require('ringo/logging').getLogger(module.id);

function GenericException(code, msg) {
    log.error(msg);
    this.code = code;
    this.message = msg;
}

GenericException.prototype.toString = function () {
    return this.message;
};

function WrappedException(code, msg, e) {
    log.error(msg, e);
    this.code = code;
    this.message = msg;
    this.exception = e;
}

WrappedException.prototype.toString = function () {
    return JSON.stringify({
        code: this.code,
        message: this.message,
        exception: this.exception
    }, null, 4);
};

exports.ImapService = Object.subClass({
    init: function (opts) {

        this.opts = opts;
        this.email = this.opts.email;
        this.props = java.lang.System.getProperties();

        this.props.setProperty('mail.store.protocol', 'imaps');

        if (this.opts.debug) {
            this.props.setProperty('mail.debug', 'true');
        }

        log.info('Set mail.store.protocol to secure IMAP.');

        try {
            log.info('Trying to get session instance.');
            this.session = javax.mail.Session.getInstance(this.props, null);
        } catch (e) {
            throw new WrappedException(500, 'Error getting session.', e);
        }

        try {
            log.info('Trying to get IMAP store.');
            this.store = this.session.getStore('imaps');
        } catch (e) {
            throw new WrappedException(500, 'Error getting IMAP store.', e);
        }
    },
    connect: function () {
        // If neither of these exist, we've got no authentication provided and cannot proceed.
        if (!(this.opts.password || this.opts.oauth)) {
            throw new GenericException(401, 'No authentication provided.');
        }

        if (this.opts.password) {
            try {
                log.info('Trying to connect to IMAP store with supplied credentials: {}', JSON.stringify(this.opts, null, 4));
                this.store.connect(this.opts.hostname, this.opts.email, this.opts.password);
            } catch (e) {
                throw new WrappedException(500, 'Could not connect to store', e);
            }
        }

        if (this.opts.oauth) {
            throw new GenericException(400, 'Not yet implemented.');
        }

    },
    write: function (folder, messages) {
        if (typeof folder === 'string') {
            folder = this.store.getFolder(folder);
        }

        if (folder.getType() === javax.mail.Folder.HOLDS_FOLDERS) {
            throw new GenericException(500, 'Folder cannot contain messages, unable to write.');
        }

        if (folder.isOpen()) {
            log.info('Closing folder, reopening with correct mode.');
            folder.close(false);
        }

        // Open folder to be written to.
        folder.open(javax.mail.Folder.READ_WRITE);
        log.info('Opened recipient folder.');

        var successCount = 0;
        var errors = [];
        //Now that the folder is open and able to receive messages, we try to write them to it.
        // This function will throw an error if it fails.
        for (var i = 0; i < messages.length; i++) {
            log.info('Appending message: {}', messages[i].getMessageNumber());
            try {
                folder.appendMessages([messages[i]]);
            } catch (e) {
                log.error('Error appending message', e);
                errors.push({
                    id: messages[i].getMessageNumber(),
                    imap: messages[i],
                    code: 500,
                    message: e.toString()
                });
                continue;
            }
            successCount++;
        }

        return {
            successCount: successCount,
            errors: errors
        }
    },
    read: function (folder, from, to) {

        // just to make it clear what cases I'm checking.
        var ids = from;

        // If this is true, this function has been called incorrectly, so we throw an exception.
        if (!to && Array.isArray(ids)) {
            throw new GenericException(400, 'Incorrect arguments passed to read. Accepted calling patterns: read(number, number) OR read(array_of_ids)');
        }

        if (typeof folder === 'string') {
            folder = this.store.getFolder(folder);
        }

        if (!folder.isOpen()) {
            folder.open(javax.mail.Folder.READ_ONLY);
        }

        if (typeof from === 'number' && typeof to === 'number') {
            return folder.getMessages(from, to);
        }

        if (Array.isArray(ids)) {
            return folder.getMessages(ids);
        }
    },
    getFolders: function () {
        return this.store.getDefaultFolder().list('*');
    },
    writeFolders: function (folders) {
        if (!folders) {
            throw new GenericException(500, 'Bad request, folders must be an array.');
        }
        for (var i = 0; i < folders.length; i++) {
            var folder;

            if (typeof folders[i] === 'object') {
                folder = this.store.getFolder(folders[i].getFullName());
            } else if (typeof folders[i] === 'string') {
                folder = this.store.getFolder(folders[i]);
            } else {
                throw new GenericException(500, 'Folders should be an array of either javax.mail.folders or strings');
            }

            if (!folder.exists()) {
                log.info('creating folder: {}', folders[i].getFullName());
                folder.create(folders[i].getType());
            }
        }
    }
});