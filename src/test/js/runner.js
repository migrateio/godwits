var log = require( 'ringo/logging' ).getLogger( module.id );
var system = require( 'system' );
var fs = require( 'fs' );
var {Parser} = require( 'ringo/args' );
var {Worker} = require( 'ringo/worker' );

var jasmineEnv;

require.paths.push( module.resolve( '../../main/webapp/WEB-INF/api' ) );
require.paths.push( module.resolve( '../../main/webapp/WEB-INF/lib' ) );
require.paths.push( module.resolve( './support' ) );

var baseDir = fs.directory( module.path );

load( baseDir + '/jasmine/jasmine-1.3.1.js' );
load( baseDir + '/jasmine/async-callback.js' );
load( baseDir + '/jasmine/jasmine.term_reporter.js' );
load( baseDir + '/jasmine/jasmine.junit_reporter.js' );

// Load helpers
function loadHelpers( dir ) {
    return fs.listTree( dir ).forEach( function ( name ) {
        var file = dir + '/' + name;
        if ( fs.isFile( file ) && fs.extension( file ) === '.js' ) load( file );
    } );
}

function initializeJasmine( watcher, verbosity, junitDir ) {
    jasmineEnv = jasmine.getEnv();

    var reporter = new jasmine.TermReporter( {
        verbosity : verbosity
    } );
    jasmineEnv.addReporter( reporter );

    if ( junitDir ) {
        jasmineEnv.addReporter(
            new jasmine.JUnitXmlReporter( junitDir )
        );
    }

    var oldCallback = jasmineEnv.currentRunner().finishCallback;
    jasmineEnv.currentRunner().finishCallback = function () {
        log.info( 'Finished' );
        oldCallback.apply( this, arguments );
        if ( !watcher ) {
            // System won't shutdown cleanly with hazelcast running its threads
            require('hazelstore' ).shutdown();

            var result = reporter.hasErrors() ? -1 : 0;
            // system.exit so maven can detect runtime success/fail
            log.info( 'Exiting with result', result );
            // This borks the exit and keeps the java process running in the background
            // because of the use of engine.addShutdownHooks().
            require( 'system' ).exit( result );
        }
    };
}

function executeTests( testDirs ) {
//    log.debug( '\n\nRunning tests at {}', new Date().toISOString() );
    var isSpec = function ( file ) {
        return fs.isFile( file ) && /.+Spec\.js$/g.test( file );
    };

    if ( fs.isFile( testDirs ) ) load( testDirs );
    else fs.listTree( testDirs ).forEach( function ( file ) {
        var f = testDirs + '/' + file;
        if ( isSpec( f ) ) load( f );
    } );

    jasmineEnv.execute();
}

function main( args ) {
    var parser = new Parser();
    parser.addOption( 'h', 'help', null, 'Run to see the usage options.' );
    parser.addOption( 'w', 'watch', null, 'Enable to run tests when files change.' );
    parser.addOption( 'i', 'interval', 'interval', 'The number of milliseconds between polling for modified files.' );
    parser.addOption( 'v', 'verbosity', 'verbosity', 'How much logging from 0 - 3.' );
    parser.addOption( 'l', 'helperDir', 'helperDir', 'Directory for Jasmine helper functions.' );
    parser.addOption( 'j', 'junitDir', 'junitDir', 'Directory for JUnit tests.' );
    parser.addOption( 's', 'sourceDirs', 'sourceDirs', 'Path to source files (can use comma to separate).' );
    parser.addOption( 't', 'testDirs', 'testDirs', 'Path to test files (can use comma to separate).' );

    args.shift();
    args = args.filter( function ( arg ) {
        return !!arg
    } );

//    log.info( 'Arguments: {}', JSON.stringify( args, null, 4 ) );
    var options = parser.parse( args );
    log.debug( 'Options: {}', JSON.stringify( options, null, 4 ) );

    if ( options.help ) {
        print( parser.help() );
        system.exit( 0 );
    }

    var sourceDirs = options.sourceDirs && options.sourceDirs.trim().split( /[,]/ );
    var testDirs = options.testDirs && options.testDirs.trim().split( /[,]/ );
    var junitDir = options.junitDir && options.junitDir.trim();
    var helperDir = options.helperDir && options.helperDir.trim();

    if ( helperDir ) loadHelpers( helperDir );
    initializeJasmine( options.watch, options.verbosity, junitDir );

    if ( options.watch ) {
        var watchPaths = [].concat( sourceDirs ).concat( testDirs );
        var watcher = new Worker( module.resolve( './watcher' ) );
        watcher.onmessage = function ( e ) {
            executeTests( testDirs );
        };
        watcher.postMessage( { watchPaths : watchPaths, interval : options.interval } );
    }

/*
    var engine = require("ringo/engine");
    engine.addShutdownHook(function() {
        log.error( 'SHUTTING DOWN' );
    });
*/


    executeTests( testDirs );
}

if ( require.main === module ) {

    /*
     var {Workflow} = require( 'workflow/workflow' );
     var workflow = new Workflow( {
     domain : 'dev-migrate',
     name : 'io.migrate.transfers',
     version : '0.0.0',
     defaultChildPolicy : 'TERMINATE',
     defaultTaskListName : 'transfer-decisions',
     description : 'The primary workflow used for a transfer Run.',
     defaultExecutionStartToCloseTimeout : '2592000', // 1 month
     defaultTaskStartToCloseTimeout : 'NONE'
     }, 'AKIAIIQOWQM6FFLQB2EQ', 'ItTa0xaI9sey2SEGGEN8yVcA5slN95+qmNrf1TMd' );
     */
    main( system.args );
    log.info( 'Exiting clean' );
}