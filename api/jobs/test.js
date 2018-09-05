'use strict';

/* jshint ignore:start */

const should = require('should'),
    J = require('../parts/jobs/job.js'),
    R = require('../parts/jobs/resource.js'),
    RET = require('../parts/jobs/retry.js');


class TestResource extends R.Resource {
    open() {
        console.log('resource: opening in %d', process.pid);
        this.opened();
        this.openedTime = Date.now();
        return Promise.resolve();
    }

    close() {
        console.log('resource: closing in %d', process.pid);
        this.closed();
        return Promise.resolve();
    }

    kill() {
        console.log('resource: killed in %d', process.pid);
        return Promise.resolve();
    }

    checkActive() {
        console.log('resource: checkActive in %d', process.pid);
        return Promise.resolve(Date.now() - this.openedTime < 20000);
    }

    start() {
        this.openedTime = Date.now();
        super.start.apply(this, arguments);
    }
}

class IPCTestJob extends J.IPCJob {
    async prepare(manager, db) {
        console.log('preparing in %d', process.pid);
        await new Promise((res, rej) => db.collection('jobs').updateOne({_id: this._id}, {$set: {'data.prepared': 1}}, err => err ? rej(err) : res()));
    }

    resourceName() {
        return 'resource:test';
    }

    createResource(_id, name, db) {
        return new TestResource(_id, name, db);
    }

    retryPolicy() {
        return new RET.NoRetryPolicy();
    }

    getConcurrency() {
        return this.data && this.data.concurrency || 0;
    }

    async run(db) {
        console.log('running in %d', process.pid);
        should.exist(this.resource);
        (this.resource instanceof TestResource).should.be.true();
        await new Promise((res, rej) => db.collection('jobs').updateOne({_id: this._id}, {$set: {'data.run': 1}}, err => err ? rej(err) : res()));

        if (this.data && this.data.fail) {
            throw new Error(this.data.fail);
        }

        if (this.data && this.data.concurrency) {
            await new Promise(res => setTimeout(res, 3000));
        }

        console.log('done running in %d', process.pid);
    }
}

module.exports = IPCTestJob;