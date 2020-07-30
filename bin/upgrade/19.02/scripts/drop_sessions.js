var pluginManager = require('../../../../plugins/pluginManager.js');

pluginManager.dbConnection().then((countlyDb) => {
    countlyDb.collection('sessions_').drop(function(err, res) { countlyDb.close();});
});