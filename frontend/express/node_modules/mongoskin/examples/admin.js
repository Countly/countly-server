var db = require('./config').db;

db.admin.listDatabases(function(err, result){
    if(err) {
      console.traceError(err);
    }
    console.log(result);
    db.close();
})
