describe( 'The google drive service', function () {
    var service;

    beforeEach( function () {
        service = new Google.Drive( {
            access_key : 'adsf',
            refresh_token : 'adfs'
        } );
    } );

    afterEach( function () {
        gDriveCleanSlate( service );
    } );

    it( 'should expose the correct api', function () {
        expect( typeof service.write ).toBe( 'function' );
        expect( typeof service.read ).toBe( 'function' );
    } );

    it( 'should return an array of files when read is called', function () {
        var files = service.read();

        expect( files ).toBeArray();
    } );

    it( 'should write files to google drive properly', function () {

    } );

    it( 'should be able to copy from another drive account without downloading to memory', function () {

    } );

    function gDriveCleanSlate( service ) {
        var files = service.read();

        for ( var i = 0; i < files.length; i++ ) {
            var id = files[i].fileId;

            var opts = {
                url : 'https://www.googleapis.com/drive/v2/files/' + id,
                method : 'DELETE',
                async : false,
                headers : {
                    Authorization : 'Bearer ' + service.credentials.access_key
                }
            };

            var exchange = httpClient.request( opts );
        }
    }
} );