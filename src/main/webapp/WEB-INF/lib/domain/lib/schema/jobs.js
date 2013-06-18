exports.schema = {
    type: 'object',
    properties: {
        jobId: {
            type: 'string'
        },
        status: {
            type: 'string',
            'enum': ['pending', 'active', 'stopped', 'completed'],
            'default': 'pending'
        },
        source: {
            type: 'object',
            properties: {
                service: {
                    type: 'string',
                    'enum': ['google', 'yahoo', 'microsoft', 'imap']
                },
                auth: {
                    type : 'object',
                    properties : {
                        username : {
                            type : 'string'
                        },
                        password : {
                            type: 'string',
                            strip: 'ROLE_USER'
                        },
                        accessToken : {
                            type: 'string',
                            strip: 'ROLE_USER'
                        },
                        refreshToken : {
                            type: 'string',
                            strip: 'ROLE_USER'
                        }
                    }
                }
            },
            required: ['service']
        },
        destination: {
            type: 'object',
            properties: {
                service: {
                    type: 'string',
                    'enum': ['google', 'yahoo', 'microsoft', 'imap']
                },
                auth: {
                    type : 'object',
                    properties : {
                        username : {
                            type : 'string'
                        },
                        password : {
                            type: 'string',
                            strip: 'ROLE_USER'
                        },
                        accessToken : {
                            type: 'string',
                            strip: 'ROLE_USER'
                        },
                        refreshToken : {
                            type: 'string',
                            strip: 'ROLE_USER'
                        }
                    }
                }
            },
            required: ['service']
        },
        content: {
            type: 'array',
            items: {
                type: 'string',
                'enum': ['mails', 'calendars', 'contacts', 'media', 'documents']
            },
            "uniqueItems": true,
            additionalItems: false
        },
        created: {
            type: 'string',
            format: 'date-time'
        }
    },
    additionalProperties: false,
    required: ['jobId', 'status']
};