exports.Service = function (opts) {
    'use strict';

    var log = require('ringo/logging').getLogger(module.id);
    var hostname = 'imap.gmail.com';

    log.info('Initializing service with options: {}', JSON.stringify(opts, null, 4));

    var props = java.lang.System.getProperties();
    props.setProperty('mail.store.protocol', 'imaps');

    log.info('Set mail.store.protocol to secure imap.');

    try {
        var session = javax.mail.Session.getInstance(props, null);
    } catch (e) {
        log.error('Error getting session: {}', e);
        throw {
            code: 400, // Temporary
            message: 'Error getting session'
        }
    }

    try {
        var store = session.getStore('imaps');
    } catch (e) {
        log.error('Error getting IMAP store: {}', e);
        return;
    }

    if (!(opts.password || opts.oauth)) {
        log.error('No authentication provided.');
        return;
    }

    if (opts.password) {
        // Try to connect to the store.
        try {
            store.connect(hostname, opts.email, opts.password);
        } catch (e) {
            log.error('Error connecting to imap store: {}', e);
            return;
        }
    }

    if (opts.oauth) {

        log.error('Oauth authentication not yet supported.');
        return;

        // Try to connect to the store.
        try {
            store.connect(hostname, opts.email, opts.password);
        } catch (e) {
            log.error('Error connecting to imap store: {}', e);
            return;
        }
    }

    var DEFAULT_FOLDER = store.getDefaultFolder();


    function read() {

    }

    function write() {

    }

    return {
        email: opts.email,
        read: read,
        write: write
    }
};