exports.schema = {
    type: 'object',
    properties: {
        email: {
            type: 'object',
            properties: {
                status: {
                    type: 'string',
                    enum: ['candidate','verified'],
                    default: 'candidate'
                },
                address: {
                    type: 'string',
                    format: 'email'
                }
            },
            required: ['status', 'address'],
            default: {},
            additionalProperties: false
        },
        created: {
            type: 'string',
            format: 'date-time'
        }
    },
    additionalProperties: false,
    required: ['email']
};