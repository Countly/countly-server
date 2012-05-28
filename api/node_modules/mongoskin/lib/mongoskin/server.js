var __slice = Array.prototype.slice,
    mongodb = require('mongodb'),
    Db = mongodb.Db,
    Server = mongodb.Server,
    SkinDb = require('./db').SkinDb;

/**
 * Construct SkinServer with native Server
 *
 * @param server
 */
var SkinServer = exports.SkinServer = function(server) {
  this.server = server;
  this._cache_ = [];
};

/**
 * Create SkinDb from a SkinServer
 *
 * @param name database name
 *
 * @return SkinDb
 *
 * TODO add options
 */
SkinServer.prototype.db = function(name, options) {
  var key = (username || '') + '@' + name;
  var skinDb = this._cache_[key];
  if (!skinDb || skinDb.fail) {
    var username = options.username,
        password = options.password;
    delete options.username;
    delete options.password;
    if(options.native_parser === undefined) {
      options.native_parser = !! mongodb.BSONNative;
    }
    var db = new Db(name, this.server, options);
    skinDb = new SkinDb(db, username, password);
    this._cache_[key] = skinDb;
  }
  return skinDb;
};
