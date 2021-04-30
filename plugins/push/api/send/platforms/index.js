const fs = require('fs'),
    path = require('path');

let PLATFORM = {};

fs.readdirSync(__dirname).filter(f => f !== 'index.js' && f.endsWith('.js')).forEach(f => {
    PLATFORM[f.substr(0, f.lastIndexOf('.'))] = require(path.join(__dirname, f));
});

module.exports = {
    platforms: Object.keys(PLATFORM),
    PLATFORM
};