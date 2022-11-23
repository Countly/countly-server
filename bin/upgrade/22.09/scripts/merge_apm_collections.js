const pluginManager = require('../../../../plugins/pluginManager.js');
const OPERATION_BATCH_SIZE = 200;

pluginManager.dbConnection("countly").then(async(countlyDb) => {
    try {

        let apps = await countlyDb.collection('apps').find({}).project({_id: 1}).toArray();
        let apmCollections = apps.flatMap(o=> ['apm_network' + o._id, 'apm_device' + o._id]);
        let collections = await countlyDb.listCollections().toArray();
        let collectionsList = collections.map(o => o.name);
        const intersection = apmCollections.filter(x => collectionsList.includes(x));

        for (const colName of intersection) {
            console.log('exporting collection ->', colName);
            let requests = [];
            let currentType = '';
            let appId = '';
            const cursor = countlyDb.collection(colName).find({});
            if (colName.startsWith('apm_network')) {
                currentType = 'network';
                appId = colName.split('apm_network')[1];
            }
            else if (colName.startsWith('apm_device')) {
                currentType = 'device';
                appId = colName.split('apm_device')[1];
            }

            while (await cursor.hasNext()) {
                let doc = await cursor.next();
                doc.type = currentType;
                doc.app_id = appId;
                doc._id = appId + '_' + currentType + '_' + doc._id;
                requests.push({
                    'insertOne': {"document": doc}
                });
                if (requests.length > OPERATION_BATCH_SIZE) {
                    try {
                        await countlyDb.collection('apm').bulkWrite(requests, {ordered: false});
                    }
                    catch (e) {
                        if (e.code !== 11000) {
                            console.log("Problem inserting", e);
                        }
                    }
                    console.log('inserted ->', requests.length);
                    requests = [];
                }
            }
            if (requests.length) {
                try {
                    await countlyDb.collection('apm').bulkWrite(requests, {ordered: false});
                }
                catch (e) {
                    if (e.code !== 11000) {
                        console.log("Problem inserting", e);
                    }
                }
                console.log('2, inserted ->', requests.length);
                requests = [];
            }
        }

        console.log("Script ran successfully!!!");
        countlyDb.close();
        return;
    }
    catch (e) {
        console.log("Error while running script ", e);
        countlyDb.close();
        return;
    }
});
