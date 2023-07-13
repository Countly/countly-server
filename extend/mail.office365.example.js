// NTLM support: https://github.com/nodemailer/nodemailer-ntlm-auth
// Steps:
//      1) run "npm install nodemailer-ntlm-auth" in "echo $(countly dir)"
//      2) rename or copy this file to countly/extend/mail.js

var nodemailer = require("nodemailer");
var nodemailerNTLMAuth = require("nodemailer-ntlm-auth");

module.exports = function(mail) {
    mail.smtpTransport = nodemailer.createTransport({
        host: '<smtp_server>',
        port: 587,
        secure: false,
        auth: {
            type: 'custom',
            method: 'NTLM',
            user: '<username>',
            pass: '<password>',
        },
        customAuth: {
            NTLM: nodemailerNTLMAuth
        }
    });

    mail.sendMail = function(message, callback) {
        message.from = "<countly@yourcompany.com>";
        mail.smtpTransport.sendMail(message, function(error) {
            if (error) {
                console.log("Error sending email");
                console.log(error.message);
            }

            if (callback) {
                callback(error);
            }
        });
    };
};
