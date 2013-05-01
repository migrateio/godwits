var log = require( 'ringo/logging' ).getLogger( module.id );
var fs = require( 'fs' );
var watchPaths;
var watchInterval;
var source;
var previousCount;
var previousCRC;
var firstTime = true;
var crc = new java.util.zip.CRC32();

function changesDetected( folders ) {
    // Get an array of all the fully qualified filenames in the folders and filter
    // them into just the JS files we care about.
    var jsFiles = [].concat( folders )
        // Replace each folder with an array of all file names
        .map( function ( folder ) {
            if (fs.isFile(folder)) return [folder];
            return fs.listTree( folder )
                // Make sure the file names are fully qualified
                .map( function ( file ) {
                    return folder + '/' + file;
                } );
        } )
        // Flatten the array of arrays into a single array
        .reduce( function ( a, b ) {
            return a.concat( b );
        } )
        // Retain only the JS files
        .filter( function ( file ) {
            return fs.isFile( file ) && fs.extension( file ) === '.js';
        } );

//    log.info( 'Found {} JS files. Previous count: {}', jsFiles.length, previousCount );
    if ( jsFiles.length != previousCount ) {
        previousCount = jsFiles.length;
        if ( !firstTime ) return true;
    }

    crc.reset();
    jsFiles.forEach( function ( file ) {
        var time = fs.lastModified( file ).getTime();
        while ( time > 0 ) {
            crc.update( time & 0xff );
            time = time >> 8;
        }
    } );
    var value = crc.getValue();
//    log.info( 'New CRC {}. Previous CRC: {}', value, previousCRC );
    if ( previousCRC !== value ) {
        previousCRC = value;
        if ( !firstTime ) return true;
    }

    firstTime = false;
    return false;
}

function checkForChanges() {
//        log.info( 'Watching for modified files on paths: {}',
//            JSON.stringify( watchPaths, null, 2 ) );
    if ( watchPaths ) {
        var isChanged = changesDetected( watchPaths );
        if ( isChanged ) source.postMessage( {changed : isChanged} );
    }
    setTimeout( checkForChanges, watchInterval );
}

function onmessage( e ) {
    watchInterval = e.data.interval || 2000;
    watchPaths = e.data.watchPaths;
    source = e.source;
//    log.info( 'Watcher paths: {}',
//        JSON.stringify( e.data, null, 2 ), watchInterval, watchPaths );
}

setTimeout( checkForChanges, 0 );



