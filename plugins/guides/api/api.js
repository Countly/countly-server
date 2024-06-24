var exported = {},
    plugins = require('../../pluginManager.js'),
    common = require('../../../api/utils/common.js');

(function() {
    plugins.register("/i/guides/viewed", function(ob) {
        var db = common.db,
            user_id = ob.params.qstring.user_id,
            update = {"viewedGuides": true};

        // check for rights and what we do for table updates persistent settings etc in other places
        db.collection("members").update({ _id: db.ObjectID(user_id) }, { $set: update }, { upsert: true }, function(err, res) {
            if (err) {
                common.returnMessage(err, 503, 'Failed to update member');
            }
            else {
                common.returnMessage(res, 200, 'Succesfuly updated member');
            }
        });
    });
}(exported));

module.exports = exported;