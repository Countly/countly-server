/*!
 * mongoskin - utils.js
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
var EventEmitter = require('events').EventEmitter;
var constant = require('./constant');
var STATE_OPEN = constant.STATE_OPEN;
var STATE_OPENNING = constant.STATE_OPENNING;
var STATE_CLOSE = constant.STATE_CLOSE;

exports.inherits = require('util').inherits;

exports.error = function (err, args, name) {
  var cb = args.pop();
  if (cb && typeof cb === 'function') {
    cb(err);
  } else {
    console.error("Error occured with no callback to handle it while calling " + name,  err);
  }
};

/**
 * SkinObject
 *
 * @constructor
 * @api public
 */
exports.SkinObject = function () {
  this.emitter = new EventEmitter();
  this.state = STATE_CLOSE;
};

/**
 * Skin method binding.
 * 
 * @param {String} objName
 * @param {Function} obj
 * @param {String} nativeObjName
 * @param {String} methodName
 * @param {Function} method
 * @return {Function}
 */
exports.bindSkin = function (objName, obj, nativeObjName, methodName, method) {
  if (typeof method !== 'function') {
    return;
  }
  return obj.prototype[methodName] = function () {
    var args = __slice.call(arguments);
    if (this.state === STATE_OPEN) {
      method.apply(this[nativeObjName], args);
      return this;
    }
    this.open(function (err, nativeObj) {
      if (err) {
        exports.error(err, args, objName + '.' + methodName);
      } else {
        return method.apply(nativeObj, args);
      }
    });
    return this;
  };
};

exports.extend = function (destination, source) {
  for (var property in source) {
    destination[property] = source[property];
  }
  return destination;
};

exports.noop = function () {};