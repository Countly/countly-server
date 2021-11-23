const request = require("request");
const common = require('../../../../../api/utils/common.js');

/**
 * SDK event effect, not avaliable yet
 */
class SDKEventEffect {
    /**
     * Init function
     */
    constructor() {
        this._timeout = 5000;
        this._url = `http://localhost:${common.config.api.port}/i`;
    }

    /**
     * main function to run effect
     * @param {object} options - options for required variable
     *
     */
    run({effect}) {
        // todo: assemble params for request;
        const {app_key, event_key, segmentation} = effect.configuration;
        const qs = {
            app_key,
            device_id: 0,
            events: JSON.stringify([{
                key: event_key,
                count: 1,
                segmentation,
            }])
        };

        request.get({url: this._url, qs: qs, timeout: this._timeout}, function(e, r, body) {
            console.log(e, r, body, this._url, qs, "[sdkEventEffect]");
        });
    }
}
module.exports = SDKEventEffect;
