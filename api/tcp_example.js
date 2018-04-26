const net = require('net');
const countlyConfig = require('./config', 'dont-enclose');
const plugins = require('../plugins/pluginManager.js');
const log = require('./utils/log.js')('core:tcp');
const common = require('./utils/common.js');
const {processRequest} = require('./utils/requestProcessor');

/**
 * Initialize Plugins
 */
plugins.init();

/**
 * Uncaught Exception Handler
 */
process.on('uncaughtException', (err) => {
    console.log('Caught exception: %j', err, err.stack);
    if (log && log.e)
        log.e('Logging caught exception');
    process.exit(1);
});

/**
 * Unhandled Rejection Handler
 */
process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled rejection for %j with reason %j stack ', p, reason, reason ? reason.stack : undefined);
    if (log && log.e)
        log.e('Logging unhandled rejection');
});

/**
 * Create DB connection
 */
common.db = plugins.dbConnection(countlyConfig);
  
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
    
    //common response function to sockets
    function respond(message){
        if(socket.readyState === "open"){
            socket.write(message);
        }
    }
    
    //npm install JSONStream
    var JSONStream = require('JSONStream');
    
    //parse JSON stream and call data on each separate JSON object
    socket.pipe(JSONStream.parse()).on('data', function (data) {
        if(data){
            /**
            * Accepting data in format {"url":"endpoint", "body":"data"}
            * Example: {"url":"/o/ping"}
            * Example: {"url":"/i", "body":{"device_id":"test","app_key":"APP_KEY","begin_session":1,"metrics":{}}}
            **/
            plugins.loadConfigs(common.db, function(){                
                //creating request context
                var params = {
                    //providing data in request object
                    'req':{url:data.url, body:data.body, method:"tcp"},
                    //adding custom processing for API responses
                    'APICallback': function(err, data, headers, returnCode, params){
                        //sending response to client
                        respond(data);
                    }
                };
                
                //processing request
                processRequest(params);
            }, true);
        }
        else{
            respond('Data cannot be parsed');
        }
    }).on("error", function(err){
        console.log("TCP parse error", err);
    });
    socket.on("error", function(err){
        console.log("TCP connection error", err);
    });
    socket.on("close", function(err){
        console.log("TCP connection closed with error", err);
    });
}).listen(3005, "localhost");
