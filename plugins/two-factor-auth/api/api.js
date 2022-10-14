var plugin = {},
    common = require('../../../api/utils/common.js'),
    {authenticator: GA} = require("otplib"),
    log = common.log('two-factor-auth:api'),
    utils = require("../../../api/utils/utils.js"),
    plugins = require('../../pluginManager.js'),
    { validateUser } = require('../../../api/utils/rights.js');

const FEATURE_NAME = 'two_factor_auth';

plugins.setConfigs("two-factor-auth", {
    globally_enabled: false
});

plugins.register("/permissions/features", function(ob) {
    ob.features.push(FEATURE_NAME);
});

plugins.register("/i/two-factor-auth", function(ob) {
    var config = plugins.getConfig("two-factor-auth");

    switch (ob.params.qstring.method) {
    case "enable":
        validateUser(ob.params, function() {
            var member = ob.params.member,
                secretToken = ob.params.qstring.secret_token,
                authCode = ob.params.qstring.auth_code;

            if (!/^\d{6}$/.test(authCode)) {
                common.returnMessage(ob.params, 400, "Invalid 2FA code");
            }
            else {
                try {
                    var verified = GA.check(authCode, secretToken);
                    if (verified) {
                        common.db.collection("members").findAndModify(
                            {_id: member._id},
                            {},
                            {
                                $set: {
                                    "two_factor_auth.enabled": true,
                                    "two_factor_auth.secret_token": utils.encrypt(secretToken)
                                }
                            },
                            function(err) {
                                if (!err) {
                                    common.returnMessage(ob.params, 200, "Enabled 2FA for user");
                                    plugins.dispatch("/systemlogs", {params: ob.params, action: "two_factor_auth_enabled", data: {}});
                                }
                                else {
                                    log.e(`Database error while enabling 2FA: ${err.message}`);
                                }
                            }
                        );
                    }
                    else {
                        common.returnMessage(ob.params, 401, "Failed to authenticate");
                    }
                }
                catch (err) {
                    log.e(`Caught an exception while enabling 2FA: ${err.message}`);
                    common.returnMessage(ob.params, 500, "Error during verification");
                }
            }
        });
        break;
    case "disable":
        validateUser(ob.params, function() {
            var member = ob.params.member;

            if (!config.globally_enabled) {
                common.db.collection("members").findAndModify(
                    {_id: member._id},
                    {},
                    {
                        $set: {"two_factor_auth.enabled": false},
                        $unset: {"two_factor_auth.secret_token": ""}
                    },
                    function(err) {
                        if (!err) {
                            common.returnMessage(ob.params, 200, "Disabled 2FA for user");
                            plugins.dispatch("/systemlogs", {params: ob.params, action: "two_factor_auth_disabled", data: {}});
                        }
                        else {
                            log.e(`Database error while disabling 2FA: ${err.message}`);
                            common.returnMessage(ob.params, 500, "Database error while disabling 2FA");
                        }
                    }
                );
            }
            else {
                common.returnMessage(ob.params, 403, "Can not disable 2FA for user when it is globally enabled");
            }
        });
        break;
    case "admin_check":
        ob.validateUserForGlobalAdmin(ob.params, function() {
            if (!ob.params.qstring.uid) {
                common.returnMessage(ob.params, 400, "User id required");
            }
            else {
                common.db.collection("members").findOne(
                    {_id: common.db.ObjectID(ob.params.qstring.uid)},
                    {},
                    function(err, member) {
                        if (err) {
                            log.e(`Database error while checking 2FA: ${err.message}`);
                            common.returnMessage(ob.params, 500, "Database error while checking 2FA");
                        }
                        else if (!member) {
                            common.returnMessage(ob.params, 404, "User does not exist");
                        }
                        else {
                            common.returnMessage(ob.params, 200, !!(member.two_factor_auth && member.two_factor_auth.enabled) + "");
                        }
                    }
                );
            }
        });
        break;
    case "admin_disable":
        ob.validateUserForGlobalAdmin(ob.params, function() {
            if (!ob.params.qstring.uid) {
                common.returnMessage(ob.params, 400, "User id required");
            }
            else {
                common.db.collection("members").updateOne(
                    {_id: common.db.ObjectID(ob.params.qstring.uid)},
                    {
                        $set: {"two_factor_auth.enabled": false},
                        $unset: {"two_factor_auth.secret_token": ""}
                    },
                    {},
                    function(err, member) {
                        if (err) {
                            log.e(`Database error while disabling 2FA: ${err.message}`);
                            common.returnMessage(ob.params, 500, "Database error while disabling 2FA");
                        }
                        else if (!member) {
                            common.returnMessage(ob.params, 404, "User does not exist");
                        }
                        else {
                            common.returnMessage(ob.params, 200, "Disabled 2FA for user");
                            plugins.dispatch("/systemlogs", {params: ob.params, action: "two_factor_auth_disabled", data: {user_id: ob.params.qstring.uid}});
                        }
                    }
                );
            }
        });
        break;
    default:
        common.returnMessage(ob.params, 400, "Invalid method");
    }

    return true;
});

module.exports = plugin;
