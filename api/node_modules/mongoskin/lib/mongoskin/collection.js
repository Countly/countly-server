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
var __slice = Array.prototype.slice,
    events = require('events'),
    Collection = require('mongodb').Collection,
    SkinCursor = require('./cursor').SkinCursor,
    utils = require('./utils'),
    STATE_CLOSE = 0,
    STATE_OPENNING = 1,
    STATE_OPEN = 2;

/**
 * Construct SkinCollection from SkinDb and collectionName
 * use skinDb.collection('name') usually
 *
 * @param skinDb
 * @param collectionName
 *
 */
var SkinCollection = exports.SkinCollection = function(skinDb, collectionName) {
  this.skinDb = skinDb;
  this.ObjectID = this.skinDb.ObjectID;
  this.collectionName = collectionName;
  this.collection;
  this.state = STATE_CLOSE;
  this.internalHint;
  var that = this;
  this.__defineGetter__('hint', function() { return this.internalHint; });
  this.__defineSetter__('hint', function(value) {
      this.internalHint = value;
      this.open(function(err, collection) {
        collection.hint = value;
        that.internalHint = collection.hint;
      });
  });

  this.emitter = new events.EventEmitter();
};

/**
 * bind method of mongodb.Collection to mongoskin.SkinCollection
 */
var bindSkin = function(name, method) {
  SkinCollection.prototype[name] = function() {
    var args = arguments.length > 0 ? __slice.call(arguments, 0) : [];
    this.open(function(err, collection) {
      if (err) {
        utils.error(err, args, 'SkinCollection.' + name);
      } else {
        method.apply(collection, args);
      }
    });
  };
};

for (var name in Collection.prototype) {
  var method = Collection.prototype[name];
  bindSkin(name, method);
}

/*
 * find is a special method, because it could return a SkinCursor instance
 */
SkinCollection.prototype._find = SkinCollection.prototype.find;

/**
 * retrieve mongodb.Collection
 */
SkinCollection.prototype.open = function(fn) {
  switch (this.state) {
    case STATE_OPEN:
      return fn(null, this.collection);
    case STATE_OPENNING:
      return this.emitter.once('open', fn);
    case STATE_CLOSE:
    default:
      var that = this;
      this.emitter.once('open', fn);
      this.state = STATE_OPENNING;
      this.skinDb.open(function(err, db) {
          if (err) {
            that.state = STATE_CLOSE;
            return that.emitter.emit('open', err, null);
          }
          that.skinDb.db.collection(that.collectionName, function(err, collection) {
              if (collection) {
                that.state = STATE_OPEN;
                that.collection = collection;
                if (that.hint) {
                  that.collection.hint = that.hit;
                }
              }else {
                that.state = STATE_CLOSE;
              }
              that.emitter.emit('open', err, collection);
          });
      });
  }
};

SkinCollection.prototype.close = function(){
  this.state = STATE_CLOSE;
};

SkinCollection.prototype.drop = function(fn) {
  this.skinDb.dropCollection(this.collectionName, fn);
  this.close();
};

/**
 * same args as find, but use Array as callback result but not use Cursor
 *
 * findItems(args, function(err, items){});
 *
 * same as
 *
 * find(args, function(err, cursor){cursor.toArray(err, items){}});
 *
 */
SkinCollection.prototype.findItems = function() {
  var args = __slice.call(arguments),
    fn = args[args.length - 1];

  args[args.length - 1] = function(err, cursor) {
    if (err) {
      fn(err);
    } else {
      cursor.toArray(fn);
    }
  }

  this._find.apply(this, args);
};

/**
 * find and cursor.each
 */
SkinCollection.prototype.findEach = function() {
  var args = __slice.call(arguments),
      fn = args[args.length - 1];

  args[args.length - 1] = function(err, cursor) {
    if (err) {
      fn(err);
    } else {
      cursor.each(fn);
    }
  }

  this._find.apply(this, args);
};

/**
 * @deprecated use SkinDb.id instead
 */
SkinCollection.prototype.id = function(hex) {
  return this.skinDb.toId(hex);
};

/**
 * use hex id as first argument, support ObjectID and String id
 * 
 * @param {String/ObjectID} id
 * @param {Function} callback
 * @return {Object} cursor
 * @api public
 */
SkinCollection.prototype.findById = function() {
  var args = __slice.call(arguments);
  args[0] = {_id: this.skinDb.toId(args[0])};
  this.findOne.apply(this, args);
};

/**
 * use hex id as first argument
 */
SkinCollection.prototype.updateById = function() {
  var args = __slice.call(arguments);
  args[0] = {_id: this.skinDb.toId(args[0])};
  this.update.apply(this, args);
};

/**
 * use hex id as first argument
 */
SkinCollection.prototype.removeById = function() {
  var args = __slice.call(arguments);
  args[0] = {_id: this.skinDb.toId(args[0])};
  this.remove.apply(this, args);
};

/**
 * if last argument is not a function, then returns a SkinCursor
 */
SkinCollection.prototype.find = function() {
  var args = arguments.length > 0 ? __slice.call(arguments, 0) : [];
  if (args.length > 0 && typeof(args[args.length - 1]) === 'function') {
    this._find.apply(this, args);
  }else {
    return new SkinCursor(null, this, args);
  }
};

