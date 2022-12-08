const pluginManager = require('../../../../plugins/pluginManager.js');

console.log("Assign creator to funnels from systemlogs");

pluginManager.dbConnection().then(async(countlyDb) => {

    var requests = [];

    async function update(funnel) {
        try {
            var log = await countlyDb.collection('systemlogs').findOne({ 'i._id': funnel._id, 'a': "funnel_added" });
            requests.push({
                'updateOne': {
                    'filter': { '_id': funnel._id },
                    'update': {
                        '$set': {'creator': countlyDb.ObjectID(log.user_id), 'created': log.ts}
                    }
                }
            });
            if (requests.length === 500) {
                //Execute per 500 operations and re-init
                console.log("Flushing changes:" + requests.length);
                try {
                    await countlyDb.collection('funnels').bulkWrite(requests);
                }
                catch (err) {
                    console.error(err);
                }
                requests = [];
            }
        }
        catch (err) {
            console.log(err);
        }
    }

    try {
        var funnels = await countlyDb.collection('funnels').find({ $or: [{ 'creator': null }, { 'created': null }] }).toArray();
        if (funnels.length == 0) {
            console.log("No changes");
        }
        else {
            for (const funnel of funnels) {
                await update(funnel);
            }
            if (requests.length > 0) {
                console.log("Flushing changes:" + requests.length);
                try {
                    await countlyDb.collection('funnels').bulkWrite(requests);
                }
                catch (err) {
                    console.error(err);
                }
                console.log("Assign creator to funnel DONE");
            }
        }
    }
    catch (err) {
        console.log(err);
    }
    finally {
        countlyDb.close();
    }
});