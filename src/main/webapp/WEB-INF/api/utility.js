'use strict';

var config = exports.config = {
    version : '0.1.0'
};

var uid = exports.uuid = function () {
    var uuid = java.util.UUID.randomUUID();
    return uuid.toString();
};
