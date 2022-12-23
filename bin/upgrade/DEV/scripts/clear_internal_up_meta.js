const pluginManager = require('../../../../plugins/pluginManager.js');
var Promise = require("bluebird");

console.log("Started: Clearing internal user properties from meta");

Promise.all(
    [
        pluginManager.dbConnection("countly"),
        pluginManager.dbConnection("countly_drill")
    ])
    .spread(async function(countlyDB, countlyDrillDB) {
        try {
            let apps = await countlyDB.collection('apps').find({}).project({_id: 1}).toArray();
            for (const appId of apps.map(a => a._id)) {
                await countlyDrillDB.collection("drill_meta" + appId).updateOne(
                    {_id: 'meta_up'},
                    {
                        $unset: {
                            "up.ingested": "",
                            "up.cdfs": "",
                            "up.consent": "",
                            "up.fsd": "",
                            "up.fsm": "",
                            "up.fsw": "",
                            "up.hadFatalCrash": "",
                            "up.hadNonfatalCrash": "",
                            "up.hos": "",
                            "up.lest": "",
                            "up.lvt": "",
                            "up.nxret": "",
                            "up.tkap": "",
                            "up.tkip": "",
                            "up.vc": "",
                        }
                    }
                );
            }
            console.log('Complete: Clearing internal user properties from meta');
            countlyDB.close();
            countlyDrillDB.close();
        }
        catch (e) {
            console.log('ERROR: Clearing internal user properties from meta');
            console.error(e);
            countlyDB.close();
            countlyDrillDB.close();
        }
    });