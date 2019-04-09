'use strict';

const logger = require('../../utils/log.js'),
    log = logger('jobs:worker:' + process.pid),
    ipc = require('./ipc.js'),
    Job = require('./job.js').Job,
    {Notifier} = require('./watcher.js'),
    manager = require('../../../plugins/pluginManager.js');

/** Worker jobs handler which allows scheduling and listens for status updates from master **/
class Worker extends Notifier {
    /** constructor **/
    constructor() {
        super();
        log.i('Starting');
        this.ided = {};
        this.central = new ipc.CentralWorker('jobs', (data) => {
            log.d('From master: %j', data);
            if (data === 'started') {
                this.central.read('*').then(names => {
                    log.d('Job names from master: %j', names);
                    this.names = names;
                    manager.dispatch('jobs:schedule');
                }, err => {
                    log.e('Couldn\'t get job names: %j', err);
                });
            }
            else if (typeof data === 'object' && data.job) {
                this.notify(data);
            }
        });
    }

    /**
    * Create job instance
    * 
    * @param {string} name - job name
    * @param {object} data - job data (optional)
    * @returns {Job} job instance
    **/
    job(name, data) {
        if (!this.names) {
            throw new Error('Jobs must me scheduled either from plugins.register(\'jobs:schedule\') or after it\'s called');
        }
        if (this.names.filter(n => n === name).length === 0) {
            throw new Error(`No job file for ${name}`);
        }
        return new Job(name, data, this._watchId.bind(this));
    }
}

if (!Worker.instance) {
    Worker.instance = new Worker();
}

module.exports = Worker.instance;