'use strict';

var log = require('ringo/logging').getLogger(module.id);

exports.Imap = Object.subClass({
    init: function(opts) {
        log.info('Initializing service with options: {}', JSON.stringify(opts, null, 4));
    },
    connect: function (opts) {

    },
    write: function () {

    },
    read: function () {

    },
    getFolders: function () {

    },
    writeFolders: function () {

    }
});