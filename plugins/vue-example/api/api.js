var common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js'),
    {validateUserForWrite} = require('../../../api/utils/rights.js');


const mockCollection = [...Array(100)].map((elem, idx) => {
    return {
        _id: idx,
        name: "File " + Math.floor(Math.random() * 1000)
    };
});

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
        else if (ob.params.qstring.method === 'large-col') {
            validateUserForDataReadAPI(params, function() {
                let tableParams = params.qstring;
                let currentArray = mockCollection.slice();
                if (tableParams.sSearch) {
                    currentArray = currentArray.filter(function(item) {
                        return item.name.includes(tableParams.sSearch);
                    });
                }
                if (tableParams.sSortDir_0) {
                    let field = tableParams.iSortCol_0 === '0' ? '_id' : 'name';
                    let dir = tableParams.sSortDir_0 === 'asc' ? 1 : -1;
                    currentArray.sort(function(a, b) {
                        if (a[field] === b[field]) {
                            return 0;
                        }
                        return a[field] < b[field] ? -dir : dir;
                    });
                }
                let startIndex = parseInt(tableParams.iDisplayStart, 10),
                    length = parseInt(tableParams.iDisplayLength, 10);

                let currentPage = currentArray.slice(startIndex, startIndex + length);
                common.returnOutput(params, {
                    aaData: currentPage,
                    iTotalRecords: mockCollection.length,
                    iTotalDisplayRecords: currentArray.length
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