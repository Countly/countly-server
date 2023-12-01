const pluginManager = require("../../../../plugins/pluginManager.js");
const countlyFs = require('../../../../api/utils/countlyFs.js');

Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_fs")]).then(async function([countlyDb, _countlyFs]) {
    console.log("Connected to Countly database and file system...");
    countlyFs.setHandler(_countlyFs);
    try {
        //GET APPS
        const apps = await countlyDb.collection("apps").find({}, {_id: 1, name: 1}).toArray();
        if (apps) {
            console.log("Found " + apps.length + " apps");
            //SET PATH
            let path = __dirname + '/../../../../frontend/express/public/appimages/';
            //FOR EACH APP
            for (let i = 0; i < apps.length; i++) {
                var has_image = false;
                //CHECK IF APP HAS IMAGE
                await new Promise((resolve) => {
                    countlyFs.getStats("appimages", path + apps[i]._id + ".png", {}, function(err, stats) {
                        has_image = stats && stats.size && !err;
                        resolve();
                    });
                });
                //SET HAS IMAGE FLAG
                await countlyDb.collection("apps").updateOne({_id: apps[i]._id}, {$set: {has_image: !!has_image}});
            }
        }
    }
    catch (error) {
        console.log(error);
    }
    finally {
        close();
    }

    function close() {
        countlyDb.close();
        _countlyFs.close();
        console.log("Done.");
    }
});