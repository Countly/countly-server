var db = require('./config').db;

db.collection('test').insert({foo: 'bar'}, function(err, result) {
    console.log(result);
    db.collection('test').drop();
    db.close();

});
