const pluginManager = require('../../../../plugins/pluginManager.js');
const { cleanupCustomField } = require('../../../../plugins/crashes/api/parts/custom_field.js');

console.log('Cleaning up crashgroup custom fields');

pluginManager.dbConnection().then(async(countlyDb) => {
    await cleanupCustomField(countlyDb);

    countlyDb.close();
    console.log('Crashgroup cleanup done');
});
