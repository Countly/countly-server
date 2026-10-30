const pluginInstance = {};
const countlyConfig = require('../../../frontend/express/config');
const common = require('../../../api/utils/common.js');
const reports = require('../api/reports');
const localize = require('../../../api/utils/localization.js');
const plugins = require('../../../plugins/pluginManager');

(function(plugin) {
    plugin.init = function(app, countlyDb) {
        plugin.staticPaths = function(appObj, countlyDbObj, express) {
            appObj.use(countlyConfig.path + "/reports/images", express.static(__dirname + "/public/images"));
        };

        /**
         * Send the subscription page with localized texts
         *
         * @param {object} res - express response object
         * @param {string} lang - language code
         * @param {string} css - extra css for the page
         * @param {Function} getTexts - receives the localization properties, returns the page texts
         * @param {number} status - http status code
         **/
        function sendPage(res, lang, css, getTexts, status) {
            localize.getProperties(lang, function(err, props) {
                if (err) {
                    console.log(err);
                    res.status(500).send("Error");
                    return;
                }
                const texts = getTexts(props);
                res.status(status).render('../../../plugins/reports/frontend/public/templates/unsubscribe.html', {
                    path: countlyConfig.path || "",
                    css,
                    error: texts.error,
                    i18n: texts.i18n,
                });
            });
        }

        /**
         * Render the page for a subscription link that cannot be acted on
         *
         * @param {object} res - express response object
         * @param {number} status - 400 for a malformed link, 404 for a report that no longer exists
         **/
        function renderError(res, status) {
            const prefix = status === 404 ? "reports.subscription-not-found" : "reports.subscription-invalid";
            sendPage(res, "en", "", function(props) {
                return {
                    error: true,
                    i18n: {
                        title: localize.format(props[`${prefix}-title`]),
                        subtitle: localize.format(props[`${prefix}-subtitle`]),
                    }
                };
            }, status);
        }

        /**
         * render view 
         *
         * @param {object} res - express response object
         * @param {object} countlyDbObj - countly common db object
         * @param {bool} isUnSub - is  unsubscription action 
         * @param {object} report - report db object
         **/
        function render(res, countlyDbObj, isUnSub, report) {
            if (!report) {
                renderError(res, 404);
                return;
            }
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

                    sendPage(res, lang, css, function(props) {
                        const i18n = {};
                        const prefix = isUnSub ? "un" : "";
                        i18n.title = localize.format(props[`reports.${prefix}subscribe-title`]);
                        i18n.subtitle = localize.format(props[`reports.${prefix}subscribe-subtitle`], report.title);
                        i18n.hint = localize.format(props[`reports.${prefix}subscribe-hint`]);
                        i18n.button = localize.format(props[`reports.${prefix}subscribe-button`]);
                        return {error: false, i18n};
                    }, 200);
                });
            });
        }

        /**
         * Decode the subscription link payload
         *
         * @param {object} query - express request query
         * @returns {object|null} report id and email, or null when the link cannot be decoded
         **/
        function parseSubscriptionCode(query) {
            let data;
            try {
                data = JSON.parse(query.data);
            }
            catch {
                return null;
            }
            if (!data || typeof data !== "object") {
                return null;
            }
            const parsedData = reports.decryptUnsubscribeCode(data);
            if (!parsedData || !parsedData.reportID || typeof parsedData.email !== "string") {
                return null;
            }
            try {
                return {reportID: common.db.ObjectID(parsedData.reportID + ""), email: parsedData.email};
            }
            catch {
                return null;
            }
        }

        app.get(countlyConfig.path + '/unsubscribe_report', function(req, res) {
            const code = parseSubscriptionCode(req.query);
            if (!code) {
                renderError(res, 400);
                return true;
            }
            const {reportID, email} = code;
            countlyDb.collection('reports').findOne({_id: reportID}, function(err, report) {
                if (err || !report) {
                    renderError(res, 404);
                    return;
                }
                countlyDb.collection('reports').findOneAndUpdate({_id: reportID}, { $pull: {'emails': email}}, {returnDocument: "after"}, function(errUpdate, result) {
                    plugins.callMethod("logAction", {req: req, user: {email}, action: "reports_unsubscribe", data: {before: {emails: report.emails}, update: {emails: result && result.value && result.value.emails}}});
                    render(res, countlyDb, true, result && result.value);
                });
            });

            return true;
        });

        app.get(countlyConfig.path + '/subscribe_report', function(req, res) {
            const code = parseSubscriptionCode(req.query);
            if (!code) {
                renderError(res, 400);
                return true;
            }
            const {reportID, email} = code;
            countlyDb.collection('reports').findOne({_id: reportID}, function(err, report) {
                if (err || !report) {
                    renderError(res, 404);
                    return;
                }
                countlyDb.collection('reports').findOneAndUpdate({_id: reportID}, { $addToSet: {'emails': email}}, {returnDocument: "after"}, function(errUpdate, result) {
                    plugins.callMethod("logAction", {req: req, user: {email}, action: "reports_subscribe", data: {before: report.emails, update: {emails: result && result.value && result.value.emails}}});
                    render(res, countlyDb, false, result && result.value);
                });
            });

            return true;
        });
    };
}(pluginInstance));

module.exports = pluginInstance;
