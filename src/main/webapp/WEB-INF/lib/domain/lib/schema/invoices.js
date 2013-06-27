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
            required: ['service']
        },
        expires : {
            type : 'string',
            format : 'date-time'
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
                        required: ['service']
                    }
                },
                required: ['content', 'jobId', 'status', 'source']
            }
        },
        starts : {
            type : 'string',
            format : 'date-time'
        },
        test : {
            type : 'object',
            properties : {
                jobId : {
                    type : 'string'
                },
                started : {
                    type : 'string',
                    format : 'date-time'
                }
            },
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
    required: [
        'destination', 'expires', 'invoiceId', 'invoiceNum', 'starts',
        'totalCharged', 'userId'
    ]
};
