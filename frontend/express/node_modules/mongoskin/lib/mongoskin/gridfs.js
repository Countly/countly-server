var GridStore = require('mongodb').GridStore;

/**
 * @param filename:  filename or ObjectId
 */
var SkinGridStore = exports.SkinGridStore = function(skinDb) {
  this.skinDb = skinDb;
}

/**
 * @param id
 * @param filename
 * @param mode
 * @param options
 * @param callback
 *  callback(err, gridStoreObject)
 */
SkinGridStore.prototype.open = function(id, filename, mode, options, callback){
  var args = Array.prototype.slice.call(arguments);
  var callback = args.pop();
  this.skinDb.open(function(err, db) {
      new GridStore(db, args[0], args[1], args[2], args[3]).open(callback);
  });
}

/**
 * @param filename: filename or ObjectId
 */
SkinGridStore.prototype.unlink = SkinGridStore.prototype.remove = function(filename, callback){
  this.skinDb.open(function(err, db) {
      GridStore.unlink(db, filename, callback);
  });
}

SkinGridStore.prototype.exist = function(filename, rootCollection, callback){
  this.skinDb.open(function(err, db) {
      GridStore.exist(db, filename, rootCollection, callback);
  });
}

exports.SkinGridStore = SkinGridStore;
