var services = {
    google : {
    },
    microsoft : {

    }
};

var eventSchema = {
    id : '',
    name : '',
    desc : '',
    start_time : '',
    end_time : '',
    location : '',
    is_all_day_event : '',
    visibility : '',
    availability : ''
};


exports.Service = Object.subClass( {
    init : function () {

    },

    read: function () {

    },

    write: function (calendars) {

    }
} );