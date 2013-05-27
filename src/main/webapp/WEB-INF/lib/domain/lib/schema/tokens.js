exports.schema = {
    type: 'object',
    properties: {
        id: {
            type: 'string'
        },
        userId: {
            type: 'string'
        },
        created: {
            type: 'string',
            format: 'date-time'
        }
    },
    additionalProperties: false,
    required: ['id', 'userId']
};