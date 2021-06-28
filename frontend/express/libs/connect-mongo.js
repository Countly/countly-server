/*!
 * connect-mongoskin
 * Copyright(c) 2012 Johnny Halife <johnny@mural.ly>
 * Mantained by Mural.ly Team <dev@mural.ly>
 */
var Store = require('express-session').Store,
    util = require('util');

/**
 * Connect Framework Middleware abstraction for
 * using it with MongoSkin (https://github.com/kissjs/node-mongoskin)
 *
 * @param {SkingDb}	skinDb - db connection
 * @param {Object=} options - options
 */
var SkinStore = function(skinDb, options) {
    if (!skinDb) {
        throw (new Error('You must provide a `db` (SkinDb object)'));
    }

    this.db = skinDb;
    this.sessions = this.db.collection('sessions_');
    this.sessions.createIndex({expires: 1}, {expireAfterSeconds: 0}, function() {});

    Store.call(this, options);
};

/** SkinStore extendes Store from Connect */
util.inherits(SkinStore, Store);

/**
 * Gets a session row from the persistance store
 *
 * @param {string} sid - session id
 * @param {Function} callback - callback when done
 */
SkinStore.prototype.get = function(sid, callback) {
    this.sessions.findOne({_id: sid }, function(err, row) {
        if (err || !row) {
            return callback(err, row);
        }

        var session = typeof row.session === 'string' ? JSON.parse(row.session) : row.session;
        callback(null, session);
    });
};

/**
 * Stores a session row on the persistance store.
 *
 * @param {string} sid - session id
 * @param {Object} session - session data
 * @param {Function} callback - callback when done
 */
SkinStore.prototype.set = function(sid, session, callback) {
    var values = {_id: sid, session: JSON.stringify(session) };

    if (session && session.cookie && session.cookie.expires) {
        values.expires = new Date(session.cookie.expires);
    }

    this.sessions.replaceOne({_id: sid}, values, {upsert: true}, function() {
        callback.apply(this, arguments);
    });
};

/**
 * Destroys a session from the persistance store.
 *
 * @param {string} sid - session id
 * @param {Function} callback - callback when done
 */
SkinStore.prototype.destroy = function(sid, callback) {
    this.sessions.deleteOne({_id: sid}, {safe: false}, callback);
};

/**
 * Wipes out the persitance store.
 *
 * @param {Function} callback - callback when done
 */
SkinStore.prototype.clear = function(callback) {
    this.sessions.drop(callback);
};

/**
 * Returns the number of sessions currently available
 * on the persitance store.
 *
 * @param {Function} callback - callback when done
 */
SkinStore.prototype.length = function(callback) {
    this.sessions.estimatedDocumentCount(callback);
};

/**
 * Returns the number of sessions currently available
 * on the persitance store (for backwards compatability)
 *
 * @param {Function} callback - callback when done
 */
SkinStore.prototype.count = SkinStore.prototype.length;

/**
 * Returns all sessions
 *
 * @param {Function} callback - callback when done
 */
SkinStore.prototype.all = function(callback) {
    this.sessions.find().toArray(callback);
};

/**
 * Reset time to live on session, to prevent it from being deleted.
 *
 * @param {string} sid - session id
 * @param {Object} session - session data
 * @param {Function} callback - callback when done
 */
SkinStore.prototype.touch = SkinStore.prototype.set;

module.exports = SkinStore;
