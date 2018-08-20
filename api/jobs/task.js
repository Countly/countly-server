'use strict';

const job = require('../parts/jobs/job.js'),
	pluginManager = require('../../plugins/pluginManager.js'),
	log = require('../utils/log.js')('api:task'),
	Promise = require("bluebird");
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const common = require('../utils/common.js');
const taskmanager = require('../utils/taskmanager.js');
const moment = require('moment');

/**
 *  Task Monitor Job extend from Countly Job
 */
class MonitorJob extends job.Job {
	run(db, done) {
		const self = this;
		const targetHour =  (new moment()).hours();
		common.db.collection("long_tasks").find({autoRefresh:true, r_hour: targetHour}).toArray(function (err, tasks) {
			log.d('Running Task Monitor Job ....');
            log.d("job info:", self._json, tasks);
            tasks.forEach((task)=>{
                return Promise.coroutine(function *() {
                    taskmanager.rerunTask({db: common.db, id: task._id}, (err, res) => {});
                })();
            }) 
            
            done()
		});
	}
}

module.exports = MonitorJob;

