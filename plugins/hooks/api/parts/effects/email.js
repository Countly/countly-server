const mail = require("../../../../../api/parts/mgmt/mail.js");

class EmailEffect {
    constructor(options) {
        console.log(options,"email constructor!!33");
    }

    run(options) {
        console.log("Email effect!!!!333");
        console.log(options);
        const {effect, params} = options;
        var msg = {
            to: effect.configuration.address||"247546458@qq.com",
            //from: "countly hooks",
            subject: "Countly hooks",
            html: "effect!!" + JSON.stringify(params), 
        }
        console.log(msg);
        mail.sendMail(msg);
    }
}

module.exports = EmailEffect;
