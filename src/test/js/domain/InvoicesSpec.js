var log = require( 'ringo/logging' ).getLogger( module.id );

var store = require( 'hazelstore' );
var domain = require( 'domain' );

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

        it( 'should have starts and expires properties set', function () {
            var i = invoices.read( invoice.invoiceId );
            expect( i ).toBeDefined();

            expect( i.starts ).toEqual( jasmine.any( String ) );
            expect( i.expires ).toEqual( jasmine.any( String ) );

            var elapsed = Date.now() - new Date( i.starts ).getTime();
            expect( elapsed ).toBeLessThan( 5000 );

            log.info( 'Dates: ', i.starts, i.expires );
            var diff = new Date( i.expires ).getTime() - new Date( i.starts ).getTime();
            expect( diff ).toEqual( 1000 * 60 * 60 * 24 * 30 );
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
            expect( i ).toBeArray();
            expect( i.length ).toEqual( 1 );
            expect( i[0].invoiceId ).toEqual( invoice.invoiceId );
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
            expect( i ).toEqual( [] );
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
            var date = new Date( '1992-10-03T11:30:00.123Z' );

            var i = invoices.read( invoice.invoiceId );
            expect( i ).toBeDefined();

            var job1 = {
                jobId : 'job_1',
                content : ['mails', 'contacts'],
                source : {
                    service : 'yahoo',
                    auth : {
                        username : 'fred@yahoo.com'
                    }
                }
            };
            var job2 = {
                jobId : 'job_2',
                content : ['documents', 'media'],
                status : 'active',
                source : {
                    service : 'microsoft',
                    auth : {
                        username : 'fred@live.com'
                    }
                }
            };

            i.addJob( job1 );
            i.addJob( job2 );

            invoices.update( i );

            i = invoices.read( invoice.invoiceId );
            expect( i ).toBeDefined();
            expect( i.jobs ).toBeArray();
            expect( i.jobs.length ).toEqual( 2 );
            expect( i.jobs[1] ).toEqual( job2 );

            // Make sure default status property was created
            expect( i.jobs[0].status ).toEqual( 'pending' );
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
            invoice = invoices.create( {
                destination : {
                    service : 'google',
                    auth : {
                        username : 'jcook@migrate.io'
                    }
                },
                jobs : [
                    {
                        jobId : 'job_1',
                        content : ['mails', 'contacts'],
                        status : 'completed',
                        source : {
                            service : 'yahoo',
                            auth : {
                                username : 'fred@yahoo.com'
                            }
                        }
                    },
                    {
                        jobId : 'job_2',
                        content : ['documents', 'media'],
                        status : 'active',
                        source : {
                            service : 'microsoft',
                            auth : {
                                username : 'fred@live.com'
                            }
                        }
                    }
                ],
                invoiceNum : '12345',
                userId : 'abcdef'
            } );
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
            expect( laps[0].jobId ).toEqual( 'job_2' );
        } );

        it( 'should detect overlap jobs when job is completed', function () {
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
            expect( result.due ).toEqual( 15 );
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
            expect( result.due ).toEqual( 15 );
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
            expect( result.due ).toEqual( 5 );
        } );

        it( 'should report non-imap job as max $15', function () {
            var invoice = new domain.Invoice( {
                totalCharged : 5
            } );
            var result = invoice.calculatePayment( {
                source : {
                    auth : {
                        username : 'jcook@gmail.com'
                    }
                }
            } );
            expect( result.charged ).toEqual( 5 );
            expect( result.due ).toEqual( 10 );
        } );

        it( 'should report imap jobs to non-edu host as max $15', function () {
            var invoice = new domain.Invoice( {
                totalCharged : 15
            } );
            var result = invoice.calculatePayment( {
                source : {
                    auth : {
                        hostname : 'imap.aol.com'
                    }
                }
            } );
            expect( result.charged ).toEqual( 15 );
            expect( result.due ).toEqual( 0 );
        } );

        it( 'should report imap jobs to non-edu host as max $5', function () {
            var invoice = new domain.Invoice( {
                totalCharged : 5
            } );
            var result = invoice.calculatePayment( {
                source : {
                    auth : {
                        hostname : 'imap.osu.edu'
                    }
                }
            } );
            expect( result.charged ).toEqual( 5 );
            expect( result.due ).toEqual( 5 );
        } );

        it( 'should report no charges when charged = $15', function () {
            var invoice = new domain.Invoice( {
                totalCharged : 15
            } );
            var result = invoice.calculatePayment( {
                source : {
                    auth : {
                        hostname : 'imap.osu.edu'
                    }
                }
            } );
            expect( result.charged ).toEqual( 15 );
            expect( result.due ).toEqual( 0 );
        } );

    } );

    var inv_open_jobs2_active1 = {
        destination : {
            service : 'google',
            auth : {
                username : 'jcook@migrate.io'
            }
        },
        jobs : [
            {
                jobId : 'job_1',
                content : ['mails', 'contacts'],
                status : 'completed',
                source : {
                    service : 'yahoo',
                    auth : {
                        username : 'fred@yahoo.com'
                    }
                }
            },
            {
                jobId : 'job_2',
                content : ['documents', 'media'],
                status : 'active',
                source : {
                    service : 'microsoft',
                    auth : {
                        username : 'fred@live.com'
                    }
                }
            }
        ],
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
        jobs : [
            {
                jobId : 'job_1',
                content : ['mails', 'contacts'],
                status : 'completed',
                source : {
                    service : 'yahoo',
                    auth : {
                        username : 'fred@yahoo.com'
                    }
                }
            },
            {
                jobId : 'job_2',
                content : ['documents', 'media'],
                status : 'pending',
                source : {
                    service : 'microsoft',
                    auth : {
                        username : 'fred@live.com'
                    }
                }
            }
        ],
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
        starts : '2012-05-19T16:20:00.000Z',
        expires : '2012-06-19T16:20:00.000Z',
        jobs : [
            {
                jobId : 'job_1',
                content : ['mails', 'contacts'],
                status : 'completed',
                source : {
                    service : 'yahoo',
                    auth : {
                        username : 'fred@yahoo.com'
                    }
                }
            },
            {
                jobId : 'job_2',
                content : ['documents', 'media'],
                status : 'pending',
                source : {
                    service : 'microsoft',
                    auth : {
                        username : 'fred@live.com'
                    }
                }
            }
        ],
        invoiceNum : '12345',
        userId : 'user2'
    };

} );