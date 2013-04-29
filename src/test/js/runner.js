var system = require( 'system' );
var fs = require( 'fs' );
var {Parser} = require( 'ringo/args' );
var {Worker} = require( 'ringo/worker' );
var log = require( 'ringo/logging' ).getLogger( module.id );

var jasmineEnv;

require.paths.push( module.resolve( '../../main/webapp/WEB-INF/api' ) );
require.paths.push( module.resolve( '../../main/webapp/WEB-INF/lib' ) );

var baseDir = fs.directory(module.path);

load( baseDir + '/jasmine/jasmine-1.3.1.js' );
load( baseDir + '/jasmine/jasmine.async.js' );
load( baseDir + '/jasmine/jasmine.terminal_reporter.js' );
load( baseDir + '/jasmine/jasmine.junit_reporter.js' );

function initializeJasmine( watcher, verbosity, junitDir ) {
    jasmineEnv = jasmine.getEnv();

    var reporter = new jasmine.TerminalReporter( {
        verbosity : verbosity,
        color : true
    } );
    jasmineEnv.addReporter( reporter );

    if ( junitDir ) {
        jasmineEnv.addReporter(
            new jasmine.JUnitXmlReporter( junitDir )
        );
    }

    var oldCallback = jasmineEnv.currentRunner().finishCallback;
    jasmineEnv.currentRunner().finishCallback = function () {
        oldCallback.apply( this, arguments );
        if ( !watcher && reporter.hasErrors() ) require( 'system' ).exit( -1 );
    };
}

function executeTests( testDirs ) {
    log.debug( '\n\nRunning tests at {}', new Date().toISOString() );
    fs.listTree( testDirs ).forEach( function ( file ) {
        var f = testDirs + '/' + file;
        if ( fs.isFile( f ) && /.+Spec\.js$/g.test( file ) ) load( f );
    } );
    jasmineEnv.execute();
}

function main( args ) {
    var parser = new Parser();
    parser.addOption( 'h', 'help', null, 'Run to see the usage options.' );
    parser.addOption( 'w', 'watch', null, 'Enable to run tests when files change.' );
    parser.addOption( 'i', 'interval', 'interval', 'The number of milliseconds between polling for modified files.' );
    parser.addOption( 'v', 'verbosity', 'verbosity', 'How much logging from 0 - 3.' );
    parser.addOption( 'j', 'junitDir', 'junitDir', 'Directory for JUnit tests.' );
    parser.addOption( 's', 'sourceDirs', 'sourceDirs', 'Path to source files (can use comma to separate).' );
    parser.addOption( 't', 'testDirs', 'testDirs', 'Path to test files (can use comma to separate).' );

    args.shift();
    args = args.filter(function(arg) { return !!arg });

//    log.info( 'Arguments: {}', JSON.stringify( args, null, 4 ) );
    var options = parser.parse( args );
//    log.info( 'Options: {}', JSON.stringify( options, null, 4 ) );

    if (options.help) {
        print( parser.help() );
        system.exit(0);
    }

    var sourceDirs = options.sourceDirs && options.sourceDirs.trim().split( /[:;]/ );
    var testDirs = options.testDirs && options.testDirs.trim().split( /[:;]/ );
    var junitDir = options.junitDir && options.junitDir.trim();

    initializeJasmine( options.watch, options.verbosity, junitDir );

    if ( options.watch ) {
        var watchPaths = [].concat( sourceDirs ).concat( testDirs );
        var watcher = new Worker( module.resolve( './watcher' ) );
        watcher.onmessage = function ( e ) {
            executeTests( testDirs );
        };
        watcher.postMessage( { watchPaths : watchPaths, interval : options.interval } );
    }

    executeTests( testDirs );
}

if ( require.main === module ) {
    main( system.args );
}