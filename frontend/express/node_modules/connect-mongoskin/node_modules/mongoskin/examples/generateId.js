var redis = require('redis').createClient()
  , shorten = require('shorten')(redis)
  , async = require('async')
  , db = require('./config').db
  ;

db.bind('user');

function log(err) {
  if(err) {
    console.log(err.stack);
  }
}

function createUser(user, callback) {

  async.waterfall([
      function(fn) {
        shorten.nextId('user', fn);
      }
    , function(uid, fn) {
        user.uid = uid;
        db.user.save(user, fn);
      }
  ], callback);

}

for(var i = 0; i<10; i++) {
  createUser({name: 'user' + i}, log);
}
