exports.schema = {
    type: 'object',
    properties: {
        tokenId: {
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
    required: ['tokenId', 'user', 'created']
};