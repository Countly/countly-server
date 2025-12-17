var pluginManager = require('../pluginManager.js');

/**
 * Cleanup Center uninstall script (core copy).
 *
 * Mirrors the behavior of `plugins/cleanup-center/uninstall.js` to keep
 * both plugin locations consistent.
 */

pluginManager.dbConnection().then(function(db) {
    var collections = ['cleanup_audit_log', 'cleanup_metadata'];

    function dropNext() {
        if (!collections.length) {
            console.log('Cleanup Center (core) plugin successfully uninstalled.');
            db.close();
            return;
        }

        var name = collections.shift();
        db.collection(name).drop(function(err) {
            if (err && err.codeName !== 'NamespaceNotFound') {
                console.log('Cleanup Center (core) uninstall: error dropping collection ' + name, err);
            }
            else {
                console.log('Cleanup Center (core) uninstall: dropped collection ' + name);
            }
            dropNext();
        });
    }

    dropNext();
}).catch(function(err) {
    console.log('Cleanup Center (core) uninstall: failed to obtain DB connection', err);
});



