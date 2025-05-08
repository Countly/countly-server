// run as 
// node generate.js > ../../../frontend/express/public/javascripts/countly/countly.device.list.js

//https://www.theiphonewiki.com/wiki/Models 
//https://gist.github.com/adamawolf/3048717
//scrape_mac_devices.txt
var devices = require("./apple.json");

//https://m.media-amazon.com/images/G/01/mobile-apps/dex/firetablets/tablet-device-specs-data._TTH_.json
//https://developer.amazon.com/docs/fire-tv/device-specifications.html?v=ftveditioninsigniahd
//https://developer.amazon.com/docs/fire-tablets/ft-specs-custom.html
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
    .fromFile("./supported_devices.csv")
    .on('json', (jsonObj)=>{
        //process.stderr.write("Parsed data/json line: " + jsonObj);
        var d = jsonObj["Marketing Name"] + "";
        var i = jsonObj["Model"] + "";
        if (i != d && d.trim().length) {
            try {
                devices[i] = decodeURIComponent(escape(d.replace(/\\x([0-9a-f]{2})/g, function(_, pair) {
                    return String.fromCharCode(parseInt(pair, 16));
                })));
            }
            catch (ex) {
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