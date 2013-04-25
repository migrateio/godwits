var log = require('ringo/logging').getLogger(module.id);

exports.Service = function (opts) {
    'use strict';

    var hostname = 'imap.mail.yahoo.com';

    log.info('Initializing service with options: {}', JSON.stringify(opts, null, 4));

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

    var props = java.lang.System.getProperties();
    props.setProperty('mail.store.protocol', 'imaps');
    props.setProperty('mail.imap.yahoo.guid', '1'); // this hack is necessary to support yahoo.
    props.setProperty('mail.debug', 'true');

    log.info('Set mail.store.protocol to secure IMAP.');

    var session;

    try {
        log.info('Trying to get session instance.');
        session = javax.mail.Session.getInstance(props, null);
    } catch (e) {
        throw new WrappedException(500, 'Error getting session.', e);
    }

    var store;

    try {
        log.info('Trying to get IMAP store.');
        store = session.getStore('imaps');
    } catch (e) {
        throw new WrappedException(500, 'Error getting IMAP store.', e);
    }

    // If neither of these exist, we've got no authentication provided and cannot proceed.
    if (!(opts.password || opts.oauth)) {
        throw new GenericException(401, 'No authentication provided.');
    }

    if (opts.password) {
        try {
            log.info('Trying to connect to IMAP store with supplied credentials: {}', JSON.stringify(opts, null, 4));
            store.connect(hostname, opts.email, opts.password);
        } catch (e) {
            throw new WrappedException(500, 'Could not connect to store', e);
        }
    }

    if (opts.oauth) {
        throw new GenericException(400, 'Not yet implemented.');
    }

    function getFolderStructure() {
        return store.getDefaultFolder().list('*');
    }

    function replicateFolders(folders) {
        for (var i = 0; i < folders.length; i++) {
            var folder = store.getFolder(folders[i].getFullName());
            if (!folder.exists()) {
                log.info('creating folder: {}', folders[i].getFullName());
                folder.create(folders[i].getType());
            }
        }
    }

    /**
     * @params [from], [to], [ids]
     * @returns IMAPMessages
     */
    function read(folder, from, to) {

        // just to make it clear what cases I'm checking.
        var ids = from;

        // If this is true, this function has been called incorrectly, so we throw an exception.
        if (!to && Array.isArray(ids)) {
            throw new GenericException(400, 'Incorrect arguments passed to read. Accepted calling patterns: read(number, number) OR read(array_of_ids)');
        }

        if (typeof folder === 'string') {
            folder = store.getFolder(folder);
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
    }

    function write(messages) {

        var folder = store.getFolder('Inbox');

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
    }

    return {
        email: opts.email,
        read: read,
        write: write,
        getFolderStructure: getFolderStructure,
        replicateFolders: replicateFolders
    }
};
