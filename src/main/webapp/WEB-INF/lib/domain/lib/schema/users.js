exports.schema = {
<<<<<<< Updated upstream
    type: 'object',
    properties: {
        id: {
            type: 'string'
        },
        name: {
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
=======
    type : 'object',
    properties : {
        email : {
            type : 'object',
            properties : {
                status : {
                    type : 'string',
                    enum : ['candidate', 'verified'],
                    default : 'candidate'
>>>>>>> Stashed changes
                },
                address : {
                    type : 'string',
                    format : 'email'
                }
            },
<<<<<<< Updated upstream
            required: ['status', 'address'],
            'default': {},
            additionalProperties: false
        },
        roles: {
            type: 'array',
            "items": {
                "type": "string"
            },
            "minItems": 1,
            "uniqueItems": true,
            'default': ['ROLE_USER']
        },
        created: {
            type: 'string',
            format: 'date-time'
        }
    },
    additionalProperties: false,
    required: ['id', 'email', 'name', 'roles']
=======
            required : ['status', 'address'],
            default : {},
            additionalProperties : false
        },
        created : {
            type : 'string',
            format : 'date-time'
        }
    },
    additionalProperties : false,
    required : ['email']
>>>>>>> Stashed changes
};