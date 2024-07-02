/**
 *  Script to add no_snapshots flag to drill reports
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/reports_snapshot_flag.js
 *  Command: node fix_null_uids.js
 */
const pluginManager = require('../../../plugins/pluginManager.js');
var Promise = require("bluebird");

console.log('looking for byval reports');


Promise.all([pluginManager.dbConnection("countly")]).then(async function([countlyDb]) {
    countlyDb.collection('long_tasks').find({"type": "drill", "linked_to._issuer": "wqm:drill", "manually_create": true}).toArray(function(err, reports) {
        if (err) {
            console.log('Error while fetching reports', err);
            countlyDb.close();
            return;
        }
        else {
            console.log("checking reports");
            reports = reports || [];
            Promise.each(reports, function(report) {
                return new Promise(function(resolve, reject) {

                    try {
                        report.request = JSON.parse(report.request);
                        if (report.request && report.request.json && report.request.json.method === "segmentation" && report.request.json.projectionKey && !report.request.json.no_snapshots) {
                            report.request.json.no_snapshots = true;
                            countlyDb.collection('long_tasks').updateOne({_id: report._id}, {$set: {"request": JSON.stringify(report.request)}}, function(err) {
                                if (err) {
                                    console.log('Error while updating report', report._id);
                                    reject();
                                }
                                else {
                                    console.log('report updated', report._id);
                                    resolve();
                                }
                            });
                        }
                        else {
                            resolve();
                        }
                    }
                    catch (e) {
                        console.log('Error while parsing report', report._id);
                        console.log(e);
                        resolve();
                    }
                });
            }).then(function() {
                console.log('Finished');
                countlyDb.close();
                process.exit();
            }).catch(function() {
                console.log('Unknown Error while executing script');
                countlyDb.close();
                process.exit();
            });
        }
    });
});
