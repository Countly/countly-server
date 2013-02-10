var db = require('./config').db;

db.gridfs().open('test.txt', 'w', function(err, gs) {
    gs.write('blablabla', function(err, reply) {
        gs.close(function(err, reply){
            db.gridfs().open('test.txt', 'r' ,function(err, gs) {
                gs.read(function(err, reply){
                    console.log(reply.toString());
                });
            });
        });
    });
});
