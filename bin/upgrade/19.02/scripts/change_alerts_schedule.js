// 'every 5 minutes';every 59 mins starting on the 59 min
var pluginManager = require('../../../../plugins/pluginManager');

pluginManager.dbConnection().then((countlyDb) => {
    countlyDb.collection('alerts').updateMany({
        // 'period': 'every 5 minutes',
    }, {
        "$set": {
        "period": 'every 1 hour on the 59th min'
        }
    }, function (err, result) {
        if (err) {
        console.log('Change alerts schedule time failed.')
        } else {
        console.log(`Changed alerts schedule time records count: ${result.modifiedCount}`)
        }
        countlyDb.close();
    });
});