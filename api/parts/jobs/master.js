'use strict';

const logger = require('../../utils/log.js'),
    log = logger('jobs:master'),
    ipc = require('./ipc.js'),
    scan = require('./scanner.js'),
    Watcher = require('./watcher.js').Watcher,
    Job = require('./job.js').Job,
    manager = require('../../../plugins/pluginManager.js');

/** 
 * Jobs master process:
 * - Keep track of job files & tell workers wether a particular job is available.
 * - Listen for jobs collection changes & distributed updates amongh workers & plugins.
 **/
class Master {
    /** constructor **/
    constructor() {
        log.i('Starting job master in %d', process.pid);
        this.db = manager.singleDefaultConnection(5);
        this.classes = {}; // {'job name': Constructor}
        this.files = {}; // {'ping': '/usr/local/countly/api/jobs/ping.js'}        
        this.central = new ipc.Central('jobs', (name, read) => {
            if (read) {
                if (name === '*') {
                    return Object.keys(this.classes);
                }
                else {
                    return (name in this.classes);
                }
            }
        });
        this.central.attach();
        scan(this.db, this.files, this.classes).catch(log.e.bind(log)).then(() => {
            log.d('Found jobs: %j', Object.keys(this.classes));
            this.watcher = new Watcher(this.db);
            this.watcher.watch('', this.onchange.bind(this));
            this.watcher.start();
            setTimeout(() => {
                manager.dispatch('jobs:schedule');
                this.central.send(null, 'started');
            }, 1000);
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
        if (!this.classes) {
            throw new Error('Jobs must me scheduled either from plugins.register(\'jobs:schedule\') or after it\'s called');
        }
        if (!(name in this.classes)) {
            throw new Error(`No job file for ${name}`);
        }
        return new Job(name, data);
    }

    /**
     * Handle mongo change stream data - pass it to plguins & workers
     * 
     * @param  {Boolean} neo whether change is for new job
     * @param  {Object} job changed job
     */
    onchange({neo, job, change}) {
        log.d('Onchange: %s / %j', neo ? 'new' : 'edit', job, 'change', change);
        this.central.send(null, {neo, job, change});
        manager.dispatch('job:' + job.name, {neo, job, change});
    }
}

if (!Master.instance) {
    Master.instance = new Master();
}

module.exports = Master.instance;