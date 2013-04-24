exports.Service = function (opts) {
    'use strict';

    var log = require('ringo/logging').getLogger(module.id);
    var hostname = 'imap.gmail.com';

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

    log.info('Set mail.store.protocol to secure imap.');

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

    function read() {

        // If this is true, this function has been called incorrectly, so we throw an exception.
        if (!arguments[1] && Array.isArray(arguments[0])) {
            throw new GenericException(400, 'Incorrect arguments passed to read. Accepted calling patterns: read(number, number) OR read(array_of_ids)');
        }

        var folder = store.getFolder('Inbox');

        if (!folder.isOpen()) {
            folder.open(javax.mail.Folder.READ_ONLY);
        }

        if (typeof arguments[0] === 'number' && typeof arguments[1] === 'number') {
            return folder.getMessages(arguments[0], arguments[1]);
        }

        if (Array.isArray(arguments[0])) {
            return folder.getMessages(arguments[0]);
        }
    }

    function write() {

    }

    return {
        email: opts.email,
        read: read,
        write: write
    }
};