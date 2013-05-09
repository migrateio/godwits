/**
 * This current implementation is a thin wrapper over the Java AWS Simple Workflow
 * implementation. It will be more efficient to ditch the Java dependency entirely, as
 * it spends most of its time converting JSON to Java objects, then we convert the Java
 * objects back to JSON. This can be eliminated if our library makes the HTTP calls
 * directly. At the moment though, the Java routines will allow us to get started
 * quickly and not have to worry about message signing, connection pooling, retry
 * attempts and other things we will have to implement when we make the HTTP calls
 * ourselves.
 * todo: Get rid of the AWS Java dependency for working with SimpleWorkflow.
 *
 *
 * Usage
 *
 * The dev will create a class that extends Workflow. An instance of this class will be
 * the embodiment of an SWF Workflow which is a distributed application composed of
 * coordination logic and tasks that run asynchronously across multiple computing
 * devices.
 *
 * A Workflow object is instantiated by calling its constructor and supplying the
 * following parameters.
 *
 *     var workflow = new Workflow(workflowType, accessKey, secretKey);
 *
 * workflow
 * >
 *
 *
 */


var {Workflow} = require('./workflow');
var {Decider} = require('./decider');
var {DeciderPoller} = require('./deciderPoller');
var {Worker} = require('./worker');
var {WorkerPoller} = require('./workerPoller');


exports.Workflow = Workflow;
exports.Decider = Decider;
exports.DeciderPoller = DeciderPoller;
exports.Worker = Worker;
exports.WorkerPoller = WorkerPoller;

