function onmessage ( e ) {

    var swfClient = e.data.swfClient;
    var interval = e.data.interval || '120';
    var beatInterval = parseInt( interval ) * 1000;

    var opts = {
        taskToken: e.data.taskToken
    };

    function beat() {
        swfClient.recordActivityTaskHeartbeat( opts );
        setTimeout(beat, beatInterval)
    }

    setTimeout( beat, beatInterval >> 1 );
}

