// run as 
// node generate.js > countly.device.list.js
var devices = require("./ios.json");
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
            devices[i] = decodeURIComponent(escape(d.replace(/\\x([0-9a-f]{2})/g, function(_, pair) {
                return String.fromCharCode(parseInt(pair, 16));
            })));
        }
    })
    .on('done', ()=>{
        console.log("/**\n * Object with device models as keys and pretty/marketing device names as values\n * @name countlyDeviceList\n * @global\n * @namespace countlyDeviceList\n */\nwindow.countlyDeviceList = " + JSON.stringify(devices) + ";\nif( typeof module !== 'undefined' && module.exports ) {\n    exports = module.exports = window.countlyDeviceList\n}");
    });