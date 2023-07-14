//file should be placed in countly/extend
//edit this script and put it in countly/extend/mail.js to overwrite existing email templates and settings
var nodemailer = require('nodemailer');
const pluginManager = require('../plugins/pluginManager.js');

function getPluginConfig() {
    //rename company
    var company = "Company";
    var email = "email@company.com";

    const plugins = pluginManager.getPlugins(true);
    if (plugins.indexOf('white-labeling') > -1) {
        try {
            const pluginsConfig = pluginManager.getConfig("white-labeling");
            const {emailFrom, emailCompany} = pluginsConfig;
            email = emailFrom && emailFrom.length > 0 ? emailFrom : email;
            company = emailCompany && emailCompany.length > 0 ? emailCompany : company;
        }
        catch (error) {
            console.log('Error getting plugins config', error);
        }
    }
    return { email, company };
}

module.exports = function(mail) {
    //define this if you need to send email from some third party service
    mail.smtpTransport = nodemailer.createTransport({
        host: "myhost",
        secureConnection: true,
        port: 2525,
        auth: {
            user: "username",
            pass: "password"
        }
    });

    mail.sendMail = function(message, callback) {
        const { email, company } = getPluginConfig();
        message.from = company + " <" + email + ">";
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

    mail.sendMessage = function(to, subject, message, callback) {
        const { email, company } = getPluginConfig();
        mail.sendMail({
            to: to,
            from: company + " <" + email + ">",
            subject: subject || "",
            html: message || ""
        }, callback);
    };

    mail.sendToNewMember = function(member, memberPassword) {
        const { company } = getPluginConfig();
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
        const { company } = getPluginConfig();
        const password = mail.escapedHTMLString(memberPassword);

        mail.lookup(function(err, host) {
            mail.sendMessage(member.email, "" + company + " Account - Password Change", "Hi " + mail.getUserFirstName(member) + ",<br/><br/>\n" +
            "Your password for your " + company + " account on <a href='" + host + "'>" + host + "</a> has been changed. Below you can find your updated account details;<br/><br/>\n" +
            "Username: " + member.username + "<br/>Password: " + password + "<br/><br/>\n" +
            "Best,<br/>A fellow " + company + " Admin");
        });
    };

    mail.sendPasswordResetInfo = function(member, prid) {
        const { company } = getPluginConfig();

        mail.lookup(function(err, host) {
            mail.sendMessage(member.email, "" + company + " Account - Password Reset", "Hi " + mail.getUserFirstName(member) + ",<br/><br/>\n" +
            "You can reset your " + company + " account password by following <a href='" + host + "/reset/" + prid + "'>this link</a>.<br/><br/>\n" +
            "If you did not request to reset your password ignore this email.<br/><br/>\n" +
            "Best,<br/>A fellow " + company + " Admin");
        });
    };

    mail.sendAutomatedMessageError = function(member, link) {
        const { company } = getPluginConfig();

        mail.lookup(function(err, host) {
            link = host + '/' + link;
            mail.sendMessage(member.email, company + " Automated Push Problem", "Hi " + mail.getUserFirstName(member) + ",,<br/><br/>\n" +
            "Your <a href=\"" + link + "\">automated message</a> cannot be sent due to a repeating error.\n" +
            "Please review message status and reactivate the message once the problem is resolved.<br/><br/>\n" +
            "Best,<br/>A fellow " + company + " Admin");
        });
    };
};
