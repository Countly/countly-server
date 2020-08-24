const request = require("request");

class HttpEffect{
    constructor() {
        this._timeout = 5000;
    }
    run({params, effect}) {
        const {method, url}= effect.configuration; 
        // todo: assemble params for request;
        // const params = {}  
        switch(method) {
            case 'get':
                return request.get({url,qs:params, timeout: this._timeout}, function (e, r, body) {
                    console.log(e, r, body, "[httpeffects]");
                });
            case 'post': 
                //support post formData
                return request.post({url, formData:params, timeout: this._timeout}, function (e, r, body) {
                    console.log(e, r, body, "[httpeffects]");
                });
            default:
                return;
        }
    }
}
module.exports = HttpEffect;

