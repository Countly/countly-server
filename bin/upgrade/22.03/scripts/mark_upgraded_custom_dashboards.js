var pluginManager = require('../../../../plugins/pluginManager.js');
const fs = require('fs');
var path = require('path');

console.log("Upgrading app_users data");

pluginManager.dbConnection().then(async (countlyDb) => {
        await countlyDb.collection('widgets').updateMany(
            { gridsize: { $exists : false }},
            {
                $set: { gridsize: 4 }
            }
        );
    countlyDb.close();
});