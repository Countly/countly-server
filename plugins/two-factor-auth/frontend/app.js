var pluginObject = {},
    {authenticator: GA} = require("otplib"),
    URL = require('url').URL,
    qrcode = require("qrcode"),
    countlyConfig = require('../../../frontend/express/config'),
    plugins = require('../../pluginManager.js'),
    apiUtils = require("../../../api/utils/utils.js"),
    members = require("../../../frontend/express/libs/members.js"),
    versionInfo = require("../../../frontend/express/version.info"),
    languages = require('../../../frontend/express/locale.conf'),
    preventBruteforce = require('../../../frontend/express/libs/preventBruteforce.js');

/**
 @param {string} username - user identifier
 @param {string} secret - base32 encoded 2FA secret
 @param {function} callback - function to call with an error, if any, and a SVG string
 */
function generateQRCode(username, secret, callback) {
    var domain = versionInfo.company || versionInfo.title || "Countly";

    if (domain === "Countly") {
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

        // modify password reset flow
        app.get(countlyConfig.path + '/reset/:prid', function(req, res, next) {
            if (req.params.prid) {
                req.params.prid += "";
                // password reset id is found
                countlyDb.collection('password_reset').findOne({prid: req.params.prid}, function(passwordResetErr, passwordReset) {
                    if (!passwordReset || !passwordReset.user_id) {
                        next();
                        return;
                    }
                    else if (passwordReset.two_factor_auth_passed) {
                        next();
                        return;
                    }

                    // member is found
                    countlyDb.collection('members').findOne({_id: passwordReset.user_id}, {}, function(memberErr, member) {
                        if (member && member.two_factor_auth && member.two_factor_auth.enabled && member.two_factor_auth.secret_token) {
                            if (!req.query.auth_code) {
                                // user has not passed the 2fa
                                res.render("../../../plugins/two-factor-auth/frontend/public/templates/enter2fa_reset", {
                                    cdn: countlyConfig.cdn || "",
                                    countlyFavicon: req.countly.favicon,
                                    countlyPage: req.countly.page,
                                    countlyTitle: req.countly.title,
                                    csrf: req.csrfToken(),
                                    inject_template: req.template,
                                    languages: languages,
                                    message: req.flash('info'),
                                    path: countlyConfig.path || "",
                                    themeFiles: req.themeFiles
                                });
                            }
                            else if (GA.check(req.query.auth_code, apiUtils.decrypt(member.two_factor_auth.secret_token))) {
                                // everything is ok, let the user reset their password
                                countlyDb.collection('password_reset').updateOne({prid: req.params.prid}, {$set: {two_factor_auth_passed: true}}, {}, function(passwordResetUpdateErr) {
                                    if (passwordResetUpdateErr) {
                                        console.log(`Error setting 2FA pass for password reset: ${passwordResetUpdateErr}`);
                                    }
                                    next();
                                });
                            }
                            else {
                                // 2FA auth code was wrong, delete the password reset token
                                countlyDb.collection('password_reset').deleteOne({prid: req.params.prid}, function(passwordResetDelErr) {
                                    if (passwordResetDelErr) {
                                        console.log(`Error deleting password reset: ${passwordResetDelErr}`);
                                    }
                                });
                                res.redirect(countlyConfig.path + '/forgot');
                            }
                        }
                        else {
                            next();
                        }
                    });
                });
            }
            else {
                next();
            }
        });

        app.post(countlyConfig.path + '/reset', function(req, res, next) {
            if (req.body.prid) {
                req.body.prid += "";
                // password reset id is found
                countlyDb.collection('password_reset').findOne({prid: req.body.prid}, function(passwordResetErr, passwordReset) {
                    if (!passwordReset || !passwordReset.user_id) {
                        next();
                        return;
                    }

                    countlyDb.collection('members').findOne({_id: passwordReset.user_id}, {}, function(memberErr, member) {
                        if (member && member.two_factor_auth && member.two_factor_auth.enabled && member.two_factor_auth.secret_token) {
                            if (passwordReset.two_factor_auth_passed) {
                                next();
                            }
                            else {
                                res.redirect(countlyConfig.path + '/reset/' + req.body.prid);
                            }
                        }
                        else {
                            next();
                        }
                    });
                });
            }
            else {
                next();
            }
        });

        // modify login flow
        app.post(countlyConfig.path + '/login', function(req, res, next) {
            members.verifyCredentials(req.body.username, req.body.password, function(member) {
                // if member exists and 2fa is enabled globally or for the user
                if (member && (member.two_factor_auth && member.two_factor_auth.enabled || plugins.getConfig("two-factor-auth").globally_enabled)) {
                    // if 2fa is not set up for the user
                    if ((member.two_factor_auth === undefined || member.two_factor_auth.secret_token === undefined) &&
                        (req.body.auth_code === undefined || req.body.secret_token === undefined)) {
                        const secretToken = GA.generateSecret();

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
                        res.render("../../../plugins/two-factor-auth/frontend/public/templates/enter2fa_login", {
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
                            const secretToken = member.two_factor_auth && member.two_factor_auth.secret_token ? apiUtils.decrypt(member.two_factor_auth.secret_token) : req.body.secret_token;

                            req.session.otp = req.body.auth_code;
                            if (GA.check(req.body.auth_code, secretToken)) {
                                if (req.body.secret_token) {
                                    countlyDb.collection("members").findAndModify(
                                        {_id: member._id},
                                        {},
                                        {
                                            $set: {
                                                "two_factor_auth.enabled": true,
                                                "two_factor_auth.secret_token": apiUtils.encrypt(req.body.secret_token)
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
                                // 2fa is being set up
                                if (req.body.secret_token) {
                                    generateQRCode(member.username, req.body.secret_token, function(err, svg) {
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
                                                secret_token: req.body.secret_token,
                                                qrcode_html: svg
                                            });
                                        }
                                    });
                                }
                                // 2fa is already set up
                                else {
                                    // otp is wrong, increase fails
                                    preventBruteforce.fail("login", req.body.username);
                                    res.render("../../../plugins/two-factor-auth/frontend/public/templates/enter2fa_login", {
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
