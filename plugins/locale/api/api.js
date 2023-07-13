var exported = {},
    langs = require('./utils/langs.js'),
    common = require('../../../api/utils/common.js'),
    fetch = require('../../../api/parts/data/fetch.js'),
    plugins = require('../../pluginManager.js'),
    { validateRead } = require('../../../api/utils/rights.js');

const FEATURE_NAME = 'locale';

(function() {
    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });
    plugins.register("/worker", function() {
        common.dbUserMap.locale = 'lo'; // full ISO locale from device
        common.dbUserMap.lang = 'la'; // language extracted from locale
    });
    plugins.register("/o/method/total_users", function(ob) {
        ob.shortcodesForMetrics.languages = "la";
        ob.shortcodesForMetrics.langs = "la";
    });
    plugins.register("/metric/collection", function(ob) {
        if (ob.metric === "locales" || ob.metric === "langs") {
            ob.data = ["langs", "langs", "locale"];
        }
    });
    plugins.register("/session/metrics", function(ob) {
        var predefinedMetrics = ob.predefinedMetrics;
        var userProps = ob.userProps;
        var params = ob.params;
        var user = ob.user;
        var isNewUser = ob.isNewUser;
        if (params.qstring.metrics && params.qstring.metrics._locale) {
            var locale = params.qstring.metrics._locale, lang = langs.languageFromLocale(locale);
            params.qstring.metrics._lang = lang;

            if (isNewUser || user[common.dbUserMap.locale] !== locale) {
                userProps[common.dbUserMap.locale] = locale;
            }
        }
        predefinedMetrics.push({
            db: "langs",
            metrics: [
                { name: "_lang", set: "langs", short_code: common.dbUserMap.lang }
            ]
        });

    });

    plugins.register("/o", function(ob) {
        var params = ob.params;

        if (params.qstring.method === "langs") {
            validateRead(params, FEATURE_NAME, fetch.fetchTimeObj, 'langs');
            return true;
        }
        return false;
    });

    plugins.register("/o/langmap", function(ob) {
        common.returnOutput(ob.params, langs.languages);
        return true;
    });

    plugins.register("/i/apps/reset", function(ob) {
        var appId = ob.appId;
        common.db.collection('langs').remove({'_id': {$regex: appId + ".*"}}, function() {});
    });

    plugins.register("/i/apps/delete", function(ob) {
        var appId = ob.appId;
        common.db.collection('langs').remove({'_id': {$regex: appId + ".*"}}, function() {});
    });

    plugins.register("/i/apps/clear", function(ob) {
        var appId = ob.appId;
        var ids = ob.ids;
        common.db.collection('langs').remove({$and: [{'_id': {$regex: appId + ".*"}}, {'_id': {$nin: ids}}]}, function() {});
    });

    plugins.register("/i/apps/clear_all", function(ob) {
        var appId = ob.appId;
        common.db.collection('langs').remove({'_id': {$regex: appId + ".*"}}, function() {});
    });
}(exported));

module.exports = exported;