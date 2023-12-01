var exportedPlugin = {},
    common = require('../../../api/utils/common'),
    plugins = require('../../pluginManager.js');

(function(plugin) {
    plugin.init = function(_, countlyDb) {
        plugin.loginSuccessful = function(ob) {
            const member = ob.data;

            countlyDb.collection('members').update(
                { _id: common.db.ObjectID(member._id) },
                { $inc: { login_count: 1 } },
            );
        };
    };

    plugin.renderDashboard = function(ob) {
        ob.data.countlyGlobal.domain = plugins.getConfig("api").domain;
    };
}(exportedPlugin));

module.exports = exportedPlugin;