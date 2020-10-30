const request = require("request");
const utils = require("../../utils");

/**
 * Http effect
 */
class HTTPEffect {
    /**
     * Init function
     */
    constructor() {
        this._timeout = 15000;
    }

    /**
     * main function to run effect
     * @param {object} options - options for required variable
     * @return {promise} - return request promise object
     */
    run({params, effect}) {
        console.log(params, effect, "HTTPEffect running");
        const {method, url, requestData} = effect.configuration;
        const parsedURL = utils.parseStringTemplate(url, params);
        const parsedRequestData = utils.parseStringTemplate(requestData, params, method);
        console.log(parsedURL, parsedRequestData, "[HTTPEffect]");
        // todo: assemble params for request;
        // const params = {}
        switch (method) {
        case 'get':
            return request.get({uri: parsedURL + "?" + parsedRequestData, timeout: this._timeout}, function(e, r, body) {
                console.log(e, body, "[httpeffects]");
            });
            break;
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
            break;
        default:
            return;
        }
    }
}
module.exports = HTTPEffect;

