#!/usr/bin/env node
const pluginManager = require("../../../plugins/pluginManager.js");
const fs = require('fs');
const path = require('path');
const https = require('https');
const { createWriteStream, promises: fsPromises } = require('fs');
const yauzl = require('yauzl');

const DATA = "cities1000.txt";
const ADMIN1 = "admin1CodesASCII.txt";
const COUNTRIES = "countryInfo.txt";
const COLLECTION_PREFIX = "geocoder_";

// Helper function to download a file using Node.js
function downloadFile(url, destination) {
    console.log(`Downloading ${url} to ${destination}...`);
    return new Promise((resolve, reject) => {
        const file = createWriteStream(destination);

        https.get(url, response => {
            if (response.statusCode !== 200) {
                console.error(`Failed to download ${url}: ${response.statusCode}`);
                reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
                return;
            }

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', err => {
            console.error(`Error downloading ${url}:`, err);
            fs.unlink(destination, () => {});
            reject(err);
        });

        file.on('error', err => {
            console.error(`Error writing to file ${destination}:`, err);
            fs.unlink(destination, () => {});
            reject(err);
        });
    });
}

// Helper function to unzip a file using yauzl (pure JS implementation)
async function unzipFile(zipFile, destination) {
    console.log(`Unzipping ${zipFile} to ${destination}...`);
    try {
    // Read zip file into memory
        const zipBuffer = await fsPromises.readFile(zipFile);

        // Open zip file from buffer
        const zipfile = await new Promise((resolve, reject) => {
            yauzl.fromBuffer(zipBuffer, { lazyEntries: true }, (err, zipfile) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(zipfile);
                }
            });
        });

        return new Promise((resolve, reject) => {

            zipfile.on('entry', (entry) => {
                // Skip directory entries
                if (/\/$/.test(entry.fileName)) {
                    zipfile.readEntry();
                    return;
                }

                // Check if this is the file we want (cities1000.txt)
                if (entry.fileName === path.basename(destination)) {
                    zipfile.openReadStream(entry, (err, readStream) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        // Extract file to destination
                        const writeStream = fs.createWriteStream(destination);

                        readStream.on('end', () => {
                            zipfile.readEntry();
                        });

                        writeStream.on('finish', () => {
                            // We found and extracted the file we needed
                            resolve();
                        });

                        readStream.pipe(writeStream);
                    });
                }
                else {
                    // Not the file we're looking for, continue to next entry
                    zipfile.readEntry();
                }
            });

            zipfile.on('error', (err) => {
                console.error(`Error reading zip file ${zipFile}:`, err);
                reject(err);
            });

            zipfile.on('end', () => {
                // If we get here without resolving, we didn't find the file
                resolve();
            });

            // Start reading entries
            zipfile.readEntry();
        });
    }
    catch (err) {
        console.error(`Error unzipping file ${zipFile}:`, err);
        return Promise.reject(err);
    }
}

// Download files if they don't exist
async function downloadFiles() {
    console.log("Checking and downloading necessary files...");

    if (!fs.existsSync(DATA)) {
        console.log("Downloading cities from Geonames...");
        const zipFile = "cities1000.zip";
        await downloadFile("https://download.geonames.org/export/dump/cities1000.zip", zipFile);

        try {
            await unzipFile(zipFile, DATA);
            await fsPromises.unlink(zipFile);
        }
        catch (error) {
            console.error("Error extracting zip file:", error);
            throw error;
        }
    }
    else {
        console.log(`Using existing ${DATA}`);
    }

    if (!fs.existsSync(ADMIN1)) {
        console.log("Downloading admin1 from Geonames...");
        await downloadFile("https://download.geonames.org/export/dump/admin1CodesASCII.txt", ADMIN1);
    }
    else {
        console.log(`Using existing ${ADMIN1}`);
    }

    if (!fs.existsSync(COUNTRIES)) {
        console.log("Downloading countries from Geonames...");
        await downloadFile("https://download.geonames.org/export/dump/countryInfo.txt", COUNTRIES);
    }
    else {
        console.log(`Using existing ${COUNTRIES}`);
    }
}

// Parse TSV files and insert into MongoDB
async function processTsvFiles() {
    console.log("Processing TSV files and inserting into MongoDB...");

    // Connect to MongoDB
    pluginManager.dbConnection().then(async(db) => {

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
        if (featuresArray.length > 0) {
            await features.insertMany(featuresArray);
        }

        if (coordinatesArray.length > 0) {
            await coordinates.insertMany(coordinatesArray);
        }

        if (admin1Array.length > 0) {
            await admin1.insertMany(admin1Array);
        }

        if (countriesArray.length > 0) {
            await countries.insertMany(countriesArray);
        }

        // Create indexes
        await coordinates.createIndex({ latitude: 1, longitude: 1 });
        await coordinates.createIndex({ feature_id: 1 });
        await features.createIndex({ id: 1 });
        await features.createIndex({ name: 1, country_id: 1 });
        await admin1.createIndex({ country_id: 1, id: 1 });
        await countries.createIndex({ id: 1 });

        console.log(`Created MongoDB collections with ${featuresArray.length} features.`);

        // Clean up
        db.close();
    });
}

// Clean up temporary files
function cleanUp() {
    console.log("Cleaning up...");
    fs.unlinkSync(DATA);
    fs.unlinkSync(ADMIN1);
    fs.unlinkSync(COUNTRIES);
}

// Main execution
async function main() {
    try {
        downloadFiles();
        await processTsvFiles();
        cleanUp();
        console.log("Done!");
    }
    catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

main();