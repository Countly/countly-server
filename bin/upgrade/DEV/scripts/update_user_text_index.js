// Drop the existing index
const pluginManager = require('../../../../plugins/pluginManager.js'),
asyncjs = require('async');
pluginManager.dbConnection().then((countlyDb) => {
  countlyDb.collection('apps').find({}).toArray(function (err, apps) {
    function upgrade(app, done) {
      countlyDb.collection('app_users' + app._id).dropIndex({ "name": "text", "email": "text" });
      countlyDb.collection('app_users' + app._id).createIndex(
        { "name": "text", "email": "text", "did": "text", "uid": "text" },
        { background: true },
        function (err, result) {
          if (err) {
            console.log(err);
          } else {
            console.log(result);
          }
        }
      );
      done();
    }

    asyncjs.eachSeries(apps, upgrade, function () {
      console.log("Updating index finished");
      countlyDb.close();
    });

  });

});

