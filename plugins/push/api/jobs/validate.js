'use strict';

/* jshint ignore:start */

const job = require('../../../../api/parts/jobs/job.js'),
    log = require('../../../../api/utils/log.js')('job:push:validate'),
    //creds = require('../parts/credentials.js'),
    ConnectionResource = require('../parts/res.js'),
    retry = require('../../../../api/parts/jobs/retry.js');

/** class - ValidateJob */
class ValidateJob extends job.TransientJob {
    /** constructor
      * @param {string} name - name
      * @param {object} data  - data
      */
    constructor(name, data) {
        super(name, data);
    }

    /** prepare
     * @returns {Promise} promise, resolved(always)
     */
    prepare(/*manager, db*/) {
        return new Promise((resolve, reject) => {
            this.db().collection('plugins').findOne({}, (error, plugins) => {
                if (error || !plugins) {
                    return reject(error || 'no configs');
                }

                this.proxyhost = plugins.push && plugins.push.proxyhost || '';
                this.proxyport = plugins.push && plugins.push.proxyport || '';
                this.proxyuser = plugins.push && plugins.push.proxyuser || '';
                this.proxypass = plugins.push && plugins.push.proxypass || '';

                resolve();
            });
        });
    }

    /** resource name
     * @returns {string} 'validate:' + this.data.cid
     */
    resourceName() {
        return 'validate:' + this.data.cid;
    }

    /** create resource
     * @param {string} _id - id
     * @param {string} name  - name
     * @returns {object} ConnectionResource
     */
    createResource(_id, name) {
        return new ConnectionResource(_id, name, {cid: this.data.cid, test: false, field: 'ip', proxyhost: this.proxyhost, proxyport: this.proxyport, proxyuser: this.proxyuser, proxypass: this.proxypass}, this.db());
    }

    /** release Resource (call close() on it, returns result)
     * @param {object} resource to call on
     * @returns {object} result on close
     */
    releaseResource(resource) {
        return resource.close();
    }

    /** function returns NoretryPolicy
        @returns {object} retrypolicy
    */
    retryPolicy() {
        return new retry.NoRetryPolicy();
    }

    /** function runs job */
    async run() {
        log.i('[%d] validating credentials %s', process.pid, this.data.cid);

        let statuses, resourceError;
        try {
            [statuses, resourceError] = await this.resource.send([{_id: 1, m: '{"test":true}', t: 'testtoken'}]);
            log.i('[%d] returned status for %s: %j / %j', process.pid, this.data.cid, statuses, resourceError);

        }
        catch (e) {
            log.e('Error during validation: %j', e.stack || e);
            if (Array.isArray(e) && e.length === 2) {
                statuses = e[0];
                resourceError = e[1];
            }
            else {
                throw e;
            }
        }

        if (resourceError) {
            throw resourceError;
        }
        else if (statuses.length) {
            let s = statuses[0];
            if (s[1] === 400 || s[2] === 'BadDeviceToken') {
                return;
            }
            else if (s[1] === -200 || s[2] === 'InvalidRegistration') {
                return;
            }
            else if (s[1] > 400 && s[1] < 500) {
                throw new Error(s[1]);
            }
            else {
                return;
            }
        }
    }
}

module.exports = ValidateJob;