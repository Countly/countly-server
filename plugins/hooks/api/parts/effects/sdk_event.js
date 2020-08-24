const request = require("request");
const common = require('../../../../../api/utils/common.js');

class SDKEventEffect{
    constructor() {
        this._timeout = 5000;
        this._url = `http://localhost:${common.config.api.port}/i`;
    }
    run({params, effect, rule}) {
        // todo: assemble params for request;
        const {app_key, event_key, segmentation} = effect.configuration; 
        const qs = {
            app_key,
            device_id: 0,
            events:JSON.stringify([{
                key: event_key,
                count: 1,
                segmentation,
            }])
         }

        return request.get({url: this._url, qs:qs, timeout: this._timeout}, function (e, r, body) {
            console.log(e, r, body,this._url, qs, "[sdkEventEffect]");
        });
    }
}
module.exports = SDKEventEffect;
