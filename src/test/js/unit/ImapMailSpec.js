function writeTests( service ) {
    describe( 'The write function', function () {

        beforeEach( function () {

            // Make sure we've not been disconnected. If we have, reconnect.

            if ( !service.store.isConnected() ) {
                service.connect();
            }
        } );

        it( 'should allow me to write an email to the server', function () {
            // We need a mock email, and this email account isn't wiped, so let's generate a semi-random string and test for it.
            // Thanks, stack overflow: http://stackoverflow.com/questions/6248666/how-to-generate-short-uid-like-ax4j9z-in-js
            var uid = ("0000" + (Math.random() * Math.pow( 36, 4 ) << 0).toString( 36 )).substr( -4 );

            // Now we need to start writing a new email.
            // The message constructor takes a session as an argument.
            var email = new javax.mail.internet.MimeMessage( service.session );

            // Now lets fill out some dummy data in the message.
            email.setFrom( new javax.mail.internet.InternetAddress( 'test@migrate.io' ) );
            email.setRecipient( javax.mail.Message.RecipientType.TO, new javax.mail.internet.InternetAddress( service.email ) );

            // This is the main thing we'll test for, since its the one that will be unique-ish.
            email.setSubject( uid );

            var sentDate = new java.util.Date();

            // This one is also going to be tested, since it **will** be unique.
            email.setSentDate( sentDate );

            // Completeness.
            email.setText( 'This is a test email. Hello!' );

            // Alright, our email is constructed, lets append it to the server.

            // We have to initialize an array, since that's what write takes.
            var emails = [email];

            // And with this called, we should be ready to test.
            var result = service.write( 'INBOX', emails );

            // Our returned successCount should be 1, and our errors should be empty
            expect( result.successCount ).toBe( 1 );
            expect( result.errors ).toEqual( [] );

            // Now we'll need to get the email we just wrote. Probably gonna break out of the regular api here and call some **java** directly.

            // Hm, theoretically it should be the last written email, so lets grab that one.
            var folder = service.store.getFolder( 'INBOX' );
            var count = folder.getMessageCount();

            // This shouldn't be necessary, as it should still be open from the write call. However, we include this just to be sure.
            if ( !folder.isOpen() ) {
                folder.open( javax.mail.Folder.READ_ONLY );
            }

            // Since it should be the last email, we call getMessages with a new array containing the count.
            // Message numbers shouldn't have gaps, so this should return the last email.
            var testEmail = folder.getMessages( [count] );

            // getMessages returns an array, so lets alias that to a single message object.
            testEmail = testEmail[0];

            // Alright, we have our email, lets test it.
            expect( testEmail.getSubject() ).toBe( uid );
            expect( testEmail.getSentDate().toString() ).toEqual( sentDate.toString() );
            expect( testEmail.getSender().toString() ).toBe( 'test@migrate.io' );

            // This one is probably uh, not right.
            expect( testEmail.getRecipients( javax.mail.Message.RecipientType.TO )[0].toString() ).toBe( service.email );

            // All done.
        } );

        // Todo: refactor this DRY-style.
        it( 'should allow me to write an email with an attachment to the server', function () {
            // We need a mock email, and this email account isn't wiped, so let's generate a semi-random string and test for it.
            // Thanks, stack overflow: http://stackoverflow.com/questions/6248666/how-to-generate-short-uid-like-ax4j9z-in-js
            var uid = ("0000" + (Math.random() * Math.pow( 36, 4 ) << 0).toString( 36 )).substr( -4 );

            // Now we need to start writing a new email.
            // The message constructor takes a session as an argument.
            var email = new javax.mail.internet.MimeMessage( service.session );

            // Now lets fill out some dummy data in the message.
            email.setFrom( new javax.mail.internet.InternetAddress( 'test@migrate.io' ) );
            email.setRecipient( javax.mail.Message.RecipientType.TO, new javax.mail.internet.InternetAddress( service.email ) );

            // This is the main thing we'll test for, since its the one that will be unique-ish.
            email.setSubject( uid );

            var sentDate = new java.util.Date();

            // This one is also going to be tested, since it **will** be unique.
            email.setSentDate( sentDate );

            var bodyPart = new javax.mail.internet.MimeBodyPart();

            bodyPart.setText( 'Test email w/ attachment.' );

            var multipart = new javax.mail.internet.MimeMultipart();
            multipart.addBodyPart( bodyPart );

            var attachment = new javax.mail.internet.MimeBodyPart();

            var json = JSON.stringify( {
                'test' : uid
            } );

            //Found an easier way to do the attachment. using it
            var ds = new javax.mail.util.ByteArrayDataSource( json, 'application/json' );
            attachment.setDataHandler( new javax.activation.DataHandler( ds ) );
            attachment.setFileName( 'test.json' );
            multipart.addBodyPart( attachment );

            email.setContent( multipart );
            // Alright, our email is constructed, lets append it to the server.

            // We have to initialize an array, since that's what write takes.
            var emails = [email];

            // And with this called, we should be ready to test.
            var result = service.write( 'INBOX', emails );

            // Our returned successCount should be 1, and our errors should be empty
            expect( result.successCount ).toBe( 1 );
            expect( result.errors ).toEqual( [] );

            // Now we'll need to get the email we just wrote. Probably gonna break out of the regular api here and call some **java** directly.

            // Hm, theoretically it should be the last written email, so lets grab that one.
            var folder = service.store.getFolder( 'INBOX' );
            var count = folder.getMessageCount();

            // This shouldn't be necessary, as it should still be open from the write call. However, we include this just to be sure.
            if ( !folder.isOpen() ) {
                folder.open( javax.mail.Folder.READ_ONLY );
            }

            // Since it should be the last email, we call getMessages with a new array containing the count.
            // Message numbers shouldn't have gaps, so this should return the last email.
            var testEmail = folder.getMessages( [count] );

            // getMessages returns an array, so lets alias that to a single message object.
            testEmail = testEmail[0];

            // Alright, we have our email, lets test it.
            expect( testEmail.getSubject() ).toBe( uid );
            expect( testEmail.getSentDate().toString() ).toEqual( sentDate.toString() );
            expect( testEmail.getSender().toString() ).toBe( 'test@migrate.io' );

            var emailTestMultiPart = testEmail.getContent();
            var attachmentTestPart, stringTestPart;

            for ( var i = 0; i < emailTestMultiPart.getCount(); i++ ) {
                if ( emailTestMultiPart.getBodyPart( i ).getDisposition() ) {
                    attachmentTestPart = emailTestMultiPart.getBodyPart( i );
                } else {
                    stringTestPart = emailTestMultiPart.getBodyPart( i );
                }
            }

            if ( !attachmentTestPart ) {
                for ( i = 0; i < emailTestMultiPart.getCount(); i++ ) {
                    log.info( service.email + ": " + emailTestMultiPart.getBodyPart( i ).getContentType() );
                    log.info( service.email + ": " + emailTestMultiPart.getBodyPart( i ).getDisposition() );
                }
            }

            expect( attachmentTestPart ).toBeDefined();
            expect( attachmentTestPart.getDataHandler().getName() ).toBe( 'test.json' );
            expect( stringTestPart.getContent() ).toBe( 'Test email w/ attachment.' );

            // This one is probably uh, not right.
            expect( testEmail.getRecipients( javax.mail.Message.RecipientType.TO )[0].toString() ).toBe( service.email );

            // All done.
        } );
    } );
}

function getFoldersTests( service ) {
    describe( 'The getFolders function', function () {

        beforeEach( function () {

            // Make sure we've not been disconnected. If we have, reconnect.

            if ( !service.store.isConnected() ) {
                service.connect();
            }
        } );

        it( 'should return an array of all the folders in the account', function () {
            var folders = service.getFolders();

            expect( folders.forEach ).toBeTruthy();
            expect( folders.map ).toBeTruthy();
            expect( folders.length > 1 ).toBeTruthy();

            var result = false;

            for ( var i = 0; i < folders.length; i++ ) {
                if ( folders[i].getName().toLowerCase() === 'inbox' ) {
                    result = true;
                }
            }

            expect( result ).toBeTruthy();
        } );

    } );
}

function readTests( service ) {
    describe( 'The read function', function () {

        beforeEach( function () {

            // Make sure we've not been disconnected. If we have, reconnect.

            if ( !service.store.isConnected() ) {
                service.connect();
            }
        } );

        it( 'should allow me to read an email', function () {
            expect( service.read( service.getFolders()[0], 1, 1 ) ).toBeDefined();
        } );

        it( 'should allow me to read many emails', function () {
            expect( service.read( service.getFolders()[0], 1, 1000 ) ).toBeDefined();
        } );

    } );
}

function writeFoldersTests( service ) {
    describe( 'The writeFolders function', function () {

        beforeEach( function () {

            // Make sure we've not been disconnected. If we have, reconnect.

            if ( !service.store.isConnected() ) {
                service.connect();
            }
        } );

        it( 'should write all the folders passed in, if they do not already exist', function () {
            var uid = ("0000" + (Math.random() * Math.pow( 36, 4 ) << 0).toString( 36 )).substr( -4 );

            var result = service.writeFolders( [uid] );

            expect( result.successCount ).toBe( 1 );
            expect( result.errors ).toEqual( [] );

            var folders = service.getFolders();
            var testFolder;

            for ( var i = 0; i < folders.length; i++ ) {
                if ( folders[i].getName() === uid ) {
                    testFolder = folders[i];
                }
            }

            expect( testFolder ).toBeDefined();
            expect( testFolder.getName() ).toBe( uid );
        } );
    } );
}

