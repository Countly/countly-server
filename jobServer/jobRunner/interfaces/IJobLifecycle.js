/**
 * Interface for job lifecycle operations
 */
class IJobLifecycle {
    /**
     * Starts the job runner
     * @param {Object.<string, Function>} jobClasses Object containing job classes keyed by job name
     */
    async start(/* jobClasses */) {
        throw new Error('Method not implemented');
    }

    /**
     * Closes the job runner and cleans up resources
     */
    async close() {
        throw new Error('Method not implemented');
    }
}

module.exports = IJobLifecycle;