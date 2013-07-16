var log = require( 'ringo/logging' ).getLogger( module.id );

var store = require( 'hazelstore' );
var domain = require( 'domain' );
var {Deferred} = require( 'ringo/promise' );
var {props} = require( 'utility' );
var stripe = require( 'stripe' )( props['stripe.secret_key'] );

var CARD_GOOD_VISA = '4242424242424242';  // good visa number
var CARD_CHARGE_FAIL = '4000000000000341';  // Attaching this card to a Customer object will succeed, but attempts to charge the customer will fail.
var reISO8601 = /^\d{4}\-\d\d\-\d\dT\d\d:\d\d:\d\d\.\d\d\dZ$/;

beforeEach( function () {
    store.init( 'hazelcast-simpledb.xml' );
} );

describe( 'Invoice Domain', function () {

    var invoices, map;

    beforeEach( function () {
        invoices = new domain.Invoices( 'dev' );
        expect( invoices ).toBeDefined();
        map = invoices.backingMap();
    } );

    afterEach( function () {
        map.clear();
    } );


    function createToken( cardNum ) {
        var deferred = new Deferred();
        var card = {
            card : {
                number : cardNum,
                exp_month : 12,
                exp_year : 2016,
                cvc : '478'
            }
        };
        stripe.tokens.create( card ).then(
            function success( token ) {
                expect( token.id ).toEqual( jasmine.any( String ) );
                deferred.resolve( token.id );
            },
            function failure() {
                log.warn( 'test::createToken, failed to create token: ',
                    JSON.stringify( card ), JSON.stringify( arguments ) );
                deferred.resolve( arguments, true );
            }
        );

        return deferred.promise.wait( 5000 );
    }

    describe( 'testing object instantiation', function () {
        it( 'should fail if we exclude the many required fields', function () {
            expect(function () {
                invoices.create( {} )
            } ).toThrowMatch( 'Missing required property: destination' );

            expect(function () {
                invoices.create( {
                    destination : {
                        service : 'google'
                    }
                } )
            } ).toThrowMatch( 'Missing required property' );

            expect(function () {
                invoices.create( {
                    destination : {
                        service : 'google'
                    },
                    invoiceNum : '12345'
                } )
            } ).toThrowMatch( 'Missing required property' );

            var result = invoices.create( {
                destination : {
                    service : 'google'
                },
                invoiceNum : '12345',
                userId : 'abcdef'
            } );

            expect( invoices ).toBeDefined();
        } );

    } );

    describe( 'Testing the crud functionality', function () {

        var invoice;

        beforeEach( function () {
            invoice = invoices.create( {
                destination : {
                    service : 'google',
                    auth : {
                        username : 'jcook@migrate.io'
                    }
                },
                invoiceNum : '12345',
                userId : 'abcdef'
            } );
            expect( invoice.invoiceId ).toEqual( jasmine.any( String ) );
        } );

        it( 'should be able to read by pk', function () {
            var i = invoices.read( invoice.invoiceId );
            expect( i ).toBeDefined();
            expect( i.invoiceId ).toEqual( invoice.invoiceId );
        } );

        it( 'should be able to read by dest lookup', function () {
            var i = invoices.readByJob( 'abcdef', {
                destination : {
                    service : 'google',
                    auth : {
                        username : 'jcook@migrate.io'
                    }
                }
            } );
            expect( i.invoiceId ).toEqual( invoice.invoiceId );
        } );

        it( 'job lookup with wrong user id should not find results', function () {
            var i = invoices.readByJob( { userId : 'aaaaaa' }, {
                destination : {
                    service : 'google',
                    auth : {
                        username : 'jcook@migrate.io'
                    }
                }
            } );
            expect( i ).toBeNull();
        } );

        it( 'should be able to add comments', function () {
            var date = new Date( '1992-10-03T11:30:00.123Z' );

            var i = invoices.read( invoice.invoiceId );
            expect( i ).toBeDefined();

            i.addComment( 'xyz', 'this is comment #1' );
            i.addComment( 'xyz', 'this is comment #2', date );

            invoices.update( i );

            i = invoices.read( invoice.invoiceId );
            expect( i ).toBeDefined();
            expect( i.comments ).toBeArray();
            expect( i.comments.length ).toEqual( 2 );
            expect( i.comments[0].userId ).toEqual( 'xyz' );
            expect( i.comments[1].userId ).toEqual( 'xyz' );
            expect( i.comments[0].message ).toMatch( '#1' );
            expect( i.comments[1].message ).toMatch( '#2' );

            var elapsed = Date.now() - new Date( i.comments[0].created ).getTime();
            expect( elapsed ).toBeLessThan( 5000 );

            expect( i.comments[1].created ).toEqual( date.toISOString() );
        } );

        it( 'should be able to append jobs', function () {
            var i = invoices.read( invoice.invoiceId );
            expect( i ).toBeDefined();

            var job1 = JSON.parse( JSON.stringify( job_open_1 ) );
            var job2 = JSON.parse( JSON.stringify( job_open_2 ) );

            i.addJob( job1, { payment : 500 } );
            i.addJob( job2, { test : true } );

            invoices.update( i );

            i = invoices.read( invoice.invoiceId );
            expect( i ).toBeDefined();
            expect( i.jobs ).toBeArray();
            expect( i.jobs.length ).toEqual( 2 );

            // Jobs have some additional fields added to them when added, strip those
            // away after ensuring their presence
            i.jobs.forEach(function(job) {
                expect( job.expires ).toMatch( reISO8601 );
                delete job.expires;
                expect( job.starts ).toMatch( reISO8601 );
                delete job.starts;
            });
            expect( i.jobs[1].test ).toEqual( true );
            delete i.jobs[1].test;

            // Make sure default status property was created
            expect( i.jobs[0].status ).toEqual( 'pending' );
            delete i.jobs[0].status;

            // Destination is not stored in jobs array
            delete job1.destination;
            expect( i.jobs[0] ).toEqual( job1 );

            delete job2.destination;
            expect( i.jobs[1] ).toEqual( job2 );
            expect( i.jobs[1].status ).toEqual( 'active' );

            // Test for test property
            expect( i.test.jobId ).toEqual( job2.jobId );
            expect( i.test.starts ).toMatch( reISO8601 );
        } );

    } );

    describe( 'Testing the invoices preauthorization function', function () {

        it( 'should detect incomplete jobs', function () {
            expect(function () {
                invoices.preauthorize( 'user1', new domain.Job( {
                    source : {
                        service : 'microsoft',
                        auth : {
                        }
                    },
                    content : ['contacts', 'mails', 'media']
                } ) );
            } ).toThrowMatch( 'Job is not complete' );

            expect(function () {
                invoices.preauthorize( 'user1', new domain.Job( {
                    source : {
                        auth : {
                            username : 'fred@live.com'
                        }
                    },
                    content : ['contacts', 'mails', 'media']
                } ) );
            } ).toThrowMatch( 'Job is not complete' );

            expect(function () {
                invoices.preauthorize( 'user1', domain.Job( {
                    source : {
                        service : 'microsoft',
                        auth : {
                            username : 'fred@live.com'
                        }
                    },
                    content : []
                } ) );
            } ).toThrowMatch( 'Job is not complete' );
        } );

    } );

    describe( 'Testing the preauth support functions', function () {

        var invoice;

        beforeEach( function () {
            var i = new domain.Invoice({
                destination : {
                    service : 'google',
                    auth : {
                        username : 'jcook@migrate.io'
                    }
                },
                invoiceNum : '12345',
                userId : 'abcdef'
            });
            i.addJob( job_done_1, { payment: 500 });
            i.addJob( job_open_1, { payment: 500 });
            invoice = invoices.create( i );
            expect( invoice.invoiceId ).toEqual( jasmine.any( String ) );
        } );

        it( 'should detect overlap jobs', function () {
            var laps = invoice.overlappingJobs( {
                source : {
                    service : 'microsoft',
                    auth : {
                        username : 'fred@live.com'
                    }
                },
                content : ['contacts', 'mails', 'media']
            } );

            expect( laps ).toBeArray();
            expect( laps.length ).toEqual( 1 );
            expect( laps[0].jobId ).toEqual( 'job_open_1' );
        } );

        it( 'should not detect overlap jobs when job is completed', function () {
            var laps = invoice.overlappingJobs( {
                source : {
                    service : 'yahoo',
                    auth : {
                        username : 'fred@yahoo.com'
                    }
                },
                content : ['contacts', 'mails', 'media']
            } );

            expect( laps ).toBeArray();
            expect( laps.length ).toEqual( 0 );
        } );

        it( 'should not detect overlap jobs when there is no service match', function () {
            var laps = invoice.overlappingJobs( {
                source : {
                    service : 'google',
                    auth : {
                        username : 'fred@live.com'
                    }
                },
                content : ['contacts', 'mails', 'media']
            } );

            expect( laps ).toBeArray();
            expect( laps.length ).toEqual( 0 );
        } );

        it( 'should not detect overlap jobs when there is no username match', function () {
            var laps = invoice.overlappingJobs( {
                source : {
                    service : 'microsoft',
                    auth : {
                        username : 'fred@outlook.com'
                    }
                },
                content : ['contacts', 'mails', 'media']
            } );

            expect( laps ).toBeArray();
            expect( laps.length ).toEqual( 0 );
        } );

        it( 'should not detect overlap jobs when there is no content overlap', function () {
            var laps = invoice.overlappingJobs( {
                source : {
                    service : 'microsoft',
                    auth : {
                        username : 'fred@live.com'
                    }
                },
                content : ['contacts', 'mails', 'calendars']
            } );

            expect( laps ).toBeArray();
            expect( laps.length ).toEqual( 0 );
        } );
    } );

    describe( 'Testing the payment calculation support functions', function () {

        it( 'should report non-imap job as $15', function () {
            var invoice = new domain.Invoice( {
                totalCharged : 0
            } );
            var result = invoice.calculatePayment( {
                source : {
                    auth : {
                        username : 'jcook@gmail.com'
                    }
                }
            } );
            expect( result.charged ).toEqual( 0 );
            expect( result.due ).toEqual( 1500 );
        } );

        it( 'should report imap jobs to non-edu host as $15', function () {
            var invoice = new domain.Invoice( {
                totalCharged : 0
            } );
            var result = invoice.calculatePayment( {
                source : {
                    auth : {
                        hostname : 'imap.aol.com'
                    }
                }
            } );
            expect( result.charged ).toEqual( 0 );
            expect( result.due ).toEqual( 1500 );
        } );

        it( 'should report imap jobs to non-edu host as $5', function () {
            var invoice = new domain.Invoice( {
                totalCharged : 0
            } );
            var result = invoice.calculatePayment( {
                source : {
                    auth : {
                        hostname : 'imap.osu.edu'
                    }
                }
            } );
            expect( result.charged ).toEqual( 0 );
            expect( result.due ).toEqual( 500 );
        } );

        it( 'should report non-imap job as max $15', function () {
            var invoice = new domain.Invoice( {
                totalCharged : 500
            } );
            var result = invoice.calculatePayment( {
                source : {
                    auth : {
                        username : 'jcook@gmail.com'
                    }
                }
            } );
            expect( result.charged ).toEqual( 500 );
            expect( result.due ).toEqual( 1000 );
        } );

        it( 'should report imap jobs to non-edu host as max $15', function () {
            var invoice = new domain.Invoice( {
                totalCharged : 1500
            } );
            var result = invoice.calculatePayment( {
                source : {
                    auth : {
                        hostname : 'imap.aol.com'
                    }
                }
            } );
            expect( result.charged ).toEqual( 1500 );
            expect( result.due ).toEqual( 0 );
        } );

        it( 'should report imap jobs to non-edu host as max $5', function () {
            var invoice = new domain.Invoice( {
                totalCharged : 500
            } );
            var result = invoice.calculatePayment( {
                source : {
                    auth : {
                        hostname : 'imap.osu.edu'
                    }
                }
            } );
            expect( result.charged ).toEqual( 500 );
            expect( result.due ).toEqual( 500 );
        } );

        it( 'should report no charges when charged = $15', function () {
            var invoice = new domain.Invoice( {
                totalCharged : 1500
            } );
            var result = invoice.calculatePayment( {
                source : {
                    auth : {
                        hostname : 'imap.osu.edu'
                    }
                }
            } );
            expect( result.charged ).toEqual( 1500 );
            expect( result.due ).toEqual( 0 );
        } );

    } );

    describe( 'should be able to submit jobs on new invoice', function () {

        var users, userMap, tokenId;

        beforeEach( function () {
            users = new domain.Users( 'dev' );
            expect( users ).toBeDefined();
            try {
                users.create( exUsers.betty );
            } catch ( e ) {
                log.error( 'Error', e );
            }
            userMap = users.backingMap();
        } );

        afterEach( function () {
            userMap.clear();
        } );

        it( 'should be able to handle a normal payment', function () {
            var tokenId = createToken( CARD_GOOD_VISA );

            var userId = exUsers.betty.userId;
            var job = new domain.Job( job_open_1 );
            var payment = { due : 1500, tokenId : tokenId };

            var result = invoices.submitJob( userId, job, payment );

            expect( result ).toBeDefined();
            expect( result.userId ).toEqual( userId );
            expect( result.destination ).toEqual( {
                service : job.destination.service,
                auth : {
                    username : job.destination.auth.username
                }
            } );
            expect( result.totalCharged ).toEqual( 1500 );

            expect( result.invoiceId ).toEqual( jasmine.any( String ) );
            expect( result.invoiceNum ).toEqual( jasmine.any( String ) );

            expect( result.jobs ).toBeArray();
            expect( result.jobs.length ).toEqual( 1 );
        } );

        it( 'should be able to handle a test run', function () {
            var userId = exUsers.betty.userId;
            var job = new domain.Job( job_open_1 );
            var payment = { test : true };

            var result = invoices.submitJob( userId, job, payment );

            expect( result ).toBeDefined();
            expect( result.userId ).toEqual( userId );
            expect( result.destination ).toEqual( {
                service : job.destination.service,
                auth : {
                    username : job.destination.auth.username
                }
            } );
            expect( result.totalCharged ).toEqual( 0 );

            expect( result.invoiceId ).toEqual( jasmine.any( String ) );
            expect( result.invoiceNum ).toEqual( jasmine.any( String ) );

            expect( result.jobs ).toBeArray();
            expect( result.jobs.length ).toEqual( 1 );
        } );

        it( 'will fail with a preauth due mismatch', function () {
            var tokenId = createToken( CARD_GOOD_VISA );

            var userId = exUsers.betty.userId;
            var job = new domain.Job( job_open_1 );
            var payment = { tokenId : tokenId, due : 500 };

            try {
                invoices.submitJob( userId, job, payment );
                expect( true ).toBe( false );
            } catch ( e ) {
                expect( e.status ).toEqual( 400 );
                expect( e.code ).toEqual( 'preauth_due' );
                expect( e.preauth ).toEqual( jasmine.any( Object ) );
                expect( e.payment ).toEqual( jasmine.any( Object ) );
            }
        } );

        it( 'will fail with a bad card', function () {
            var tokenId = createToken( CARD_CHARGE_FAIL );

            var userId = exUsers.betty.userId;
            var job = new domain.Job( job_open_2 );
            var payment = { tokenId : tokenId, due : 1500 };

            try {
                invoices.submitJob( userId, job, payment );
                expect( true ).toBe( false );
            } catch ( e ) {
                expect( e.status ).toEqual( 400 );
                expect( e.code ).toEqual( 'card_declined' );
                expect( e.charge ).toEqual( jasmine.any( Object ) );
                expect( e.detail ).toEqual( jasmine.any( Object ) );
            }
        } );

        it( 'will fail running a test when already tested', function () {
            var tokenId = createToken( CARD_GOOD_VISA );

            var userId = exUsers.betty.userId;
            var job = new domain.Job( job_open_1 );
            var payment = { test : true };

            var invoice = invoices.submitJob( userId, job, payment );
            expect( invoice ).toBeDefined();
            expect( invoice.userId ).toEqual( userId );
            expect( invoice.test.jobId ).toMatch( job.jobId );
            expect( invoice.test.starts ).toMatch( reISO8601 );

            job = new domain.Job( job_open_2 );

            try {
                invoices.submitJob( userId, job, payment );
                expect( true ).toBe( false );
            } catch ( e ) {
                expect( e.status ).toEqual( 400 );
                expect( e.code ).toEqual( 'preauth_test' );
                expect( e.preauth ).toEqual( jasmine.any( Object ) );
                expect( e.payment ).toEqual( jasmine.any( Object ) );
            }
        } );

        it( 'will succeed with a 0 payment due if invoice maxed out', function () {
            var tokenId = createToken( CARD_GOOD_VISA );

            var userId = exUsers.betty.userId;
            var job = new domain.Job( job_open_1 );
            var payment = { tokenId : tokenId, due : 1500 };

            var invoice = invoices.submitJob( userId, job, payment );
            expect( invoice ).toBeDefined();
            expect( invoice.userId ).toEqual( userId );

            job = new domain.Job( job_open_2 );
            payment = { due : 0 };

            invoice = invoices.submitJob( userId, job, payment );
        } );
    } );

    var job_done_1 = {
        jobId : 'job_done_1',
        content : ['mails', 'contacts'],
        status : 'completed',
        source : {
            service : 'yahoo',
            auth : {
                username : 'fred@yahoo.com'
            }
        },
        destination : {
            service : 'google',
            auth : {
                username : 'jcook@migrate.io'
            }
        }
    };

    var job_done_2 = {
        jobId : 'job_done_2',
        content : ['documents'],
        status : 'completed',
        source : {
            service : 'microsoft',
            auth : {
                username : 'fred@live.com'
            }
        },
        destination : {
            service : 'google',
            auth : {
                username : 'jcook@migrate.io'
            }
        }
    };

    var job_open_1 = {
        jobId : 'job_open_1',
        content : ['documents', 'media'],
//        status : 'pending',  Should be auto-created, testing
        source : {
            service : 'microsoft',
            auth : {
                username : 'fred@live.com'
            }
        },
        destination : {
            service : 'google',
            auth : {
                username : 'jcook@migrate.io'
            }
        }
    };

    var job_open_2 = {
        jobId : 'job_open_2',
        content : ['mails'],
        status : 'active',
        source : {
            service : 'imap',
            auth : {
                username : 'fred@example.org'
            }
        },
        destination : {
            service : 'google',
            auth : {
                username : 'jcook@migrate.io'
            }
        }
    };

    var inv_open_jobs2_active1 = {
        destination : {
            service : 'google',
            auth : {
                username : 'jcook@migrate.io'
            }
        },
        invoiceNum : '12345',
        userId : 'user1'
    };


    var inv_open_jobs2_active0 = {
        destination : {
            service : 'google',
            auth : {
                username : 'jcook@migrate.io'
            }
        },
        invoiceNum : '12345',
        userId : 'user2'
    };

    var inv_closed_jobs2_active0 = {
        destination : {
            service : 'google',
            auth : {
                username : 'jcook@migrate.io'
            }
        },
        invoiceNum : '12345',
        userId : 'user2'
    };

    var exUsers = {
        fred : {
            userId : '123',
            name : 'fred',
            email : {
                address : 'fred@bedrock.com',
                status : 'candidate'
            },
            roles : [ 'ROLE_CANDIDATE' ]
        },

        // User is verified and selected a password and run a job.
        wilma : {
            userId : '456',
            name : 'wilma',
            password : '$2a$10$TzHJ5IdWP9ooyXanLoT5uuDYFeCTVUiHLw5JUjY9e8Wr9Ob7STHWC',
            payment : {
                token : 'pay_token_1',
                last4 : '9876',
                type : 'Visa',
                expires : '2016-09-01T00:00:00.000Z'
            },
            services : {
                stripe : {
                    customerId : 'stripe_4382648'
                },
                xero : {
                    customerId : 'xero_9382716'
                }
            },
            email : {
                address : 'wilma@bedrock.com',
                status : 'verified'
            },
            roles : [ 'ROLE_USER' ]
        },

        // User is verified and selected a password, but has not started a run yet.
        betty : {
            userId : '789',
            name : 'betty',
            email : {
                address : 'betty@bedrock.com',
                status : 'verified'
            },
            password : '$2a$10$TzHJ5IdWP9ooyXanLoT5uuDYFeCTVUiHLw5JUjY9e8Wr9Ob7STHWC',
            roles : [ 'ROLE_USER' ]
        },

        // Password is verified, but user has not selected a password yet.
        barney : {
            userId : '987',
            name : 'barney',
            email : {
                address : 'barney@bedrock.com',
                status : 'verified'
            },
            roles : [ 'ROLE_CANDIDATE' ]
        }

    };

} );