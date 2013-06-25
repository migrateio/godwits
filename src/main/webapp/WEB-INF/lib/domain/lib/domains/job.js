/**
 * # Job _(Domain Object)_
 *
 * ## Constructor
 *
 * ### Parameters
 *
 * **json** The json representation of a job.
 */
exports.Job = function(job) {
    if (typeof job.toJSON === 'function') return job;


    function isRunning() {
        return job && job.status === 'active';
    }

    /**
     * A job is considered complete if it has a source and destination account and content
     * types selected.
     */
    function isComplete() {
        return job
            && job.destination && job.destination.service
            && job.destination.auth && job.destination.auth.username
            && job.source && job.source.service
            && job.source.auth && job.source.auth.username
            && job.content && job.content.length > 0;
    }

    /**
     * ## checkSource(source)
     *
     * Compares the source param passed in with the job's source parameter checking for
     * a match. Returns true if match found, otherwise returns false. If this job does
     * not have a fully qualified source object, we will return false. We will normalize
     * the comparison by treating the username as case-insensitive.
     *
     * ### Parameters
     *
     * **source** The source object to compare against. It will include a `service`
     *            property and a `username` property.
     *
     * todo: At some point, we may want to normalize usernames based on service types if
     * such a thing is necessary. (ie Google's treating of '+' as a stop char, or
     * stripping of periods from the username.) Since most of these services are
     * authenticated using oauth or even username/password it is unlikely that
     * normalizations steps will be necessary. If they are, they go here (at least for
     * sources).
     */
    function sourceOverlaps(source) {
        if (job.source && job.source.service
            && job.source.auth && job.source.auth.username
            && source && source.service
            && source.auth && source.auth.username
            ) {
            return job.source.service.toLowerCase() === source.service.toLowerCase()
                && job.source.auth.username.toLowerCase() === source.auth.username.toLowerCase();
        }
        return false;
    }

    var obj = {
        sourceOverlaps: sourceOverlaps,
        isRunning: isRunning,
        isComplete: isComplete,
        toJSON : function toJSON() {
            return job;
        }
    };

    Object.keys( job || {} ).forEach( function ( prop ) {
        obj[prop] = job[prop];
    } );

    return obj;
};