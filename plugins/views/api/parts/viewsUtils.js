var common = require('../../../../api/utils/common.js');
var plugins = require('../../../pluginManager.ts');
var log = common.log('views:api');

module.exports = {
    /**
     * Omits specified segments from views
     * @param {Object} options - options for omitting
     * @param {Object} [options.db] - database connection (optional, defaults to common.db)
     * @param {Array<string>} [options.omit] - array of segment names to omit
     * @param {string} options.appId - application ID
     * @param {Object} options.params - params object
     * @param {Object} [options.params.qstring] - query string object
     * @param {Object} [options.params.user] - user object
     * @param {string} [options.params.user._id] - user ID
     * @param {string} [options.params.user.username] - username
     * @param {boolean} [options.extend] - whether to extend existing omit list or replace it
     * @param {function(string=): void} callback - callback function called with optional error message
     */
    ommit_segments: async function(options, callback) {
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
            updateOp = {$addToSet: {omit: {"$each": omit}}, "$unset": unset};

        }
        else {
            updateOp = {$set: {omit: omit}, "$unset": unset};
        }

        try {
            await db.collection('views').updateOne({"_id": db.ObjectID(appId)}, updateOp);
            plugins.dispatch("/systemlogs", {params: params, action: "view_segments_ommit", data: { update: omit}});

            var errCn = 0;
            for (var z = 0; z < omit.length; z++) {
                var colName = "app_viewdata";
                try {
                    await common.db.collection(colName).deleteMany({"_id": {"$regex": "^" + appId + "_" + omit + "_.*"}});
                }
                catch (err) {
                    if (err.code !== 26) { //if error is not collection not found.(Because it is possible for it to not exist)
                        log.e(JSON.stringify(err));
                        errCn++;
                    }
                }
            }
            log.d("Segments omittion compleated  for:" + JSON.stringify(omit));
            if (errCn > 0) {
                plugins.dispatch("/systemlogs", {params: params, action: "view_segments_ommit_complete", data: { app_id: appId, update: omit, error: "Failed to delete some(" + errCn + ") collections. Please call omiting again."}});
            }
            else {
                plugins.dispatch("/systemlogs", {params: params, action: "view_segments_ommit_complete", data: { app_id: appId, update: omit}});
            }
            callback();
        }
        catch (error) {
            log.e(error);
            callback("Updating database failed");
        }

    },
    cleanupRootDocument: async function(db, appId) {
        try {
            var doc = await db.collection('views').findOne({"_id": db.ObjectID(appId)});
            var segment_value_limit = 10;
            var changes_collected = false;
            var omitted = doc.omit || [];

            //Remove still stored omited segments(that should not be in doc anymore)
            for (var z = 0; z < omitted.length; z++) {
                if (doc.segments && doc.segments[omitted[z]]) {
                    changes_collected = true;
                    try {
                        await this.ommit_segments({db, omit: [omitted[z]], appId, params: {qstring: {}, user: {_id: "system", username: "system"}}}, function(err) {
                            if (err) {
                                log.e("Failed to omit segment " + omitted[z] + ": " + err);
                            }
                        });

                    }
                    catch (err) {
                        log.e("Failed to omit segment " + omitted[z] + ": " + err);
                    }
                }
            }

            //Look for any segment having more values than limit and omit it if it is not already omitted.
            if (!changes_collected && doc.segments) {
                for (var seg in doc.segments) {
                    if (Object.keys(doc.segments[seg]).length > segment_value_limit && !omitted.includes(seg)) {
                        changes_collected = true;
                        try {
                            await this.ommit_segments({db, omit: [omitted[z]], appId, params: {qstring: {}, user: {_id: "system", username: "system"}}}, function(err) {
                                if (err) {
                                    log.e("Failed to omit segment " + omitted[z] + ": " + err);
                                }
                            });

                        }
                        catch (err) {
                            log.e("Failed to omit segment " + omitted[z] + ": " + err);
                        }
                    }
                }
            }

        }
        catch (error) {
            log.e("Failed to cleanup root document for app " + appId + ": " + error);
        }
    }
};