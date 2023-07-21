const common = require('../../../api/utils/common');

var exportedPlugin = {};

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
}(exportedPlugin));

module.exports = exportedPlugin;