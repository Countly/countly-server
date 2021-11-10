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
        const {effect, params, rule} = options;
        let emailAddress = effect.configuration.address;
        if (typeof emailAddress === "string") {
            emailAddress = [emailAddress]; //parse to array
        }

        const logs = [];
        /**
        * handle email sending promise
        * @param {object} msg - message object
        * @return {void}
        */
        const promisifyEMailSending = (msg) => {
            return new Promise((resolve) => {
                mail.sendMail(msg, (e) => {
                    if (e) {
                        logs.push(`message:${e.message} \n stack: ${JSON.stringify(e.stack)}`);
                        utils.addErrorRecord(rule._id, e);
                        log.e("[hooks email effect]", e);
                    }
                    resolve();
                });
            });
        };
        const sendTasks = [];
        await emailAddress.forEach(address => {
            const formatedJSON = "<pre>" + JSON.stringify(params, null, 2) + "</pre>";
            var msg = {
                to: address,
                subject: "Countly Hooks",
                html: formatedJSON,
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
