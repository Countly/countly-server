'use strict';

const logger = require('../../utils/log.js'),
    log = logger('jobs:handle'),
    ipc = require('./ipc.js'),
    job = require('./job.js'),
    scan = require('./scanner.js'),
    manager = require('../../../plugins/pluginManager.js');

const TRANSIENT_JOB_TIMEOUT = 300000;

/** handle running jobs **/
class Handle {
    /** constructor **/
    constructor() {
        log.i('Starting job handle in %d', process.pid);
        manager.singleDefaultConnection().then((db) => {
            this.db = db;
            this.classes = {}; // {'job name': Constructor}
            this.files = {}; // {'ping': '/usr/local/countly/api/jobs/ping.js'}
            scan(this.db, this.files, this.classes);
        });
    }

    /**
    * create job instance
    * @param {string} name - job name
    * @param {object} data - data about job
    * @returns {Job} job
    **/
    job(name, data) {
        let Constructor = this.classes[name];
        if (Constructor) {
            return new Constructor(name, data);
        }
        else {
            throw new Error('Couldn\'t find job file named ' + name);
        }
    }

    /**
    * Cancel job if any exists
    * 
    * @param {string} name - job name
    * @param {object} data - data about job
    * @returns {Job} job
    **/
    cancel(name, data) {
        return this.db.collection('jobs').updateMany({name, data, status: {$in: [job.STATUS.SCHEDULED, job.STATUS.WAITING, job.STATUS.PAUSED]}}, {$set: {status: job.STATUS.CANCELLED, error: 'Cancelled by user'}});
    }

    /**
    * run transient job
    * @param {string} name - job name
    * @param {object} data - data about job
    * @returns {Promise} promise
    **/
    runTransient(name, data) {
        data._id = data.id = '' + (data._id || this.db.ObjectID());

        let Constructor = this.classes[name];
        if (Constructor) {
            return new Promise((resolve, reject) => {

                var timeout = setTimeout(() => {
                        if (channel !== null) {
                            channel.remove();
                            channel = null;
                            reject('Transient timeout');
                        }
                    }, TRANSIENT_JOB_TIMEOUT),

                    j = new Constructor(name, data),

                    channel = new ipc.IdChannel(job.EVT.TRANSIENT_CHANNEL).attach(process).on(job.EVT.TRANSIENT_DONE, (json) => {
                        log.d('[%d]: Got transient job response %j', process.pid, j._json, json);
                        if (json._id === data._id) {
                            if (channel === null) {
                                return;
                            }
                            else {
                                channel.remove();
                                channel = null;
                                clearTimeout(timeout);
                                if (json.error) {
                                    reject(json);
                                }
                                else {
                                    resolve(json.result);
                                }
                            }
                        }
                    });

                j._json._id = data._id;

                log.d('[%d]: Sending transient job %j', process.pid, j._json);
                channel.send(job.EVT.TRANSIENT_RUN, j._json);
            });

        }
        else {
            throw new Error('Couldn\'t find job file named ' + name);
        }
    }

    /**
    * get ipc
    * @returns {ipc} ipc
    **/
    get ipc() {
        return ipc;
    }

}

if (!Handle.instance) {
    Handle.instance = new Handle();
}

module.exports = Handle.instance;