var pluginManager = require('../../../../plugins/pluginManager.js'),
    countlyDb = pluginManager.dbConnection();

countlyDb.collection('sessions_').drop(function(err, res) { countlyDb.close();});