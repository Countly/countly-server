// run as 
// node generate.js > ../../../frontend/express/public/javascripts/countly/countly.device.list.js

// Sources for apple.json. Add a new identifier only when two sources agree on it
// (for Macs, Apple's own page is enough):
// - The Apple Wiki "Models" page (formerly theiphonewiki.com). The page is built from one
//   subpage per family (Models/iPhone, Models/iPad, Models/Apple Watch, ...); the site
//   blocks plain HTTP clients, so read the wikitext through the API:
//   https://theapplewiki.com/api.php?action=parse&page=Models/iPhone&prop=wikitext&format=json
// - AppleDB, device list with identifiers: https://api.appledb.dev/device/main.json
// - https://gist.github.com/adamawolf/3048717 (iPhone, iPad, Watch only)
// - Macs: Apple's "Identify your Mac" pages, see scrape_mac_devices.txt
var devices = require("./apple.json");

// Sources for amazon.json (model code -> name tables):
// - Fire TV: https://developer.amazon.com/docs/device-specs/identify-fire-tv-devices.html
// - Fire tablets: https://developer.amazon.com/docs/device-specs/ft-identify-tablet-devices.html
// - Older tablets: https://m.media-amazon.com/images/G/01/mobile-apps/dex/firetablets/tablet-device-specs-data._TTH_.json
var amazon = require("./amazon.json");


for (var i in amazon) {
    devices[i] = amazon[i];
}

// Informative messages are writer to stderr so they don't interfere with the stdout piping to a file
// When downloading the CSV file it will be UTF-16 LE. It needs to be transformed to UTF-8 (non BOM version)
// converting with notepad++ or vscode might not work on a windows device. Try on a mac device
process.stderr.write("Starting CSV parsing\n");
var csv = require('csvtojson');
csv()
//Shift + Cmd + P -> Convert Encoding -> Save with encoding -> UTF-8
//from https://support.google.com/googleplay/answer/1727131?hl=en-GB
//direct download: https://storage.googleapis.com/play_public/supported_devices.csv
    .fromFile("./supported_devices.csv")
    // csvtojson v2 removed the 'json' event; subscribe() yields each parsed row instead.
    .subscribe((jsonObj)=>{
        //process.stderr.write("Parsed data/json line: " + jsonObj);
        var d = jsonObj["Marketing Name"] + "";
        var i = jsonObj["Model"] + "";
        if (i != d && d.trim().length) {
            try {
                //the CSV also escapes some apostrophes as \'
                devices[i] = decodeURIComponent(escape(d.replace(/\\x([0-9a-f]{2})/g, function(_, pair) {
                    return String.fromCharCode(parseInt(pair, 16));
                }).replace(/\\'/g, "'")));
            }
            catch {
                devices[i] = d;
            }
        }
    })
    // .on('data', (data)=>{
    //     //process.stderr.write("Parsed data line: " + data);
    // })
    // .on('error', (err)=>{
    //     process.stderr.write("Error while parsing: " + err);
    // })
    .on('done', ()=>{
        process.stderr.write("CSV parsing 'done' trigger\n");
        process.stdout.write("/**\n * Object with device models as keys and pretty/marketing device names as values\n * @name countlyDeviceList\n * @global\n * @namespace countlyDeviceList\n */\nvar countlyDeviceList = " + JSON.stringify(devices, null, 4) + ";\n/*global module*/\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = countlyDeviceList;\n}");
    });
process.stderr.write("Ending CSV parsing\n");