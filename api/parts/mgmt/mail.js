/**
* This module is meant handling mailing
* @module api/parts/mgmt/mail
*/

/** @lends module:api/parts/mgmt/mail */
var mail = {},
    nodemailer = require('nodemailer'),
    sendmailTransport = require('nodemailer-sendmail-transport'),
    localize = require('../../utils/localization.js'),
    plugins = require('../../../plugins/pluginManager.js'),
    versionInfo = require('../../../frontend/express/version.info'),
    authorize = require('../../utils/authorizer'),
    ip = require('./ip.js');

mail.smtpTransport = nodemailer.createTransport(sendmailTransport({path: "/usr/sbin/sendmail"}));
/*
 Use the below transport to send mails through Gmail

    mail.smtpTransport = nodemailer.createTransport(smtpTransport({
        host: 'localhost',
        port: 25,
        auth: {
            user: 'username',
            pass: 'password'
        }
    }));
*/
/*
 Use the below transport to send mails through your own SMTP server

    mail.smtpTransport = nodemailer.createTransport(smtpTransport({
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
    mail.sendMail({
        to: to,
        from: "Countly",
        subject: subject || "",
        html: message || ""
    }, callback);
};

/**
* Send localized email with params
* @param {string} lang - locale to use in email (to get values from properties)
* @param {string} to - where to send email
* @param {string} subject - key from localization files to use as subject
* @param {string} message - key from localization files to use as email message
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
            mail.sendMessage(to, properties[subject], properties[message], callback);
        }
    });
};

/**
* Email to send to new members
* @param {object} member - member document
* @param {string} memberPassword - OTP for member to authorize
**/
mail.sendToNewMember = function(member, memberPassword) {
    member.lang = member.lang || "en";
    mail.lookup(function(err, host) {
        localize.getProperties(member.lang, function(err2, properties) {
            var message = localize.format(properties["mail.new-member"], mail.getUserFirstName(member), host, member.username, memberPassword);
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
    mail.lookup(function(err, host) {
        localize.getProperties(member.lang, function(err2, properties) {
            var message = localize.format(properties["mail.password-change"], mail.getUserFirstName(member), host, member.username, memberPassword);
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
            var message = localize.format(properties["mail.password-reset"], mail.getUserFirstName(member), host, prid);
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
                    var message = localize.format(properties["mail.time-ban"], mail.getUserFirstName(member), host, token);
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
            let message = localize.format(properties['mail.autopush-error'], mail.getUserFirstName(member), link);
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
        userFirstName = "there";
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