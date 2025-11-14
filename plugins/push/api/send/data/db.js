const mongodb = require('mongodb');

module.exports.ObjectID = function(id) {
    try {
        return new mongodb.ObjectId(id);
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
    return !id ? id : id instanceof mongodb.ObjectId ? id : new mongodb.ObjectId(id);
};
