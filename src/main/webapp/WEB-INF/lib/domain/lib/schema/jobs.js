exports.schema = {
    type: 'object',
    properties: {
        id: {
            type: 'string'
        },
        source: {
            type: 'object',
            properties: {
                service: {
                    type: 'string',
                    enum: ['google', 'yahoo', 'microsoft', 'imap']
                },
                accessToken: {
                    type: 'string'
                },
                refreshToken: {
                    type: 'string'
                },
                username: {
                    type: 'string'
                },
                password: {
                    type: 'string'
                }
            },
            required: ['service']
        },
        destination: {
            type: 'object',
            properties: {
                service: {
                    type: 'string',
                    enum: ['google', 'yahoo', 'microsoft', 'imap']
                },
                accessToken: {
                    type: 'string'
                },
                refreshToken: {
                    type: 'string',
                    strip: 'ROLE_USER'
                },
                username: {
                    type: 'string'
                },
                password: {
                    type: 'string',
                    strip: 'ROLE_USER'
                }
            },
            required: ['service']
        },
        types: {
            type: 'array',
            items: {
                type: 'string'
            },
            additionalProperties: false
        },
        created: {
            type: 'string',
            format: 'date-time'
        }
    },
    additionalProperties: false,
    required: ['id']
};