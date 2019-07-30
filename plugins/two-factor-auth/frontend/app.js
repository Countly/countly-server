var pluginObject = {},
    GA = require("otplib/authenticator"),
    URL = require('url').URL,
    qrcode = require("qrcode"),
    countlyConfig = require('../../../frontend/express/config'),
    plugins = require('../../pluginManager.js'),
    languages = require('../../../frontend/express/locale.conf');

GA.options = {
    crypto: require("crypto")
};

/**
 @param {string} username - user identifier
 @param {string} secret - base32 encoded 2FA secret
 @param {function} callback - function to call with an error, if any, and a SVG string
 */
function generateQRCode(username, secret, callback) {
    var domain = "Countly";

    try {
        const apiURL = plugins.getConfig("api").domain;
        if (apiURL) {
            let parsedURL = new URL(apiURL);
            domain = parsedURL.hostname;
        }
    }
    catch (err) {
        console.log(`Error parsing api URL: ${err}`);
    }

    qrcode.toString(GA.keyuri(username, domain, secret),
        {type: "svg", color: {light: "#FFF0"}, errorCorrectionLevel: "L"},
        callback);
}

(function(plugin) {
    plugin.init = function(app, countlyDb) {
        // require two factor auth localization file for translation strings
        app.get(countlyConfig.path + '/login', function(req, res, next) {
            req.template.js += "\naddLocalization('two-factor-auth', countlyGlobal['cdn']+'two-factor-auth/localization/');";
            next();
        });

        // modify login flow
        app.post(countlyConfig.path + '/login', function(req, res, next) {
            countlyDb.collection('members').findOne({"username": req.body.username}, function(memberErr, member) {
                if (memberErr) {
                    console.log(`Database error searching for member during login with 2FA: ${memberErr.message}`);
                }

                // if member exists and 2fa is enabled globally or for the user
                if (member && (member.two_factor_auth && member.two_factor_auth.enabled || plugins.getConfig("two-factor-auth").globally_enabled)) {
                    // if 2fa is not set up for the user
                    if ((member.two_factor_auth === undefined || member.two_factor_auth.secret_token === undefined) &&
                        (req.body.auth_code === undefined || req.body.secret_token === undefined)) {
                        var secretToken = GA.generateSecret();

                        generateQRCode(member.username, secretToken, function(err, svg) {
                            if (err) {
                                console.log(`Error generating QR code: ${err}`);
                                res.redirect(countlyConfig.path + "/login?message=two-factor-auth.login.error");
                            }
                            else {
                                res.render("../../../plugins/two-factor-auth/frontend/public/templates/setup2fa", {
                                    cdn: countlyConfig.cdn || "",
                                    countlyFavicon: req.countly.favicon,
                                    countlyPage: req.countly.page,
                                    countlyTitle: req.countly.title,
                                    csrf: req.csrfToken(),
                                    inject_template: req.template,
                                    languages: languages,
                                    message: req.flash('info'),
                                    path: countlyConfig.path || "",
                                    themeFiles: req.themeFiles,
                                    username: req.body.username || "",
                                    password: req.body.password || "",
                                    secret_token: secretToken,
                                    qrcode_html: svg
                                });
                            }
                        });
                    }
                    // else if user did not provide 2fa code (login flow first phase)
                    else if (!req.body.auth_code) {
                        res.render("../../../plugins/two-factor-auth/frontend/public/templates/enter2fa", {
                            cdn: countlyConfig.cdn || "",
                            countlyFavicon: req.countly.favicon,
                            countlyPage: req.countly.page,
                            countlyTitle: req.countly.title,
                            csrf: req.csrfToken(),
                            inject_template: req.template,
                            languages: languages,
                            message: req.flash('info'),
                            path: countlyConfig.path || "",
                            themeFiles: req.themeFiles,
                            username: req.body.username || "",
                            password: req.body.password || ""
                        });
                    }
                    // else everything is alright (login flow second phase)
                    else {
                        try {
                            var verified = GA.check(req.body.auth_code, (member.two_factor_auth && member.two_factor_auth.secret_token) || req.body.secret_token);
                            if (verified) {
                                if (req.body.secret_token) {
                                    countlyDb.collection("members").findAndModify(
                                        {_id: member._id},
                                        {},
                                        {
                                            $set: {
                                                "two_factor_auth.enabled": true,
                                                "two_factor_auth.secret_token": req.body.secret_token
                                            }
                                        },
                                        function(enableErr) {
                                            if (enableErr) {
                                                console.log(`Error enabling 2FA for ${member.username}: ${enableErr.message}`);
                                            }
                                            else {
                                                plugins.callMethod("logAction", {req: req, res: res, user: member, action: "two_factor_auth_enabled", data: {}});
                                            }
                                        }
                                    );
                                }
                                next();
                            }
                            else {
                                res.redirect(countlyConfig.path + "/login?message=two-factor-auth.login.code");
                            }
                        }
                        catch (verifyErr) {
                            console.log(`Error verifying 2FA for ${member.username}: ${verifyErr.message}`);
                            res.redirect(countlyConfig.path + "/login?message=two-factor-auth.login.code");
                        }
                    }
                }
                else {
                    next();
                }
            });
        });
    };

    // set vars to be usable on frontend
    // these variables are passed to countly.views.js
    // therefore the view / vars are loaded in the existing countly window
    plugin.renderDashboard = function(params) {
        var secretToken = GA.generateSecret();

        params.data.countlyGlobal["2fa_secret_token"] = secretToken;

        generateQRCode(params.data.countlyGlobal.member.username, secretToken, function(err, svg) {
            if (err) {
                console.log(`Error generating QR code: ${err}`);
                params.data.countlyGlobal["2fa_qrcode_html"] = "<span>:(</span>";
            }
            else {
                params.data.countlyGlobal["2fa_qrcode_html"] = svg;
            }
        });
        params.data.countlyGlobal["2fa_globally_enabled"] = !!plugins.getConfig("two-factor-auth").globally_enabled;
    };
}(pluginObject));

module.exports = pluginObject;