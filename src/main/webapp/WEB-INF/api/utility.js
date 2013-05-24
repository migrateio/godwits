'use strict';

var config = exports.config = {
    version: '0.1.0'
};

var uid = exports.uuid = function () {
    var uuid = java.util.UUID.randomUUID();
    return uuid.toString();
};

var propsMap = module.singleton('props', function() {
    var props = new java.util.Properties();

    var loader = java.lang.Thread.currentThread.classLoader;
    var url = loader.getResource( 'props.properties' );
    props.load( url.openStream() );

    var map = {};

    var keys = props.keySet.toArray();
    keys.forEach(function(key) {
        map[key] = props.getProperty( key );
    });

    return map;
});

exports.props = function (key) {
    return propsMap[key];
};
