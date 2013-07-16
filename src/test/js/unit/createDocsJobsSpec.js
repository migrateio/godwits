describe( 'Splitting up docs jobs', function () {

    function splitJobs( files ) {
        var result = [];
        var i = 0;

        while ( files.length - 1 > 0 ) {
            result.push( {
                files : files.splice( 0, Math.min( 50, files.length - 1 ) )
            } );
        }

        return result;
    }

    var mockData = [];

    beforeEach( function () {
        mockData = [];

        var i = 0;

        while ( mockData.length < 1234 ) {
            mockData.push( {
                "kind":"drive#file",
                "id":"" + ++i,
                "etag":"\"J8kzJ67EL2P-zhJXkqDC6KDbQaE/MTM3MzkzODEyMjUzMg\"",
                "selfLink":"https://www.googleapis.com/drive/v2/files/1IT_3Pn2q5_QXg6vyeD8Woo9X0yhX3ZCmGcF-yQbEvoA",
                "alternateLink":"https://docs.google.com/a/migrate.io/document/d/1IT_3Pn2q5_QXg6vyeD8Woo9X0yhX3ZCmGcF-yQbEvoA/edit?usp=drivesdk",
                "embedLink":"https://docs.google.com/a/migrate.io/document/d/1IT_3Pn2q5_QXg6vyeD8Woo9X0yhX3ZCmGcF-yQbEvoA/preview",
                "openWithLinks":{
                    "619683526622":"https://docs.google.com/a/migrate.io/document/d/1IT_3Pn2q5_QXg6vyeD8Woo9X0yhX3ZCmGcF-yQbEvoA/edit?usp=drive_web"
                },
                "defaultOpenWithLink":"https://docs.google.com/a/migrate.io/document/d/1IT_3Pn2q5_QXg6vyeD8Woo9X0yhX3ZCmGcF-yQbEvoA/edit?usp=drive_web",
                "iconLink":"https://ssl.gstatic.com/docs/doclist/images/icon_11_document_list.png",
                "thumbnailLink":"https://docs.google.com/a/migrate.io/feeds/vt?gd=true&id=1IT_3Pn2q5_QXg6vyeD8Woo9X0yhX3ZCmGcF-yQbEvoA&v=26&s=AMedNnoAAAAAUeWn9Hk0XJcCUXaVLGaSLiWaiWf_bFAW&sz=s220",
                "title":"Selecting Services",
                "mimeType":"application/vnd.google-apps.document",
                "labels":{
                    "starred":false,
                    "hidden":false,
                    "trashed":false,
                    "restricted":false,
                    "viewed":false
                },
                "createdDate":"2013-07-15T22:32:19.551Z",
                "modifiedDate":"2013-07-16T01:28:42.532Z",
                "parents":[
                    {
                        "kind":"drive#parentReference",
                        "id":"0B2qYo3bL67RWUlpiMzZNbUZYdTQ",
                        "selfLink":"https://www.googleapis.com/drive/v2/files/1IT_3Pn2q5_QXg6vyeD8Woo9X0yhX3ZCmGcF-yQbEvoA/parents/0B2qYo3bL67RWUlpiMzZNbUZYdTQ",
                        "parentLink":"https://www.googleapis.com/drive/v2/files/0B2qYo3bL67RWUlpiMzZNbUZYdTQ",
                        "isRoot":false
                    }
                ],
                "exportLinks":{
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":"https://docs.google.com/feeds/download/documents/export/Export?id=1IT_3Pn2q5_QXg6vyeD8Woo9X0yhX3ZCmGcF-yQbEvoA&exportFormat=docx",
                    "application/vnd.oasis.opendocument.text":"https://docs.google.com/feeds/download/documents/export/Export?id=1IT_3Pn2q5_QXg6vyeD8Woo9X0yhX3ZCmGcF-yQbEvoA&exportFormat=odt",
                    "text/html":"https://docs.google.com/feeds/download/documents/export/Export?id=1IT_3Pn2q5_QXg6vyeD8Woo9X0yhX3ZCmGcF-yQbEvoA&exportFormat=html",
                    "application/rtf":"https://docs.google.com/feeds/download/documents/export/Export?id=1IT_3Pn2q5_QXg6vyeD8Woo9X0yhX3ZCmGcF-yQbEvoA&exportFormat=rtf",
                    "text/plain":"https://docs.google.com/feeds/download/documents/export/Export?id=1IT_3Pn2q5_QXg6vyeD8Woo9X0yhX3ZCmGcF-yQbEvoA&exportFormat=txt",
                    "application/pdf":"https://docs.google.com/feeds/download/documents/export/Export?id=1IT_3Pn2q5_QXg6vyeD8Woo9X0yhX3ZCmGcF-yQbEvoA&exportFormat=pdf"
                },
                "userPermission":{
                    "kind":"drive#permission",
                    "etag":"\"J8kzJ67EL2P-zhJXkqDC6KDbQaE/Uo-JosPPHa2v7UHmZfyAIe7mswI\"",
                    "id":"me",
                    "selfLink":"https://www.googleapis.com/drive/v2/files/1IT_3Pn2q5_QXg6vyeD8Woo9X0yhX3ZCmGcF-yQbEvoA/permissions/me",
                    "role":"writer",
                    "type":"user"
                },
                "quotaBytesUsed":"0",
                "ownerNames":[
                    "James Cook"
                ],
                "owners":[
                    {
                        "kind":"drive#user",
                        "displayName":"James Cook",
                        "picture":{
                            "url":"https://lh3.googleusercontent.com/-Q5hcu0L--c0/AAAAAAAAAAI/AAAAAAAAAB4/0n8KV6QuGRo/s64/photo.jpg"
                        },
                        "isAuthenticatedUser":false,
                        "permissionId":"03238847639470767805"
                    }
                ],
                "lastModifyingUserName":"Kevin Sturdevant",
                "lastModifyingUser":{
                    "kind":"drive#user",
                    "displayName":"Kevin Sturdevant",
                    "picture":{
                        "url":"https://lh3.googleusercontent.com/-KVJ3cHBqJ9M/AAAAAAAAAAI/AAAAAAAACkQ/4x3_gkzZSCI/s64/photo.jpg"
                    },
                    "isAuthenticatedUser":false,
                    "permissionId":"07200852051728912069"
                },
                "editable":true,
                "writersCanShare":true,
                "shared":true,
                "appDataContents":false
            } );
        }
    } );

    it( 'should split into chunks', function () {
        var res = splitJobs( mockData );
        expect( res ).toBeArray();
        expect( res[0].files ).toBeArray();
    } );

    it( 'should not alter the data', function () {
        var res = splitJobs( mockData );
        expect( res[0].files[0].kind ).toBe( 'drive#file' );
    } );
} );