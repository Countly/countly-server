require("./download_geonames_data.js");
//require("./import_geonames_mongodb.js");
/*
const https = require('https');
const { createWriteStream } = require('fs');
const file = createWriteStream("cities1000.zip");
https.get('https://download.geonames.org/export/dump/cities1000.zip', (res) => {
    console.log('statusCode:', res.statusCode);
    console.log('headers:', res.headers);

    res.pipe(file);

    file.on('finish', () => {
        console.log(`Downloaded`);
        file.close();
    });

}).on('error', (e) => {
    console.error(e);
});*/