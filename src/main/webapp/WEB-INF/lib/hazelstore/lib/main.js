var hazel = require( './hazelcast/hazelcast' );


exports.init = hazel.init;
exports.shutdown = hazel.shutdown;

exports.getMap = hazel.getMap;
exports.lock = hazel.lock;
exports.inTransaction = hazel.inTransaction;
exports.registerListener = hazel.registerListener;
exports.clearListeners = hazel.clearListeners;

exports.generateId = require( './utils' ).generateId;
