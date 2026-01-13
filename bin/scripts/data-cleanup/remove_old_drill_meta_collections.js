
const pluginManager = require('../../../../plugins/pluginManager.js');

console.log("Deleting old meta documents");

Promise.all(
    [
        pluginManager.dbConnection("countly"),
        pluginManager.dbConnection("countly_drill")
    ])
    .then(async function([countlyDB, countlyDrillDB]) {

        countlyDrillDB.collections(function(err, colls) {
            if (err) {
                console.log('Script failed. Exiting');
                countlyDB.close();
                countlyDrillDB.close();
            }
            else {
                //filter out list with only drill_meta collections. but not outr merged collection
                for (var z = 0; z < colls.length; z++) {
                    colls[z] = colls[z].collectionName;
                }
                var drillMetaCollections = colls.filter(function(coll) {
                    return (coll.indexOf("drill_meta") === 0 && coll.length > 11);
                });

                (async() => {
                    for (const coll of drillMetaCollections) {
                        await new Promise(function(resolve) {
                            countlyDrillDB.collection(coll).drop(function(err3) {
                                if (err3) {
                                    console.log(err3);
                                }
                                resolve();
                            });
                        });
                    }
                })().then(function() {
                    console.log("All old drill meta collections deleted");
                    countlyDB.close();
                    countlyDrillDB.close();
                }).catch(function(err5) {
                    console.log(err5);
                    console.log('Script failed. Exiting');
                    countlyDB.close();
                    countlyDrillDB.close();
                });

            }
        });

    });