var exported = {},
    plugins = require('../../pluginManager.js'),
    common = require('../../../api/utils/common.js');

(function() {
    //write api call
    plugins.register("/i", function(/*ob*/) {
        //process sdk request here
    });

    plugins.register("/i/guides/viewed", function(ob) {
        var params = ob.params;
        updateMemberViewedGuides(common.db, params.qstring.user_id, params);
    });

    /**
    * @param {object} db - database connection for countly db
    * @param {string} user_id - user for which to update settings
    * @param {object} params - params object
    */
    function updateMemberViewedGuides(db, user_id, params) {
        var callback = callback || null;
        var update = {"viewedGuides": true};
        db.collection("members").update({ _id: db.ObjectID(user_id) }, { $set: update }, { upsert: true }, function(err, /*res*/) {
            if (err) {
                // common.returnMessage(params, 503, 'Save note failed');
                // return false;
            }
            else {
                common.returnMessage(params, 200, 'Succesfuly updated member');
                return true;
            }
        });
    }
}(exported));

module.exports = exported;