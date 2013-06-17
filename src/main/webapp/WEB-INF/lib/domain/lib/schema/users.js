exports.schema = {
    type: 'object',
    properties: {
        userId: {
            type: 'string'
        },
        name: {
            type: 'string',
            minLength : 1
        },
        password: {
            type: 'string',
            strip: 'ROLE_USER',
            minLength : 1
        },
        payment: {
            type: 'object',
            properties: {
                last4: {
                    type: 'string'
                }
            },
            additionalProperties: false
        },
        services: {
            type: 'object',
            strip: 'ROLE_USER',
            properties: {
                stripe: {
                    type: 'string'
                },
                xero: {
                    type: 'string'
                }
            },
            additionalProperties: false
        },
        email: {
            type: 'object',
            properties: {
                status: {
                    type: 'string',
                    'enum': ['candidate','verified'],
                    'default': 'candidate'
                },
                address: {
                    type: 'string',
                    format: 'email',
                    minLength : 1
                }
            },
            required: ['status', 'address'],
            'default': {},
            additionalProperties: false
        },
        roles: {
            strip: 'ROLE_USER',
            type: 'array',
            "items": {
                "type": "string",
                "enum": ['ROLE_CANDIDATE', 'ROLE_USER', 'ROLE_ADMIN']
            },
            "minItems": 1,
            "uniqueItems": true,
            'default': ['ROLE_CANDIDATE']
        },
        created: {
            type: 'string',
            format: 'date-time'
        }
    },
    additionalProperties: false,
    required: ['userId', 'email', 'name', 'roles']
};