var plugin = {},
    common = require('../../../api/utils/common.js'),
    log = common.log('compliance-hub:ingestor'),
    plugins = require('../../pluginManager.ts');

(function() {

    //write api call
    plugins.register("/sdk/process_user", function(ob) {
        var params = ob.params;
        if (typeof params.qstring.consent === "string") {
            try {
                params.qstring.consent = JSON.parse(params.qstring.consent);
            }
            catch (SyntaxError) {
                log.e('Parse consent JSON failed', params.qstring.consent, params.req.url, params.req.body);
            }
        }
        if (params.qstring.consent) {
            if (!params.app_user.consent) {
                params.app_user.consent = {};
            }

            var update = {};
            var hasIn = false;
            var hasOut = false;
            var stateSegmentation = {};
            Object.keys(params.app_user.consent).forEach(function(k) {
                stateSegmentation[k + "_bf"] = String(params.app_user.consent[k]);
            });

            Object.keys(params.qstring.consent).forEach(function(k2) {
                var prevVal = params.app_user.consent[k2];
                var currVal = params.qstring.consent[k2];
                stateSegmentation[k2 + "_bf"] = (prevVal === null || typeof prevVal === "undefined") ? null : String(prevVal);
                stateSegmentation[k2] = String(currVal);
                if (prevVal !== currVal) {
                    update["consent." + k2] = currVal;
                    if (currVal) {
                        hasIn = true;
                    }
                    else {
                        hasOut = true;
                    }
                }
            });

            if (Object.keys(update).length) {
                var type = [];
                ob.updates.push({$set: update});
                if (hasIn) {
                    type.push("i");
                }
                if (hasOut) {
                    type.push("o");
                }
                if (type.length === 1) {
                    stateSegmentation._type = type[0];
                }
                else if (type.length > 1) {
                    stateSegmentation._type = type;
                }
                params.qstring.events.push({
                    key: "[CLY]_consent",
                    count: 1,
                    segmentation: stateSegmentation
                });
            }
        }
    });

    plugins.register("/i/user_merge", function(ob) {
        var newAppUser = ob.newAppUser;
        var oldAppUser = ob.oldAppUser;
        if (typeof oldAppUser.consent !== "undefined") {
            if (typeof newAppUser.consent === "undefined") {
                newAppUser.consent = oldAppUser.consent;
            }
            else {
                for (var i in oldAppUser.consent) {
                    if (typeof newAppUser.consent[i] === "undefined") {
                        newAppUser.consent[i] = oldAppUser.consent[i];
                    }
                }
            }
        }
    });

}(plugin));

module.exports = plugin;
