/*!
 * mongoskin - router.js
 *
 * Copyright(c) 2011 - 2012 kissjs.org
 * MIT Licensed
 */

"use strict";

/**
 * Module dependencies.
 */

/**
 * Router
 * 
 * @param {Function(name)} select
 * @constructor
 * @api public
 */
var Router = exports.Router = function (select) {
  this._select = select;
  this._collections = {};
};

/**
 * Bind custom methods
 *
 * @param {String} name, collection name.
 * @param {Object} [options]
 * @return {Router} this
 * @api public
 */
Router.prototype.bind = function (name, options) {
  var args = Array.prototype.slice.call(arguments);
  var database = this._select(name);
  var collection = database.bind.apply(database, args);
  this._collections[name] = collection;
  Object.defineProperty(this, name, {
    value: collection,
    writable: false,
    enumerable: true
  });
  return this;
};

Router.prototype.collection = function (name) {
  return this._collections[name] || (this._collections[name] = this._select(name).collection(name));
};
