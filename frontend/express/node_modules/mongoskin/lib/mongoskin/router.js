var Router = exports.Router = function(select) {
  this._select = select;
  this._collections = {};
}

Router.prototype.bind = function() {
  var args = Array.prototype.slice.call(arguments),
      name = args[0];

  var database = this._select(name);
  var coll = database.bind.apply(database, args);

  this._collections[name] = coll;
  Object.defineProperty(this, name, {
      value: coll,
      writable: false,
      enumerable: true
  });

};

Router.prototype.collection = function(name) {
  return this._collections[name] || (this._collections[name] = this._select(name).collection(name));
};
