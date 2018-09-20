var mail = {},
    nodemailer = require('nodemailer'),
    request = require('request'),
    sendmailTransport = require('nodemailer-sendmail-transport'),
    smtpTransport = require('nodemailer-smtp-transport'),
    localize = require('../../utils/localization.js'),
    plugins = require('../../../plugins/pluginManager.js'),
    versionInfo = require('../../../frontend/express/version.info'),
    authorize = require('../../utils/authorizer'),
    ip = require('./ip.js');
    
mail.smtpTransport = nodemailer.createTransport(sendmailTransport({
    path: "/usr/sbin/sendmail"
}));
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

mail.sendMail = function(message, callback) {
    mail.smtpTransport.sendMail(message, function (error) {
        if (error) {
            console.log('Error sending email');
            console.log(error.message);
        }
        if(callback)
            callback(error);
    });
}

mail.sendMessage = function (to, subject, message, callback) {
    mail.sendMail({
        to:to,
        from:"Countly",
        subject:subject || "",
        html:message || ""
    }, callback);
};

mail.sendLocalizedMessage = function (lang, to, subject, message, callback) {
    localize.getProperties(lang, function(err, properties){
        if (err) {
            if(callback)
                callback(err);
        }
        else{
            mail.sendMessage(to, properties[subject], properties[message], callback);
        }
    });
};

mail.sendToNewMember = function (member, memberPassword) {
    member.lang = member.lang || "en";
    mail.lookup(function(err, host) {
        localize.getProperties(member.lang, function(err, properties){
            var message = localize.format(properties["mail.new-member"], mail.getUserFirstName(member), host, member.username, memberPassword);
            mail.sendMessage(member.email, properties["mail.new-member-subject"], message);
        });
    });
};

mail.sendToUpdatedMember = function (member, memberPassword) {
    member.lang = member.lang || "en";
    mail.lookup(function(err, host) {
        localize.getProperties(member.lang, function(err, properties){
            var message = localize.format(properties["mail.password-change"], mail.getUserFirstName(member), host, member.username, memberPassword);
            mail.sendMessage(member.email, properties["mail.password-change-subject"], message);
        });
    });
};

mail.sendPasswordResetInfo = function (member, prid) {
    member.lang = member.lang || "en";
    mail.lookup(function(err, host) {
        localize.getProperties(member.lang, function(err, properties){
            var message = localize.format(properties["mail.password-reset"], mail.getUserFirstName(member), host, prid);
            mail.sendMessage(member.email, properties["mail.password-reset-subject"], message);
        });
    });
};

mail.sendTimeBanWarning = function(member, db){
    authorize.save({
        purpose:"LoggedInAuth",
        db:db, 
        ttl:3600, 
        multi:false, 
        owner:member._id, 
        app:"", 
        callback:function(err, token){
            mail.lookup(function(err, host) {
                localize.getProperties(member.lang, function(err, properties){
                    var subject = localize.format(properties['mail.time-ban-subject'], versionInfo.title || "Countly");
                    var message = localize.format(properties["mail.time-ban"], mail.getUserFirstName(member), host, token);
                    mail.sendMessage(member.email, subject, message);
                });
            });
        }
    });
};

mail.getUserFirstName = function(member) {
    var userName = (member.full_name).split(" "),
        userFirstName = "";

    if (userName.length == 0) {
        userFirstName = "there";
    } else {
        userFirstName = userName[0];
    }

    return userFirstName;
}

mail.lookup = function(callback) {
    ip.getHost(callback);
}

plugins.extendModule("mail", mail);
module.exports = mail;