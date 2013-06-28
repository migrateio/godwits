var log = require( 'ringo/logging' ).getLogger( module.id );

function createJobs( folders ) {
    // This should probably go in a configuration file.
    const MAX_MESSAGES = 100;
    var done = false;

    // These probably shouldn't be named so similar...
    var jobs = [];

    // Loop until we're done.
    while ( !done ) {

        // Each iteration of this loop is a new job.
        // We initialize the job thusly.
        var job = {
            folders : [],
            messageCount : 0
        };

        // Creating a job happens in this loop.
        while ( job.messageCount < MAX_MESSAGES ) {

            // Iterate over all folders passed to us.
            for ( var i = folders.length - 1; i >= 0; i-- ) {

                // If a folder has no uids we don't care about it anymore, so we just get rid of it,
                // update our iterator, and kick to the next iteration of the loop.
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
                    var array = folders[i].uids.splice( 0, difference );

                    folder.uids = folder.uids.concat( array );
                    job.messageCount += difference;
                }

                if ( job.messageCount >= MAX_MESSAGES ) {
                    break;
                }
            }

            if ( job.messageCount === 0 ) {
                break;
            }
        }

        // Getting here means our job has gotten the max number of messages it can hold.
        if ( job.messageCount > 0 ) jobs.push( job );

        // If there's no folders to read from we're done, else we're not.
        if ( folders.length === 0 ) {
            done = true;
            break;
        }
    }
    return jobs;
}

describe( 'The createJobs function', function () {

    var folders = [];

    beforeEach( function () {
        var strings = [];

        for ( var i = 0; i < 20; i++ ) {
            strings.push( i.toString() );
        }

        for ( i = 0; i < 20; i++ ) {
            folders.push( {
                folderName : i.toString(),
                uids : strings.slice()
            } );
        }
    } );

    it( 'should return an array of jobs.', function () {
        var result = createJobs( folders );

        expect( result ).toBeArray();
        for ( var i = 0; i < result.length; i++ ) {
            expect( result[i].messageCount ).toEqual( 100 );
            expect( result[i].folders ).toBeArray();
            for ( var j = 0; j < result[i].folders.length; j++ ) {
                expect( result[i].folders[j].uids.length ).toEqual( 20 );
            }
        }
    } );

} );