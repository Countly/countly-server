var pluginManager = require('../../../../plugins/pluginManager.js'),
    countlyDb = pluginManager.dbConnection();

countlyDb.collection('jobs').deleteMany({}, function(err, res) { countlyDb.close();});