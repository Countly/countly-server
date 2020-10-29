const request = require("request");
const utils = require("../../utils");

class HTTPEffect {
    constructor() {
        this._timeout = 15000;
    }

    run({params, effect}) {
        console.log(params, effect, "!!!httddd");
        const {method, url, requestData} = effect.configuration;
        const parsedURL = utils.parseStringTemplate(url, params);
        const parsedRequestData = utils.parseStringTemplate(requestData, params);
        console.log(parsedURL, parsedRequestData, "!!!httddd2");
        // todo: assemble params for request;
        // const params = {}
        switch (method) {
        case 'get':
            return request.get({parsedURL, qs: parsedRequestData, timeout: this._timeout}, function(e, r, body) {
                console.log(e, body, "[httpeffects]");
            });
        case 'post':
            //support post formData
            let parsedJSON = {};
            try {
                parsedJSON = JSON.parse(parsedRequestData);
            }
            catch (e) {
                console.log('http efffect parse post data err:', e);
            }
            return request({
                method: 'POST',
                uri: parsedURL,
                json: parsedJSON,
                timeout: this._timeout,
            },
            function(e, r, body) {
                console.log(e, body, "[httpeffects]");
            });
        default:
            return;
        }
    }
}
module.exports = HTTPEffect;

