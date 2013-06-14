
var mongo = require('../');

var conf = {
  hosts: [
    '127.0.0.1:27110/?auto_reconnect',
    '127.0.0.1:27111/?auto_reconnect'
  ],
  dataDB: 'test'
};

var db = exports.db = mongo.db(conf.hosts, {
  database: conf.dataDB
});

var noop = function() {};

db.bind('user');
// db.user.ensureIndex({ name: 1 }, { unique: true }, noop);
// db.user.ensureIndex({ enable: 1 }, noop);
// db.user.ensureIndex({ created_at: 1, enable: 1 }, noop);

var counter = 0;
setInterval(function () {
  db.user.findItems({ name: 'name_' + counter }, function (err, items) {
    if (err) {
      console.error('findItems user error', err);
    }
    if (items) {
      console.log('total: %d users', items.length);
    }
  });
  db.user.insert({
    name: 'name_' + counter,
    createtime: new Date()
  }, function(err, user) {
    if (err) {
      console.error('insert user error', err);
    }
    if (user && user[0]) {
      console.log('new: %d %s', counter, user[0]._id);
    }
  });
  counter++;
}, 10);
