var common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js'),
    {validateRead, validateCreate, validateUpdate, validateDelete} = require('../../../api/utils/rights.js');

const FEATURE_NAME = 'vue_example';

const mockCollection = [...Array(100)].map((elem, idx) => {
    return {
        _id: idx,
        number_0: Math.floor(Math.random() * 1000) + "",
        number_1: Math.floor(Math.random() * 1000) + "",
        number_2: Math.floor(Math.random() * 1000) + "",
        name: "File " + Math.floor(Math.random() * 1000)
    };
});

(function() {

    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });

    plugins.register('/o', function(ob) {
        var params = ob.params;
        if (ob.params.qstring.method === 'get-random-numbers') {
            validateRead(params, FEATURE_NAME, function() {
                common.returnOutput(params, [...Array(30)].map(() => Math.floor(Math.random() * 9)));
            });
            return true;
        }
        else if (ob.params.qstring.method === 'vue-records') {
            validateRead(params, FEATURE_NAME, function() {
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
            validateRead(params, FEATURE_NAME, function() {
                let tableParams = params.qstring;
                let currentArray = mockCollection.slice();
                if (tableParams.sSearch) {
                    currentArray = currentArray.filter(function(item) {
                        return item.name.includes(tableParams.sSearch) ||
                                item.number_0.includes(tableParams.sSearch) ||
                                item.number_1.includes(tableParams.sSearch) ||
                                item.number_2.includes(tableParams.sSearch);
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
                let startIndex = parseInt(tableParams.iDisplayStart || 0, 10),
                    length = parseInt(tableParams.iDisplayLength || currentArray.length, 10);

                let currentPage = currentArray.slice(startIndex, startIndex + length);

                currentPage = currentPage.map(function(row) {
                    var obj = {
                        _id: row._id,
                        name: row.name
                    };
                    if (tableParams.visibleColumns) {
                        JSON.parse(tableParams.visibleColumns).forEach(function(col) {
                            obj[col] = row[col];
                        });
                    }
                    return obj;
                });
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
        validateCreate(paramsInstance, FEATURE_NAME, function(params) {
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
        validateUpdate(paramsInstance, FEATURE_NAME, function(params) {
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
        validateDelete(paramsInstance, FEATURE_NAME, function(params) {
            common.db.collection("vue_example").remove({ "_id": common.db.ObjectID(params.qstring.id) }, function() {
                common.returnMessage(params, 200, "Deleted a record");
            });
        });
        return true;
    });

}());

module.exports = {};