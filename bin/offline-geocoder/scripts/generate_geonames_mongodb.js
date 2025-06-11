//require("./download_geonames_data.js");
//require("./import_geonames_mongodb.js");

const https = require('node:https');

https.get('https://download.geonames.org/export/dump/cities1000.zip', (res) => {
    console.log('statusCode:', res.statusCode);
    console.log('headers:', res.headers);

    res.on('data', (d) => {
        process.stdout.write(d);
    });

}).on('error', (e) => {
    console.error(e);
});