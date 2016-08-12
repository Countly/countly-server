//file should be placed in countly/extend
//edit this script and put it in countly/extend/mail.js to overwrite existing email templates and settings
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

//rename company
var company = "Company";
var email = "email@company.com";

module.exports = function(mail){
    //define this if you need to send email from some third party service
    mail.smtpTransport = nodemailer.createTransport(smtpTransport({
        host: "myhost",
        secureConnection: true,
        port: 2525,
        auth: {
            user: "username",
            pass: "password"
        }
    }));

    mail.sendMessage = function (to, subject, message, callback) {
        mail.sendMail({
            to:to,
            from:company+" <"+email+">",
            subject:subject || "",
            html:message || ""
        }, callback);
    };

    mail.sendToNewMember = function (member, memberPassword) {
        mail.lookup(function(err, host) {
            mail.sendMessage(member.email, "Your "+company+" Account",
                "Hi "+mail.getUserFirstName(member)+",<br/><br/>Your "+company+" account on <a href='"+host+"'>"+host+"</a> is created with the following details;<br/><br/>Username: "+member.username+"<br/>Password: "+memberPassword+"<br/><br/>Enjoy,<br/>A fellow "+company+" Admin");
        });
    };

    mail.sendToUpdatedMember = function (member, memberPassword) {
        mail.lookup(function(err, host) {
            mail.sendMessage(member.email, ""+company+" Account - Password Change", "Hi "+mail.getUserFirstName(member)+",<br/><br/>Your password for your "+company+" account on <a href='"+host+"'>"+host+"</a> has been changed. Below you can find your updated account details;<br/><br/>Username: "+member.username+"<br/>Password: "+memberPassword+"<br/><br/>Best,<br/>A fellow "+company+" Admin");
        });
    };

    mail.sendPasswordResetInfo = function (member, prid) {
        mail.lookup(function(err, host) {
            mail.sendMessage(member.email, ""+company+" Account - Password Reset", "Hi "+mail.getUserFirstName(member)+",<br/><br/>You can reset your "+company+" account password by following <a href='"+host+"/reset/"+prid+"'>this link</a>.<br/><br/>If you did not request to reset your password ignore this email.<br/><br/>Best,<br/>A fellow "+company+" Admin");
        });
    };
};