/**
 * @typedef {Object} RetryConfig
 * @property {number} attempts - Maximum number of retry attempts
 * @property {number} delay - Delay between retries in milliseconds
 */

/**
 * Interface for job execution operations.
 * Provides methods to manage and configure job execution within the system.
 * @interface
 */
class IJobExecutor {
    /**
     * Creates and defines a new job in the execution system
     * @param {string} jobName - Unique identifier for the job
     * @param {Constructor} JobClass - Constructor for the job implementation
     * @throws {Error} When method is not implemented by concrete class
     * @returns {Promise<void>} Resolves when job is created and defined
     */
    async createJob(/* jobName, JobClass */) {
        throw new Error('Method not implemented');
    }

    /**
     * Enables a previously created job for execution
     * @param {string} jobName - Name of the job to enable
     * @throws {Error} When method is not implemented by concrete class
     * @returns {Promise<void>} Resolves when job is enabled
     */
    async enableJob(/* jobName */) {
        throw new Error('Method not implemented');
    }

    /**
     * Disables an active job from execution
     * @param {string} jobName - Name of the job to disable
     * @throws {Error} When method is not implemented by concrete class
     * @returns {Promise<void>} Resolves when job is disabled
     */
    async disableJob(/* jobName */) {
        throw new Error('Method not implemented');
    }

    /**
     * Configures retry behavior for a specific job
     * @param {string} jobName - Name of the job to configure
     * @param {RetryConfig} retryConfig - Configuration for retry behavior
     * @throws {Error} When method is not implemented by concrete class
     * @returns {Promise<void>} Resolves when retry configuration is applied
     */
    async configureRetry(/* jobName, retryConfig */) {
        throw new Error('Method not implemented');
    }
}

module.exports = IJobExecutor;