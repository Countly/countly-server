/**
 * Interface for job execution operations
 */
class IJobExecutor {
    /**
     * Creates and defines a new job
     * @param {string} jobName The name of the job
     * @param {Function} JobClass The job class to create
     */
    async createJob(/* jobName, JobClass */) {
        throw new Error('Method not implemented');
    }

    /**
     * Enable a job
     * @param {string} jobName Name of the job to enable
     */
    async enableJob(/* jobName */) {
        throw new Error('Method not implemented');
    }

    /**
     * Disable a job
     * @param {string} jobName Name of the job to disable
     */
    async disableJob(/* jobName */) {
        throw new Error('Method not implemented');
    }

    /**
     * Configure job retry settings
     * @param {string} jobName Name of the job
     * @param {Object} retryConfig Retry configuration
     * @param {number} retryConfig.attempts Number of retry attempts
     * @param {number} retryConfig.delay Delay between retries in ms
     */
    async configureRetry(/* jobName, retryConfig */) {
        throw new Error('Method not implemented');
    }
}

module.exports = IJobExecutor;