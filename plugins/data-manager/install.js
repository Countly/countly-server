try {
    var pluginManager = require('../pluginManager.js');

    console.log("Installing data manager plugin");
    console.log("Generating schema for events in drill");

    pluginManager.dbConnection().then(async(db) => {
        db.collection('systemlogs').ensureIndex({"i.segment": 1}, {sparse: true, background: true}, function(){});
        db.collection('systemlogs').ensureIndex({"i.ev": 1}, {sparse: true, background: true}, function(){});
        db.collection('systemlogs').ensureIndex({"i.id": 1}, {sparse: true, background: true}, function(){});
    });

    require('./install-extension.js')();
}
catch (e) {
    // suppress
}