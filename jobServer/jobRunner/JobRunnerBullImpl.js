const IJobRunner = require('./IJobRunner');
const { Queue, Worker } = require('bullmq');

/**
 * BullMQ implementation of the job runner
 */
class JobRunnerBullImpl extends IJobRunner {
    /**
     * Map of queue names to BullMQ Queue instances
     * @type {Map<string, import('bullmq').Queue>}
     */
    #queues = new Map();

    /**
     * Map of queue names to BullMQ Worker instances
     * @type {Map<string, import('bullmq').Worker>}
     */
    #workers = new Map();

    #bullConfig;

    #redisConnection;

    #Queue;

    #Worker;

    /**
     * Creates a new BullMQ job runner
     * @param {Object} db Database connection
     * @param {Object} config Configuration object
     */
    constructor(db, config) {
        super(db, config);
        this.#Queue = Queue;
        this.#Worker = Worker;
        this.#redisConnection = config.redis;
        this.#bullConfig = config.bullConfig;
    }

    /**
     * @param {Object.<string, Function>} jobClasses Object containing job classes keyed by job name
     */
    async start(jobClasses) {

        // Create queues and workers for each job
        for (const [name, JobClass] of Object.entries(jobClasses)) {
            // Create queue
            const queue = new this.#Queue(name, {
                connection: this.#redisConnection,
                ...this.#bullConfig
            });
            this.#queues.set(name, queue);

            // Create worker
            const worker = new this.#Worker(name, async(job) => {
                const instance = new JobClass(name);
                await instance.run(job);
            }, {
                connection: this.#redisConnection,
                ...this.#bullConfig
            });
            this.#workers.set(name, worker);

            // Handle worker events
            worker.on('completed', (job) => {
                console.log(`Job ${job.id} completed`);
            });

            worker.on('failed', (job, err) => {
                console.error(`Job ${job.id} failed:`, err);
            });
        }
    }

    /**
     * Closes all queues and workers
     * @returns {Promise<void>} A promise that resolves once all queues and workers are closed
     */
    async close() {
        // Close all workers
        for (const worker of this.#workers.values()) {
            await worker.close();
        }
        this.#workers.clear();

        // Close all queues
        for (const queue of this.#queues.values()) {
            await queue.close();
        }
        this.#queues.clear();
    }
}

module.exports = JobRunnerBullImpl;