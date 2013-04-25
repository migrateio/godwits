var fs = require( 'fs' );
var baseDir = fs.workingDirectory() + 'src/test/js';

load( baseDir + '/jasmine/jasmine-1.3.1.js' );
load( baseDir + '/jasmine/jasmine.terminal_reporter.js' );
load( baseDir + '/jasmine/jasmine.junit_reporter.js' );

fs.listTree( baseDir ).forEach( function ( file ) {
    var f = baseDir + '/' + file;
    if ( fs.isFile( f ) && /.+Spec\.js$/g.test( file ) ) load( f );
} );

var jasmineEnv = jasmine.getEnv();


var reporter = new jasmine.TerminalReporter( {
    verbosity : 3,
    color : true
} );
jasmineEnv.addReporter( reporter );

jasmineEnv.addReporter(
    new jasmine.JUnitXmlReporter( fs.workingDirectory() + 'target/surefire-reports/' )
);

var done = function () {
    print( 'Calling done' );
    if ( reporter.hasErrors() ) require( 'system' ).exit( -1 );
};

var oldCallback = jasmineEnv.currentRunner().finishCallback;

jasmineEnv.currentRunner().finishCallback = function () {
    oldCallback.apply( this, arguments );
    done();
};

jasmineEnv.execute();

