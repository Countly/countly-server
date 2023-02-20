const log = require('./api/utils/log.js');
log.setDefault("debug");
var pluginManager = require('./plugins/pluginManager');
pluginManager.dbConnection().then((countlyDb) => {
    countlyDb.collection('apps').count(function(err, apps) {
        console.log(err, apps);
        countlyDb.close();
    });
}).catch(function(err){
    console.log(err);
});