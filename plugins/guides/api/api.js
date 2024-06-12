var exported = {},
    plugins = require('../../pluginManager.js'),
    common = require('../../../api/utils/common.js');

(function() {
    plugins.register("/i/guides/viewed", function(ob) {
        var params = ob.params;
        updateMemberViewedGuides(common.db, params.qstring.user_id, params);
    });

    /**
    * @param {object} db - database connection for countly db
    * @param {string} user_id - user for which to update settings
    * @param {object} params - params object
    */
    function updateMemberViewedGuides(db, user_id) {
        var callback = callback || null;
        var update = {"viewedGuides": true};
        db.collection("members").update({ _id: db.ObjectID(user_id) }, { $set: update }, { upsert: true }, async function(err, res) {
            if (err) {
                common.returnMessage(err, 503, 'Failed to update member');
            }
            else {
                common.returnMessage(res, 200, 'Succesfuly updated member');
            }
        });
    }
}(exported));

module.exports = exported;