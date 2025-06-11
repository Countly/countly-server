#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const { createWriteStream, promises: fsPromises } = require('fs');
const yauzl = require('yauzl'); // Pure JavaScript unzip implementation

const DATA = "cities1000.txt";
const ADMIN1 = "admin1CodesASCII.txt";
const COUNTRIES = "countryInfo.txt";
const DATA_DIR = "data";

// Helper function to download a file using Node.js
function downloadFile(url, destination) {
    console.log(`Downloading ${url} to ${destination}...`);
    return new Promise((resolve, reject) => {
        console.log(`Download promise enter: ${url}`);
        const file = createWriteStream(destination);
        console.log(`Download stream created for ${destination}`);
        https.get(url, response => {
            console.log(`Response status code: ${response.statusCode}`);
            if (response.statusCode !== 200) {
                console.log(`Failed to download ${url}: ${response.statusCode}`);
                reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
                return;
            }

            response.pipe(file);

            file.on('finish', () => {
                console.log(`Downloaded ${url} to ${destination}`);
                file.close();
                resolve();
            });
        }).on('error', err => {
            console.log(`Error downloading ${url}:`, err);
            fs.unlink(destination, () => {});
            reject(err);
        });
        console.log(`File stream created for ${destination}`);
        file.on('error', err => {
            console.log(`Error writing to file ${destination}:`, err);
            fs.unlink(destination, () => {});
            reject(err);
        });
        console.log(`Download promise exit: ${url}`);
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
                console.log(`Error reading zip file ${zipFile}:`, err);
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
        console.log(`Error unzipping file ${zipFile}:`, err);
        return Promise.reject(err);
    }
}

// Download files if they don't exist
async function downloadFiles() {
    console.log("Checking and downloading necessary files...");

    // Create data directory if it doesn't exist
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR);
    }

    const dataFilePath = path.join(DATA_DIR, DATA);
    const admin1FilePath = path.join(DATA_DIR, ADMIN1);
    const countriesFilePath = path.join(DATA_DIR, COUNTRIES);

    if (!fs.existsSync(dataFilePath)) {
        console.log("Downloading cities from Geonames...");
        const zipFile = path.join(DATA_DIR, "cities1000.zip");

        try {
            console.log("before downloading cities1000.zip");
            await downloadFile("https://download.geonames.org/export/dump/cities1000.zip", zipFile);
            console.log("after downloading cities1000.zip");
            console.log("Extracting cities1000.zip...");
            await unzipFile(zipFile, dataFilePath);
            console.log("Extraction complete, removing zip file...");
            await fsPromises.unlink(zipFile);
            console.log(`Extracted ${dataFilePath}`);
        }
        catch (error) {
            console.log("Error extracting zip file:", error);
            throw error;
        }
    }
    else {
        console.log(`Using existing ${dataFilePath}`);
    }

    if (!fs.existsSync(admin1FilePath)) {
        console.log("Downloading admin1 from Geonames...");
        try {
            await downloadFile("https://download.geonames.org/export/dump/admin1CodesASCII.txt", admin1FilePath);
        }
        catch (error) {
            console.log("Error downloading admin1:", error);
            throw error;
        }
    }
    else {
        console.log(`Using existing ${admin1FilePath}`);
    }

    if (!fs.existsSync(countriesFilePath)) {
        console.log("Downloading countries from Geonames...");
        try {
            await downloadFile("https://download.geonames.org/export/dump/countryInfo.txt", countriesFilePath);
        }
        catch (error) {
            console.log("Error downloading countries:", error);
            throw error;
        }
    }
    else {
        console.log(`Using existing ${countriesFilePath}`);
    }

    console.log("All files downloaded successfully!");
}

// Main execution
async function main() {
    try {
        await downloadFiles();
        console.log("Done downloading data!");
    }
    catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

main();
