var _ = require('underscore'),
    crypto = require('crypto');

/**
 *  Returns drill collection name
 *  @param {string} event Event name
 *  @param {string} appId Application ID
 *  @returns {string} collection name
 */
function getCollectionName(event, appId) {
    return "drill_events" + getEventHash(event, appId);
}

/**
 *  Returns event hash
 *  @param {string} event Event name
 *  @param {string} appId Application ID
 *  @returns {string} hash
 */
function getEventHash(event, appId) {
    var eventUnescaped = _.unescape(event);
    return crypto.createHash('sha1').update(eventUnescaped + appId).digest('hex');
}

/**
 *  Returns common collection name
 *  @param {string} event Event name
 *  @param {string} appId Application ID
 *  @returns {string} collection name
 */
function getCommonCollectionName(event, appId) {
    var eventUnescaped = _.unescape(event);
    return "events" + crypto.createHash('sha1').update(eventUnescaped + appId).digest('hex');
}

exports.getCollectionName = getCollectionName;
exports.getCommonCollectionName = getCommonCollectionName;
exports.getEventHash = getEventHash;