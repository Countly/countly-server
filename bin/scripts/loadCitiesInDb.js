var pluginManager = require("../../plugins/pluginManager.js");

console.log("Loading city coordinates into db");
console.log("Process might take few minutes");
pluginManager.dbConnection().then((db) => {
    db.collection("cityCoordinates").estimatedDocumentCount(function(err, count) {
        if (count < 135233) {
            const cities = require('all-the-cities');

            for (var p = 0; p < cities.length; p++) {
                cities[p]._id = cities[p].cityId;
            }
            db.collection("cityCoordinates").insertMany(cities, {ordered: false, ignore_errors: [11000]}, function() {
                console.log("Cities loded in db");
                db.close();
            });
        }
        else {
            console.log("Cities already in db");
            db.close();
        }
    });
});
