var common = require('../../../../api/utils/common.js');
var plugins = require('../../../pluginManager.js');
var log = common.log('views:api');
var crypto = require('crypto');

module.exports = {
    ommit_segments: function(options, callback) {
        var db = options.db || common.db;
        var omit = options.omit || [];
        var appId = options.appId;
        var params = options.params;

        var unset = {};
        for (var zz = 0; zz < omit.length; zz++) {
            unset["segments." + omit[zz]] = "";
        }
        var updateOp = {};
        if (options.extend) {
            updateOp = {$addToSet: {omit: omit}, "$unset": unset};

        }
        else {
            updateOp = {$set: {omit: omit}, "$unset": unset};
        }
        db.collection('views').updateOne({"_id": db.ObjectID(appId)}, updateOp, function(err5) {
            if (err5) {
                log.e(err5);
                callback("Updating database failed");
            }
            else {
                plugins.dispatch("/systemlogs", {params: params, action: "view_segments_ommit", data: { update: omit}});

                var promises = [];
                var errCn = 0;
                for (var z = 0; z < omit.length; z++) {
                    var colName = "app_viewdata" + crypto.createHash('sha1').update(omit[z] + appId).digest('hex');
                    promises.push(new Promise(function(resolve2) {
                        common.db.collection(colName).drop(function(err) {
                            if (err && err.code !== 26) { //if error is not collection not found.(Because it is possible for it to not exist)
                                log.e(JSON.stringify(err));
                                errCn++;
                            }
                            resolve2();
                        });
                    }));
                }
                Promise.all(promises).then(function() {
                    log.d("Segments omittion compleated  for:" + JSON.stringify(omit));
                    if (errCn > 0) {
                        plugins.dispatch("/systemlogs", {params: params, action: "view_segments_ommit_complete", data: { app_id: appId, update: omit, error: "Failed to delete some(" + errCn + ") collections. Please call omiting again."}});
                    }
                    else {
                        plugins.dispatch("/systemlogs", {params: params, action: "view_segments_ommit_complete", data: { app_id: appId, update: omit}});
                    }
                });
                callback();
            }
        });

    }
};