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
                    userid : {
                        type : 'string'
                    }
                }
            }
        },
        destination : {
            type : 'object',
            properties : {
                service : {
                    type : 'string'
                },
                username : {
                    type : 'string'
                }
            }
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
                    content : {
                        type : 'array',
                        items : {
                            type : 'string'
                        }
                    },
                    jobId : {
                        type : 'string'
                    },
                    status : {
                        type : 'string',
                        'enum': ['pending', 'active', 'stopped', 'complete']
                    },
                    source : {
                        type : 'object',
                        properties : {
                            service : {
                                type : 'string'
                            },
                            username : {
                                type : 'string'
                            }
                        }
                    }
                }
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
                completed : {
                    type : 'string',
                    format : 'date-time'
                }
            }
        },
        totalCharged : {
            type : 'number'
        },
        transactions : {
            type : 'array',
            items : {
                type : 'object',
                properties : {
                    amount : {
                        type : 'number'
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
                        'enum' : ['google', 'yahoo', 'microsoft', 'imap']
                    },
                    type : {
                        type : 'string'
                    }
                }
            }
        },
        userId : {
            type : 'string'
        }
    }
};
