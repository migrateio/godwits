var log = require( 'ringo/logging' ).getLogger( module.id );

function createJobs( folders ) {
    // This should probably go in a configuration file.
    const MAX_MESSAGES = 100;
    log.info( 'Max messages: {}', MAX_MESSAGES );

    var done = false;

    // These probably shouldn't be named so similar...
    var jobs = [];

    // Loop until we're done.
    var j = 0;
    while ( !done ) {

        log.info( 'Outer loop. iteration: {} ', ++j );

        // Each iteration of this loop is a new job.
        // We initialize the job thusly.
        var job = {
            folders : [],
            messageCount : 0
        };

        log.info( 'Initialized job: {}', job );


        // Creating a job happens in this loop.
        while ( job.messageCount < MAX_MESSAGES ) {
            log.info( 'Inner loop, messagecount: {}', job.messageCount );

            // Iterate over all folders passed to us.
            for ( var i = folders.length - 1; i >= 0; i-- ) {
                log.info( 'Iteration: {} ', i );
                // If a folder has no uids we don't care about it anymore, so we just get rid of it,
                // update our iterator, and kick to the next iteration of the loop.
                log.info( folders[i].uids.length );
                if ( folders[i].uids.length === 0 ) {
                    folders.splice( i, 1 );
                    continue;
                }

                // Now we have a worthwhile folder, so we push into the folders array, which will
                // contain our data.
                var folder = job.folders.push( {
                    folderName : folders[i].folderName,
                    uids : []
                } );

                folder = job.folders[--folder];

                // Finally, we'll loop over the uids in said folder until the job we're building has
                // enough messages, or until we run out of uids to move into the job.

                if ( job.messageCount <= MAX_MESSAGES && folders[i].uids.length !== 0 ) {
                    var difference = Math.min( MAX_MESSAGES - job.messageCount, folders[i].uids.length );
                    log.info( 'Difference: {}', difference );

                    var array = folders[i].uids.splice( 0, difference );
                    log.info( 'Array spliced off: {}', JSON.stringify( array, null, 4 ) );

                    folder.uids = folder.uids.concat( array );
                    job.messageCount += difference;
                    log.info( 'MessageCount: {}', job.messageCount );
                }

                if ( job.messageCount >= MAX_MESSAGES ) {
                    log.info( 'breaking...' );
                    break;
                }
            }

            if ( job.messageCount === 0 ) {
                log.info( 'breaking...' );
                break;
            }
        }

        // Getting here means our job has gotten the max number of messages it can hold.
        if ( job.messageCount > 0 ) jobs.push( job );

//        log.info( 'job: {}', JSON.stringify( job, null, 4 ) );
//        log.info( 'jobs: {}', JSON.stringify( jobs, null, 4 ) );

        // If there's no folders to read from we're done, else we're not.
        log.info( 'Folders.length is: {}', folders.length );
        if ( folders.length === 0 ) {
            log.info( 'We\'re done.' );

//            return jobs;
            done = true;
            log.info( 'Done: {}', done );
            break;
        }
        log.info( '??????' );
    }
//    log.info( JSON.stringify(jobs, null, 4) );
    return jobs;
}

describe( 'The createJobs function', function () {

    var folders = [];

    beforeEach( function () {
        var strings = [];

        for ( var i = 0; i < 2000; i++ ) {
            strings.push( i.toString() );
        }

        for ( i = 0; i < 2000; i++ ) {
            folders.push( {
                folderName : i.toString(),
                uids : strings.slice()
            } );
        }
    } );

    it( 'should return an array of jobs.', function () {
//        var copyfolders = folders.slice();
        var result = createJobs( folders );
//        log.info('input: {} ', JSON.stringify(copyfolders, null, 4));
//        log.info( 'Result: {}', JSON.stringify( result, null, 4 ) );

        expect( result ).toBeArray();

    } );

} );