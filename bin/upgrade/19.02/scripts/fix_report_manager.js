var pluginManager = require('../../../../plugins/pluginManager');

pluginManager.dbConnection().then((countlyDb) => {
    countlyDb.collection('long_tasks').updateMany({
        'autoRefresh': true,
        r_hour: {
        $type: 10
        }
    }, {
        "$set": {
        "r_hour": 0
        }
    }, function (err, result) {
        if (err) {
        console.log('Fix task "r_hour" field null value failed.')
        } else {
        console.log(`Fix task "r_hour" field records count: ${result.modifiedCount}`)
        }
        countlyDb.close();
    });
});