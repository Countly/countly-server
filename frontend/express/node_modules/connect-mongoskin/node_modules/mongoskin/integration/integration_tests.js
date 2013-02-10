GLOBAL.DEBUG = true;

var assert = require('assert'),
    mongo = require('../lib/mongoskin');

console.log('======== test MongoSkin.db ========');
(function(){
  var username = 'testuser',
      password = 'password';

  db = mongo.db('localhost/test');
  db.open(function(err, db) {
      assert.ok(!err);
      assert.ok(db, err && err.stack);
      db.addUser(username, password, function(err, result){
          var authdb = mongo.db(username + ':' + password +'@localhost/test');
          authdb.open(function(err, db){
              assert.ok(!err, err && err.stack);
          });
          var faildb = mongo.db(username + ':wrongpassword@localhost/test');
          faildb.open(function(err, db){
              assert.ok(err, 'should not auth');
              assert.ok(!db, 'should not return db');
          });
      });
  });
})();

(function(){
  db = mongo.db('db://admin:admin@localhost:27017/test?auto_reconnect');
  db.open(function(err, db){
      assert.ok(err instanceof Error);
  })
})();

var bindToBlog = {
  first: function(fn) {
    this.findOne(fn);
  }
};

console.log('======== test MongoSkin.router ========');
var testdb1 = mongo.db('localhost/test1');
var testdb2 = mongo.db('localhost/test2');
var router = mongo.router(function(name){
    switch(name){
    case 'user':
    case 'message':
      return testdb1;
    default:
      return testdb2;
    }
});
assert.equal(router.collection('user'), testdb1.collection('user'), 'user should router to testdb1');
assert.equal(router.collection('message'), testdb1.collection('message'), 'message should router to testdb1');
assert.equal(router.collection('others'), testdb2.collection('others'), 'others should router to testdb2');
router.bind('user');
router.bind('others');
assert.equal(router.user, testdb1.user, 'user property should router to testdb1');
assert.equal(router.others, testdb2.others, 'user property should router to testdb1');

console.log('======== test MongoSkin.bind ========');
var db = mongo.db('localhost/test_mongoskin');
db.bind('blog', bindToBlog);
db.bind('users');
assert.equal(db.blog.first, bindToBlog.first);
assert.ok(db.users);

console.log('======== test SkinDb bson ========');
assert.ok(db.ObjectID.createFromHexString('a7b79d4dca9d730000000000'));

console.log('======== test SkinDb.bind ========');
db.bind('blog2', bindToBlog);
db.bind('user2');
assert.equal(db.blog2.first, bindToBlog.first);
assert.ok(db.user2);

console.log('======== test SkinDb.open ========');
(function(){
  var db1, db2;
  db.open(function(err, db) {
      assert.ok(db, err && err.stack);
      db1 = db;
      assert.equal(db1.state, 'connected');
      if (db2) {
        assert.equal(db1, db2, 'should alwayse be the same instance in db.open.');
      }
  });

  db.open(function(err, db) {
      assert.ok(db, err && err.stack);
      db2 = db;
      assert.equal(db2.state, 'connected');
      if (db1) {
        assert.equal(db1, db2, 'should alwayse be the same instance in db.open.');
      }
  });

})()

console.log('======== test normal method of SkinDb ========');
db.createCollection('test_createCollection', function(err, collection) {
    assert.equal(db.db.state, 'connected');
    assert.ok(collection, err && err.stack);
});


console.log('======== test SkinDb.collection ========');
assert.equal(db.blog, db.collection('blog'));

console.log('======== test SkinCollection.open ========');
var coll1, coll2;
db.blog.open(function(err, coll) {
    assert.ok(coll, err && err.stack);
    coll1 = coll;
    if (coll2) {
      assert.equal(coll1, coll2, 'should be the same instance in collection.open');
    }
});

db.blog.open(function(err, coll) {
    assert.ok(coll, err && err.stack);
    coll2 = coll;
    if (coll1) {
      assert.equal(coll1, coll2, 'should be the same instance in collection.open');
    }
});

console.log('======== test normal method of SkinCollection ========');
db.collection('test_normal').ensureIndex([['a',1]], function(err, replies){
    assert.ok(replies, err && err.stack);
});

console.log('======== test SkinCollection.drop ========');
db.collection('test_find').drop(function(err, replies){
    assert.ok(!err, err && err.stack);
});

console.log('======== test SkinCollection.find ========');
collection = db.collection('test_find');
collection.insert([{a:1},{a:2},{a:3},{a:4}], function(err, replies){
    assert.ok(replies, err && err.stack);
    console.log('======== test SkinCollection.findById ========');
    collection.findById(replies[0]._id.toString(), function(err, item){
        assert.equal(item.a, 1);
        console.log('======== test SkinCollection.removeById ========');
        collection.removeById(replies[0]._id.toString(), function(err, reply){
            assert.ok(!err, err && err.stack);
            collection.findById(replies[0]._id.toString(), function(err, item){
                assert.ok(!err);
                assert.ok(!item);
            });
        });
    });
});


    collection.findItems(function(err, items){
        assert.ok(items, err && err.stack);
        console.log('found '+ items.length + ' items');
    });
    collection.findEach(function(err, item){
        assert.ok(!err, err && err.stack);
    });
    collection.find(function(err, cursor){
        assert.ok(cursor, err && err.stack);
    });

    console.log('======== test SkinCursor ========');
    collection.find().toArray(function(err, items){
        console.log('======== test find cursor toArray========');
        assert.ok(items, err && err.stack);
    });
    collection.find().each(function(err, item){
        console.log('======== test find cursor each========');
        assert.ok(!err, err && err.stack);
    });
    collection.find().sort({a:-1}).limit(2).skip(1).toArray(function(err, items){
        console.log('======== test cursor sort() limit() skip() ========');
        assert.ok(!err, err && err.stack);
        console.dir(items);
    });

console.log('======== deep future test ========');
(function(){
  var db2 = mongo.db('localhost/test-mongoskin01');
  db2.collection('blog').find().toArray(function(err, items){
      assert.ok(!err, err && err.stack);
  })
})();

(function(){
  var db2 = mongo.db('unknownhost/test-mongoskin01');
  db2.collection('blog').find().toArray(function(err, items){
      assert.ok(err);
  })
})();
/*
console.log('======== test SkinDb.close ========');
db.close();
assert.equal(db.db.state, 'notConnected');
*/

