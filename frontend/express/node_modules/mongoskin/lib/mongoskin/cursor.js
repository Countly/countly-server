var __slice = Array.prototype.slice,
    events = require('events'),
    Cursor = require('mongodb').Cursor,
    utils = require('./utils'),
    STATE_CLOSE = 0,
    STATE_OPENNING = 1,
    STATE_OPEN = 2;

var SkinCursor = exports.SkinCursor = function(cursor, skinCollection, args ) {
  this.cursor = cursor;
  this.skinCollection = skinCollection;
  this.args = args;
  this.emitter = new events.EventEmitter();
  if (!cursor) {
    this.state = STATE_CLOSE;
  }else {
    this.state = STATE_OPEN;
  }
}

SkinCursor.prototype.open = function(fn) {
  switch (this.state) {
    case STATE_OPEN:
      return fn(null, this.cursor);
    case STATE_OPENNING:
      return this.emitter.once('open', fn);
    case STATE_CLOSE:
    default:
      var that = this;
      this.emitter.once('open', fn);
      this.state = STATE_OPENNING;
      this.skinCollection.open(function(err, collection) {
        if (err) {
          that.state = STATE_CLOSE;
          that.emitter.emit('open', err);
          return
        }
        // copy args
        var args = that.args.slice();
        args.push(function(err, cursor) {
          if (cursor) {
            that.state = STATE_OPEN;
            that.cursor = cursor;
          }
          that.emitter.emit('open', err, cursor);
        });

        collection.find.apply(collection, args);
      });
  }
};

var bindSkin = function(name, method) {
  SkinCursor.prototype[name] = function() {
    var args = arguments.length > 0 ? __slice.call(arguments, 0) : [];
    this.open(function(err, cursor) {
      if (err) {
        utils.error(err, args, 'SkinCursor.' + name);
      } else {
        method.apply(cursor, args);
      }
    });
    return this;
  };
};

[
  // callbacks
  'toArray','each','count','nextObject','getMore', 'explain', 
  // self return
  'sort','limit','skip','batchSize',
  // unsupported
  //'rewind', 'close' ,...
].forEach(function(name) {
    var method = Cursor.prototype[name];
    bindSkin(name, method);
});
