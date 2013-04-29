

var config = exports.config = {
    version: '0.1.0'
};

exports.uuid = function () {
    var uuid = java.util.UUID.randomUUID();

    return uuid.toString();
    return uuid.leastSignificantBits.toString( 36 ) + uuid.mostSignificantBits.toString( 36 );
};
