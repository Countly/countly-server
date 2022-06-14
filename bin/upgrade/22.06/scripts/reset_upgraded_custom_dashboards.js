var pluginManager = require('../../../../plugins/pluginManager.js');
const fs = require('fs');
var path = require('path');

console.log("Upgrading app_users data");

pluginManager.dbConnection().then(async (countlyDb) => {
    fs.readFile(path.resolve(__dirname, "../../../../countly_marked_version.json"), async function (err, data) {
        var olderVersions = [];
        if (err) {
            console.log(err);
            countlyDb.close();
            return;
        }
        try {
            olderVersions = JSON.parse(data);
        }
        catch (parseErr) {
            console.log(parseErr);
            countlyDb.close();
            return;
        }
        var doReset = false;
        if (Array.isArray(olderVersions)) {
            olderVersions.forEach(function (v) {
                if (v?.version?.split('.')?.[0] + '' === '22') {
                    doReset = true;
                }
            });
        }
        if (doReset) {
            await countlyDb.collection('widgets').updateMany(
                { gridsize: 4 },
                {
                    $mul: { 'size.0': 3 },
                    $unset: { position: 1 },
                    $set: { gridsize: 12 }
                }
            );
        }
        countlyDb.close();
    });
});