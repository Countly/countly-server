var pluginManager = require('../../../../plugins/pluginManager.js');

pluginManager.dbConnection().then(async function(countlyDb) {
    console.log("Connected to Countly database...");
    try {
        const cohorts = await countlyDb.collection("cohorts").find({"name": {"$regex": "^\\[CLY\\]_AB.*"}}, {"_id": 1, "steps": 1, "name": 1}).toArray();
        if (cohorts) {
            var updateObj = [];
            for (var k = 0; k < cohorts.length; k++) {
                if (cohorts[k].steps && cohorts[k].steps.length) {
                    for (var l = 0; l < cohorts[k].steps.length; l++) {
                        if (cohorts[k].steps[l].period && Array.isArray(cohorts[k].steps[l].period) && cohorts[k].steps[l].period[1] > 220950501179902000) {
                            updateObj.push({
                                'updateOne': {
                                    'filter': {"_id": cohorts[k]._id },
                                    'update': {"$set": {"steps.$[element].period": {"since": cohorts[k].steps[l].period[0]}}},
                                    'arrayFilters': [{ "element.period": {$gte: 220950501179902000}}]
                                }
                            });
                        }
                    }
                }
            }
            if (!(updateObj.length === 0)) {
                await countlyDb.collection("cohorts").bulkWrite(updateObj, {ordered: false}, function(err) {
                    if (err) {
                        console.error(err);
                        close();
                    }
                    else {
                        console.log("Successfuly updated periods with huge numbers");
                        close();
                    }
                });
            }
            else {
                console.log("No periods with huge numbers to fix.");
                close();
            }
        }
    }
    catch (error) {
        console.log("Error: " + error);
        close();
    }

    function close() {
        countlyDb.close();
        console.log("Done.");
    }
});


