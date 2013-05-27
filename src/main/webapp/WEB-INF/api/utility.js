'use strict';



var config = exports.config = {
    version: '0.1.0'
};

exports.uuid = function () {
    var uuid = java.util.UUID.randomUUID();
    return uuid.toString();
};

exports.props = module.singleton('props', function() {
    var props = new java.util.Properties();

    var loader = java.lang.Thread.currentThread().contextClassLoader;
    var url = loader.getResource( 'props.properties' );
    props.load( url.openStream() );

    var map = {};

    var keys = props.keySet().toArray();
    keys.forEach(function(key) {
        map[key] = props.getProperty( key );
    });

    return map;
});

