'use strict';

const job = require('../../../../api/parts/jobs/job.js'),
    pluginManager = require('../../../pluginManager.js'),
    log = require('../../../../api/utils/log.js')('alert:monitor'),
    Promise = require("bluebird");
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const common = require('../../../../api/utils/common.js');
let alertModules = {};


/**
 * load alert modeules from 'alertModules/*' folder
 * @return {object} promise
 */
const getAlertModules = function() {
    const plugins = pluginManager.getPlugins();
    const alertsDirList = [];
    for (let i = 0, l = plugins.length; i < l; i++) {
        alertsDirList.push(path.resolve(__dirname, "../../../" + plugins[i] + "/api/alertModules"));
    }

    let promises = alertsDirList.map(function(alertDir) {
        return new Promise((resolve) => {
            fs.readdir(alertDir, (err, files) => {
                return err || !files ? resolve() : resolve(files.map(f => {
                    return {
                        name: f.substr(0, f.length - 3),
                        filePath: alertDir + '/' + f
                    };
                }));
            });
        });
    });

    return Promise.all(promises).then(arrays => {
        arrays = _.flatten(arrays);
        alertModules = [];
        arrays.forEach(alert => {
            if (alert && alert.filePath) {
                alertModules[alert.name] = alert.filePath;
            }
        });
    });
};

// load modules
getAlertModules();

/**
 * @class
 * @classdesc Class MonitorJob is Alert Monitor Job extend from Countly Job
 * @extends Job
 */
class MonitorJob extends job.Job {
    /**
    * run task
    * @param {object} db - db object
    * @param {function} done - callback function
    */
    run(db, done) {
        const alertID = this._json.data.alertID;
        const self = this;
        common.db.collection("alerts").findOne({ _id: common.db.ObjectID(alertID) }, function(err, alertConfigs) {
            log.d('Runing alerts Monitor Job ....');
            log.d("job info:", self._json, alertConfigs);
            if (alertModules[alertConfigs.alertDataType]) {
                const module = require(alertModules[alertConfigs.alertDataType]);
                module.check({ db: common.db, alertConfigs, done });
            }
        });
    }
}

module.exports = MonitorJob;
