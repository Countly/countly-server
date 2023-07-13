/***
 * @module api/utils/countly-request
 */

const got = require('got');

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
                // Call the callback with the error
                params.callback(error);
            });
    }
    else {
        // Make the request using got
        got(params.uri, params.options)
            .then(response => {
                params.callback(null, response, response.body);
            })
            .catch(error => {
                // Call the callback with the error
                params.callback(error);
            });
    }


};

// Add a post method to the request object
module.exports.post = function(uri, options, callback) {
    var params = initParams(uri, options, callback);
    if (params.options && (params.options.url || params.options.uri)) {
        // Make the request using got
        got.post(params.options)
            .then(response => {
                // Call the callback with the response data
                params.callback(null, response, response.body);
            })
            .catch(error => {
                // Call the callback with the error
                params.callback(error);
            });
    }
    else {
        // Make the request using got
        got.post(params.uri, params.options)
            .then(response => {
                params.callback(null, response, response.body);
            })
            .catch(error => {
                // Call the callback with the error
                params.callback(error);
            });
    }
};

//Add a get method to the request object
module.exports.get = function(uri, options, callback) {
    module.exports(uri, options, callback);
};