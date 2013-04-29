var {Decider} = require( 'workflow/decider' );

describe( 'Decider', function () {

    var decider;
    var async = new AsyncSpec( this );

    var response =
    {
        "events" : [
            {
                "decisionTaskStartedEventAttributes" : {
                    "scheduledEventId" : 130
                },
                "eventId" : 132,
                "eventTimestamp" : 1353899856.0710001,
                "eventType" : "DecisionTaskStarted"
            },
            {
                "activityTaskStartedEventAttributes" : {
                    "scheduledEventId" : 5
                },
                "eventId" : 131,
                "eventTimestamp" : 1353899856.0599999,
                "eventType" : "ActivityTaskStarted"
            },
            {
                "decisionTaskScheduledEventAttributes" : {
                    "startToCloseTimeout" : "900",
                    "taskList" : {
                        "name" : "ProcessPages_TaskList"
                    }
                },
                "eventId" : 130,
                "eventTimestamp" : 1353899856.003,
                "eventType" : "DecisionTaskScheduled"
            },
            {
                "activityTaskCompletedEventAttributes" : {
                    "result" : "{\"stagedSheetId\":\"eab46181-1278-417f-af53-c6054893655d\",\"totalSheetsInWorkflow\":50,\"tag\":\"ProcessPageActivityTask\"}",
                    "scheduledEventId" : 52,
                    "startedEventId" : 119
                },
                "eventId" : 129,
                "eventTimestamp" : 1353899856.003,
                "eventType" : "ActivityTaskCompleted"
            },
            {
                "eventId" : 128,
                "eventTimestamp" : 1353899848.6960001,
                "eventType" : "MarkerRecorded",
                "markerRecordedEventAttributes" : {
                    "decisionTaskCompletedEventId" : 121,
                    "details" : "32",
                    "markerName" : "PagesQueuedMarker"
                }
            },
            {
                "eventId" : 127,
                "eventTimestamp" : 1353899848.6960001,
                "eventType" : "MarkerRecorded",
                "markerRecordedEventAttributes" : {
                    "decisionTaskCompletedEventId" : 121,
                    "details" : "33",
                    "markerName" : "PagesQueuedMarker"
                }
            },
            {
                "eventId" : 126,
                "eventTimestamp" : 1353899848.6960001,
                "eventType" : "MarkerRecorded",
                "markerRecordedEventAttributes" : {
                    "decisionTaskCompletedEventId" : 121,
                    "details" : "34",
                    "markerName" : "PagesQueuedMarker"
                }
            },
            {
                "eventId" : 125,
                "eventTimestamp" : 1353899848.6960001,
                "eventType" : "MarkerRecorded",
                "markerRecordedEventAttributes" : {
                    "decisionTaskCompletedEventId" : 121,
                    "details" : "35",
                    "markerName" : "PagesQueuedMarker"
                }
            },
            {
                "eventId" : 124,
                "eventTimestamp" : 1353899848.6960001,
                "eventType" : "MarkerRecorded",
                "markerRecordedEventAttributes" : {
                    "decisionTaskCompletedEventId" : 121,
                    "details" : "36",
                    "markerName" : "PagesQueuedMarker"
                }
            },
            {
                "eventId" : 123,
                "eventTimestamp" : 1353899848.6960001,
                "eventType" : "MarkerRecorded",
                "markerRecordedEventAttributes" : {
                    "decisionTaskCompletedEventId" : 121,
                    "details" : "37",
                    "markerName" : "PagesQueuedMarker"
                }
            },
            {
                "eventId" : 122,
                "eventTimestamp" : 1353899848.6960001,
                "eventType" : "MarkerRecorded",
                "markerRecordedEventAttributes" : {
                    "decisionTaskCompletedEventId" : 121,
                    "details" : "38",
                    "markerName" : "PagesQueuedMarker"
                }
            },
            {
                "decisionTaskCompletedEventAttributes" : {
                    "scheduledEventId" : 106,
                    "startedEventId" : 120
                },
                "eventId" : 121,
                "eventTimestamp" : 1353899848.6960001,
                "eventType" : "DecisionTaskCompleted"
            },
            {
                "decisionTaskStartedEventAttributes" : {
                    "scheduledEventId" : 106
                },
                "eventId" : 120,
                "eventTimestamp" : 1353899848.625,
                "eventType" : "DecisionTaskStarted"
            },
            {
                "activityTaskStartedEventAttributes" : {
                    "scheduledEventId" : 52
                },
                "eventId" : 119,
                "eventTimestamp" : 1353899845.378,
                "eventType" : "ActivityTaskStarted"
            },
            {
                "activityTaskCompletedEventAttributes" : {
                    "result" : "{\"stagedSheetId\":\"eab46181-1278-417f-af53-c6054893655d\",\"totalSheetsInWorkflow\":50,\"tag\":\"ProcessPageActivityTask\"}",
                    "scheduledEventId" : 22,
                    "startedEventId" : 117
                },
                "eventId" : 118,
                "eventTimestamp" : 1353899845.323,
                "eventType" : "ActivityTaskCompleted"
            },
            {
                "activityTaskStartedEventAttributes" : {
                    "scheduledEventId" : 22
                },
                "eventId" : 117,
                "eventTimestamp" : 1353899836.3,
                "eventType" : "ActivityTaskStarted"
            },
            {
                "activityTaskCompletedEventAttributes" : {
                    "result" : "{\"stagedSheetId\":\"eab46181-1278-417f-af53-c6054893655d\",\"totalSheetsInWorkflow\":50,\"tag\":\"ProcessPageActivityTask\"}",
                    "scheduledEventId" : 42,
                    "startedEventId" : 115
                },
                "eventId" : 116,
                "eventTimestamp" : 1353899836.2420001,
                "eventType" : "ActivityTaskCompleted"
            },
            {
                "activityTaskStartedEventAttributes" : {
                    "scheduledEventId" : 42
                },
                "eventId" : 115,
                "eventTimestamp" : 1353899826.671,
                "eventType" : "ActivityTaskStarted"
            },
            {
                "activityTaskCompletedEventAttributes" : {
                    "result" : "{\"stagedSheetId\":\"eab46181-1278-417f-af53-c6054893655d\",\"totalSheetsInWorkflow\":50,\"tag\":\"ProcessPageActivityTask\"}",
                    "scheduledEventId" : 25,
                    "startedEventId" : 113
                },
                "eventId" : 114,
                "eventTimestamp" : 1353899826.6170001,
                "eventType" : "ActivityTaskCompleted"
            },
            {
                "activityTaskStartedEventAttributes" : {
                    "scheduledEventId" : 25
                },
                "eventId" : 113,
                "eventTimestamp" : 1353899817.845,
                "eventType" : "ActivityTaskStarted"
            }
        ],
        "nextPageToken" : "ENCODED_NEXT_PAGE_TOKEN",
        "previousStartedEventId" : 120,
        "startedEventId" : 132,
        "taskToken" : "ENCODED_TASK_TOKEN",
        "workflowExecution" : {
            "runId" : "116CSfjpFImVn/25iosht+OhRs7WR+Gsv/lAVSOD3maBE=",
            "workflowId" : "1ed3a95abe7a4b2cb50ac9a224acb572"
        },
        "workflowType" : {
            "name" : "ProcessPages_Workflow",
            "version" : "1.0"
        }
    };


    beforeEach( function () {
    } );

    
/*
    async.it( 'returns a promise', function (done) {
        try {
            var decider = new Decider([]);
            expect( typeof decider.then === 'function' ).toBe( true );
            decider.then( function () {
                done();
            } );
        } catch ( e ) {
            log.info( e );
        }
    } );
*/

    async.it( 'will be in initialized state after starting workflow', function (done) {
        try {
            var decider = new Decider( [
                {
                    "eventId" : 1,
                    "eventTimestamp" : 1326592619.474,
                    "eventType" : "WorkflowExecutionStarted",
                    "workflowExecutionStartedEventAttributes" : {
                        "childPolicy" : "TERMINATE",
                        "executionStartToCloseTimeout" : "3600",
                        "input" : "arbitrary-string-that-is-meaningful-to-the-workflow",
                        "parentInitiatedEventId" : 0,
                        "tagList" : ["music purchase", "digital", "ricoh-the-dog"],
                        "taskList" : {
                            "name" : "specialTaskList"
                        },
                        "taskStartToCloseTimeout" : "600",
                        "workflowType" : {
                            "name" : "customerOrderWorkflow",
                            "version" : "1.0"
                        }
                    }
                }
            ] );

            decider.then( function ( data ) {
                log.info( 'Promise return values: {}', JSON.stringify ( data.fsm.state ) );
                expect( data.fsm.state ).toEqual( 'initialized' );
                done();
            } );
        } catch ( e ) {
            log.error( e );
        }
    } );


} );