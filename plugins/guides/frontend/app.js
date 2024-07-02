var plugin = {};
const countlyConfig = require('../../../frontend/express/config');
const common = require('../../../api/utils/common.js');

plugin.init = function(app) {
    app.post(countlyConfig.path + '/guides/viewed', function(req, res) {
        if (!req.session || !req.session.uid) {
            res.send(false);
            res.end();
            return false;
        }
        else {
            var db = common.db,
                user_id = req.body.user_id,
                update = {"viewedGuides": true};

            db.collection("members").update({ _id: db.ObjectID(user_id) }, { $set: update }, { upsert: true }, function(err, res2) {
                if (err) {
                    common.returnMessage(err, 503, 'Failed to update member');
                }
                else {
                    common.returnMessage(res2, 200, 'Succesfuly updated member');
                }
            });
        }
    });
};

module.exports = plugin;