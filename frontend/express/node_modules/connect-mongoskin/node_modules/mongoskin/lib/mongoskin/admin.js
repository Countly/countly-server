/*!
 * mongoskin - admin.js
 * 
 * Copyright(c) 2011 - 2012 kissjs.org
 * Copyright(c) 2012 fengmk2 <fengmk2@gmail.com>
 * MIT Licensed
 */

"use strict";

/**
 * Module dependencies.
 */

var Admin = require('mongodb').Admin;
var utils = require('./utils');
var constant = require('./constant');

/**
 * SkinAdmin
 * 
 * @param {SkinDb} skinDb
 * @constructor
 * @api public
 */
var SkinAdmin = exports.SkinAdmin = function (skinDb) {
  utils.SkinObject.call(this);
  this.skinDb = skinDb;
  this.admin = null;
};

utils.inherits(SkinAdmin, utils.SkinObject);

/**
 * Retrieve mongodb.Admin instance.
 * 
 * @param {Function(err, admin)} callback
 * @return {SkinAdmin} this
 * @api public
 */
SkinAdmin.prototype.open = function (callback) {
  if (this.state === constant.STATE_OPEN) {
    callback(null, this.admin);
    return this;
  }
  this.emitter.once('open', callback);
  if (this.state === constant.STATE_OPENNING) {
    return this;
  }
  this.state = constant.STATE_OPENNING;
  this.skinDb.open(function (err, db) {
    if (err) {
      this.admin = null;
      this.state = constant.STATE_CLOSE;
    } else {
      this.admin = new Admin(db);
      this.state = constant.STATE_OPEN;
    }
    this.emitter.emit('open', err, this.admin);
  }.bind(this));
  return this;
};

for (var key in Admin.prototype) {
  var method = Admin.prototype[key];
  utils.bindSkin('SkinAdmin', SkinAdmin, 'admin', key, method);
}