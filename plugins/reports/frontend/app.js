const pluginInstance = {};
const countlyConfig = require('../../../frontend/express/config');
const common = require('../../../api/utils/common.js');
const reports = require('../api/reports');
const localize = require('../../../api/utils/localization.js');

(function(plugin) {
    plugin.init = function(app, countlyDb) {
        plugin.staticPaths = function(appObj, countlyDbObj, express) {
            appObj.use(countlyConfig.path + "/reports/images", express.static(__dirname + "/public/images"));
        };

        /**
         * render view 
         *
         * @param {object} res - express response object
         * @param {object} countlyDbObj - countly common db object
         * @param {bool} isUnSub - is  unsubscription action 
         * @param {object} report - report db object
         **/
        function render(res, countlyDbObj, isUnSub, report) {
            countlyDbObj.collection("plugins").findOne({_id: "whitelabeling"}, function(err, result) {
                let css = "";
                if (!err) {
                    if (result && result.prelogo && result.prelogo !== "") {
                        css = " .logo{background-image: url(" + result.prelogo + ") !important;}";
                    }
                }
                countlyDbObj.collection('members').findOne({_id: report.user}, function(err1, member) {
                    if (err1) {
                        console.log(err1);
                    }
                    const lang = (member && member.lang) || "en";

                    localize.getProperties(lang, function(err2, props) {
                        if (err2) {
                            console.log(err2);
                        }
                        else {
                            const i18n = {};
                            const prefix = isUnSub ? "un" : "";
                            i18n.title = localize.format(props[`reports.${prefix}subscribe-title`]);
                            i18n.subtitle = localize.format(props[`reports.${prefix}subscribe-subtitle`], report.title);
                            i18n.hint = localize.format(props[`reports.${prefix}subscribe-hint`]);
                            i18n.button = localize.format(props[`reports.${prefix}subscribe-button`]);

                            res.render('../../../plugins/reports/frontend/public/templates/unsubscribe.html', {
                                path: countlyConfig.path || "",
                                css,
                                i18n: i18n,
                            });
                        }
                    });
                });
            });
        }

        app.get(countlyConfig.path + '/unsubscribe_report', function(req, res) {
            try {
                const data = JSON.parse(req.query.data);
                const parsedData = reports.decryptUnsubscribeCode(data);
                const {reportID, email} = parsedData;
                countlyDb.collection('reports').findOneAndUpdate({_id: common.db.ObjectID(reportID)}, { $pull: {'emails': email}}, function(err, result) {
                    render(res, countlyDb, true, result && result.value);
                });
            }
            catch (e) {
                console.log(e);
                render(res, countlyDb);
            }

            return true;
        });

        app.get(countlyConfig.path + '/subscribe_report', function(req, res) {
            try {
                const data = JSON.parse(req.query.data);
                const parsedData = reports.decryptUnsubscribeCode(data);
                const {reportID, email} = parsedData;
                countlyDb.collection('reports').findOneAndUpdate({_id: common.db.ObjectID(reportID)}, { $addToSet: {'emails': email}}, function(err, result) {
                    render(res, countlyDb, false, result && result.value);
                });
            }
            catch (e) {
                console.log(e);
                render(res, countlyDb);
            }

            return true;
        });
    };
}(pluginInstance));

module.exports = pluginInstance;
