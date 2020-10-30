const mail = require("../../../../../api/parts/mgmt/mail.js");

class EmailEffect {
    constructor(options) {
    }

    run(options) {
        console.log(options);
        const {effect, params} = options;
        let emailAddress = effect.configuration.address;
        if (typeof emailAddress === "string") {
            emailAddress = [emailAddress] //parse to array
        }

        emailAddress.forEach(address => {
            var msg = {
                to: address,
                subject: "Countly hooks",
                html: JSON.stringify(params),
            };
            console.log(msg);
            mail.sendMail(msg);
        })
    }
}

module.exports = EmailEffect;
