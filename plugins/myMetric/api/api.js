var plugins = require('../../pluginManager.js');


plugins.register("/i/my-metric", function (ob) {
    let paramsInstance = ob.params;
    if (paramsInstance.qstring.args) {
        paramsInstance.qstring.args.date = new Date();
        try {
            paramsInstance.qstring.args = JSON.parse(paramsInstance.qstring.args);
        } catch (SyntaxError) {
            console.log('Parse ' + paramsInstance.qstring.args + ' JSON failed');
        }
    }
    common.db.collection('my_metric').insert(paramsInstance, function () {
        return true;
    });
});

plugins.register("/o/my-metric", function (ob) {
    var params = ob.params;
    var validate = ob.validateUserForGlobalAdmin;
    if (params.qstring && params.qstring.args) {
        try {
            params.qstring.args = JSON.parse(params.qstring.args);
        } catch (SyntaxError) {
            console.log('Parse ' + paramsInstance.qstring.args + ' JSON failed');
        }
    }
    let result = {};
    validate(params, async function () {
        common.db.collection("my_metric").find().sort({my_metric: -1}).limit(3).toArray(function (err, res) {
            if (res) {
                if (res.length > 0) {
                    result.top_3_my_metric_and_date = res;
                }
            }
        });

        let array =  common.db.collection('my_metric').aggregate([
            {"$group": {_id: "date", count: {$sum: 1}}}
        ]).toArray();
        if (array) {
            if (array.length > 0) {
                result.table_time_series = array;
            }
        }
    });
return result;
});