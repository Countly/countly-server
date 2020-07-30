const net = require('net');
const countlyConfig = require('./config', 'dont-enclose');
const plugins = require('../plugins/pluginManager.js');
const log = require('./utils/log.js')('core:tcp');
const common = require('./utils/common.js');
const {processRequest} = require('./utils/requestProcessor');


/**
 * Create DB connection
 */
plugins.dbConnection(countlyConfig).then(function(db) {
    common.db = db;

    /**
    * Initialize Plugins
    */
    plugins.init();

    /**
    * Uncaught Exception Handler
    */
    process.on('uncaughtException', (err) => {
        console.log('Caught exception: %j', err, err.stack);
        if (log && log.e) {
            log.e('Logging caught exception');
        }
        process.exit(1);
    });

    /**
    * Unhandled Rejection Handler
    */
    process.on('unhandledRejection', (reason, p) => {
        console.log('Unhandled rejection for %j with reason %j stack ', p, reason, reason ? reason.stack : undefined);
        if (log && log.e) {
            log.e('Logging unhandled rejection');
        }
    });

    /**
    * Let plugins know process started
    */
    plugins.dispatch("/worker", {common: common});

    /**
    * Preload initial configs
    */
    plugins.loadConfigs(common.db);

    /**
    * Create TCP server
    */
    net.createServer(function(socket) {

        /**
        * Common response function to sockets and logging received data
        * @param {string} message - response string that was usually returned by API
        * @param {object} headers - HTTP headers that would usually be returned by API
        * @param {number} returnCode - HTTP response code that would usually be returned by API
        * @param {params} paramsOb - params object for processed request
        **/
        function respond(message, headers, returnCode, paramsOb) {
            console.log(message, headers, returnCode, paramsOb);
            if (socket.readyState === "open") {
                socket.write(message);
            }
        }

        //npm install JSONStream
        var JSONStream = require('JSONStream');

        //parse JSON stream and call data on each separate JSON object
        socket.pipe(JSONStream.parse()).on('data', function(data) {
            if (data) {
                /**
                * Accepting req data in format {"url":"endpoint", "body":"data"}
                * Example: {"url":"/o/ping"}
                * Example: {"url":"/i", "body":{"device_id":"test","app_key":"APP_KEY","begin_session":1,"metrics":{}}}
                **/
                //creating request context
                var params = {
                    //providing data in request object
                    'req': {
                        url: data.url,
                        body: data.body,
                        method: "tcp"
                    },
                    //adding custom processing for API responses
                    'APICallback': function(err, responseData, headers, returnCode, paramsOb) {
                        //sending response to client
                        respond(responseData, headers, returnCode, paramsOb);
                    }
                };

                //processing request
                processRequest(params);
            }
            else {
                respond('Data cannot be parsed');
            }
        }).on("error", function(err) {
            console.log("TCP parse error", err);
        });
        socket.on("error", function(err) {
            console.log("TCP connection error", err);
        });
        socket.on("close", function(err) {
            console.log("TCP connection closed with error", err);
        });
    }).listen(3005, "localhost");
});