// run as 
// node generate.js > countly.device.list.js

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
var csv = require('csvtojson');
csv()
//from https://support.google.com/googleplay/answer/1727131?hl=en-GB
    .fromFile("./supported_devices.csv")
    .on('json', (jsonObj)=>{
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
    .on('done', ()=>{
        process.stdout.write("/**\n * Object with device models as keys and pretty/marketing device names as values\n * @name countlyDeviceList\n * @global\n * @namespace countlyDeviceList\n */\nvar countlyDeviceList = " + JSON.stringify(devices, null, 4) + ";\n/*global module*/\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = countlyDeviceList;\n}");
    });