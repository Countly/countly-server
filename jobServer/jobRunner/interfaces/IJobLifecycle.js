/**
 * Interface for managing job lifecycle operations.
 * Handles the initialization, execution, and cleanup of job runners.
 * 
 * @interface
 */
class IJobLifecycle {
    /**
     * Starts the job runner and initializes all registered jobs
     * 
     * @typedef {Object} JobClass
     * @property {Function} new Creates a new instance of the job
     * @property {Function} execute Method that runs the job logic
     * 
     * @param {Object.<string, JobClass>} jobClasses - Map of job names to their implementing classes
     * @throws {Error} When initialization fails
     * @returns {Promise<void>} Resolves when all jobs are initialized and runner is ready
     */
    async start(/* jobClasses */) {
        throw new Error('Method not implemented');
    }

    /**
     * Gracefully shuts down the job runner and performs cleanup
     * 
     * @throws {Error} When cleanup fails
     * @returns {Promise<void>} Resolves when all jobs are stopped and resources are released
     */
    async close() {
        throw new Error('Method not implemented');
    }
}

module.exports = IJobLifecycle;