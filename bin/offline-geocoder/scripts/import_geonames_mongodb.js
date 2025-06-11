#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Get the project root directory (directory of the script)
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const DATA = path.join(DATA_DIR, "cities1000.txt");
const ADMIN1 = path.join(DATA_DIR, "admin1CodesASCII.txt");
const COUNTRIES = path.join(DATA_DIR, "countryInfo.txt");
const DATABASE_NAME = "countly";
const COLLECTION_PREFIX = "geocoder_";

// MongoDB connection URL
const url = 'mongodb://localhost:27017';

// Parse TSV files and insert into MongoDB
async function processTsvFiles() {
    console.log("Processing TSV files and inserting into MongoDB...");

    // Check if data files exist
    if (!fs.existsSync(DATA)) {
        throw new Error(`Data file ${DATA} does not exist. Please run download_geonames_data.js first.`);
    }
    if (!fs.existsSync(ADMIN1)) {
        throw new Error(`Data file ${ADMIN1} does not exist. Please run download_geonames_data.js first.`);
    }
    if (!fs.existsSync(COUNTRIES)) {
        throw new Error(`Data file ${COUNTRIES} does not exist. Please run download_geonames_data.js first.`);
    }

    // Connect to MongoDB
    const client = new MongoClient(url);
    await client.connect();

    const db = client.db(DATABASE_NAME);

    // Create collections if they don't exist
    const features = db.collection(COLLECTION_PREFIX + 'features');
    const coordinates = db.collection(COLLECTION_PREFIX + 'coordinates');
    const admin1 = db.collection(COLLECTION_PREFIX + 'admin1');
    const countries = db.collection(COLLECTION_PREFIX + 'countries');

    // Drop collections if they exist
    await Promise.all([
        features.drop().catch(() => {}),
        coordinates.drop().catch(() => {}),
        admin1.drop().catch(() => {}),
        countries.drop().catch(() => {})
    ]);

    // Process features and coordinates
    console.log("Processing features and coordinates...");
    const featureData = fs.readFileSync(DATA, 'utf8').split('\n');
    const featuresArray = [];
    const coordinatesArray = [];

    featureData.forEach(line => {
        if (!line.trim()) {
            return;
        }

        const fields = line.split('\t');
        if (fields.length < 19) {
            return;
        }

        const id = parseInt(fields[0]);
        const name = fields[1].replace(/"/g, '').replace(/;/g, '');
        const countryId = fields[8];
        const admin1Id = parseInt(fields[10]);
        const tz = fields[17];

        featuresArray.push({
            id,
            name,
            country_id: countryId,
            admin1_id: admin1Id,
            tz
        });

        coordinatesArray.push({
            feature_id: id,
            latitude: parseFloat(fields[4]),
            longitude: parseFloat(fields[5])
        });
    });

    // Process admin1
    console.log("Processing admin1 data...");
    const admin1Data = fs.readFileSync(ADMIN1, 'utf8').split('\n');
    const admin1Array = [];

    admin1Data.forEach(line => {
        if (!line.trim()) {
            return;
        }

        const fields = line.split('\t');
        if (fields.length < 3) {
            return;
        }

        const idParts = fields[0].split('.');
        const countryId = idParts[0];
        const id = parseInt(idParts[1]);
        const name = fields[1].replace(/"/g, '').replace(/;/g, '');

        admin1Array.push({
            country_id: countryId,
            id,
            name
        });
    });

    // Process countries
    console.log("Processing country data...");
    const countriesData = fs.readFileSync(COUNTRIES, 'utf8').split('\n');
    const countriesArray = [];

    countriesData.forEach(line => {
        if (!line.trim() || line.startsWith('#')) {
            return;
        }

        const fields = line.split('\t');
        if (fields.length < 5) {
            return;
        }

        countriesArray.push({
            id: fields[0],
            name: fields[4]
        });
    });

    // Insert data into collections
    console.log("Inserting data into MongoDB collections...");
    if (featuresArray.length > 0) {
        console.log(`Inserting ${featuresArray.length} features...`);
        await features.insertMany(featuresArray);
    }

    if (coordinatesArray.length > 0) {
        console.log(`Inserting ${coordinatesArray.length} coordinates...`);
        await coordinates.insertMany(coordinatesArray);
    }

    if (admin1Array.length > 0) {
        console.log(`Inserting ${admin1Array.length} admin1 records...`);
        await admin1.insertMany(admin1Array);
    }

    if (countriesArray.length > 0) {
        console.log(`Inserting ${countriesArray.length} countries...`);
        await countries.insertMany(countriesArray);
    }

    // Create indexes
    console.log("Creating indexes...");
    await coordinates.createIndex({ latitude: 1, longitude: 1 });
    await coordinates.createIndex({ feature_id: 1 });
    await features.createIndex({ id: 1 });
    await features.createIndex({ name: 1, country_id: 1 });
    await admin1.createIndex({ country_id: 1, id: 1 });
    await countries.createIndex({ id: 1 });

    console.log(`Created MongoDB collections with ${featuresArray.length} features.`);

    // Clean up
    await client.close();
}

// Main execution
async function main() {
    try {
        await processTsvFiles();
        console.log("Done importing data into MongoDB!");
    }
    catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

main();
