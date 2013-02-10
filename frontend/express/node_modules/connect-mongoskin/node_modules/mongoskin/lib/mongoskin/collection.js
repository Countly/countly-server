/*!
 * mongoskin - collection.js
 *
 * Copyright(c) 2011 - 2012 kissjs.org
 * Copyright(c) 2012 fengmk2 <fengmk2@gmail.com>
 * MIT Licensed
 */

"use strict";

/**
 * Module dependencies.
 */

/**
  bind these methods from Collection.prototype to Provider

  methods:
    insert
    checkCollectionName
    remove
    rename
    save
    update
    distinct
    count
    drop
    findAndModify
    find
    normalizeHintField
    findOne
    createIndex
    ensureIndex
    indexInformation
    dropIndex
    dropIndexes
    mapReduce
    group
    options
*/
var __slice = Array.prototype.slice;
var events = require('events');
var Collection = require('mongodb').Collection;
var SkinCursor = require('./cursor').SkinCursor;
var utils = require('./utils');
var constant = require('./constant');
var STATE_CLOSE = constant.STATE_CLOSE;
var STATE_OPENNING = constant.STATE_OPENNING;
var STATE_OPEN = constant.STATE_OPEN;

/**
 * Construct SkinCollection from SkinDb and collectionName
 * use skinDb.collection('name') usually
 *
 * @param {SkinDb} skinDb
 * @param {String} collectionName
 * @param {Object} [options] collection options
 * @constructor
 * @api public
 */
var SkinCollection = exports.SkinCollection = function (skinDb, collectionName, options) {
  utils.SkinObject.call(this);
  this.emitter.setMaxListeners(50);
  
  this.options = options;
  this.skinDb = skinDb;
  this.ObjectID = this.skinDb.ObjectID;
  this.collectionName = collectionName;
  this.collection = null;
  this.internalHint = null;
  this.__defineGetter__('hint', function () {
    return this.internalHint;
  });
  this.__defineSetter__('hint', function (value) {
    this.internalHint = value;
    this.open(function (err, collection) {
      collection.hint = value;
      this.internalHint = collection.hint;
    }.bind(this));
  });
};

utils.inherits(SkinCollection, utils.SkinObject);

for (var _name in Collection.prototype) {
  var method = Collection.prototype[_name];
  utils.bindSkin('SkinCollection', SkinCollection, 'collection', _name, method);
}

/*
 * find is a special method, because it could return a SkinCursor instance
 */
SkinCollection.prototype._find = SkinCollection.prototype.find;

/**
 * Retrieve mongodb.Collection
 * 
 * @param {Function(err, collection)} callback
 * @return {SkinCollection} this
 * @api public
 */
SkinCollection.prototype.open = function (callback) {
  switch (this.state) {
    case STATE_OPEN:
      callback(null, this.collection);
      break;
    case STATE_OPENNING:
      this.emitter.once('open', callback);
      break;
    // case STATE_CLOSE:
    default:
      this.emitter.once('open', callback);
      this.state = STATE_OPENNING;
      this.skinDb.open(function (err, db) {
        if (err) {
          this.state = STATE_CLOSE;
          return this.emitter.emit('open', err, null);
        }
        db.collection(this.collectionName, this.options, function (err, collection) {
          if (err) {
            this.state = STATE_CLOSE;
          } else {
            this.state = STATE_OPEN;
            this.collection = collection;
            if (this.hint) {
              this.collection.hint = this.hit;
            }
          }
          this.emitter.emit('open', err, collection);
        }.bind(this));
      }.bind(this));
      break;
  }
  return this;
};

/**
 * Close current collection.
 * 
 * @param {Function(err)} callback
 * @return {SkinCollection} this
 * @api public
 */
SkinCollection.prototype.close = function (callback) {
  this.collection = null;
  this.state = STATE_CLOSE;
  return this;
};

/**
 * Drop current collection.
 * 
 * @param {Function(err)} callback
 * @return {SkinCollection} this
 * @api public
 */
SkinCollection.prototype.drop = function (callback) {
  this.skinDb.dropCollection(this.collectionName, callback);
  this.close();
  return this;
};

/**
 * same args as find, but use Array as callback result but not use Cursor
 *
 * findItems(args, function (err, items) {});
 *
 * same as
 *
 * find(args).toArray(function (err, items) {});
 * 
 * or using `mongodb.collection.find()`
 *
 * find(args, function (err, cursor) {
 *   cursor.toArray(function (err, items) {
 *   });
 * });
 *
 * @param {Object} [query]
 * @param {Object} [options]
 * @param {Function(err, docs)} callback
 * @return {SkinCollection} this
 * @api public
 */
SkinCollection.prototype.findItems = function (query, options, callback) {
  var args = __slice.call(arguments);
  var fn = args[args.length - 1];
  args[args.length - 1] = function (err, cursor) {
    if (err) {
      return fn(err);
    }
    cursor.toArray(fn);
  };
  this.find.apply(this, args);
  return this;
};

/**
 * find and cursor.each(fn).
 * 
 * @param {Object} [query]
 * @param {Object} [options]
 * @param {Function(err, item)} eachCallback
 * @return {SkinCollection} this
 * @api public
 */
SkinCollection.prototype.findEach = function (query, options, eachCallback) {
  var args = __slice.call(arguments);
  var fn = args[args.length - 1];
  args[args.length - 1] = function (err, cursor) {
    if (err) {
      return fn(err);
    }
    cursor.each(fn);
  };
  this.find.apply(this, args);
  return this;
};

/**
 * @deprecated use `SkinDb.toId` instead
 *
 * @param {String} hex
 * @return {ObjectID|String}
 * @api public
 */
SkinCollection.prototype.id = function (hex) {
  return this.skinDb.toId(hex);
};

/**
 * Operate by object.`_id`
 * 
 * @param {String} methodName
 * @param {String|ObjectID|Number} id
 * @param {Arguments|Array} args
 * @return {SkinCollection} this
 * @api private
 */
SkinCollection.prototype._operateById = function (methodName, id, args) {
  args = __slice.call(args);
  args[0] = {_id: this.skinDb.toId(id)};
  this[methodName].apply(this, args);
  return this;
};

/**
 * Find one object by _id.
 * 
 * @param {String|ObjectID|Number} id, doc primary key `_id`
 * @param {Function(err, doc)} callback
 * @return {SkinCollection} this
 * @api public
 */
SkinCollection.prototype.findById = function (id, callback) {
  return this._operateById('findOne', id, arguments);
};

/**
 * Update doc by _id.
 * @param {String|ObjectID|Number} id, doc primary key `_id`
 * @param {Object} doc
 * @param {Function(err)} callback
 * @return {SkinCollection} this
 * @api public
 */
SkinCollection.prototype.updateById = function (id, doc, callback) {
  return this._operateById('update', id, arguments);
};

/**
 * Remove doc by _id.
 * @param {String|ObjectID|Number} id, doc primary key `_id`
 * @param {Function(err)} callback
 * @return {SkinCollection} this
 * @api public
 */
SkinCollection.prototype.removeById = function (id, callback) {
  return this._operateById('remove', id, arguments);
};

/**
 * Creates a cursor for a query that can be used to iterate over results from MongoDB.
 * 
 * @param {Object} query
 * @param {Object} options
 * @param {Function(err, docs)} callback
 * @return {SkinCursor|SkinCollection} if last argument is not a function, then returns a SkinCursor, 
 *   otherise return this
 * @api public
 */
SkinCollection.prototype.find = function (query, options, callback) {
  var args = __slice.call(arguments);
  if (args.length > 0 && typeof args[args.length - 1] === 'function') {
    this._find.apply(this, args);
    return this;
  } else {
    return new SkinCursor(null, this, args);
  }
};