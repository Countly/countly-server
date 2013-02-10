var mongoskin = require('../lib/mongoskin/');

var db = mongoskin.db(['127.0.0.1:27017'], {
    database: 'test'
});

db.open(function(err, data) {
    console.log(err && err.stack);
    console.log(data);
});
