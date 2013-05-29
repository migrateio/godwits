exports.schema = {
    type: 'object',
    properties: {
        id: {
            type: 'string'
        },
        user: {
            type: 'object'
        },
        created: {
            type: 'string',
            format: 'date-time'
        }
    },
    additionalProperties: false,
    required: ['id', 'userId']
};