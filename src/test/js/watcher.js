var log = require( 'ringo/logging' ).getLogger( module.id );
var fs = require( 'fs' );
var basePaths;
var source;
var previousCount;
var previousCRC;
var crc = new java.util.zip.CRC32();

function changesDetected( folders ) {
    // Get an array of all the fully qualified filenames in the folders and filter
    // them into just the JS files we care about.
    var jsFiles = [].concat( folders )
        // Replace each folder with an array of all file names
        .map( function ( folder ) {
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
        return true;
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
        return true;
    }

    return false;
}

function checkForChanges() {
    if ( basePaths ) {
        var isChanged = changesDetected( basePaths );
        source.postMessage( {changed : isChanged} );
    }
    setTimeout( checkForChanges, 2000 );
}

function onmessage( e ) {
    log.info( 'Watching for modified files on paths: {}',
        JSON.stringify( e.data, null, 2 ) );
    basePaths = e.data;
    source = e.source;
}

setTimeout( checkForChanges, 0 );



