/**
 * Module for geographic data operations
 * @module api/parts/data/geoData
 */

/**
 * @typedef {import('../../../types/geoData').LoadCityCoordinatesOptions} LoadCityCoordinatesOptions
 * @typedef {import('../../../types/geoData').LoadCityCoordinatesCallback} LoadCityCoordinatesCallback
 * @typedef {import('../../../types/geoData').CityCoordinate} CityCoordinate
 */

const log = require('../../utils/log.js')('core:geo');
const common = require('../../utils/common.js');

/** @type {import('../../../types/geoData').GeoData} */
var geoData = {
    loadCityCoordiantes: function(options, callback) {
        options.db = options.db || common.db;
        options.query = options.query || {};
        options.projection = options.projection || {'country': 1, 'loc': 1, 'name': 1};

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

        pipeline = [{'$match': options.query}, {'$project': options.projection}];

        options.db.collection('cityCoordinates').aggregate(pipeline).toArray(function(/** @type {Error | null} */ err, /** @type {CityCoordinate[]} */ cities) {
            if (err) {
                log.e(err);
            }
            callback(err, cities || []);
        });
    }
};

module.exports = geoData;