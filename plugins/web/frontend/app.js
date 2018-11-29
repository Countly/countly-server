var exported = {},
    request = require("request"),
    countlyConfig = require("../../../frontend/express/config");

(function(plugin) {
    plugin.init = function(app) {
        app.get(countlyConfig.path + '/pixel.png', function(req, res) {
            if (req.query.app_key) {
                var options = {uri: "http://localhost/i", method: "POST", timeout: 4E3, json: {}};
                if  (req && req.headers && req.headers['user-agent']) {
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

                request(options, function() {});
            }
            var img = new Buffer("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAAApJREFUCNdjYAAAAAIAAeIhvDMAAAAASUVORK5CYII=", 'base64');

            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': img.length
            });
            res.end(img);
        });
    };
}(exported));

module.exports = exported;