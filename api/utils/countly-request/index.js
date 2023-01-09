/***
 * @module api/utils/countly-request
 */
const got = require('got');

module.exports = function(options, callback) {
    // Convert options to a URL
    const url = options.url || options.uri;

    // Set up the request options for got
    const requestOptions = {
        method: options.method,
        headers: options.headers,
        body: options.body,
        form: options.form,
        json: options.json,
        searchParams: options.qs,
        retry: options.forever,
        timeout: options.timeout,
        followRedirect: options.followAllRedirects,
        throwHttpErrors: !options.simple,
    };

    // Make the request using got
    got(url, requestOptions)
        .then(response => {
            // Create a fake request object
            const req = {
                headers: response.headers,
            };

            // Create a fake response object
            const res = {
                statusCode: response.statusCode,
                headers: response.headers,
            };

            // Call the callback with the response data
            callback(null, res, response.body);
        })
        .catch(error => {
            // Call the callback with the error
            callback(error);
        });
};

// Add a post method to the request object
module.exports.post = function(options, callback) {
    options.method = 'POST';
    module.exports(options, callback);
};

//Add a get method to the request object
module.exports.get = function(options, callback) {
    options.method = 'GET';
    module.exports(options, callback); 
};