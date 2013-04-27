function onmessage ( e ) {

    var workflow = e.data.workflow;
    var interval = e.data.interval || '120';
    var beatInterval = parseInt( interval ) * 1000;

    var opts = {
        taskToken: e.data.taskToken
    };

    function beat() {
        workflow.recordActivityTaskHeartbeat( opts );
        setTimeout(beat, beatInterval)
    }

    setTimeout( beat, beatInterval >> 1 );
}

