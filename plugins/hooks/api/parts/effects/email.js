const mail = require("../../../../../api/parts/mgmt/mail.js");

class EmailEffect {
    constructor(options) {
    }

    run(options) {
        console.log(options);
        const {effect, params} = options;
        var msg = {
            to: effect.configuration.address,
            //from: "countly hooks",
            subject: "Countly hooks",
            html: JSON.stringify(params),
        };
        console.log(msg);
        mail.sendMail(msg);
    }
}

module.exports = EmailEffect;
