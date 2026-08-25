var common = require('../../../../api/utils/common.js');
var plugins = require('../../../pluginManager.js');
var log = common.log('views:api');
var crypto = require('crypto');
var { hasReadRight } = require('../../../../api/utils/rights.js');

module.exports = {
    /**
    * Whether a token's owner, bounded by the token, may read a feature for an app.
    *
    * The member handed in here must already be the token-scoped one: rights.js bounds a
    * member by the authenticating token's permissions before any handler runs, and this
    * route resolves its own token, so it has to do the same before asking this.
    *
    * hasReadRight covers feature permissions, an app admin and a global admin, but not the
    * legacy membership validateRead still honours: a member stored before permission
    * objects existed has no `permission` at all and is granted read through `user_of`.
    * Refusing those would take away access the same member's api_key still has. A locked
    * account is refused, as validateRead refuses it.
    * @param {object} member - the member a token resolved to, already token-scoped
    * @param {string} appId - id of the app the request resolved to
    * @param {string} feature - feature being read
    * @returns {boolean} true when this caller may read
    **/
    ownerCanRead: function(member, appId, feature) {
        if (!member || member.locked) {
            return false;
        }
        if (member.global_admin) {
            return true;
        }
        if (typeof member.permission === "undefined") {
            return Array.isArray(member.user_of) && member.user_of.indexOf(appId) !== -1;
        }
        return !!hasReadRight(feature, appId, member);
    },


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
            updateOp = {$addToSet: {omit: {"$each": omit}}, "$unset": unset};

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