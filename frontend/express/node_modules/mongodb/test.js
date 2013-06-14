var mongodb = require('./lib/mongodb')
  , Db      = mongodb.Db
  , Server  = mongodb.Server
  , ReplSet = mongodb.ReplSet
  , MongoClient = mongodb.MongoClient;

// Replica set
var replSet = new ReplSet( [
    new Server('localhost', 31000), // Primary
    new Server('localhost', 31001), // Secondary
    new Server('localhost', 31002), // Secondary
    // new Server('ChristianK-MacBook-Pro.local', 31000), // Primary
    // new Server('ChristianK-MacBook-Pro.local', 31001), // Secondary
    // new Server('ChristianK-MacBook-Pro.local', 31002), // Secondary
  ],
  { rs_name: 'testReplSet', read_secondary: true }
);


// MongoClient.connect("mongodb://localhost:31000,localhost:31001,localhost:31002", function(err, db) {
//   console.log("=========================== logged on")
//   if (err) console.error(err);
//   db.close();
// })
var db = new Db('test', replSet, { native_parser: true, w: 1 });

// Opening
db.open(function (err, _db) {
  console.log("=========================== logged on")
  if (err) console.error(err);

  _db.close();
});

// var dns = require('dns');

// dns.lookup('ChristianK-MacBook-Pro.local', function (err, addresses) {
//   if (err) throw err;

//   console.log('addresses: ' + JSON.stringify(addresses));

//   dns.reverse('192.168.1.138', function (err, domains) {
//     console.dir(err)
//   });
  
  // addresses.forEach(function (a) {
  //   dns.reverse(a, function (err, domains) {
  //     if (err) {
  //       throw err;
  //     }

  //     console.log('reverse for ' + a + ': ' + JSON.stringify(domains));
  //   });
  // });
// });