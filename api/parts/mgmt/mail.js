var mail = {},
    nodemailer = require('nodemailer'),
    request = require('request'),
    plugins = require('../../../plugins/pluginManager.js'),
    smtpTransport = nodemailer.createTransport("Sendmail", "/usr/sbin/sendmail");
/*
 Use the below transport to send mails through Gmail

 smtpTransport = nodemailer.createTransport("SMTP",{
     service: "Gmail",
     auth: {
         user: "YOUR_GMAIL_OR_GOOGLE_APPS_EMAIL",
         pass: "PASSWORD"
     }
 });
*/
/*
 Use the below transport to send mails through your own SMTP server

 smtpTransport = nodemailer.createTransport("SMTP", {
     host: "smtp.gmail.com", // hostname
     secureConnection: true, // use SSL
     port: 465, // port for secure SMTP
     auth: {
         user: "gmail.user@gmail.com",
         pass: "userpass"
     }
 });
*/

mail.sendMail = function(message) {
    smtpTransport.sendMail(message, function (error) {
        if (error) {
            console.log('Error sending email');
            console.log(error.message);
            return;
        }
    });
}

mail.sendToNewMember = function (member, memberPassword) {
    lookup(function(err, host) {
        var message = {
            to:member.email,
            from:"Countly",
            subject:'Your Countly Account',
            html:'Hi ' + getUserFirstName(member) + ',<br/><br/>' +
                'Your Countly account on <a href="' + host + '">' + host + '</a> is created with the following details;<br/><br/>' +
                'Username: ' + member.username + '<br/>' +
                'Password: ' + memberPassword + '<br/><br/>' +
                'Enjoy,<br/>' +
                'A fellow Countly Admin'
        };

        mail.sendMail(message);
    });
};

mail.sendToUpdatedMember = function (member, memberPassword) {
    lookup(function(err, host) {
        var message = {
            to:member.email,
            from:"Countly",
            subject:'Countly Account - Password Change',
            html:'Hi ' + getUserFirstName(member) + ',<br/><br/>' +
                'Your password for your Countly account on <a href="' + host + '">' + host + '</a> has been changed. Below you can find your updated account details;<br/><br/>' +
                'Username: ' + member.username + '<br/>' +
                'Password: ' + memberPassword + '<br/><br/>' +
                'Best,<br/>' +
                'A fellow Countly Admin'
        };

        mail.sendMail(message);
    });
};

mail.sendPasswordResetInfo = function (member, prid) {
    lookup(function(err, host) {
        var message = {
            to:member.email,
            from:"Countly",
            subject:'Countly Account - Password Reset',
            html:'Hi ' + getUserFirstName(member) + ',<br/><br/>' +
                'You can reset your Countly account password by following ' +
                '<a href="' + host + '/reset/' + prid + '">this link</a>.<br/><br/>' +
                'If you did not request to reset your password ignore this email.<br/><br/>' +
                'Best,<br/>' +
                'A fellow Countly Admin'
        };

        mail.sendMail(message);
    });
};

function getUserFirstName(member) {
    var userName = (member.full_name).split(" "),
        userFirstName = "";

    if (userName.length == 0) {
        userFirstName = "there";
    } else {
        userFirstName = userName[0];
    }

    return userFirstName;
}

function lookup(callback) {
    // If host is set in config.js use that, otherwise get the external IP from ifconfig.me
    if (plugins.getConfig("api").domain) {
        callback(false, plugins.getConfig("api").domain);
    } else {
        request('http://ifconfig.me/ip', function(error, response, body) {
            callback(error, body);
        });
    }
}
plugins.extendModule("mail", mail);
module.exports = mail;