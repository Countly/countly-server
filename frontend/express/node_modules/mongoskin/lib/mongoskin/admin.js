var Admin = require('mongodb').Admin
  , utils = require('./utils');

var SkinAdmin = exports.SkinAdmin = function(skinDb) {
  this.skinDb = skinDb;
}

SkinAdmin.prototype.open = function(callback) {
  if(this.admin) return callback(null, this.admin);
  this.skinDb.open(function(err, db){
      if(err) return callback(err);
      this.admin = new Admin(db);
      callback(null, this.admin);
  })
}

var bindSkin = function(name, method) {
  SkinAdmin.prototype[name] = function() {
    var args = arguments.length > 0 ? Array.prototype.slice.call(arguments, 0) : [];
    return this.open(function(err, admin) {
      if (err) {
        utils.error(err, args, 'SkinAdmin.' + name);
      } else {
        method.apply(admin, args);
      }
    });
  };
};

for (var name in Admin.prototype) {
  var method = Admin.prototype[name];
  bindSkin(name, method);
}

exports.SkinAdmin = SkinAdmin;
