var task = {
    "events" : [
        {
            "eventType" : "WorkflowExecutionStarted",
            "eventId" : 1,
            "eventTimestamp" : "2013-05-13T20:04:01.000Z",
            "WorkflowExecutionStartedEventAttributes" : {
                "executionStartToCloseTimeout" : "2592000",
                "parentInitiatedEventId" : 0,
                "taskStartToCloseTimeout" : "60",
                "childPolicy" : "TERMINATE",
                "input" : {
                    "jobId" : "4N9w5",
                    "userId" : "123abc",
                    "source" : {
                        "service" : "yahoo",
                        "principal" : "oravecz@yahoo.com",
                        "credential" : "<secret>",
                        "display" : "oravecz@yahoo.com"
                    },
                    "destination" : {
                        "service" : "google",
                        "principal" : "jcook@pykl.com",
                        "credential" : "<secret>",
                        "display" : "jcook@pykl.com"
                    },
                    "types" : {
                        "email" : true,
                        "contacts" : true,
                        "documents" : false,
                        "calendar" : false,
                        "media" : false
                    },
                    "payment" : {
                        "service" : "stripe",
                        "amount" : 15,
                        "currency" : "usd",
                        "customer" : "cus_1Jf98WUwZxuKfj"
                    }
                },
                "taskList" : {
                    "name" : "test-tasklist-decider"
                },
                "tagList" : [],
                "workflowType" : {
                    "name" : "io.migrate.transfers",
                    "version" : "0.0.4"
                }
            }
        },
        {
            "eventType" : "DecisionTaskScheduled",
            "eventId" : 2,
            "eventTimestamp" : "2013-05-13T20:04:01.000Z",
            "DecisionTaskScheduledEventAttributes" : {
                "taskList" : {
                    "name" : "test-tasklist-decider"
                },
                "startToCloseTimeout" : "60"
            }
        },
        {
            "eventType" : "DecisionTaskStarted",
            "eventId" : 3,
            "eventTimestamp" : "2013-05-13T20:04:02.000Z",
            "DecisionTaskStartedEventAttributes" : {
                "scheduledEventId" : 2
            }
        },
        {
            "eventType" : "DecisionTaskCompleted",
            "eventId" : 4,
            "eventTimestamp" : "2013-05-13T20:04:02.000Z",
            "DecisionTaskCompletedEventAttributes" : {
                "startedEventId" : 3,
                "scheduledEventId" : 2
            }
        },
        {
            "eventType" : "ActivityTaskScheduled",
            "eventId" : 5,
            "eventTimestamp" : "2013-05-13T20:04:02.000Z",
            "ActivityTaskScheduledEventAttributes" : {
                "heartbeatTimeout" : "15",
                "activityId" : "804fb0c3-f847-4c88-b777-350435c02c68",
                "scheduleToCloseTimeout" : "NONE",
                "decisionTaskCompletedEventId" : 4,
                "scheduleToStartTimeout" : "NONE",
                "input" : {
                    "userId" : "123abc"
                },
                "taskList" : {
                    "name" : "test-tasklist-worker"
                },
                "startToCloseTimeout" : "10",
                "activityType" : {
                    "name" : "load-user",
                    "version" : "0.0.6"
                }
            }
        },
        {
            "eventType" : "ActivityTaskStarted",
            "eventId" : 6,
            "eventTimestamp" : "2013-05-13T20:04:02.000Z",
            "ActivityTaskStartedEventAttributes" : {
                "scheduledEventId" : 5
            }
        },
        {
            "eventType" : "ActivityTaskCompleted",
            "eventId" : 7,
            "eventTimestamp" : "2013-05-13T20:04:02.000Z",
            "ActivityTaskCompletedEventAttributes" : {
                "result" : {
                    "status" : 200,
                    "data" : {
                        "userId" : "123abc",
                        "name" : "Fred Flintstone",
                        "email" : "fred@bedrock.com"
                    }
                },
                "startedEventId" : 6,
                "scheduledEventId" : 5
            }
        },
        {
            "eventType" : "DecisionTaskScheduled",
            "eventId" : 8,
            "eventTimestamp" : "2013-05-13T20:04:02.000Z",
            "DecisionTaskScheduledEventAttributes" : {
                "taskList" : {
                    "name" : "test-tasklist-decider"
                },
                "startToCloseTimeout" : "60"
            }
        },
        {
            "eventType" : "DecisionTaskStarted",
            "eventId" : 9,
            "eventTimestamp" : "2013-05-13T20:04:02.000Z",
            "DecisionTaskStartedEventAttributes" : {
                "scheduledEventId" : 8
            }
        },
        {
            "eventType" : "DecisionTaskCompleted",
            "eventId" : 10,
            "eventTimestamp" : "2013-05-13T20:04:03.000Z",
            "DecisionTaskCompletedEventAttributes" : {
                "startedEventId" : 9,
                "scheduledEventId" : 8
            }
        },
        {
            "eventType" : "ActivityTaskScheduled",
            "eventId" : 11,
            "eventTimestamp" : "2013-05-13T20:04:03.000Z",
            "ActivityTaskScheduledEventAttributes" : {
                "heartbeatTimeout" : "15",
                "activityId" : "0863cc75-7ff8-4959-a9ea-425718ac83b9",
                "scheduleToCloseTimeout" : "NONE",
                "decisionTaskCompletedEventId" : 10,
                "scheduleToStartTimeout" : "NONE",
                "input" : {
                    "userId" : "123abc"
                },
                "taskList" : {
                    "name" : "test-tasklist-worker"
                },
                "startToCloseTimeout" : "10",
                "activityType" : {
                    "name" : "auth-payment",
                    "version" : "0.0.6"
                }
            }
        },
        {
            "eventType" : "ActivityTaskStarted",
            "eventId" : 12,
            "eventTimestamp" : "2013-05-13T20:04:03.000Z",
            "ActivityTaskStartedEventAttributes" : {
                "scheduledEventId" : 11
            }
        },
        {
            "eventType" : "ActivityTaskCompleted",
            "eventId" : 13,
            "eventTimestamp" : "2013-05-13T20:04:03.000Z",
            "ActivityTaskCompletedEventAttributes" : {
                "result" : {
                    "status" : 200
                },
                "startedEventId" : 12,
                "scheduledEventId" : 11
            }
        },
        {
            "eventType" : "DecisionTaskScheduled",
            "eventId" : 14,
            "eventTimestamp" : "2013-05-13T20:04:03.000Z",
            "DecisionTaskScheduledEventAttributes" : {
                "taskList" : {
                    "name" : "test-tasklist-decider"
                },
                "startToCloseTimeout" : "60"
            }
        },
        {
            "eventType" : "DecisionTaskStarted",
            "eventId" : 15,
            "eventTimestamp" : "2013-05-13T20:04:03.000Z",
            "DecisionTaskStartedEventAttributes" : {
                "scheduledEventId" : 14
            }
        },
        {
            "eventType" : "DecisionTaskCompleted",
            "eventId" : 16,
            "eventTimestamp" : "2013-05-13T20:04:05.000Z",
            "DecisionTaskCompletedEventAttributes" : {
                "startedEventId" : 15,
                "scheduledEventId" : 14
            }
        },
        {
            "eventType" : "ActivityTaskScheduled",
            "eventId" : 17,
            "eventTimestamp" : "2013-05-13T20:04:05.000Z",
            "ActivityTaskScheduledEventAttributes" : {
                "heartbeatTimeout" : "15",
                "activityId" : "e45d7a7f-7650-4ab7-bf60-12c8cb5e0b30",
                "scheduleToCloseTimeout" : "NONE",
                "decisionTaskCompletedEventId" : 16,
                "scheduleToStartTimeout" : "NONE",
                "input" : {
                    "userId" : "123abc"
                },
                "taskList" : {
                    "name" : "test-tasklist-worker"
                },
                "startToCloseTimeout" : "10",
                "activityType" : {
                    "name" : "migrate",
                    "version" : "0.0.6"
                }
            }
        },
        {
            "eventType" : "ActivityTaskStarted",
            "eventId" : 18,
            "eventTimestamp" : "2013-05-13T20:04:05.000Z",
            "ActivityTaskStartedEventAttributes" : {
                "scheduledEventId" : 17
            }
        },
        {
            "eventType" : "ActivityTaskCompleted",
            "eventId" : 19,
            "eventTimestamp" : "2013-05-13T20:04:05.000Z",
            "ActivityTaskCompletedEventAttributes" : {
                "result" : {
                    "status" : 200
                },
                "startedEventId" : 18,
                "scheduledEventId" : 17
            }
        },
        {
            "eventType" : "DecisionTaskScheduled",
            "eventId" : 20,
            "eventTimestamp" : "2013-05-13T20:04:05.000Z",
            "DecisionTaskScheduledEventAttributes" : {
                "taskList" : {
                    "name" : "test-tasklist-decider"
                },
                "startToCloseTimeout" : "60"
            }
        },
        {
            "eventType" : "DecisionTaskStarted",
            "eventId" : 21,
            "eventTimestamp" : "2013-05-13T20:04:05.000Z",
            "DecisionTaskStartedEventAttributes" : {
                "scheduledEventId" : 20
            }
        },
        {
            "eventType" : "DecisionTaskCompleted",
            "eventId" : 22,
            "eventTimestamp" : "2013-05-13T20:04:05.000Z",
            "DecisionTaskCompletedEventAttributes" : {
                "startedEventId" : 21,
                "scheduledEventId" : 20
            }
        },
        {
            "eventType" : "ActivityTaskScheduled",
            "eventId" : 23,
            "eventTimestamp" : "2013-05-13T20:04:05.000Z",
            "ActivityTaskScheduledEventAttributes" : {
                "heartbeatTimeout" : "15",
                "activityId" : "ab5e52b2-1293-4a7b-9340-5ded4de0247f",
                "scheduleToCloseTimeout" : "NONE",
                "decisionTaskCompletedEventId" : 22,
                "scheduleToStartTimeout" : "NONE",
                "taskList" : {
                    "name" : "test-tasklist-worker"
                },
                "startToCloseTimeout" : "10",
                "activityType" : {
                    "name" : "analyze-results",
                    "version" : "0.0.6"
                }
            }
        },
        {
            "eventType" : "ActivityTaskStarted",
            "eventId" : 24,
            "eventTimestamp" : "2013-05-13T20:04:05.000Z",
            "ActivityTaskStartedEventAttributes" : {
                "scheduledEventId" : 23
            }
        },
        {
            "eventType" : "ActivityTaskCompleted",
            "eventId" : 25,
            "eventTimestamp" : "2013-05-13T20:04:05.000Z",
            "ActivityTaskCompletedEventAttributes" : {
                "result" : {
                    "status" : 200
                },
                "startedEventId" : 24,
                "scheduledEventId" : 23
            }
        },
        {
            "eventType" : "DecisionTaskScheduled",
            "eventId" : 26,
            "eventTimestamp" : "2013-05-13T20:04:05.000Z",
            "DecisionTaskScheduledEventAttributes" : {
                "taskList" : {
                    "name" : "test-tasklist-decider"
                },
                "startToCloseTimeout" : "60"
            }
        },
        {
            "eventType" : "DecisionTaskStarted",
            "eventId" : 27,
            "eventTimestamp" : "2013-05-13T20:04:05.000Z",
            "DecisionTaskStartedEventAttributes" : {
                "scheduledEventId" : 26
            }
        },
        {
            "eventType" : "DecisionTaskCompleted",
            "eventId" : 28,
            "eventTimestamp" : "2013-05-13T20:04:05.000Z",
            "DecisionTaskCompletedEventAttributes" : {
                "startedEventId" : 27,
                "scheduledEventId" : 26
            }
        },
        {
            "eventType" : "ActivityTaskScheduled",
            "eventId" : 29,
            "eventTimestamp" : "2013-05-13T20:04:05.000Z",
            "ActivityTaskScheduledEventAttributes" : {
                "heartbeatTimeout" : "15",
                "activityId" : "3b0f9689-ed6d-4cc8-922c-f844df784999",
                "scheduleToCloseTimeout" : "NONE",
                "decisionTaskCompletedEventId" : 28,
                "scheduleToStartTimeout" : "NONE",
                "taskList" : {
                    "name" : "test-tasklist-worker"
                },
                "startToCloseTimeout" : "10",
                "activityType" : {
                    "name" : "report",
                    "version" : "0.0.6"
                }
            }
        },
        {
            "eventType" : "ActivityTaskStarted",
            "eventId" : 30,
            "eventTimestamp" : "2013-05-13T20:04:05.000Z",
            "ActivityTaskStartedEventAttributes" : {
                "scheduledEventId" : 29
            }
        },
        {
            "eventType" : "ActivityTaskCompleted",
            "eventId" : 31,
            "eventTimestamp" : "2013-05-13T20:04:06.000Z",
            "ActivityTaskCompletedEventAttributes" : {
                "result" : {
                    "status" : 200
                },
                "startedEventId" : 30,
                "scheduledEventId" : 29
            }
        },
        {
            "eventType" : "DecisionTaskScheduled",
            "eventId" : 32,
            "eventTimestamp" : "2013-05-13T20:04:06.000Z",
            "DecisionTaskScheduledEventAttributes" : {
                "taskList" : {
                    "name" : "test-tasklist-decider"
                },
                "startToCloseTimeout" : "60"
            }
        },
        {
            "eventType" : "DecisionTaskStarted",
            "eventId" : 33,
            "eventTimestamp" : "2013-05-13T20:04:06.000Z",
            "DecisionTaskStartedEventAttributes" : {
                "scheduledEventId" : 32
            }
        },
        {
            "eventType" : "DecisionTaskCompleted",
            "eventId" : 34,
            "eventTimestamp" : "2013-05-13T20:04:07.000Z",
            "DecisionTaskCompletedEventAttributes" : {
                "startedEventId" : 33,
                "scheduledEventId" : 32
            }
        },
        {
            "eventType" : "ActivityTaskScheduled",
            "eventId" : 35,
            "eventTimestamp" : "2013-05-13T20:04:07.000Z",
            "ActivityTaskScheduledEventAttributes" : {
                "heartbeatTimeout" : "15",
                "activityId" : "2422528b-5506-4438-abbc-93760da13ce8",
                "scheduleToCloseTimeout" : "NONE",
                "decisionTaskCompletedEventId" : 34,
                "scheduleToStartTimeout" : "NONE",
                "taskList" : {
                    "name" : "test-tasklist-worker"
                },
                "startToCloseTimeout" : "10",
                "activityType" : {
                    "name" : "invoice",
                    "version" : "0.0.6"
                }
            }
        },
        {
            "eventType" : "ActivityTaskStarted",
            "eventId" : 36,
            "eventTimestamp" : "2013-05-13T20:04:07.000Z",
            "ActivityTaskStartedEventAttributes" : {
                "scheduledEventId" : 35
            }
        },
        {
            "eventType" : "ActivityTaskCompleted",
            "eventId" : 37,
            "eventTimestamp" : "2013-05-13T20:04:07.000Z",
            "ActivityTaskCompletedEventAttributes" : {
                "result" : {
                    "status" : 200
                },
                "startedEventId" : 36,
                "scheduledEventId" : 35
            }
        },
        {
            "eventType" : "DecisionTaskScheduled",
            "eventId" : 38,
            "eventTimestamp" : "2013-05-13T20:04:07.000Z",
            "DecisionTaskScheduledEventAttributes" : {
                "taskList" : {
                    "name" : "test-tasklist-decider"
                },
                "startToCloseTimeout" : "60"
            }
        },
        {
            "eventType" : "DecisionTaskStarted",
            "eventId" : 39,
            "eventTimestamp" : "2013-05-13T20:04:07.000Z",
            "DecisionTaskStartedEventAttributes" : {
                "scheduledEventId" : 38
            }
        }
    ],
    "previousStartedEventId" : 33,
    "startedEventId" : 39,
    "taskToken" : "AAAAKgAAAAEAAAAAAAAAAipaPqKJi6gPgwrS3Es8M8Rso/ZkGvuBbWtp6hrtPmjFd9L5uidQ9UyH9Q7Yv8LhA1wNqKDH5BOdvYquyNszOsR+RrfbdQMSeNsNLWchwo0LJfgwOe3HjN8oOV3lyROMzzT1w2XFTDt+ETU7jEOa7S3FgpawXo2A5vJktg3KO9Qjif5dsB3XRinrLELvrCazCDzsTSC59gJZRghO/M5L0lBxLV5fOm/lt4XWEfKT8PP/ypHAL9LRG6ulRBcB+soezmBykjlRP5PKMTQ1SsoM0cKpNEXPmlcG8wP31/UBSSHMX9sFV2lTCaMzKbfc8GLHBg==",
    "workflowExecution" : {
        "runId" : "12iyEpRpF3+VdH0URFo0pnWCN/H9MCFggIGlL/ZXEniDE=",
        "workflowId" : "18c2e111-cc70-4941-8370-4cbd1a61e3c4"
    },
    "workflowType" : {
        "name" : "io.migrate.transfers",
        "version" : "0.0.4"
    }
};