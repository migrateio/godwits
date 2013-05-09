"use strict";

var log = require( 'ringo/logging' ).getLogger( module.id );
var {jsonToProps, propsToJson} = require( 'hazelstore/utils' );

function convertCheck(msg, actual, expected) {

    it(msg, function() {
        var result = jsonToProps( actual );
        expect( result ).toEqual( expected );
        result = propsToJson( result );
        expect( result ).toEqual( actual );
    });
}

describe( 'Json to Props Conversion', function () {

    convertCheck( 'should be able to convert simplest strings',
        {
            name : 'fred'
        },
        {
            name : 'fred'
        }
    );

    convertCheck( 'should be able to convert simple strings',
        {
            name : 'fred',
            city : 'bedrock',
            friend : 'barney'
        },
        {
            name : 'fred',
            city : 'bedrock',
            friend : 'barney'
        }
    );

    convertCheck( 'should be able to handle nested simple strings',
        {
            name : 'fred',
            city : 'bedrock',
            associate : {
                name : 'barney',
                rel : 'friend',
                spouse: {
                    name: 'betty',
                    rel: 'wife'
                }
            }
        },
        {
            name : 'fred',
            city : 'bedrock',
            'associate.name' : 'barney',
            'associate.rel' : 'friend',
            'associate.spouse.name' : 'betty',
            'associate.spouse.rel' : 'wife'
        }
    );


    convertCheck( 'should be able to convert simple arrays',
        [
            'fred', 'barney', 'wilma'
        ],
        {
            '[0]': 'fred',
            '[1]' : 'barney',
            '[2]' : 'wilma'
        }
    );

    // todo: Not sure what to do with an empty array
    convertCheck( 'should be able to convert the simplest array',
        [],
        {
            '[]': ''
        }
    );

    convertCheck( 'should be able to convert 2d arrays',
        [[
            'fred', 'barney', 'wilma'
        ]],
        {
            '[0].[0]': 'fred',
            '[0].[1]' : 'barney',
            '[0].[2]' : 'wilma'
        }
    );

        convertCheck( 'should be able to handle deeply nested arrays',
            [[[[[
                'fred', 'barney', 'wilma'
            ]]]]],
            {
                '[0].[0].[0].[0].[0]': 'fred',
                '[0].[0].[0].[0].[1]': 'barney',
                '[0].[0].[0].[0].[2]': 'wilma'
            }
        );

     convertCheck( 'should be able to handle numbers',
            {
                name : 'fred',
                age : 42,
                'bowling-avg' : 209.12
            },
            {
                name : 'fred',
                age : 42,
                'bowling-avg' : 209.12
            }
        );


     convertCheck( 'should be able to handle dates',
            (function () {
                var d = new Date();
                d.setUTCFullYear( 1992 );
                d.setUTCMonth( 9 );
                d.setUTCDate( 3 );
                d.setUTCHours( 16 );
                d.setUTCMinutes( 20 );
                d.setUTCSeconds( 2 );
                d.setUTCMilliseconds( 153 );

                return {
                    name : 'fred',
                    dob : d
                };
            })(),
            {
                name : 'fred',
                dob : '1992-10-03T16:20:02.153Z'
            }
        );


     convertCheck( 'should be able to handle arrays',
            {
                name : 'fred',
                city : 'bedrock',
                friends : ['barney', 'betty']
            },
            {
                name : 'fred',
                city : 'bedrock',
                'friends.[0]' : 'barney',
                'friends.[1]' : 'betty'
            }
        );

     convertCheck( 'should be able to handle complex values',
            {
                name : 'fred',
                city : 'bedrock',
                pets : ['dino'],
                associates : {
                    friends : [
                        {
                            name : 'barney',
                            family : [
                                { name : 'betty', male: false, age : 26 },
                                { name : 'bambam', male: true, age : 3 }
                            ]
                        }
                    ],
                    work : [
                        {
                            name : 'barney',
                            family : [
                                { name : 'betty', age : 26 },
                                { name : 'bambam', age : 3 }
                            ]
                        },
                        {
                            name : 'slate',
                            family : []
                        }
                    ]
                }
            },
            {
                name : 'fred',
                city : 'bedrock',
                'pets.[0]' : 'dino',
                'associates.friends.[0].name' : 'barney',
                'associates.friends.[0].family.[0].name' : 'betty',
                'associates.friends.[0].family.[0].male' : false,
                'associates.friends.[0].family.[0].age' : 26,
                'associates.friends.[0].family.[1].name' : 'bambam',
                'associates.friends.[0].family.[1].male' : true,
                'associates.friends.[0].family.[1].age' : 3,
                'associates.work.[0].name' : 'barney',
                'associates.work.[0].family.[0].name' : 'betty',
                'associates.work.[0].family.[0].age' : 26,
                'associates.work.[0].family.[1].name' : 'bambam',
                'associates.work.[0].family.[1].age' : 3,
                'associates.work.[1].name' : 'slate',
                'associates.work.[1].family.[]' : ''
            }
        );
} );
