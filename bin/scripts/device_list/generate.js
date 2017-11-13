// run as 
// node generate.js > countly.device.list.js
var devices = require("./ios.json");
var csv = require('csvtojson');
csv()
//from https://support.google.com/googleplay/answer/1727131?hl=en-GB
.fromFile("./supported_devices.csv")
.on('json',(jsonObj)=>{
    var d = jsonObj["Marketing Name"]+"";
    var i = jsonObj["Model"]+"";
    if(i != d && d.trim().length){
        devices[i] = d;
    }
})
.on('done',()=>{
    console.log("/**\n * Object with device models as keys and pretty/marketing device names as values\n * @name countlyDeviceList\n * @global\n * @namespace countlyDeviceList\n */\ncountlyDeviceList = "+JSON.stringify(devices)+";\nif( typeof module !== 'undefined' && module.exports ) {\n    exports = module.exports = countlyDeviceList\n}");
});
