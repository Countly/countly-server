const mail = require("../../../../../api/parts/mgmt/mail.js");
const utils = require("../../utils");
const common = require('../../../../../api/utils/common.js');
const log = common.log("hooks:api:api_endpoint_trigger");



/**
 * Email  effect
 */
class EmailEffect {
    /**
     * Init function
     */
    constructor() {
    }

    /**
     * main function to run effect
     * @param {object} options - options for required variable
     * @return {object} - return processed options object.
     */
    async run(options) {
        const {effect, params, rule, effectStep, _originalInput} = options;
        let emailAddress = effect.configuration.address;
        let emailTemplate = effect.configuration.emailTemplate;

        if (typeof emailAddress === "string") {
            emailAddress = [emailAddress]; //parse to array
        }

        const logs = [];
        /**
         * Promise for email sending
         * @param {object} msg  - message object
         * @returns {Promise} - promise object
         */
        const promisifyEMailSending = (msg) => {
            return new Promise((resolve) => {
                mail.sendMail(msg, (e) => {
                    if (e) {
                        logs.push(`Error: ${e.message}`);
                        utils.addErrorRecord(rule._id, e, params, effectStep, _originalInput);
                        log.e("[hooks email effect]", e);
                    }
                    resolve();
                });
            });
        };
        const sendTasks = [];
        await emailAddress.forEach(address => {
            let formatedEmailContent = "<pre>" + JSON.stringify(params, null, 2) + "</pre>";
            if (emailTemplate && emailTemplate.length > 0) {
                try {
                    formatedEmailContent = utils.parseStringTemplate(emailTemplate, params);
                    formatedEmailContent = formatedEmailContent.replace(/\n/g, "<br />");
                }
                catch (e) {
                    log.e(`Error: ${e.message}`);
                    log.e("[hooks email effect]", e);
                }

            }
            var msg = {
                to: address,
                subject: "Countly Hooks",
                html: formatedEmailContent,
            };
            sendTasks.push(promisifyEMailSending(msg));
            log.d("[hook email effect]", msg);
        });
        await Promise.all(sendTasks);
        log.d("hook email effect logs", logs);
        return {...options, logs};
    }
}

module.exports = EmailEffect;
