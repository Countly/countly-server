/**
* This module is meant handling mailing
* @module api/parts/mgmt/mail
*/

/** @lends module:api/parts/mgmt/mail */
var mail = {},
    nodemailer = require('nodemailer'),
    localize = require('../../utils/localization.js'),
    plugins = require('../../../plugins/pluginManager.js'),
    versionInfo = require('../../../frontend/express/version.info'),
    authorize = require('../../utils/authorizer'),
    config = require('../../config'),
    ip = require('./ip.js');

if (config.mail && config.mail.transport && config.mail.transport !== "nodemailer-smtp-transport") {
    mail.smtpTransport = nodemailer.createTransport(require(config.mail.transport)(config.mail.config));
}
else if (config.mail && config.mail.config) {
    mail.smtpTransport = nodemailer.createTransport(config.mail.config);
}
else {
    mail.smtpTransport = nodemailer.createTransport({
        sendmail: true,
        newline: 'unix',
        path: '/usr/sbin/sendmail'
    });
}

/**
 * 
 * @returns {string} email and company name
 */
function getPluginConfig() {
    let email = null;
    let company = null;
    const pluginList = plugins.getPlugins(true);
    if (pluginList.indexOf('white-labeling') > -1) {
        try {
            const pluginsConfig = plugins.getConfig("white-labeling");
            const {emailFrom, emailCompany} = pluginsConfig;
            email = emailFrom && emailFrom.length > 0 ? emailFrom : null;
            company = emailCompany && emailCompany.length > 0 ? emailCompany : null;
            if (email && email.length && company && company.length) {
                return company + " <" + email + ">";
            }
        }
        catch (error) {
            console.log('Error getting plugins config', error);
        }
    }
    return null;
}

/*
 Use the below transport to send mails through Gmail

    mail.smtpTransport = nodemailer.createTransport({
        host: 'localhost',
        port: 25,
        auth: {
            user: 'username',
            pass: 'password'
        }
    });
*/
/*
 Use the below transport to send mails through your own SMTP server

    mail.smtpTransport = nodemailer.createTransport({
        host: "smtp.gmail.com", // hostname
        secureConnection: true, // use SSL
        port: 465, // port for secure SMTP
        auth: {
            user: "gmail.user@gmail.com",
            pass: "userpass"
        }
    });
*/

/**
* Send email with message object
* @param {object} message - message object
* @param {string} message.to - where to send email
* @param {string} message.from - from whom was email sent
* @param {string} message.subject - subject for email
* @param {string} message.html - email message
* @param {function} callback - function to call when its done
**/
mail.sendMail = function(message, callback) {
    const whiteLabelingConfig = getPluginConfig();
    message.from = whiteLabelingConfig || config.mail && config.mail.strings && config.mail.strings.from || message.from || "Countly";
    mail.smtpTransport.sendMail(message, function(error) {
        if (error) {
            console.log('Error sending email');
            console.log(error.message);
        }
        if (callback) {
            callback(error);
        }
    });
};

/**
* Send email with params
* @param {string} to - where to send email
* @param {string} subject - subject for email
* @param {string} message - email message
* @param {function} callback - function to call when its done
**/
mail.sendMessage = function(to, subject, message, callback) {
    const whiteLabelingConfig = getPluginConfig();
    mail.sendMail({
        to: to,
        from: whiteLabelingConfig || config.mail && config.mail.strings && config.mail.strings.from || "Countly",
        subject: subject || "",
        html: message || ""
    }, callback);
};

/**
* Send localized email with params
* @param {string} lang - locale to use in email (to get values from properties)
* @param {string} to - where to send email
* @param {string|string[]} subject - key from localization files to use as subject; array of [key, var0, var1, ...] kind in case the property needs variable substitution
* @param {string|string[]} message - key from localization files to use as email message; array of [key, var0, var1, ...] kind in case the property needs variable substitution
* @param {function} callback - function to call when its done
**/
mail.sendLocalizedMessage = function(lang, to, subject, message, callback) {
    localize.getProperties(lang, function(err, properties) {
        if (err) {
            if (callback) {
                callback(err);
            }
        }
        else {
            if (Array.isArray(subject)) {
                subject = localize.format(properties[subject[0]] || subject[0], subject.slice(1));
            }
            else {
                subject = properties[subject] || subject;
            }
            if (Array.isArray(message)) {
                message = localize.format(properties[message[0]] || message[0], message.slice(1));
            }
            else {
                message = properties[message] || message;
            }
            mail.sendMessage(to, subject, message, callback);
        }
    });
};

/**
 * encode string to escape html code
 * @param {string} s inputed string
 * @return {string} newString new string escaped html code
 */
mail.escapedHTMLString = function(s) {
    var ss = s || "";
    const newString = ss.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return newString;
};

/**
* Email to send to new members
* @param {object} member - member document
* @param {string} memberPassword - OTP for member to authorize
**/
mail.sendToNewMember = function(member, memberPassword) {
    member.lang = member.lang || "en";
    const password = mail.escapedHTMLString(memberPassword);
    mail.lookup(function(err, host) {
        localize.getProperties(member.lang, function(err2, properties) {
            var message = localize.format(properties["mail.new-member"], mail.getUserFirstName(member), host, member.username, password);
            mail.sendMessage(member.email, properties["mail.new-member-subject"], message);
        });
    });
};

/**
* Email to send to new members
* @param {object} member - member document
* @param {string} prid - id for password reset link
**/
mail.sendToNewMemberLink = function(member, prid) {
    member.lang = member.lang || "en";
    mail.lookup(function(err, host) {
        localize.getProperties(member.lang, function(err2, properties) {
            var message = localize.format(properties["mail.new-member-prid"], mail.escapedHTMLString(mail.getUserFirstName(member)), host, mail.escapedHTMLString(member.username), prid);
            mail.sendMessage(member.email, properties["mail.new-member-subject"], message);
        });
    });
};

/**
* Email to send to members where global admin updated their password
* @param {object} member - member document
* @param {string} memberPassword - OTP for member to authorize
**/
mail.sendToUpdatedMember = function(member, memberPassword) {
    member.lang = member.lang || "en";
    const password = mail.escapedHTMLString(memberPassword);
    mail.lookup(function(err, host) {
        localize.getProperties(member.lang, function(err2, properties) {
            var message = localize.format(properties["mail.password-change"], mail.escapedHTMLString(mail.getUserFirstName(member)), host, mail.escapedHTMLString(member.username), password);
            mail.sendMessage(member.email, properties["mail.password-change-subject"], message);
        });
    });
};

/**
* Email to send to members when requesting to reset password
* @param {object} member - member document
* @param {string} prid - password reset id
**/
mail.sendPasswordResetInfo = function(member, prid) {
    member.lang = member.lang || "en";
    mail.lookup(function(err, host) {
        localize.getProperties(member.lang, function(err2, properties) {
            var message = localize.format(properties["mail.password-reset"], mail.escapedHTMLString(mail.getUserFirstName(member)), host, prid);
            mail.sendMessage(member.email, properties["mail.password-reset-subject"], message);
        });
    });
};

mail.sendTimeBanWarning = function(member, db) {
    authorize.save({
        purpose: "LoggedInAuth",
        db: db,
        ttl: 3600,
        multi: false,
        owner: member._id,
        app: "",
        callback: function(err, token) {
            mail.lookup(function(err2, host) {
                localize.getProperties(member.lang, function(err3, properties) {
                    var subject = localize.format(properties['mail.time-ban-subject'], versionInfo.title || "Countly");
                    var message = localize.format(properties["mail.time-ban"], mail.escapedHTMLString(mail.getUserFirstName(member)), host, token);
                    mail.sendMessage(member.email, subject, message);
                });
            });
        }
    });
};

/**
 * Send email notifying a member about unrecoverable automated message error
 * @param  {object} member user object
 * @param  {string} link   link to use in email
 */
mail.sendAutomatedMessageError = function(member, link) {
    mail.lookup(function(err, host) {
        member.lang = member.lang || 'en';
        link = host + '/' + link;
        localize.getProperties(member.lang, function(err2, properties) {
            let message = localize.format(properties['mail.autopush-error'], mail.escapedHTMLString(mail.getUserFirstName(member)), link);
            mail.sendMessage(member.email, properties['mail.autopush-error-subject'], message);
        });
    });
};

/**
* Gets members first name to use in the email
* @param {object} member - member document
* @returns {string} value to use as member's first name
**/
mail.getUserFirstName = function(member) {
    var userName = (member.full_name).split(" "),
        userFirstName = "";

    if (userName.length === 0) {
        userFirstName = config.mail && config.mail.strings && config.mail.strings.hithere || "there";
    }
    else {
        userFirstName = userName[0];
    }

    return userFirstName;
};

/**
* Lookup host name to use in links
* @param {function} callback - callback for result
**/
mail.lookup = function(callback) {
    ip.getHost(callback);
};

plugins.extendModule("mail", mail);
module.exports = mail;
