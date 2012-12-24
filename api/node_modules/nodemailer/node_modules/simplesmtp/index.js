
// expose the API to the world
module.exports.createServer = require("./lib/server.js");
module.exports.connect = require("./lib/client.js");
module.exports.createClientPool = require("./lib/pool.js");