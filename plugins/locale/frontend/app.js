var exported = {},
    countlyConfig = require('../../../frontend/express/config', 'dont-enclose'),
    langs = require('../api/utils/langs.js');

(function(plugin) {
    plugin.init = function(app) {
        app.get(countlyConfig.path + '/dashboard', function(req, res, next) {
            res.expose({
                languages: langs.languages
            }, 'countlyGlobalLang');
            next();
        });
    };
}(exported));

module.exports = exported;