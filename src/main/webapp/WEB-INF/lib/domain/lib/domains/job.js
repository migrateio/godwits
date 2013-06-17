/**
 * # Job _(Domain Object)_
 *
 * ## Constructor
 *
 * ### Parameters
 *
 * **json** The json representation of a job.
 */
exports.Job = function(json) {


    function isRunning() {
        return json && json.status === 'active';
    }

    /**
     * A job is considered complete if it has a source and destination account and content
     * types selected.
     */
    function isComplete() {
        return json
            && json.source && json.source.service
            && json.source.auth && json.source.auth.username
            && json.source && json.source.service
            && json.source.auth && json.source.auth.username
            && json.contents && json.contents.length > 0;
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
        var opts = {
            sensitivity : 'base',
            usage: 'search'
        };
        if (json.source && json.source.service && json.source.username) {
            return json.source.service.localeCompare( source.service, null, opts ) === 0
                && json.source.username.localeCompare( source.username, null, opts ) === 0
        }
        return false;
    }

    return {
        sourceOverlaps: sourceOverlaps,
        isRunning: isRunning,
        isComplete: isComplete
    }
};