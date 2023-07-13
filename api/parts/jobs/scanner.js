'use strict';

const log = require('../../utils/log.js')('jobs:scanner'),
    manager = require('../../../plugins/pluginManager.js'),
    fs = require('fs');

module.exports = (db, filesObj, classesObj) => {
    return new Promise((resolve, reject) => {
        manager.loadConfigs(db, () => {
            require('../../utils/log.js').ipcHandler({
                cmd: 'log',
                config: manager.getConfig('logs')
            });
        });

        var jobs = manager.getPlugins();
        if (!jobs) {
            log.e('Won\'t start jobs because no plugins.json exist');
            return reject('Won\'t start jobs because no plugins.json exist');
        }

        log.i('Checking plugins %j', jobs);

        jobs = [{
            category: 'api',
            dir: __dirname + '/../../jobs'
        }].concat(jobs.map(function(plugin) {
            return {
                category: plugin,
                dir: __dirname + '/../../../plugins/' + plugin + '/api/jobs'
            };
        }));

        let promises = jobs.map(job => {
            return new Promise((res) => {
                fs.readdir(job.dir, (err, files) => {
                    return err || !files ? res() : res(files.filter(f => {
                        return fs.statSync(job.dir + '/' + f).isFile();
                    }).map(f => {
                        return {
                            category: job.category,
                            name: f.substr(0, f.length - 3),
                            file: job.dir + '/' + f
                        };
                    }));
                });
            });
        });

        Promise.all(promises).then(arrays => {
            arrays.forEach(arr => {
                (arr || []).forEach(job => {
                    try {
                        let name = job.category + ':' + job.name;
                        filesObj[name] = job.file;
                        classesObj[name] = require(job.file);
                        log.d('Found job %j at %j', name, job.file);
                    }
                    catch (e) {
                        log.e('Error when loading job %s: %j ', job.file, e, e.stack);
                    }
                });
            });
        }).then(resolve, reject);
    });
};