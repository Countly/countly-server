"use strict";

async function find(geocoder, locationId, locationCountryId) {
    const featuresCollection = geocoder.db.collection(geocoder.options.collectionPrefix + 'features');
    const coordinatesCollection = geocoder.db.collection(geocoder.options.collectionPrefix + 'coordinates');
    const admin1Collection = geocoder.db.collection(geocoder.options.collectionPrefix + 'admin1');
    const countriesCollection = geocoder.db.collection(geocoder.options.collectionPrefix + 'countries');

    let query;
    if (typeof locationCountryId === 'string') {
        query = { name: locationId, country_id: locationCountryId };
    }
    else {
        query = { id: locationId };
    }

    // Get the feature
    const feature = await featuresCollection.findOne(query);

    if (!feature) {
        return;
    }

    // Get related data
    const coordinates = await coordinatesCollection.findOne({ feature_id: feature.id });
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
        latitude: coordinates ? coordinates.latitude : null,
        longitude: coordinates ? coordinates.longitude : null
    };

    return formatResult([result]);
}

function formatResult(rows) {
    const row = rows[0];

    if (row === undefined) {
        return undefined;
    }
    else {
        return format(row);
    }
}

function format(result) {
    // Construct the formatted name consisting of the name, admin1 name and
    // country name. Some features don't have an admin1, and others may have the
    // same name as the feature, so this handles that.
    let nameParts = [];
    nameParts.push(result.name);
    if (result.admin1_name && result.admin1_name != result.name) {
        nameParts.push(result.admin1_name);
    }
    nameParts.push(result.country_name);
    const formattedName = nameParts.join(', ');

    return {
        id: result.id,
        name: result.name,
        tz: result.tz,
        formatted: formattedName,
        country: {
            id: result.country_id,
            name: result.country_name
        },
        admin1: {
            id: result.admin1_id,
            name: result.admin1_name,
        },
        coordinates: {
            latitude: result.latitude,
            longitude: result.longitude
        }
    };
}

module.exports = {
    find: find,
    format: format
};
