describe('The GoogleMail service', function () {

    var {Google} = require('migrate');
    var service;

    beforeEach(function () {
        service = new Google.Mail({
            email: 'migratetester@gmail.com',
            password: 'migration10'
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

            if(!service.store.isConnected()) {
                service.connect();
            }
        });

        it('should return an array of all the folders in the account', function () {
            expect(Array.isArray(service.getFolders())).toBeTruthy();
        });

    });

    describe('The read function', function () {

        beforeEach(function () {

            // Make sure we've not been disconnected. If we have, reconnect.

            if(!service.store.isConnected()) {
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

});

