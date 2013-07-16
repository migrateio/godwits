exports.schema = {
    type : 'object',
    properties : {
        comments : {
            type : 'array',
            items : {
                type : 'object',
                properties : {
                    created : {
                        type : 'string',
                        format : 'data-time'
                    },
                    message : {
                        type : 'string'
                    },
                    userId : {
                        type : 'string'
                    }
                },
                additionalProperties: false,
                required: ['created', 'message', 'userId']
            }
        },
        destination : {
            type : 'object',
            properties : {
                service : {
                    type : 'string'
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
            additionalProperties: false,
            required: ['service']
        },
        invoiceId : {
            type : 'string'
        },
        invoiceNum : {
            type : 'string'
        },
        jobs : {
            type : 'array',
            items : {
                type : 'object',
                properties : {
                    content: {
                        type: 'array',
                        items: {
                            type: 'string',
                            'enum': ['mails', 'calendars', 'contacts', 'media', 'documents']
                        },
                        "uniqueItems": true,
                        additionalItems: false
                    },
                    starts: {
                        type: 'string',
                        format: 'date-time'
                    },
                    expires: {
                        type: 'string',
                        format: 'date-time'
                    },
                    jobId : {
                        type : 'string'
                    },
                    status : {
                        type : 'string',
                        'enum': ['pending', 'active', 'stopped', 'completed'],
                        'default': 'pending'
                    },
                    source : {
                        type : 'object',
                        properties : {
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
                        additionalProperties: false,
                        required: ['service', 'auth']
                    },
                    test: {
                        type: 'boolean',
                        'default': false
                    }
                },
                additionalProperties: false,
                required: ['content', 'jobId', 'status', 'source', 'starts', 'expires']
            }
        },
        test : {
            type : 'object',
            properties : {
                jobId : {
                    type : 'string'
                },
                starts : {
                    type : 'string',
                    format : 'date-time'
                }
            },
            additionalProperties: false,
            required: ['jobId']
        },
        totalCharged : {
            type : 'integer',
            'default': 0
        },
        transactions : {
            type : 'array',
            items : {
                type : 'object',
                properties : {
                    amount : {
                        type : 'integer'
                    },
                    relatedJob : {
                        type : 'string'
                    },
                    authId : {
                        type : 'string'
                    },
                    captureId : {
                        type : 'string'
                    },
                    customerId : {
                        type : 'string'
                    },
                    invoiceDate : {
                        type : 'string',
                        format : 'date-time'
                    },
                    invoiceNum : {
                        type : 'string'
                    },
                    service : {
                        type : 'string',
                        'enum' : ['stripe']
                    },
                    txType : {
                        type : 'string',
                        'enum' : ['charge', 'refund']
                    },
                    last4 : {
                        type : 'string'
                    },
                    fingerprint : {
                        type : 'string'
                    },
                    type : {
                        type : 'string'
                    }
                },
                additionalProperties: false,
                required: [
                    'amount', 'relatedJob', 'captureId', 'customerId', 'invoiceDate',
                    'invoiceNum', 'service', 'last4', 'fingerprint', 'type'
                ]
            }
        },
        userId : {
            type : 'string'
        }
    },
    additionalProperties: false,
    required: [
        'destination', 'invoiceId', 'invoiceNum', 'totalCharged', 'userId'
    ]
};
