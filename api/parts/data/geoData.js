
var geoData = {};
const log = require('../../utils/log.js')("core:geo");
const common = require('../../utils/common.js');


//City fields
//country(code), 
geoData.loadCityCoordiantes = function(options, callback) {
    options.db = options.db || common.db;
    options.query = options.query || {};
    options.projection = options.projection || {"country": 1, "loc": 1, "name": 1};

    var pipeline = [];
    if (options.query) {
        try {
            options.query = JSON.parse(options.query);
        }
        catch (SyntaxError) {
            log.e("Can't parse city query");
            options.query = {};
        }
    }


    if (options.country) {
        options.query.country = options.country;
    }

    pipeline = [{"$match": options.query}, {"$project": options.projection}];

    options.db.collection("cityCoordinates").aggregate(pipeline).toArray(function(err, cities) {
        if (err) {
            log.e(err);
        }
        callback(err, cities || []);
    });
};


module.exports = geoData;