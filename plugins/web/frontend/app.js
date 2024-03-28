var exported = {},
    plugins = require("../../pluginManager"),
    request = require("countly-request")(plugins.getConfig("security")),
    countlyConfig = require("../../../frontend/express/config");

(function(plugin) {
    plugin.init = function(app) {
        /**
        * Make request to report data
        * @param  {Object} options - request options and data
        */
        function makeRequest(options) {
            request(options, function(error, response) {
                if (response && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    options.uri = response.headers.location;
                    makeRequest(options);
                }
            });
        }
        app.get(countlyConfig.path + '/pixel.png', function(req, res) {
            if (req.query.app_key) {
                var options = {uri: (process.env.COUNTLY_CONFIG_PROTOCOL || "http") + "://" + (process.env.COUNTLY_CONFIG_HOSTNAME || "localhost") + (countlyConfig.path || "") + "/i", method: "POST", timeout: 4E3, json: {}, strictSSL: false};
                if (req && req.headers && req.headers['user-agent']) {
                    options.headers = {'user-agent': req.headers['user-agent']};
                }
                options.json = req.query;
                if (!options.json.device_id) {
                    options.json.device_id = "no_js";
                }

                if (!options.json.ip_address) {
                    options.json.ip_address = req.ip;
                }

                if (!options.json.user_details) {
                    options.json.user_details = {name: "No JS"};
                }

                makeRequest(options);
            }
            var img = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAAApJREFUCNdjYAAAAAIAAeIhvDMAAAAASUVORK5CYII=", 'base64');

            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': img.length
            });
            res.end(img);
        });
    };
}(exported));

module.exports = exported;