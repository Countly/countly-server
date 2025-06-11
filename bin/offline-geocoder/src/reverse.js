"use strict";

const formatLocation = require('./location').format;

// This finds the closest feature based upon Pythagoras's theorem. It is an
// approximation, and won't provide results as accurate as the haversine
// formula, but trades that for performance. For our use case this is good
// enough as the data is just an approximation of the centre point of a
// feature.
//
// The scale parameter accounts for the fact that 1 degree in longitude is
// different at the poles vs the equator.
//
// Based upon http://stackoverflow.com/a/7261601/155715
async function findFeature(geocoder, latitude, longitude, callback) {
    try {
        const coordinatesCollection = geocoder.db.collection(geocoder.options.collectionPrefix + 'coordinates');
        const featuresCollection = geocoder.db.collection(geocoder.options.collectionPrefix + 'features');
        const admin1Collection = geocoder.db.collection(geocoder.options.collectionPrefix + 'admin1');
        const countriesCollection = geocoder.db.collection(geocoder.options.collectionPrefix + 'countries');

        const scale = Math.pow(Math.cos(latitude * Math.PI / 180), 2);

        // First find the closest coordinates
        const nearestCoords = await coordinatesCollection.find({
            latitude: { $gte: latitude - 1.5, $lte: latitude + 1.5 },
            longitude: { $gte: longitude - 1.5, $lte: longitude + 1.5 }
        }).toArray();

        if (!nearestCoords || nearestCoords.length === 0) {
            if (typeof (callback) === 'function') {
                callback(undefined, {});
            }
            else if (typeof (resolve) === 'function') {
                return {};
            }
            return;
        }

        // Calculate distances and find the closest one
        nearestCoords.forEach(coord => {
            coord.distance = (latitude - coord.latitude) * (latitude - coord.latitude) +
                        (longitude - coord.longitude) * (longitude - coord.longitude) * scale;
        });

        nearestCoords.sort((a, b) => a.distance - b.distance);
        const closest = nearestCoords[0];

        // Get the feature
        const feature = await featuresCollection.findOne({ id: closest.feature_id });

        if (!feature) {
            if (typeof (callback) === 'function') {
                callback(undefined, {});
            }
            else if (typeof (resolve) === 'function') {
                return {};
            }
            return;
        }

        // Get related data
        const country = await countriesCollection.findOne({ id: feature.country_id });
        const admin1 = await admin1Collection.findOne({
            country_id: feature.country_id,
            id: feature.admin1_id
        });

        // Combine the results to match the expected schema
        const result = {
            id: feature.id,
            name: feature.name,
            tz: feature.tz,
            admin1_id: admin1 ? admin1.id : null,
            admin1_name: admin1 ? admin1.name : null,
            country_id: country ? country.id : null,
            country_name: country ? country.name : null,
            latitude: closest.latitude,
            longitude: closest.longitude
        };

        const formattedResult = formatResult([result]);

        if (typeof (callback) === 'function') {
            callback(undefined, formattedResult);
        }
        else if (typeof (resolve) === 'function') {
            return formattedResult;
        }
    }
    catch (err) {
        if (typeof (callback) === 'function') {
            callback(err, undefined);
        }
        else if (typeof (reject) === 'function') {
            console.log("Error in offline geocoder", err);
        }
    }
}

function formatResult(rows) {
    const row = rows[0];

    if (!row || row === undefined) {
        return {};
    }
    else {
        return formatLocation(row);
    }
}

function Reverse(geocoder, latitude, longitude, callback) {
    return findFeature(geocoder, latitude, longitude, callback);
}

module.exports = Reverse;
