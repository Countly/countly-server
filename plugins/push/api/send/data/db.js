const mongodb = require('mongodb');

module.exports.ObjectID = function(id) {
    try {
        return mongodb.ObjectId(id);
    }
    catch (ex) {
        return id;
    }
};

module.exports.ObjectId = mongodb.ObjectId;

/**
 * Check if passed value is an ObjectId
 * 
 * @param {any} id value
 * @returns {boolean} true if id is instance of ObjectId
 */
module.exports.isoid = function(id) {
    return id && (id instanceof mongodb.ObjectId);
};

/**
 * Decode string to ObjectID if needed
 * 
 * @param {String|ObjectID|null|undefined} id string or object id, empty string is invalid input
 * @returns {ObjectID} id
 */
module.exports.oid = function(id) {
    return !id ? id : id instanceof mongodb.ObjectId ? id : mongodb.ObjectId(id);
};

/**
 * Create ObjectID with given timestamp. Uses current ObjectID random/server parts, meaning the 
 * object id returned still has same uniquness guarantees as random ones.
 * 
 * @param {Date|number} date Date object or timestamp in seconds, current date by default
 * @returns {ObjectID} with given timestamp
 */
module.exports.oidWithDate = (date = new Date()) => {
    let seconds = (typeof date === 'number' ? (date > 9999999999 ? Math.floor(date / 1000) : date) : Math.floor(date.getTime() / 1000)).toString(16),
        server = new mongodb.ObjectId().toString().substr(8);
    return new mongodb.ObjectId(seconds + server);
};

/**
 * Create blank ObjectID with given timestamp. Everything except for date part is zeroed.
 * For use in queries like {_id: {$gt: oidBlankWithDate()}}
 * 
 * @param {Date|number} date Date object or timestamp in seconds, current date by default
 * @returns {ObjectID} with given timestamp and zeroes in the rest of the bytes
 */
module.exports.oidBlankWithDate = (date = new Date()) => {
    let seconds = (typeof date === 'number' ? (date > 9999999999 ? Math.floor(date / 1000) : date) : Math.floor(date.getTime() / 1000)).toString(16);
    return new mongodb.ObjectId(seconds + '0000000000000000');
};
