// Nodemailer SES support: https://nodemailer.com/transports/ses/
// Important steps:
//      1) run "npm install aws-sdk" in "echo $(countly dir)"
//      2) make sure you have an IAM policy to allow access to AWS SES
//      3) update the email variable below with one of your email addresses that was added to SES Identity Management
//      4) update region to one of the 3 valid AWS SES regions: eu-west-1, us-west-2 or us-east-1
//      5) rename or copy this file to countly/extend/mail.js
// Optional: You are free to stop the sendmail process as it is no longer required.

var nodemailer = require('nodemailer');
var aws = require('aws-sdk');

//rename company
var company = "Company";
var email = "email@company.com";

aws.config.update({region: 'eu-west-1'});

module.exports = function(mail) {
    //define this if you need to send email from some third party service
    mail.sesTransport = nodemailer.createTransport({
        SES: new aws.SES({
            apiVersion: '2010-12-01'
        })
    });

    mail.sendMail = function(message, callback) {
        message.from = company + " <" + email + ">";
        mail.sesTransport.sendMail(message, function(error) {
            if (error) {
                console.log('Error sending email');
                console.log(error.message);
            }
            if (callback) {
                callback(error);
            }
        });
    };

    mail.sendMessage = function(to, subject, message, callback) {
        mail.sendMail({
            to: to,
            from: company + " <" + email + ">",
            subject: subject || "",
            html: message || ""
        }, callback);
    };

    mail.sendToNewMember = function(member, memberPassword) {
        const password = mail.escapedHTMLString(memberPassword);

        mail.lookup(function(err, host) {
            mail.sendMessage(member.email, "Your " + company + " Account",
                "Hi " + mail.getUserFirstName(member) + ",<br/><br/>\n" +
                "Your " + company + " account on <a href='" + host + "'>" + host + "</a> is created with the following details;<br/><br/>\n" +
                "Username: " + member.username + "<br/>Password: " + password + "<br/><br/>\n" +
                "Enjoy,<br/>A fellow " + company + " Admin");
        });
    };

    mail.sendToUpdatedMember = function(member, memberPassword) {
        const password = mail.escapedHTMLString(memberPassword);

        mail.lookup(function(err, host) {
            mail.sendMessage(member.email, "" + company + " Account - Password Change", "Hi " + mail.getUserFirstName(member) + ",<br/><br/>\n" +
            "Your password for your " + company + " account on <a href='" + host + "'>" + host + "</a> has been changed. Below you can find your updated account details;<br/><br/>\n" +
            "Username: " + member.username + "<br/>Password: " + password + "<br/><br/>\n" +
            "Best,<br/>A fellow " + company + " Admin");
        });
    };

    mail.sendPasswordResetInfo = function(member, prid) {
        mail.lookup(function(err, host) {
            mail.sendMessage(member.email, "" + company + " Account - Password Reset", "Hi " + mail.getUserFirstName(member) + ",<br/><br/>\n" +
            "You can reset your " + company + " account password by following <a href='" + host + "/reset/" + prid + "'>this link</a>.<br/><br/>\n" +
            "If you did not request to reset your password ignore this email.<br/><br/>\n" +
            "Best,<br/>A fellow " + company + " Admin");
        });
    };

    mail.sendAutomatedMessageError = function(member, link) {
        mail.lookup(function(err, host) {
            link = host + '/' + link;
            mail.sendMessage(member.email, company + " Automated Push Problem", "Hi " + mail.getUserFirstName(member) + ",,<br/><br/>\n" +
            "Your <a href=\"" + link + "\">automated message</a> cannot be sent due to a repeating error.\n" +
            "Please review message status and reactivate the message once the problem is resolved.<br/><br/>\n" +
            "Best,<br/>A fellow " + company + " Admin");
        });
    };
};