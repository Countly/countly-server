var db = require('./config').db;

db.collection('test').findOne({}, function(err, data) {
    if(!err) {
      console.log('db has open');
      console.log(data);
    }
});

process.on('SIGINT', function() {
    console.log('Recieve SIGINT');
    db.close(function(){
        console.log('database has closed');
    })
})
