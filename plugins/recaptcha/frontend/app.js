var exportedPlugin = {},
    countlyConfig = require('../../../frontend/express/config', 'dont-enclose'),
    RecaptchaV2 = require('express-recaptcha').RecaptchaV2;
var plugins = require("../../pluginManager.js");

plugins.setConfigs("recaptcha", {
    enable: true,
    site_key: "",
    secret_key: ""
});

//only secret_key. site_key is public by design: it goes to the browser to render the
//challenge, so marking it secret would achieve nothing.
plugins.setSecretConfigs("recaptcha", {
    secret_key: true
});

(function(plugin) {
    var recaptcha = null,
        recaptchaKeys = null;

    /**
     * The RecaptchaV2 client for the keys configured now, rebuilt when they change.
     * express-recaptcha 5 replaced the module-level init/render/verify with this class.
     * @returns {object|null} client, or null if it could not be created
     */
    function getRecaptcha() {
        var config = plugins.getConfig("recaptcha"),
            keys = config.site_key + "\n" + config.secret_key;
        if (keys !== recaptchaKeys) {
            recaptchaKeys = keys;
            try {
                recaptcha = new RecaptchaV2(config.site_key, config.secret_key);
            }
            catch (ex) {
                console.log(ex);
                recaptcha = null;
            }
        }
        return recaptcha;
    }

    plugin.init = function(app, countlyDb) {
        plugins.loadConfigs(countlyDb, function() {
            if (plugins.getConfig("recaptcha").enable && plugins.getConfig("recaptcha").site_key !== "" && plugins.getConfig("recaptcha").secret_key !== "") {
                getRecaptcha();
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
                    var client = getRecaptcha();
                    if (!client) {
                        res.redirect(countlyConfig.path + '/login?message=recaptcha.incorrect');
                        return;
                    }
                    client.verify(req, function(error) {
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
                var client = getRecaptcha();
                if (client) {
                    req.template.form += client.render();
                }
            }
            next();
        });
    };
}(exportedPlugin));

module.exports = exportedPlugin;