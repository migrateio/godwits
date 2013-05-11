var a = {

    TaskToken : AAAAKgAAAAEAAAAAAAAAAhwkDJDdB5CaQogezsf5GJH3ZJmN7llXpFAuhPFWoLr0dEfatGExP9hLEgXM0rHsv3HCKH / XDPbyztVvKo + 2
}I / JAIfIHnCcYz0j4nsT2YoyVkofPNhs + gne60tIEJ6wlT + BTq9UKU9HAxYJsjHWVUvjLk12AUqlmQgPzzx8HXWHBhv26YlfkOGHIrWI6hFspHLUJYgeIude + haFIgnEFiy49Ht / f1QlF9o5ss8WiAS81 +//tydUgn1L0W9Tw5tEnxxIfT7iU3MFp6msbvEyL4n/5z7tqfCwujSQyb1tMwW4wMwYJF3hMJbZNkImVSr6hQA==,StartedEventId: 9,WorkflowExecution: {
WorkflowId: 247940c3-b8ed-4abe-a697-542327430c63,RunId: 12C+VNulURpHHeCnY9IXbdA/MTI+eN54rSVTx58Ydc5qQ=},WorkflowType: {
Name: io.migrate.transfers,Version: 0.0.3},Events: [{
EventTimestamp: Sat May 11 10:55:52 EDT 2013,EventType: WorkflowExecutionStarted,EventId: 1,WorkflowExecutionStartedEventAttributes: {
Input: {
"jobId":"4N9w5","userId":"123abc","source":{
"service":"yahoo","principal":"oravecz@yahoo.com","credential":"<secret>","display":"oravecz@yahoo.com"},"destination":{
"service":"google","principal":"jcook@pykl.com","credential":"<secret>","display":"jcook@pykl.com"},"types":{
"email":true,"contacts":true,"documents":false,"calendar":false,"media":false},"payment":{
"service":"stripe","amount":15,"currency":"usd","customer":"cus_1Jf98WUwZxuKfj"}},ExecutionStartToCloseTimeout: 2592000,TaskStartToCloseTimeout: NONE,ChildPolicy: TERMINATE,TaskList: {
Name: test-tasklist-decider},WorkflowType: {
Name: io.migrate.transfers,Version: 0.0.3},TagList: [],ParentInitiatedEventId: 0},}, {
EventTimestamp: Sat May 11 10:55:52 EDT 2013,EventType: DecisionTaskScheduled,EventId: 2,DecisionTaskScheduledEventAttributes: {
TaskList: {
Name: test-tasklist-decider},StartToCloseTimeout: NONE},}, {
EventTimestamp: Sat May 11 10:55:53 EDT 2013,EventType: DecisionTaskStarted,EventId: 3,DecisionTaskStartedEventAttributes: {
ScheduledEventId: 2},}, {
EventTimestamp: Sat May 11 10:55:53 EDT 2013,EventType: DecisionTaskCompleted,EventId: 4,DecisionTaskCompletedEventAttributes: {
ScheduledEventId: 2,StartedEventId: 3},}, {
EventTimestamp: Sat May 11 10:55:53 EDT 2013,EventType: ActivityTaskScheduled,EventId: 5,ActivityTaskScheduledEventAttributes: {
ActivityType: {
Name: load-user,Version: 0.0.5},ActivityId: 8a9837d6-4761-49d8-8d1a-65c16f02cfc8,Input: {
"userId":"123abc"},Control: undefined,ScheduleToStartTimeout: NONE,ScheduleToCloseTimeout: NONE,StartToCloseTimeout: 10,TaskList: {
Name: test-tasklist-worker},DecisionTaskCompletedEventId: 4,HeartbeatTimeout: 15},}, {
EventTimestamp: Sat May 11 10:55:53 EDT 2013,EventType: ActivityTaskStarted,EventId: 6,ActivityTaskStartedEventAttributes: {
ScheduledEventId: 5},}, {
EventTimestamp: Sat May 11 10:56:03 EDT 2013,EventType: ActivityTaskTimedOut,EventId: 7,ActivityTaskTimedOutEventAttributes: {
TimeoutType: START_TO_CLOSE,ScheduledEventId: 5,StartedEventId: 6,},}, {
EventTimestamp: Sat May 11 10:56:03 EDT 2013,EventType: DecisionTaskScheduled,EventId: 8,DecisionTaskScheduledEventAttributes: {
TaskList: {
Name: test-tasklist-decider},StartToCloseTimeout: NONE},}, {
EventTimestamp: Sat May 11 10:56:03 EDT 2013,EventType: DecisionTaskStarted,EventId: 9,DecisionTaskStartedEventAttributes: {
ScheduledEventId: 8},}],PreviousStartedEventId: 3}