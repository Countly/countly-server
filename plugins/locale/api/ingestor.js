var exported = {},
    langs = require('./utils/langs.js'),
    plugins = require('../../pluginManager.ts');

(function() {
    plugins.register("/sdk/process_request", function(ob) {

        if (ob.params.qstring.metrics && ob.params.qstring.metrics._locale) {
            var params = ob.params;
            if (params.qstring.metrics._locale) {
                var locale = params.qstring.metrics._locale, lang = langs.languageFromLocale(locale);
                params.qstring.metrics._lang = lang;

                ob.params.collectedMetrics.lo = locale;
            }
            if (params.qstring.metrics._lang) {
                ob.params.collectedMetrics.la = params.qstring.metrics._lang;
            }
        }
    });
}(exported));

module.exports = exported;