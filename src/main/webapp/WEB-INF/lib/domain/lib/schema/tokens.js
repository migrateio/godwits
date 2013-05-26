exports.schema = {
    type: 'object',
    properties: {
        id: {
            type: 'string'
        },
        userId: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: ['id', 'userId']
};