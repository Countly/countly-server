const pluginManager = require('../../../../plugins/pluginManager.js');

console.log('Removing auto symbolication setting');

pluginManager.dbConnection().then(async(db) => {
    try {
        await db.collection('plugins').updateOne({ _id: 'plugins' }, { $unset: { 'crashes.automatic_symbolication': '' } });
        console.log('Auto symbolication setting removed');
    }
    catch(err) {
        console.error('Error while removing auto symbolication setting', err);
    }

    db.close();
});
