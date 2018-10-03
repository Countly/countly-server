'use strict';

const job = require('../../../../api/parts/jobs/job.js'),
    retry = require('../../../../api/parts/jobs/retry.js'),
    log = require('../../../../api/utils/log.js')('job:data_migration:migrate'),
    MigrationResource = require('../resource.js');

/** class - ValidateJob */
class MigrateJob extends job.TransientJob {
    /** 
     * constructor
     * @param {string} name - job name
     * @param {object} data  - job data
     */
    constructor(name, data) {
        super(name, data);
    }

    /** 
     * Prepare job
     * 
     * @returns {Promise} promise, resolved(always)
     */
    prepare(/*manager, db*/) {
        return Promise.resolve();
    }

    /** 
     * Resource name
     * 
     * @returns {string} 'migration'
     */
    resourceName() {
        return 'migration';
    }

    /** 
     * Create resource
     * 
     * @param {string} _id - id
     * @param {string} name  - name
     * @returns {object} MigrationResource
     */
    createResource(_id, name) {
        // TODO: custom data
        return new MigrationResource(_id, name, {x: this.data.y}, this.db());
    }

    /** 
     * Release Resource
     * @param {object} resource to call on
     * @returns {Promise} result on close
     */
    releaseResource(resource) {
        return resource.close();
    }

    /** 
     * Retry policy for this job - probably no retries needed
     */
    retryPolicy() {
        return new retry.NoRetryPolicy();
    }

    /** 
     * Main job function
     * @return {Any} not used
     */
    async run() {
        log.i('[%d] running migration %j', process.pid, this.data);

        let result = await this.resource.migrate(['a', 'b', 'c']);

        log.i('[%d] migration done with %j', process.pid, result);

        return result;
    }
}

module.exports = MigrateJob;