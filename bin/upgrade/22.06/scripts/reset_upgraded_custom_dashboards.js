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
            /**
             * Script ran on 22.03, which means upgrade is from 20.x
             * the 22.03 sets gridsize at 4
             * So we do not unset position for gridsize 4, since they are coming from 20.x
             * The new script in 22.03 would not have run for users who are already on 22.03, 
             * so they would have gridsize 4 and need to unset the position
             */
            await countlyDb.collection('widgets').updateMany(
                { gridsize: { $ne: 4 } },
                {
                    $mul: { 'size.0': 3 },
                    $unset: { position: 1 }
                }
            );
            await countlyDb.collection('widgets').updateMany(
                { gridsize: 4 },
                {
                    $set: { gridsize: 12 }
                }
            );
        }
        countlyDb.close();
    });
});