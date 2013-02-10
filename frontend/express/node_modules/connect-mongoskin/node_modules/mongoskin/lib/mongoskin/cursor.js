/*!
 * mongoskin - cursor.js
 *
 * Copyright(c) 2011 - 2012 kissjs.org
 * MIT Licensed
 */

"use strict";

/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter;
var Cursor = require('mongodb').Cursor;
var utils = require('./utils');
var constant = require('./constant');
var STATE_CLOSE = constant.STATE_CLOSE;
var STATE_OPENNING = constant.STATE_OPENNING;
var STATE_OPEN = constant.STATE_OPEN;

var SkinCursor = exports.SkinCursor = function (cursor, skinCollection, args) {
  utils.SkinObject.call(this);

  this.cursor = cursor;
  this.skinCollection = skinCollection;
  this.args = args || [];
  this.emitter = new EventEmitter();
  if (cursor) {
    this.state = STATE_OPEN;
  }
};

utils.inherits(SkinCursor, utils.SkinObject);

/**
 * Retrieve mongodb.Cursor instance.
 * 
 * @param {Function(err, cursor)} callback
 * @return {SkinCursor} this
 * @api public
 */
SkinCursor.prototype.open = function (callback) {
  switch (this.state) {
    case STATE_OPEN:
      callback(null, this.cursor);
      break;
    case STATE_OPENNING:
      this.emitter.once('open', callback);
      break;
    // case STATE_CLOSE:
    default:
      this.emitter.once('open', callback);
      this.state = STATE_OPENNING;
      this.skinCollection.open(function (err, collection) {
        if (err) {
          this.state = STATE_CLOSE;
          this.emitter.emit('open', err);
          return;
        }
        // copy args
        var args = this.args.slice();
        args.push(function (err, cursor) {
          if (cursor) {
            this.state = STATE_OPEN;
            this.cursor = cursor;
          }
          this.emitter.emit('open', err, cursor);
        }.bind(this));
        collection.find.apply(collection, args);
      }.bind(this));
      break;
  }
  return this;
};

[
  // callbacks
  'toArray', 'each', 'count', 'nextObject', 'getMore', 'explain', 
  // self return
  'sort', 'limit', 'skip', 'batchSize',
  // unsupported
  //'rewind', 'close' ,...
].forEach(function (name) {
  var method = Cursor.prototype[name];
  utils.bindSkin('SkinCursor', SkinCursor, 'cursor', name, method);
});
