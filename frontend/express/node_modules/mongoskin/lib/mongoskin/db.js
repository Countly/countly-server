/*!
 * mongoskin - db.js
 *
 * Copyright(c) 2011 - 2012 kissjs.org
 * Copyright(c) 2012 fengmk2 <fengmk2@gmail.com>
 * MIT Licensed
 */

"use strict";

/**
 * Module dependencies.
 */

var __slice = Array.prototype.slice;
var mongodb = require('mongodb');
var utils = require('./utils');
var SkinAdmin = require('./admin').SkinAdmin;
var SkinCollection = require('./collection').SkinCollection;
var SkinGridStore = require('./gridfs').SkinGridStore;
var Db = mongodb.Db;
var constant = require('./constant');
var STATE_CLOSE = constant.STATE_CLOSE;
var STATE_OPENNING = constant.STATE_OPENNING;
var STATE_OPEN = constant.STATE_OPEN;

/**
 * SkinDb
 * 
 * @param {Db} dbconn, mongodb.Db instance
 * @param {String} [username]
 * @param {String} [password]
 * @constructor
 * @api public
 */
var SkinDb = exports.SkinDb = function (dbconn, username, password) {
  utils.SkinObject.call(this);
  this.emitter.setMaxListeners(100);

  this._dbconn = dbconn;
  this.db = null;
  this.username = username;
  this.password = password;
  this.admin = new SkinAdmin(this);
  this._collections = {};
  this.bson_serializer = dbconn.bson_serializer;
  this.ObjectID = mongodb.ObjectID /* 0.9.7-3-2 */ || dbconn.bson_serializer.ObjectID /* <= 0.9.7 */;
};

utils.inherits(SkinDb, utils.SkinObject);

/**
 * Convert to ObjectID.
 * 
 * @param {String} hex
 * @return {ObjectID}
 */
SkinDb.prototype.toObjectID = SkinDb.prototype.toId = function (hex) {
  if (hex instanceof this.ObjectID) {
    return hex;
  }
  if (!hex || hex.length !== 24) {
    return hex;
  }
  return this.ObjectID.createFromHexString(hex);
};


/**
 * Open the database connection.
 *
 * @param {Function(err, nativeDb)} [callback]
 * @return {SkinDb} this
 * @api public
 */
SkinDb.prototype.open = function (callback) {
  switch (this.state) {
    case STATE_OPEN:
      callback && callback(null, this.db);
      break;
    case STATE_OPENNING:
      // if call 'open' method multi times before opened
      callback && this.emitter.once('open', callback);
      break;
    // case STATE_CLOSE:
    default:
      var onDbOpen = function (err, db) {
        if (!err && db) {
          this.db = db;
          this.state = STATE_OPEN;
        } else {
          db && db.close();
          // close the openning connection.
          this._dbconn.close();
          this.db = null;
          this.state = STATE_CLOSE;
        }
        this.emitter.emit('open', err, this.db);
      }.bind(this);
      callback && this.emitter.once('open', callback);
      this.state = STATE_OPENNING;
      this._dbconn.open(function (err, db) {
        if (db && this.username) {
          // do authenticate
          db.authenticate(this.username, this.password, function (err) {
            onDbOpen(err, db);
          });
        } else {
          onDbOpen(err, db);
        }
      }.bind(this));
      break;
  }
  return this;
};

/**
 * Close the database connection.
 * 
 * @param {Function(err)} [callback]
 * @return {SkinDb} this
 * @api public
 */
SkinDb.prototype.close = function (callback) {
  if (this.state === STATE_CLOSE) {
    callback && callback();
  } else if (this.state === STATE_OPEN) {
    this.state = STATE_CLOSE;
    this.db.close(callback);
  } else if (this.state === STATE_OPENNING) {
    var that = this;
    this.emitter.once('open', function (err, db) {
      that.state = STATE_CLOSE;
      db ? db.close(callback) : callback && callback(err);
    });
  }
  return this;
};

/**
 * Create or retrieval skin collection
 *
 * @param {String} name, the collection name.
 * @param {Object} [options] collection options.
 * @return {SkinCollection}
 * @api public
 */
SkinDb.prototype.collection = function (name, options) {
  var collection = this._collections[name];
  if (!collection) {
    this._collections[name] = collection = new SkinCollection(this, name, options);
  }
  return collection;
};

/**
 * gridfs
 *
 * @return {SkinGridStore}
 * @api public
 */
SkinDb.prototype.gridfs = function () {
  return this.skinGridStore || (this.skinGridStore = new SkinGridStore(this));
};

/**
 * bind additional method to SkinCollection
 *
 * 1. collectionName
 * 2. collectionName, extends1, extends2,... extendsn
 * 3. collectionName, SkinCollection
 * 
 * @param {String} collectionName
 * @param {Object|SkinCollection} [options]
 * @return {SkinCollection}
 * @api public
 */
SkinDb.prototype.bind = function (collectionName, options) {
  var args = __slice.call(arguments);
  var name = args[0];

  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('Must provide collection name to bind.');
  }
  if (args.length === 1) {
    return this.bind(name, this.collection(name));
  }
  if (args.length === 2 && args[1].constructor === SkinCollection) {
    this._collections[name] = args[1];
    Object.defineProperty(this, name, {
      value: args[1],
      writable: false,
      enumerable: true
    });
    // support bind for system.js
    var names = name.split('.');
    if (names.length > 1){
      var prev = this, next;
      for (var i = 0; i < names.length - 1; i++) {
        next = prev[names[i]];
        if (!next) {
          next = {};
          Object.defineProperty(prev, names[i], {
            value: next, 
            writable: false, 
            enumerable : true
          });
        }
        prev = next;
      }
      Object.defineProperty(prev, names[names.length - 1], {
        value: args[1], 
        writable: false, 
        enumerable : true
      });
    }
    return args[1];
  }

  var isOptions = false;
  var argsIndex = 1;
  if (options && typeof options === 'object') {
    isOptions = true;
    argsIndex = 2;
    for (var k in options) {
      if (typeof options[k] === 'function') {
        isOptions = false;
        argsIndex = 1;
        break;
      }
    }
  }
  var collection = this.collection(name, isOptions ? options : null);
  for (var len = args.length; argsIndex < len; argsIndex++) {
    var extend = args[argsIndex];
    if (typeof extend !== 'object') {
      throw new Error('the args[' + argsIndex + '] should be object, but is `' + extend + '`');
    }
    utils.extend(collection, extend);
  }
  return this.bind(name, collection);
};

var IGNORE_NAMES = [
  'bind', 'open', 'close', 'collection', 'admin', 'state'
];
// bind method of mongodb.Db to SkinDb
for (var key in Db.prototype) {
  if (!key || key[0] === '_' || IGNORE_NAMES.indexOf(key) >= 0) {
    continue;
  }
  var method = Db.prototype[key];
  utils.bindSkin('SkinDb', SkinDb, 'db', key, method);
}
