var plugin = {},
    common = require('../../../api/utils/common.js'),
    {authenticator: GA} = require("otplib"),
    log = common.log('two-factor-auth:api'),
    utils = require("../../../api/utils/utils.js"),
    plugins = require('../../pluginManager.js'),
    { validateUser, isScopedCredential } = require('../../../api/utils/rights.js');

const FEATURE_NAME = 'two_factor_auth';

/**
 * Refuse a credential that is narrower than its owner.
 *
 * These three methods change the owner's second factor, which is account level and belongs
 * to no application: enable replaces the secret, disable removes it and asks for no current
 * code to do so, and generate-qr-code hands out a fresh secret to enable with. A token
 * narrowed to one app or one feature would otherwise be able to weaken the factor that
 * protects everything its owner can reach - the escalation the permission model exists to
 * prevent. validateUser bounds what a scoped token may touch per app; it does not reject
 * the request, and for an account level route there is no app to bound.
 * @param {object} params - params object of the request
 * @param {string} what - what the request was trying to do, for the message
 * @returns {boolean} true when the request was refused and answered
 */
function refuseScopedCredential(params, what) {
    if (isScopedCredential(params)) {
        common.returnMessage(params, 403, "A restricted token cannot " + what);
        return true;
    }
    return false;
}

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
            if (refuseScopedCredential(ob.params, "change two factor authentication")) {
                return;
            }
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
            if (refuseScopedCredential(ob.params, "change two factor authentication")) {
                return;
            }
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
