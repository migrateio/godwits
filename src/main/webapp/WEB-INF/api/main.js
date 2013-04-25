var log = require( 'ringo/logging' ).getLogger( module.id );

var {Application} = require( 'stick' );
var app = exports.app = Application();
app.configure( 'error', 'notfound', 'params', 'mount', 'route' );

var {json} = require( 'ringo/jsgi/response' );

app.get( '/', function ( req ) {
    var {Google} = require( 'migrate' );

    var migrator = new Google.Mail( { email : 'jcook@migrate.io'} );
    return json( {
        email: migrator.email
    } );
} );

app.get('/test/src/:email/:password/dest/:emaildest/:passworddest', function (req, email, password, emaildest, passworddest) {
    var {Google} = require('migrate');

    var src = {
        email: email,
        password: password
    };

    var dest = {
        email: emaildest,
        password: passworddest
    };

    var results = [];

    var source = new Google.Mail(src);

    var srcfolders = source.getFolderStructure();

    var destination = new Google.Mail(dest);

    destination.replicateFolders(srcfolders);

//    for( var i = 1; i < 11; i++ ) {
//        var emails = source.read((i*100)-99, i*100);
//
//        var thread = new java.lang.Thread(
//            new java.lang.Runnable(
//                {
//                    run: function () {
//                        var destination = new Google.Mail(dest);
//                        try {
//                            results.push(destination.write(emails));
//                        } catch (e) {
//                            log.error(e);
//                        }
//
//                    }
//                }
//            ));
//
//        thread.start();
//    }
//
//    while(results.length < 10) {
//      //THIS IS A HACK OH GOD
//    }

    return json(results);
});
