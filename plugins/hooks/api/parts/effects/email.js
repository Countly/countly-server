const mail = require("../../../../../api/parts/mgmt/mail.js");

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
     */
    run(options) {
        const {effect, params} = options;
        let emailAddress = effect.configuration.address;
        if (typeof emailAddress === "string") {
            emailAddress = [emailAddress]; //parse to array
        }

        emailAddress.forEach(address => {
            var msg = {
                to: address,
                subject: "Countly hooks",
                html: JSON.stringify(params),
            };
            console.log(msg);
            mail.sendMail(msg);
        });
    }
}

module.exports = EmailEffect;
