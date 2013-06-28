function mailMigrationTest( sourceService, destinationService ) {
    xdescribe( 'Mail should be successfully migrated from service to service', function () {

        beforeEach( function () {
            if ( !sourceService.store.isConnected() ) {
                sourceService.connect();
            }

            if ( !destinationService.store.isConnected() ) {
                destinationService.connect();
            }
        } );

        afterEach( function () {
            sourceService.store.close();
            destinationService.store.close();
        } );

        var folders = [];

        it( 'should read the folder structure from source service', function () {
            folders = sourceService.getFolders();

            expect( folders ).toBeDefined();
            expect( folders.length ).toBeDefined();
            expect( folders.forEach ).toBeTruthy();
            expect( folders.map ).toBeTruthy();

            var result = false;

            for ( var i = 0; i < folders.length; i++ ) {
                if ( folders[i].getName().toLowerCase() === 'inbox' ) {
                    result = true;
                }
            }
            // Every mailbox should contain an inbox.
            expect( result ).toBeTruthy();
        } );

        it( 'should write the read folder structure to the destination service', function () {

            expect(function () {
                var result;

                result = destinationService.writeFolders( folders );

                expect( result.successCount ).toBe( folders.length );
                expect( result.errors ).toEqual( [] );

            } ).not.toThrow();
        } );

        it( 'should have mirrored the folder structure across accounts', function () {
            var matches = 0;
//            log.info('initialized matches to {}', matches);

            var readFolders = destinationService.getFolders();

            for ( var i = 0; i < folders.length; i++ ) {
                for ( var j = 0; j < readFolders.length; j++ ) {
//                    log.info('Folders being tested: {}, {}', folders[i].getFullName(), readFolders[j].getFullName());

                    if ( folders[i].getFullName() === readFolders[j].getFullName() ) {
                        matches++;
//                        log.info('match found, matches incremented to: {}', matches);
                    }
                }

                expect( matches ).toEqual( i + 1 );

//                if(matches !== i+1) {
//                    log.info('No match found, iteration: {}', i);
//                }
            }

//            log.info('I expect matches to equal: {}, it is: {}', folders.length, matches);
            expect( matches ).toEqual( folders.length );

            if ( matches !== folders.length || !matches ) {
                log.info( 'Services: {}, {} do not match together :(', sourceService.email, destinationService.email );
            }
        } );

        var mails = [];

        it( 'should read emails from the source service', function () {
            var folds = sourceService.getFolders();

            for ( var i = 0; i < folds.length; i++ ) {
                var len = folds[i].getMessageCount();

                expect( len ).toBeDefined();

                mails.push( {
                    len: len,
                    folder : folds[i],
                    items : sourceService.read( folds[i], 1, ++len )
                } );

                expect( mails.items ).toBeDefined();
            }

        } );

        it( 'should write emails to the destination service', function () {
            for ( var i = 0; i < mails.length; i++ ) {
                // just to be safe.
                destinationService.writeFolders( [mails[i].folder] );
                var result = destinationService.write( mails[i].folder, mails[i].items );

                expect( result.successCount ).toBe( mails[i].items.length );
                expect( result.errors ).toEqual( [] );
            }
        } );

        it( 'should have copied the emails to the destination service such that when read, the emails are the same on both services', function () {
            var matches = 0;
            var matchesExpected = 0;

            for ( var i = 0; i < mails.length; i++ ) {
                var len = mails[i].len;

                matchesExpected += mails[i].items.length;

                expect( len ).toBeDefined();

                var moreMails = destinationService.read( mails[i].folder, 1, ++len );

                for ( var j = 0; j < moreMails.length; j++ ) {
                    // This is quite naive.
                    if ( moreMails[i].getSubject() === mails[i].items[j].getSubject() ) {
                        matches++;
                    }
                }

                expect( matches ).toEqual( matchesExpected );
            }
        } );
    } );
}