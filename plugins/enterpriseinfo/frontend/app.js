var exported = {},
    countlyConfig = require('../../../frontend/express/config', 'dont-enclose'),
    versionInfo = require('../../../frontend/express/version.info'),
    async = require('async');

(function(plugin) {
    plugin.init = function(app, countlyDb) {
        /**
         * Function to get total users
         * @param  {Function} callback - Callback function
         */
        function getTotalUsers(callback) {
            countlyDb.collection("apps").find({}, {_id: 1}).toArray(function(err1, allApps) {
                if (err1 || !allApps) {
                    callback(0, 0);
                }
                else {
                    async.map(allApps, getUserCountForApp, function(err2, results) {
                        if (err2) {
                            callback(0, 0);
                        }

                        var userCount = 0;

                        for (var i = 0; i < results.length; i++) {
                            userCount += results[i];
                        }

                        callback(userCount, allApps.length);
                    });
                }
            });
        }
        /**
         * Function to get user count for app
         * @param  {Object} appData - App data object
         * @param  {Function} callback - Callback function
         */
        function getUserCountForApp(appData, callback) {
            countlyDb.collection("app_users" + appData._id).estimatedDocumentCount(function(err, count) {
                if (err || !count) {
                    callback(null, 0);
                }
                else {
                    callback(null, count);
                }
            });
        }
        app.get(countlyConfig.path + '/dashboard', function(req, res, next) {
            if (req.session.uid && versionInfo.type === "777a2bf527a18e0fffe22fb5b3e322e68d9c07a6" && !versionInfo.footer) {
                countlyDb.collection('members').findOne({"_id": countlyDb.ObjectID(req.session.uid)}, function(err, member) {
                    if (member && (typeof member.offer === "undefined" || member.offer < 2)) {
                        countlyDb.collection('members').findAndModify({_id: countlyDb.ObjectID(req.session.uid)}, {}, {$inc: {offer: 1}}, function() {});
                        getTotalUsers(function(totalUsers) {
                            if (totalUsers > 5000) {
                                res.expose({
                                    discount: "AWESOMECUSTOMER20"
                                }, 'countlyGlobalEE');
                            }
                        });
                    }
                });
            }
            next();
        });
    };
}(exported));

module.exports = exported;