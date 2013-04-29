describe('The GoogleMail service', function () {

    var {Google} = require('migrate');
    var service;

    beforeEach(function () {
        service = new Google.Mail({
            email: 'migratetester@gmail.com',
            password: 'migration10',
            props: {
                'mail.debug': 'false'
            }
        });
    });

    it('should exist', function () {
        expect(service).toBeDefined();
    });

    it('should return the expected email address', function () {
        expect(service.email).toEqual('migratetester@gmail.com');
    });

    it('should connect to the imap server when I call connect', function () {
        expect(function () {
            service.connect();
        }).not.toThrow();

        // If no exception is thrown we've connected successfully.

        // Let's make sure, since this is a test.

        expect(service.store.isConnected()).toBeTruthy();
    });

    describe('The getFolders function', function () {

        beforeEach(function () {

            // Make sure we've not been disconnected. If we have, reconnect.

            if (!service.store.isConnected()) {
                service.connect();
            }
        });

        xit('should return an array of all the folders in the account', function () {
            var log = require('ringo/logging').getLogger(module.id);

            log.info(JSON.stringify(service.getFolders(), null, 4));
            expect(Array.isArray(service.getFolders())).toBeTruthy();
        });

    });

    describe('The read function', function () {

        beforeEach(function () {

            // Make sure we've not been disconnected. If we have, reconnect.

            if (!service.store.isConnected()) {
                service.connect();
            }
        });

        it('should allow me to read an email', function () {
            expect(service.read(service.getFolders()[0], 1, 1)).toBeDefined();
        });

        it('should allow me to read many emails', function () {
            expect(service.read(service.getFolders()[0], 1, 1000)).toBeDefined();
        });

    });

    describe('The write function', function () {

        beforeEach(function () {

            // Make sure we've not been disconnected. If we have, reconnect.

            if (!service.store.isConnected()) {
                service.connect();
            }
        });

        it('should allow me to write an email to the server', function () {
            // We need a mock email, and this email account isn't wiped, so let's generate a semi-random string and test for it.
            // Thanks, stack overflow: http://stackoverflow.com/questions/6248666/how-to-generate-short-uid-like-ax4j9z-in-js
            var uid = ("0000" + (Math.random()*Math.pow(36,4) << 0).toString(36)).substr(-4);

            // Now we need to start writing a new email.
            // The message constructor takes a session as an argument.
            var email = new javax.mail.Internet.MimeMessage(service.session);

            // Now lets fill out some dummy data in the message.
            email.setFrom(new javax.mail.Internet.InternetAddress('test@migrate.io'));
            email.setRecipient(javax.mail.Message.RecipientType.TO, new javax.mail.Internet.InternetAddress('migratetester@gmail.com'));

            // This is the main thing we'll test for, since its the one that will be unique-ish.
            email.setSubject(uid);

            var sentDate = new java.util.Date();

            // This one is also going to be tested, since it **will** be unique.
            email.setSentDate(sentDate);

            // Completeness.
            email.setText('This is a test email. Hello!');

            // Alright, our email is constructed, lets append it to the server.

            // We have to initialize an array, since that's what write takes.
            var emails = [email];

            // And with this called, we should be ready to test.
            var result = service.write('INBOX', emails);

            // Our returned successCount should be 1, and our errors should be empty
            expect(result.successCount).toBe(1);
            expect(result.errors).toEqual([]);

            // Now we'll need to get the email we just wrote. Probably gonna break out of the regular api here and call some **java** directly.

            // Hm, theoretically it should be the last written email, so lets grab that one.
            var folder = service.store.getFolder('INBOX');
            var count = folder.getMessageCount();

            // This shouldn't be necessary, as it should still be open from the write call. However, we include this just to be sure.
            if(!folder.isOpen) {
                folder.open(javax.mail.Folder.READ_ONLY);
            }

            // Since it should be the last email, we call getMessages with a new array containing the count.
            // Message numbers shouldn't have gaps, so this should return the last email.
            var testEmail = service.store.getMessages([count]);

            // Alright, we have our email, lets test it.
            expect(testEmail.getSubject()).toBe(uid);
            expect(testEmail.getSentDate()).toBe(sentDate);
            expect(testEmail.getSender().toString()).toBe('test@migrate.io');
            // This one is probably uh, not right.
            expect(testEmail.getRecipients(javax.mail.Message.RecipientType.TO)[0].toString()).toBe('migratetester@gmail.com');
        });
    });

    describe('The writeFolders function', function () {

        beforeEach(function () {

            // Make sure we've not been disconnected. If we have, reconnect.

            if (!service.store.isConnected()) {
                service.connect();
            }
        });

        it('should write all the folders passed in, if they do not already exist', function () {

        });
    });
});
