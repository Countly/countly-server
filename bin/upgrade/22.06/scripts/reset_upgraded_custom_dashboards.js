var pluginManager = require('../../../../plugins/pluginManager.js');
const fs = require('fs');
var path = require('path');

console.log("Upgrading app_users data");

pluginManager.dbConnection().then(async (countlyDb) => {
    fs.readFile(path.resolve(__dirname, "../../../../countly_marked_version.json"), async function (err, data) {
        var olderVersions = [];
        if (err) {
            console.log(err);
            return;
        }
        try {
            olderVersions = JSON.parse(data);
        }
        catch (parseErr) {
            console.log(parseErr);
            return;
        }
        console.log(olderVersions);
        var doReset = false;
        if (Array.isArray(olderVersions)) {
            olderVersions.forEach(function (v) {
                console.log(v.version);
                if (v?.version?.split('.')?.[0] + '' === '22') {
                    doReset = true;
                }
            });
        }
        if (doReset) {
            await countlyDb.collection('widgets').updateMany({}, { $mul: { 'size.0': 3 }, $unset: { position: 1 } });
        }
        countlyDb.close();
    });
});