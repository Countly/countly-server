var pluginManager = require('../../../../plugins/pluginManager.js');

pluginManager.dbConnection().then((countlyDb) => {
    countlyDb.collection('jobs').deleteMany({}, function(err, res) { countlyDb.close();});
});