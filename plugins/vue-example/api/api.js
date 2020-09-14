var common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js'),
    {validateUserForWrite} = require('../../../api/utils/rights.js');

(function() {

    plugins.register('/o', function(ob) {
        var validateUserForDataReadAPI = ob.validateUserForDataReadAPI;
        var params = ob.params;
        if (ob.params.qstring.method === 'get-random-numbers') {
            validateUserForDataReadAPI(params, function() {
                common.returnOutput(params, [...Array(30)].map(() => Math.floor(Math.random() * 9)));
            });
            return true;
        }
        else if (ob.params.qstring.method === 'vue-records') {
            validateUserForDataReadAPI(params, function() {
                var query = {};
                if (ob.params.qstring.id) {
                    query = { "_id": common.db.ObjectID(ob.params.qstring.id) };
                }
                common.db.collection("vue_example").find(query).toArray(function(err, records) {
                    common.returnOutput(params, records || []);
                });
            });
            return true;
        }
        return false;
    });

    plugins.register("/i/vue_example/save", function(ob) {
        let paramsInstance = ob.params;
        validateUserForWrite(paramsInstance, function(params) {
            let record = params.qstring.record;
            record = JSON.parse(record);
            if (!record._id) {
                return common.db.collection("vue_example").insert(record, function(err, result) {
                    common.returnOutput(params, result.insertedIds[0]);
                });
            }
            else {
                const id = record._id;
                delete record._id;
                return common.db.collection("vue_example").findAndModify({ _id: common.db.ObjectID(id) }, {}, {$set: record}, function(err, result) {
                    common.returnOutput(params, result && result.value._id);
                });
            }
        });
        return true;
    });

    plugins.register("/i/vue_example/status", function(ob) {
        let paramsInstance = ob.params;
        validateUserForWrite(paramsInstance, function(params) {
            let records = params.qstring.records;
            records = JSON.parse(records);
            var updates = records.map(function(record) {
                return {
                    'updateOne':
                    {
                        'filter': { '_id': common.db.ObjectID(record._id) },
                        'update': { '$set': { 'status': record.status } }
                    }
                };
            });
            var done = function(result) {
                common.returnOutput(params, result);
            };
            if (updates.length > 0) {
                common.db.collection("vue_example").bulkWrite(updates, function() {
                    done(true);
                });
            }
            else {
                done(true);
            }
        });
        return true;
    });

    plugins.register("/i/vue_example/delete", function(ob) {
        let paramsInstance = ob.params;
        validateUserForWrite(paramsInstance, function(params) {
            common.db.collection("vue_example").remove({ "_id": common.db.ObjectID(params.qstring.id) }, function() {
                common.returnMessage(params, 200, "Deleted a record");
            });
        });
        return true;
    });

}());

module.exports = {};