/***
 * @module api/utils/countly-request
 */

const got = require('got');
const oauthSignature = require('oauth-signature');

var initParams = function(uri, options, callback) {

    if (typeof options === 'function') {
        callback = options;
    }

    var params = {};
    if (options !== null && typeof options === 'object') {
        // Convert options to a URL
        const url = options.url || options.uri;
        const requestOptions = convertOptionsToGot(options);
        Object.assign(params, { options: requestOptions }, { uri: url });
    }
    else if (typeof uri === 'string') {
        Object.assign(params, { uri: uri });
    }
    else { //options are setn at first argument
        var requestOptions = convertOptionsToGot(uri);
        //to do add uri here
        var url = uri.url || uri.uri;
        Object.assign(params, { options: requestOptions }, { uri: url });
    }

    params.callback = callback || params.callback;


    return params;
};



var getTimeStamp = function() {
    return parseInt(new Date().getTime() / 1000, 10);
};

// borrowed from 'oauth-1.0a'
var getNonce = function() {
    var word_characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var result = '';
    for (var i = 0; i < 32; i++) {
        result += word_characters[Math.floor(Math.random() * word_characters.length, 10)];
    }
    return result;
};

var convertOptionsToGot = function(options) {
    if (options === null || typeof options !== 'object') {
        return null;
    }

    var requestOptions = {};

    //define for got and request differences
    var keyMap = {
        "qs": "searchParams",
        "strictSSL": "rejectUnauthorized",
        "gzip": "decompress",
        "jar": "cookieJar",
        "baseUrl": "prefixUrl",
        "uri": "url"
    };

    for (let key in options) {
        if (!Object.prototype.hasOwnProperty.call(requestOptions, key) && keyMap[key]) {
            requestOptions[keyMap[key]] = options[key];
        }
        else {
            requestOptions[key] = options[key];
        }
    }

    //backward compatability. in got json is not boolean. it is the object.
    //request body and json are mutally exclusive. if request.json and body exists one of them must be deleted
    if (requestOptions.json && typeof requestOptions.json === 'boolean' && requestOptions.body) {
        requestOptions.json = requestOptions.body;
        delete requestOptions.json;
    }

    if (requestOptions.prefixUrl && options.uri && requestOptions.url) {
        requestOptions.uri = options.uri;
        delete requestOptions.url;

    }

    //support for existing oauth in request
    if (options.oauth) {

        // borrowed from 'oauth-1.0a'


        const parameters = {
            oauth_consumer_key: options.oauth.consumer_key,
            oauth_token: options.oauth.token,
            oauth_signature_method: options.oauth.signature_method,
            oauth_timestamp: Math.floor(Date.now() / 1000),
            oauth_nonce: Math.random().toString(36).substring(2, 15),
            oauth_version: '1.0',
        };

        const signature = oauthSignature.generate('POST', requestOptions.prefixUrl, parameters, options.oauth.private_key.replace(/ /g, "\n"), options.oauth.token_secret);

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `OAuth oauth_consumer_key="${parameters.oauth_consumer_key}", oauth_token="${parameters.oauth_token}", oauth_signature_method="${parameters.oauth_signature_method}", oauth_timestamp="${parameters.oauth_timestamp}", oauth_nonce="${parameters.oauth_nonce}", oauth_version="1.0", oauth_signature="${signature}"`
        };

        requestOptions.json = options.body;
        delete requestOptions.body;

        requestOptions.headers = headers;

    }


    return requestOptions;
};

module.exports = function(uri, options, callback) {

    if (typeof uri === 'undefined') {
        throw new Error('undefined is not a valid uri or options object.');
    }


    const params = initParams(uri, options, callback);

    if (params.options && (params.options.url || params.options.uri)) {
        // Make the request using got
        got(params.options)
            .then(response => {
                // Call the callback with the response data
                params.callback(null, response, response.body);
            })
            .catch(error => {
                console.log("request failure");
                console.log(error);
                console.log("response body");
                console.log(error.response.body);
                // Call the callback with the error
                params.callback(error);
            });
    }
    else {
        // Make the request using got
        got(params.uri, params.options)
            .then(response => {
                console.log("request success");
                // Call the callback with the response data
                params.callback(null, response, response.body);
            })
            .catch(error => {
                // Call the callback with the error
                console.log("request failure");
                console.log(error);
                params.callback(error);
            });
    }


};

// Add a post method to the request object
module.exports.post = function(options, callback) {
    options.method = 'POST';
    options.json = options.body;
    delete options.body;
    /*if (uri && typeof uri === 'string') {
        options.uri = uri;
        options.method = 'POST';
    }
    else if (uri && typeof uri === 'object') {
        uri.uri = uri;
        uri.method = 'POST';
    }

    debugger;*/
    got.post(options, callback).then(response => {
        console.log("post request success");
        // Call the callback with the response data
        callback(null, response, response.body);
    }).catch(error => {
        // Call the callback with the error
        console.log("post request failure");
        console.log(error);
        callback(error);
    });

};

//Add a get method to the request object
module.exports.get = function(uri, options, callback) {
    /*if (uri && typeof uri === 'string') {
        options.uri = uri;
    }
    options.method = 'GET';*/
    module.exports(uri, options, callback);
};