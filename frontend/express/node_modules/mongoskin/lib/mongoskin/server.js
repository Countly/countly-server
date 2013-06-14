/*!
 * mongoskin - server.js
 *
 * Copyright(c) 2011 - 2012 kissjs.org
 * MIT Licensed
 */

"use strict";

/**
 * Module dependencies.
 */

var mongodb = require('mongodb');
var Db = mongodb.Db;
var Server = mongodb.Server;
var SkinDb = require('./db').SkinDb;

/**
 * Construct SkinServer with native Server
 *
 * @param {Server} server
 * @constructor
 * @api public
 */
var SkinServer = exports.SkinServer = function (server) {
  this.server = server;
  this._cache_ = {};
};

/**
 * Create SkinDb from a SkinServer
 *
 * @param {String} name database name
 * @param {Object} [options]
 * @return {SkinDb}
 * @api public
 */
SkinServer.prototype.db = function (name, options) {
  options = options || {};
  var username = options.username || '';
  var key = username + '@' + name;
  var skinDb = this._cache_[key];
  if (!skinDb || skinDb.fail) {
    var password = options.password;
    if (!options.native_parser) {
      options.native_parser = !! mongodb.BSONNative;
    }
    var db = new Db(name, this.server, options);
    skinDb = new SkinDb(db, username, password);
    this._cache_[key] = skinDb;
  }
  return skinDb;
};
