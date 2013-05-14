exports.schema = {
    type: 'object',
    properties: {
        id: {
            type: 'string'
        },
        password: {
            type: 'string'
        },
        services: {
            type: 'object',
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
                    format: 'email'
                }
            },
            required: ['status', 'address'],
            'default': {},
            additionalProperties: false
        },
        created: {
            type: 'string',
            format: 'date-time'
        }
    },
    additionalProperties: false,
    required: ['id', 'email']
};