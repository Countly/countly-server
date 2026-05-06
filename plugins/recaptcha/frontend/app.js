var exportedPlugin = {},
    countlyConfig = require('../../../frontend/express/config', 'dont-enclose'),
    recaptcha = require('express-recaptcha');
var plugins = require("../../pluginManager.js");

plugins.setConfigs("recaptcha", {
    enable: true,
    site_key: "",
    secret_key: ""
});

(function(plugin) {
    plugin.init = function(app, countlyDb) {
        plugins.loadConfigs(countlyDb, function() {
            if (plugins.getConfig("recaptcha").enable && plugins.getConfig("recaptcha").site_key !== "" && plugins.getConfig("recaptcha").secret_key !== "") {
                try {
                    recaptcha.init(plugins.getConfig("recaptcha").site_key, plugins.getConfig("recaptcha").secret_key);
                }
                catch (ex) {
                    console.log(ex);
                }
            }
        });
        app.post(countlyConfig.path + '/login', function(req, res, next) {
            if (req.session.fails && plugins.getConfig("recaptcha").enable && plugins.getConfig("recaptcha").site_key !== "" && plugins.getConfig("recaptcha").secret_key !== "") {
                // Skip captcha when the user already completed 2FA in this
                // session. Previously this branch checked
                // req.body.auth_code === req.session.otp, but the 2FA plugin
                // used to write session.otp BEFORE verifying the code — so
                // any successful 2FA login left a session in which any
                // subsequent /login with the same auth_code value would
                // bypass captcha against arbitrary other usernames.
                // The 2FA plugin now sets req.session.twoFactorPassed = true
                // ONLY after GA.check succeeds; we use that flag here.
                if (req.session.twoFactorPassed) {
                    next();
                }
                else {
                    recaptcha.verify(req, function(error) {
                        if (!error) {
                            next();
                        }
                        else {
                            res.redirect(countlyConfig.path + '/login?message=recaptcha.incorrect');
                        }
                    });
                }
            }
            else {
                next();
            }
        });
        app.get(countlyConfig.path + '/login', function(req, res, next) {
            if (req.session.fails && plugins.getConfig("recaptcha").enable && plugins.getConfig("recaptcha").site_key !== "" && plugins.getConfig("recaptcha").secret_key !== "") {
                req.template.html += "<link href='./recaptcha/stylesheets/main.css' rel='stylesheet' type='text/css'>";
                req.template.js += "addLocalization('recaptcha', countlyGlobal[\"cdn\"]+'recaptcha/localization/');";
                req.template.js += "$(document).ready(function() {" +
                    "$('body').addClass('recaptcha-enabled');" +
                    "});";
                if (plugins.isPluginEnabled("enterpriseinfo")) {
                    req.template.js += "$(document).ready(function() {" +
                        "$('body').addClass('enterpriseinfo-enabled');" +
                        "});";
                }
                req.template.form += recaptcha.render();
            }
            next();
        });
    };
}(exportedPlugin));

module.exports = exportedPlugin;