/**
 * Module to prevent MongoDB injections by catching operators in objects where keys start with $
 * @module frontend/express/libs/dollar-defender
 */

/**
* Test value recursively if any key starts with $ signText
* @param {any} objectToTest - value to check for $ keys
* @returns {bool} if any key started with $ or not
*/
function recursiveDollarSearch(objectToTest) {
    var dollarFound = false;
    for (var key in objectToTest) {
        if (key.indexOf('$') === 0) {
            dollarFound = true;
        }
        if (!dollarFound && objectToTest[key] && typeof objectToTest[key] === 'object') {
            dollarFound = recursiveDollarSearch(objectToTest[key]);
        }
        if (dollarFound) {
            break;
        }
    }
    if (dollarFound) {
        return true;
    }
    else {
        return false;
    }
}

module.exports = function(config) {
    if (!config) {
        config = {};
    }
    const statusCode = config.statusCode || 500;
    const message = config.message || 'Error, dollar injector attack detected!';
    return function(req, res, next) {
        var queryDollarFound;
        var paramsDollarFound;
        var bodyDollarFound;
        if (typeof req.query === 'object') {
            queryDollarFound = recursiveDollarSearch(req.query);
        }
        if (typeof req.params === 'object') {
            paramsDollarFound = recursiveDollarSearch(req.params);
        }
        if (typeof req.body === 'object') {
            bodyDollarFound = recursiveDollarSearch(req.body);
        }
        if (!bodyDollarFound && !paramsDollarFound && !queryDollarFound) {
            return next();
        }
        if (typeof config.hook === 'function') {
            config.hook(req);
        }
        return res.status(statusCode).send(message);
    };
};