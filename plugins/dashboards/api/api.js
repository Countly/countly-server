var pluginOb = {},
    plugins = require('../../pluginManager.js'),
    common = require('../../../api/utils/common.js'),
    customDashboards = require('./parts/dashboards.js'),
    path = require('path'),
    ejs = require("ejs"),
    fs = require('fs'),
    log = common.log('dashboards:api'),
    authorize = require('../../../api/utils/authorizer'),
    render = require('../../../api/utils/render'),
    versionInfo = require('../../../frontend/express/version.info'),
    ip = require("../../../api/parts/mgmt/ip"),
    localize = require('../../../api/utils/localization.js'),
    async = require('async'),
    { validateCreate, validateRead, validateUpdate, validateDelete, validateUser } = require('../../../api/utils/rights.js');

const FEATURE_NAME = 'dashboards';

plugins.setConfigs("dashboards", {
    sharing_status: true
});

(function() {
    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });

    plugins.register("/o/dashboards", function(ob) {
        var paths = ob.paths;

        if (typeof paths[3] === "undefined") {
            var params = ob.params,
                dashboardId = params.qstring.dashboard_id;

            if (typeof dashboardId === "undefined" || dashboardId.length !== 24) {
                common.returnMessage(params, 401, 'Invalid parameter: dashboard_id');
                return true;
            }

            validateRead(params, FEATURE_NAME, function() {
                var member = params.member,
                    memberId = member._id + "";

                common.db.collection("dashboards").findOne({_id: common.db.ObjectID(dashboardId)}, function(err, dashboard) {
                    if (!err && dashboard) {
                        async.parallel([
                            hasViewAccessToDashboard.bind(null, params.member, dashboard),
                            hasEditAccessToDashboard.bind(null, params.member, dashboard)
                        ], function(er, res) {
                            var hasViewAccess = res[0];
                            var hasEditAccess = res[1];

                            if (er || !hasViewAccess) {
                                return common.returnOutput(params, {error: true, dashboard_access_denied: true});
                            }

                            if (dashboard.owner_id === memberId || member.global_admin) {
                                dashboard.is_owner = true;
                            }

                            if (hasEditAccess) {
                                dashboard.is_editable = true;
                            }

                            var parallelTasks = [
                                fetchDashboardWidgets.bind(null)
                            ];

                            if (!dashboard.share_with) {
                                if (dashboard.shared_with_edit && dashboard.shared_with_edit.length ||
                                    dashboard.shared_with_view && dashboard.shared_with_view.length ||
                                    dashboard.shared_email_edit && dashboard.shared_email_edit.length ||
                                    dashboard.shared_email_view && dashboard.shared_email_view.length ||
                                    dashboard.shared_user_groups_edit && dashboard.shared_user_groups_edit.length ||
                                    dashboard.shared_user_groups_view && dashboard.shared_user_groups_view.length) {
                                    dashboard.share_with = "selected-users";
                                }
                                else {
                                    dashboard.share_with = "none";
                                }
                            }

                            if (canSeeDashboardShares(params.member, dashboard)) {
                                parallelTasks.push(fetchSharedUsersInfo.bind(null, dashboard));
                            }
                            else {
                                delete dashboard.shared_with_edit;
                                delete dashboard.shared_with_view;
                                delete dashboard.shared_email_view;
                                delete dashboard.shared_email_edit;
                                delete dashboard.shared_user_groups_edit;
                                delete dashboard.shared_user_groups_view;
                            }

                            async.parallel(parallelTasks, function(error, result) {
                                if (error) {
                                    common.returnMessage(params, 401, 'Error while fetching dashboard widget data.');
                                    return true;
                                }

                                var output = dashboard;
                                output = Object.assign(output, result[0]);

                                common.returnOutput(params, output);
                            });
                        });
                    }
                    else {
                        common.returnMessage(params, 404, "Dashboard does not exist");
                    }

                    /**
                     * Function to fetch dashboard widgets
                     * @param  {Function} callback - callback function
                     * @returns {Function} callback
                     */
                    function fetchDashboardWidgets(callback) {
                        if (!Array.isArray(dashboard.widgets)) {
                            return callback(null, {widgets: [], apps: []});
                        }

                        fetchWidgetsMeta(params, dashboard.widgets, function(metaerr, meta) {
                            if (metaerr) {
                                return callback(metaerr);
                            }

                            var widgets = meta[0] || [];
                            var apps = meta[1] || [];

                            if (!widgets.length) {
                                return callback(null, {widgets: widgets, apps: apps});
                            }

                            customDashboards.fetchWidgetData(params, widgets, function(data) {
                                var output = { widgets: data || [], apps: apps || [] };
                                return callback(null, output);
                            });
                        });
                    }

                    /**
                     * Function to fetch shared users info
                     * @param  {Object} dash - dashboard object
                     * @param  {Function} callback - callback function
                     */
                    function fetchSharedUsersInfo(dash, callback) {
                        var sharedViewIds = dash.shared_with_view || [];
                        var sharedViewEmails = dash.shared_email_view || [];
                        var sharedEditIds = dash.shared_with_edit || [];
                        var sharedEditEmails = dash.shared_email_edit || [];

                        async.parallel([
                            fetchSharedMembers.bind(null, sharedViewIds, sharedViewEmails), //View users
                            fetchSharedMembers.bind(null, sharedEditIds, sharedEditEmails) //Edit users
                        ], function(er, result) {
                            var totalViewUsers = result[0] || [];
                            var totalEditUsers = result[1] || [];

                            var allViewUsersEmails = totalViewUsers.map(function(obj) {
                                return obj.email;
                            });

                            var allEditUsersEmails = totalEditUsers.map(function(obj) {
                                return obj.email;
                            });

                            for (let i = 0; i < sharedViewEmails.length; i++) {
                                if (allViewUsersEmails.indexOf(sharedViewEmails[i]) === -1) {
                                    totalViewUsers.push({
                                        email: sharedViewEmails[i]
                                    });
                                }
                            }

                            for (let i = 0; i < sharedEditEmails.length; i++) {
                                if (allEditUsersEmails.indexOf(sharedEditEmails[i]) === -1) {
                                    totalEditUsers.push({
                                        email: sharedEditEmails[i]
                                    });
                                }
                            }

                            dash.shared_with_view_info = totalViewUsers;
                            dash.shared_with_edit_info = totalEditUsers;
                            return callback(null);
                        });
                    }
                });
            });

            return true;
        }
    });

    plugins.register("/o/dashboards/widget", function(ob) {
        var params = ob.params,
            dashboardId = params.qstring.dashboard_id,
            widgetId = params.qstring.widget_id;

        if (typeof dashboardId === "undefined" || dashboardId.length !== 24) {
            common.returnMessage(params, 401, 'Invalid parameter: dashboard_id');
            return true;
        }

        if (typeof widgetId === "undefined" || widgetId.length !== 24) {
            common.returnMessage(params, 401, 'Invalid parameter: widget_id');
            return true;
        }

        validateRead(params, FEATURE_NAME, function() {
            common.db.collection("dashboards").findOne({_id: common.db.ObjectID(dashboardId)}, function(err, dashboard) {
                if (!err && dashboard) {
                    hasViewAccessToDashboard(params.member, dashboard, function(er, status) {
                        if (er || !status) {
                            return common.returnOutput(params, {error: true, dashboard_access_denied: true});
                        }

                        common.db.collection("widgets").findOne({_id: common.db.ObjectID(widgetId)}, function(error, widget) {
                            customDashboards.fetchWidgetData(params, [widget], function(data) {
                                common.returnOutput(params, data);
                            });
                        });
                    });
                }
                else {
                    common.returnMessage(params, 404, "Dashboard does not exist");
                }
            });
        });

        return true;
    });

    plugins.register("/o/dashboards/test", function(ob) {
        var params = ob.params,
            widgets = [];

        try {
            widgets = JSON.parse(params.qstring.widgets);
        }
        catch (ex) {
            //Error
        }

        customDashboards.fetchWidgetData(params, widgets, function(data) {
            common.returnOutput(params, data);
        });

        return true;
    });

    plugins.register("/o/dashboards/all", function(ob) {
        var params = ob.params;

        validateUser(params, function() {
            var member = params.member,
                memberId = member._id + "",
                memberEmail = member.email,
                filterCond = {};

            if (!member.global_admin) {
                var groups = member.group_id || [];
                if (!Array.isArray(groups)) {
                    groups = [groups];
                }
                groups = groups.map(group_id => group_id + "");
                filterCond = {
                    $or: [
                        {owner_id: memberId},
                        {share_with: "all-users"},
                        {shared_with_edit: memberId},
                        {shared_with_view: memberId},
                        {shared_email_view: memberEmail},
                        {shared_email_edit: memberEmail},
                        {shared_user_groups_edit: {$in: groups}},
                        {shared_user_groups_view: {$in: groups}}
                    ]
                };
            }

            common.db.collection("dashboards").find(filterCond).toArray(function(err, dashboards) {
                if (err || !dashboards || !dashboards.length) {
                    return common.returnOutput(params, []);
                }

                async.forEach(dashboards, function(dashboard, done) {
                    async.parallel([
                        hasEditAccessToDashboard.bind(null, member, dashboard),
                        fetchWidgetsMeta.bind(null, params, dashboard.widgets)
                    ], function(perr, result) {
                        if (perr) {
                            return done(perr);
                        }

                        var hasEditAccess = result[0];
                        var widgetsMeta = result[1] || [];

                        if (dashboard.owner_id === memberId || member.global_admin) {
                            dashboard.is_owner = true;
                        }

                        if (hasEditAccess) {
                            dashboard.is_editable = true;
                        }

                        if (!dashboard.share_with) {
                            if (dashboard.shared_with_edit && dashboard.shared_with_edit.length ||
                                dashboard.shared_with_view && dashboard.shared_with_view.length ||
                                dashboard.shared_email_edit && dashboard.shared_email_edit.length ||
                                dashboard.shared_email_view && dashboard.shared_email_view.length ||
                                dashboard.shared_user_groups_edit && dashboard.shared_user_groups_edit.length ||
                                dashboard.shared_user_groups_view && dashboard.shared_user_groups_view.length) {
                                dashboard.share_with = "selected-users";
                            }
                            else {
                                dashboard.share_with = "none";
                            }
                        }

                        delete dashboard.shared_with_edit;
                        delete dashboard.shared_with_view;
                        delete dashboard.shared_email_view;
                        delete dashboard.shared_email_edit;
                        delete dashboard.shared_user_groups_edit;
                        delete dashboard.shared_user_groups_view;

                        dashboard.widgets = widgetsMeta[0] || [];
                        dashboard.apps = widgetsMeta[1] || [];

                        done();
                    });
                }, function(e) {
                    if (e) {
                        return common.returnOutput(params, []);
                    }
                    common.returnOutput(params, dashboards);
                });
            });
        });

        return true;
    });

    plugins.register("/o/dashboards/widget-layout", function(ob) {
        var params = ob.params;

        validateRead(params, FEATURE_NAME, function() {

            var dashboardId = params.qstring.dashboard_id;

            common.db.collection("dashboards").findOne({_id: common.db.ObjectID(dashboardId)}, {widgets: 1}, function(err, dashboard) {
                if (err || !dashboard) {
                    //Error
                }
                else {
                    common.db.collection("widgets").find({_id: {$in: dashboard.widgets}}, {_id: 1, position: 1, size: 1}).toArray(function(er, widgets) {
                        common.returnOutput(params, widgets || []);
                    });
                }
            });

        });

        return true;
    });

    plugins.register("/i/dashboards/create", function(ob) {
        var params = ob.params;

        validateCreate(params, FEATURE_NAME, function() {
            var dashboardName = params.qstring.name,
                sharedEmailEdit = params.qstring.shared_email_edit || [],
                sharedEmailView = params.qstring.shared_email_view || [],
                sharedUserGroupEdit = params.qstring.shared_user_groups_edit || [],
                sharedUserGroupView = params.qstring.shared_user_groups_view || [],
                theme = params.qstring.theme || 1,
                memberId = params.member._id + "",
                shareWith = params.qstring.share_with || "",
                copyDashId = params.qstring.copy_dash_id;

            try {
                sharedEmailEdit = JSON.parse(sharedEmailEdit);
            }
            catch (SyntaxError) {
                log.d('Parse shared_email_edit failed', sharedEmailEdit);
            }

            try {
                sharedEmailView = JSON.parse(sharedEmailView);
            }
            catch (SyntaxError) {
                log.d('Parse shared_email_view failed', sharedEmailView);
            }

            try {
                sharedUserGroupEdit = JSON.parse(sharedUserGroupEdit);
            }
            catch (SyntaxError) {
                log.d('Parse shared_user_groups_edit failed', sharedUserGroupEdit);
            }

            try {
                sharedUserGroupView = JSON.parse(sharedUserGroupView);
            }
            catch (SyntaxError) {
                log.d('Parse shared_user_groups_view failed', sharedUserGroupView);
            }

            if (!dashboardName) {
                common.returnMessage(params, 400, 'Missing parameter: name');
                return true;
            }

            if (!shareWith.length) {
                common.returnMessage(params, 400, 'Missing parameter: share_with');
                return true;
            }

            if (!Array.isArray(sharedEmailEdit)) {
                common.returnMessage(params, 400, 'Parameter needs to be an array: shared_email_edit');
                return true;
            }

            if (!Array.isArray(sharedEmailView)) {
                common.returnMessage(params, 400, 'Parameter needs to be an array: shared_email_view');
                return true;
            }

            if (!Array.isArray(sharedUserGroupEdit)) {
                common.returnMessage(params, 400, 'Parameter needs to be an array: shared_user_groups_edit');
                return true;
            }

            if (!Array.isArray(sharedUserGroupView)) {
                common.returnMessage(params, 400, 'Parameter needs to be an array: shared_user_groups_view');
                return true;
            }

            if (shareWith === "all-users" || shareWith === "none") {
                sharedEmailEdit = [];
                sharedEmailView = [];
                sharedUserGroupEdit = [];
                sharedUserGroupView = [];
            }

            var sharing = checkSharingStatus(params.member, shareWith, sharedEmailEdit, sharedEmailView, sharedUserGroupEdit, sharedUserGroupView);

            if (!sharing) {
                common.returnOutput(params, {error: true, sharing_denied: true});
                return true;
            }

            var seriesTasks = [];
            var dataWrapper = {};

            if (copyDashId) {
                seriesTasks.push(fetchWidgetIdsByDashboardId.bind(null, copyDashId, dataWrapper));
                seriesTasks.push(fetchWidgetsById.bind(null, dataWrapper));
                seriesTasks.push(insertNewWidgets.bind(null, dataWrapper));
            }

            seriesTasks.push(insertDashboards.bind(null, dataWrapper));

            async.series(seriesTasks, function(err) {
                if (err) {
                    return common.returnMessage(params, 500, "Failed to create dashboard");
                }

                var dashId = dataWrapper.dashboard_id;

                common.returnOutput(params, dashId);
            });

            /**
             * Function to insert dashbaords
             * @param  {Object} dataObj - wrapper to hold data
             * @param  {Function} callback - callback function
             */
            function insertDashboards(dataObj, callback) {
                var dashData = {
                    name: dashboardName,
                    owner_id: memberId,
                    share_with: shareWith,
                    shared_email_edit: sharedEmailEdit,
                    shared_email_view: sharedEmailView,
                    shared_user_groups_edit: sharedUserGroupEdit,
                    shared_user_groups_view: sharedUserGroupView,
                    theme: theme
                };

                var widgets = dataObj.newWidgetIds;
                if (widgets && widgets.length) {
                    dashData.widgets = widgets;
                }

                common.db.collection("dashboards").insert(dashData, function(err, result) {
                    if (!err && result && result.insertedIds && result.insertedIds[0]) {
                        dataObj.dashboard_id = result.insertedIds[0];
                        plugins.dispatch("/systemlogs", {params: params, action: "dashboard_added", data: dashData});
                        return callback(err, result.insertedIds[0]);
                    }

                    callback(err);
                }
                );
            }

            /**
             * Function to fetch widget ids by dashboard id
             * @param  {String} dashboardId - dashboard id
             * @param  {Object} dataObj - wrapper to hold data
             * @param  {Function} callback - callback function
             */
            function fetchWidgetIdsByDashboardId(dashboardId, dataObj, callback) {
                common.db.collection("dashboards").findOne({_id: common.db.ObjectID(dashboardId)}, function(err, dashboard) {
                    if (err) {
                        return callback(err);
                    }

                    hasViewAccessToDashboard(params.member, dashboard, function(er, status) {
                        if (er || !status) {
                            return callback(new Error("Access denied"));
                        }

                        dataObj.widgetIds = dashboard.widgets;
                        callback();
                    });
                });
            }

            /**
             * Function to fetch widgets by id
             * @param  {Object} dataObj - Wrapper to hold data
             * @param  {Function} callback - callback function
             * @returns {Function} callback
             */
            function fetchWidgetsById(dataObj, callback) {
                var widgetIds = dataObj.widgetIds || [];

                if (!widgetIds.length) {
                    return callback();
                }

                common.db.collection("widgets").find({_id: { $in: widgetIds }}, { _id: 0}).toArray(function(err, widget) {
                    if (err) {
                        return callback(err);
                    }

                    dataObj.widgets = widget;
                    callback(null);
                });
            }

            /**
             * Function to insert new widgets
             * @param  {Object} dataObj - wrapper to hold data
             * @param  {Function} callback - callback function
             * @returns {Function} callback
             */
            function insertNewWidgets(dataObj, callback) {
                var widgets = dataObj.widgets || [];

                if (!widgets.length) {
                    return callback();
                }

                widgets.forEach(function(widget) {
                    plugins.dispatch("/systemlogs", {params: params, action: "widget_added", data: widget});
                });

                common.db.collection("widgets").insertMany(widgets, function(err, result) {
                    if (err) {
                        err = err || new Error("Insert new widgets failed");
                        return callback(err);
                    }

                    var newWidgetIds = [];
                    Object.keys(result.insertedIds).forEach(function(key) {
                        newWidgetIds.push(result.insertedIds[key]);
                    });
                    dataObj.newWidgetIds = newWidgetIds;
                    callback();
                });
            }
        });

        return true;
    });

    plugins.register("/i/dashboards/update", function(ob) {
        var params = ob.params;

        validateUpdate(params, FEATURE_NAME, function() {
            var dashboardId = params.qstring.dashboard_id,
                dashboardName = params.qstring.name,
                sharedEmailEdit = params.qstring.shared_email_edit,
                sharedEmailView = params.qstring.shared_email_view,
                sharedUserGroupEdit = params.qstring.shared_user_groups_edit,
                sharedUserGroupView = params.qstring.shared_user_groups_view,
                theme = params.qstring.theme || 1,
                shareWith = params.qstring.share_with || "",
                memberId = params.member._id + "";

            if (!dashboardId || dashboardId.length !== 24) {
                common.returnMessage(params, 400, 'Invalid parameter: dashboard_id');
                return true;
            }

            if (!dashboardName) {
                common.returnMessage(params, 400, 'Missing parameter: name');
                return true;
            }

            if (!shareWith.length) {
                common.returnMessage(params, 400, 'Missing parameter: share_with');
                return true;
            }

            if (sharedEmailEdit) {
                try {
                    sharedEmailEdit = JSON.parse(sharedEmailEdit);
                }
                catch (SyntaxError) {
                    log.d('Parse shared_email_edit failed', sharedEmailEdit);
                }

                if (!Array.isArray(sharedEmailEdit)) {
                    common.returnMessage(params, 400, 'Parameter needs to be an array: shared_email_edit');
                    return true;
                }
            }

            if (sharedEmailView) {
                try {
                    sharedEmailView = JSON.parse(sharedEmailView);
                }
                catch (SyntaxError) {
                    log.d('Parse shared_email_view failed', sharedEmailView);
                }

                if (!Array.isArray(sharedEmailView)) {
                    common.returnMessage(params, 400, 'Parameter needs to be an array: shared_email_view');
                    return true;
                }
            }

            if (sharedUserGroupEdit) {
                try {
                    sharedUserGroupEdit = JSON.parse(sharedUserGroupEdit);
                }
                catch (SyntaxError) {
                    log.d('Parse shared_user_groups_edit failed', sharedUserGroupEdit);
                }

                if (!Array.isArray(sharedUserGroupEdit)) {
                    common.returnMessage(params, 400, 'Parameter needs to be an array: shared_user_groups_edit');
                    return true;
                }
            }

            if (sharedUserGroupView) {
                try {
                    sharedUserGroupView = JSON.parse(sharedUserGroupView);
                }
                catch (SyntaxError) {
                    log.d('Parse shared_user_groups_view failed', sharedUserGroupView);
                }

                if (!Array.isArray(sharedUserGroupView)) {
                    common.returnMessage(params, 400, 'Parameter needs to be an array: shared_user_groups_view');
                    return true;
                }
            }

            var filterCond = {
                _id: common.db.ObjectID(dashboardId)
            };

            if (!params.member.global_admin) {
                filterCond.owner_id = memberId;
            }

            var shartingStatus = plugins.getConfig("dashboards").sharing_status;
            var isGlobalAdmin = params.member.global_admin;
            var restrict = params.member.restrict || [];
            var sharing = true;
            sharing = shartingStatus || (isGlobalAdmin && (restrict.indexOf("#/manage/configurations") < 0));

            if (shareWith === "all-users" || shareWith === "none") {
                sharedEmailEdit = [];
                sharedEmailView = [];
                sharedUserGroupEdit = [];
                sharedUserGroupView = [];
            }

            common.db.collection("dashboards").findOne({_id: common.db.ObjectID(dashboardId)}, function(err, dashboard) {
                if (err || !dashboard) {
                    common.returnMessage(params, 400, "Dashboard with the given id doesn't exist");
                }
                else {
                    hasViewAccessToDashboard(params.member, dashboard, function(er, status) {
                        if (er || !status) {
                            return common.returnOutput(params, {error: true, dashboard_access_denied: true});
                        }

                        var changedFields = {
                            name: dashboardName,
                            theme: theme
                        };

                        if (sharing) {
                            changedFields.share_with = shareWith;

                            if (sharedEmailEdit) {
                                changedFields.shared_email_edit = sharedEmailEdit;
                            }

                            if (sharedEmailView) {
                                changedFields.shared_email_view = sharedEmailView;
                            }

                            if (sharedUserGroupEdit) {
                                changedFields.shared_user_groups_edit = sharedUserGroupEdit;
                            }

                            if (sharedUserGroupView) {
                                changedFields.shared_user_groups_view = sharedUserGroupView;
                            }
                        }

                        common.db.collection("dashboards").update(
                            filterCond,
                            {
                                $set: changedFields,
                                $unset: {shared_with_view: "", shared_with_edit: ""}
                            },
                            function(e, res) {
                                if (!e && res) {
                                    plugins.dispatch("/systemlogs", {params: params, action: "dashboard_edited", data: {before: dashboard, update: changedFields}});
                                    common.returnOutput(params, res);
                                }
                                else {
                                    common.returnMessage(params, 500, "Failed to update dashboard");
                                }
                            }
                        );
                    });
                }
            });
        });

        return true;
    });

    plugins.register("/i/dashboards/delete", function(ob) {
        var params = ob.params;

        validateDelete(params, FEATURE_NAME, function() {
            var dashboardId = params.qstring.dashboard_id,
                memberId = params.member._id + "";

            if (!dashboardId || dashboardId.length !== 24) {
                common.returnMessage(params, 400, 'Invalid parameter: dashboard_id');
                return true;
            }

            var filterCond = {
                _id: common.db.ObjectID(dashboardId)
            };

            if (!params.member.global_admin) {
                filterCond.owner_id = memberId;
            }

            common.db.collection("dashboards").findOne({_id: common.db.ObjectID(dashboardId)}, function(err, dashboard) {
                if (err || !dashboard) {
                    common.returnMessage(params, 400, "Dashboard with the given id doesn't exist");
                }
                else {
                    hasViewAccessToDashboard(params.member, dashboard, function(er, status) {
                        if (er || !status) {
                            return common.returnOutput(params, {error: true, dashboard_access_denied: true});
                        }

                        common.db.collection("dashboards").remove(
                            filterCond,
                            function(error, result) {
                                if (!error && result) {
                                    if (result && result.result && result.result.n === 1) {
                                        plugins.dispatch("/systemlogs", {params: params, action: "dashboard_deleted", data: dashboard});
                                    }
                                    common.returnOutput(params, result);
                                }
                                else {
                                    common.returnMessage(params, 500, "Failed to delete dashboard");
                                }
                            }
                        );
                    });
                }
            });
        });

        return true;
    });

    plugins.register("/i/dashboards/add-widget", function(ob) {
        var params = ob.params;

        validateUpdate(params, FEATURE_NAME, function() {

            var dashboardId = params.qstring.dashboard_id,
                widget = params.qstring.widget || {};

            try {
                widget = JSON.parse(widget);
            }
            catch (SyntaxError) {
                log.d('Parse widget failed', widget);
            }

            if (!dashboardId || dashboardId.length !== 24) {
                common.returnMessage(params, 400, 'Invalid parameter: dashboard_id');
                return true;
            }

            if (!isWidgetValid(widget)) {
                common.returnMessage(params, 400, 'Invalid parameter: widget');
                return true;
            }

            common.db.collection("dashboards").findOne({_id: common.db.ObjectID(dashboardId)}, function(err, dashboard) {
                if (err || !dashboard) {
                    common.returnMessage(params, 400, "Dashboard with the given id doesn't exist");
                }
                else {
                    async.parallel([
                        hasEditAccessToDashboard.bind(null, params.member, dashboard),
                        hasViewAccessToDashboard.bind(null, params.member, dashboard)
                    ], function(error, results) {
                        var hasEditAccess = results[0];
                        var hasViewAccess = results[1];

                        if (hasEditAccess) {
                            common.db.collection("widgets").insert(widget, function(er, result) {
                                if (!er && result && result.insertedIds && result.insertedIds[0]) {
                                    var newWidgetId = result.insertedIds[0];
                                    plugins.dispatch("/systemlogs", {params: params, action: "widget_added", data: widget});
                                    common.db.collection("dashboards").update({_id: common.db.ObjectID(dashboardId)}, {'$addToSet': {widgets: newWidgetId}}, function() {});
                                    common.returnOutput(params, newWidgetId);
                                }
                                else {
                                    common.returnMessage(params, 500, "Failed to create widget");
                                }
                            });
                        }
                        else if (hasViewAccess) {
                            common.returnOutput(params, {error: true, edit_access_denied: true});
                        }
                        else {
                            common.returnOutput(params, {error: true, dashboard_access_denied: true});
                        }
                    });
                }
            });

        });

        return true;
    });

    plugins.register("/i/dashboards/update-widget", function(ob) {
        var params = ob.params;

        validateUpdate(params, FEATURE_NAME, function() {

            var dashboardId = params.qstring.dashboard_id,
                widgetId = params.qstring.widget_id,
                widget = params.qstring.widget || {};

            try {
                widget = JSON.parse(widget);
            }
            catch (SyntaxError) {
                log.d('Parse widget failed', widget);
            }

            if (!dashboardId || dashboardId.length !== 24) {
                common.returnMessage(params, 400, 'Invalid parameter: dashboard_id');
                return true;
            }

            if (!widgetId || widgetId.length !== 24) {
                common.returnMessage(params, 400, 'Invalid parameter: widget_id');
                return true;
            }

            common.db.collection("dashboards").findOne({_id: common.db.ObjectID(dashboardId)}, function(err, dashboard) {
                if (err || !dashboard) {
                    common.returnMessage(params, 400, "Dashboard with the given id doesn't exist");
                }
                else {
                    async.parallel([
                        hasEditAccessToDashboard.bind(null, params.member, dashboard),
                        hasViewAccessToDashboard.bind(null, params.member, dashboard)
                    ], function(error, results) {
                        var hasEditAccess = results[0];
                        var hasViewAccess = results[1];

                        if (hasEditAccess) {
                            common.db.collection("widgets").findAndModify({_id: common.db.ObjectID(widgetId)}, {}, {$set: widget}, {new: false}, function(er, result) {
                                if (er || !result || !result.value) {
                                    common.returnMessage(params, 500, "Failed to update widget");
                                }
                                else {
                                    plugins.dispatch("/systemlogs", {params: params, action: "widget_edited", data: {before: result.value, update: widget}});
                                    common.returnMessage(params, 200, 'Success');
                                }
                            });
                        }
                        else if (hasViewAccess) {
                            common.returnOutput(params, {error: true, edit_access_denied: true});
                        }
                        else {
                            common.returnOutput(params, {error: true, dashboard_access_denied: true});
                        }
                    });
                }
            });

        });

        return true;
    });

    plugins.register("/i/dashboards/remove-widget", function(ob) {
        var params = ob.params;

        validateDelete(params, FEATURE_NAME, function() {

            var dashboardId = params.qstring.dashboard_id,
                widgetId = params.qstring.widget_id,
                widget = params.qstring.widget || {};

            try {
                widget = JSON.parse(widget);
            }
            catch (SyntaxError) {
                log.d('Parse widget failed', widget);
            }

            if (!dashboardId || dashboardId.length !== 24) {
                common.returnMessage(params, 400, 'Invalid parameter: dashboard_id');
                return true;
            }

            if (!widgetId || widgetId.length !== 24) {
                common.returnMessage(params, 400, 'Invalid parameter: widget_id');
                return true;
            }

            common.db.collection("dashboards").findOne({_id: common.db.ObjectID(dashboardId)}, function(err, dashboard) {
                if (err || !dashboard) {
                    common.returnMessage(params, 400, "Dashboard with the given id doesn't exist");
                }
                else {
                    async.parallel([
                        hasEditAccessToDashboard.bind(null, params.member, dashboard),
                        hasViewAccessToDashboard.bind(null, params.member, dashboard)
                    ], function(error, results) {
                        var hasEditAccess = results[0];
                        var hasViewAccess = results[1];

                        if (hasEditAccess) {
                            common.db.collection("dashboards").update({_id: common.db.ObjectID(dashboardId)}, { $pull: {widgets: common.db.ObjectID(widgetId)}}, function(dashboardErr) {
                                if (!dashboardErr) {
                                    common.db.collection("widgets").findAndModify({_id: common.db.ObjectID(widgetId)}, {}, {}, {remove: true}, function(widgetErr, widgetResult) {
                                        if (widgetErr || !widgetResult || !widgetResult.value) {
                                            common.returnMessage(params, 500, "Failed to remove widget");
                                        }
                                        else {
                                            plugins.dispatch("/systemlogs", {params: params, action: "widget_deleted", data: widgetResult.value});
                                            common.returnMessage(params, 200, 'Success');
                                        }
                                    });
                                }
                                else {
                                    common.returnMessage(params, 500, "Failed to remove widget");
                                }
                            });
                        }
                        else if (hasViewAccess) {
                            common.returnOutput(params, {error: true, edit_access_denied: true});
                        }
                        else {
                            common.returnOutput(params, {error: true, dashboard_access_denied: true});
                        }
                    });
                }
            });

        });

        return true;
    });

    plugins.register("/email/report", function(ob) {
        return new Promise((resolve) => {
            var params = ob.params;
            var db = params.db;
            var report = params.report;
            var moment = params.moment;
            var member = params.member;

            versionInfo.page = (!versionInfo.title) ? "http://count.ly" : null;
            versionInfo.title = versionInfo.title || "Countly";

            if (report.report_type === "dashboards") {
                var dashboardId = report.dashboards;
                validateDashboardId(dashboardId, function(err, dashboard) {
                    if (!dashboard || !dashboard.name) {
                        return resolve();
                    }

                    var dashboardName = dashboard.name;
                    authorize.save({
                        db: db,
                        multi: false,
                        owner: report.user,
                        purpose: "LoginAuthToken",
                        temporary: true,
                        ttl: 300, //5 minutes
                        callback: function(er, token) {
                            if (er) {
                                return resolve();
                            }

                            ip.getHost(function(e, host) {
                                host = host + common.config.path;
                                var randomString = (+new Date()).toString() + (Math.random()).toString();
                                var imageName = "screenshot_" + common.sha1Hash(randomString) + ".png";
                                var savePath = "../frontend/public/images/screenshots/" + imageName;
                                var options = {};
                                options.report = report;
                                options.view = "/dashboard?ssr=true#" + "/custom/" + report.dashboards; //Set ssr=true (server side rendering)
                                options.savePath = path.resolve(__dirname, savePath);
                                options.dimensions = {width: 750, padding: 100};
                                options.token = token;
                                options.source = "dashboards/" + imageName;
                                options.timeout = 60000;
                                options.cbFn = function(opt) {
                                    var rep = opt.report || {};
                                    var reportDateRange = rep.date_range || "30days";
                                    var reportTimeObj = rep.timeObj;
                                    // eslint-disable-next-line no-undef
                                    var $ = window.$;
                                    $("#date-selector .date-selector[id='" + reportDateRange + "']").trigger("click");
                                    $("body").css({ "min-width": "0px" });
                                    $("html").alterClass('theme-*', 'theme-5');
                                    $("#fullscreen, #fullscreen-alt").trigger("click");
                                    $("#dashboards #fullscreen").remove();
                                    $("#dashboards .logo.full-screen").remove();
                                    $("#dashboards #dashboard-name").addClass("remove-before");
                                    $("#dashboards #add-widget-button-group").remove();
                                    $("#dashboards #date-selector").html("<div style='margin:8px 0px 0px 2px; font-size:18px;'>" + reportTimeObj.date + "</div>");
                                    $("#dashboards .live").parents(".grid-stack-item").hide();
                                    $("html.theme-5 body, html.full-screen.theme-5").css("background-color", "#fff");
                                    $(".number").parents(".grid-stack-item").css("height", "220");
                                    $(".number .spark").hide();
                                };

                                options.beforeScrnCbFn = function() {
                                    // eslint-disable-next-line no-undef
                                    var $ = window.$;
                                    $(".funnels table colgroup col:first-child").width("145px");
                                    $(".funnels table colgroup col:last-child").width("80px");
                                };

                                options.waitForRegex = new RegExp(/o\/dashboards?/gi);

                                formatDate(report, moment);

                                render.renderView(options, function(error) {
                                    if (error) {
                                        return resolve();
                                    }

                                    report.imageName = imageName;
                                    report.mailTemplate = "/templates/email.html";

                                    process();

                                    /**
                                     * Function to process email template
                                     */
                                    function process() {
                                        var dir = path.resolve(__dirname, '../frontend/public');
                                        fs.readFile(dir + report.mailTemplate, 'utf8', function(pErr, template) {
                                            if (pErr) {
                                                return resolve();
                                            }

                                            member.lang = member.lang || "en";
                                            localize.getProperties(member.lang, function(gpErr, props) {
                                                if (gpErr) {
                                                    return resolve();
                                                }

                                                props["reports.report"] = localize.format(props["reports.report"], versionInfo.title);
                                                report.properties = props;

                                                var image = {
                                                    name: report.imageName
                                                };

                                                var message = ejs.render(template, {"host": host, "report": report, "version": versionInfo, "properties": props, "image": image});

                                                var sDate = new Date();
                                                sDate.setHours(23, 59);
                                                var startDate = new Date(sDate.getTime());
                                                var monthName = moment.localeData().monthsShort(moment([0, startDate.getMonth()]), "");
                                                var date = startDate.getDate() + " " + monthName;

                                                report.subject = versionInfo.title + ": " + localize.format(props["dashboards.email-subject"], dashboardName, date);

                                                report.data = {
                                                    "host": host,
                                                    "report": report,
                                                    "version": versionInfo,
                                                    "properties": props,
                                                    "message": message
                                                };

                                                resolve();
                                            });
                                        });
                                    }
                                });
                            });
                        }
                    });
                });
            }
            else {
                resolve();
            }
        });
    });

    plugins.register("/report/verify", function(ob) {
        return new Promise((resolve) => {
            var report = ob.report;

            if (report.report_type === "dashboards") {
                var dashboardId = report.dashboards;
                validateDashboardId(dashboardId, function(err, dashboard) {
                    report.isValid = dashboard && dashboard.name ? true : false;
                    resolve();
                });
            }
            else {
                resolve();
            }
        });
    });

    plugins.register("/report/authorize", function(ob) {
        return new Promise((resolve) => {
            var params = ob.params;
            var report = ob.report;

            if (report.report_type === "dashboards") {
                var dashboardId = report.dashboards;
                common.db.collection("dashboards").findOne({_id: common.db.ObjectID(dashboardId)}, function(err, dashboard) {
                    if (err) {
                        log.d("Some error occured while fetching report dashboard.", err);
                        return resolve();
                    }

                    if (!dashboard) {
                        log.d("Report dashboard not available to authorize.");
                        return resolve();
                    }

                    hasViewAccessToDashboard(params.member, dashboard, function(er, status) {
                        report.authorized = status ? true : false;
                        resolve();
                    });
                });
            }
            else {
                resolve();
            }
        });
    });

    plugins.register("/i/users/delete", function(ob) {
        var email = ob.data.email + "";
        common.db.collection('dashboards').update({}, {$pull: {shared_email_edit: email, shared_email_view: email}}, {multi: true}, function() {});
    });

    /**
     * Function to fetch widget meta
     * @param  {object} params - params object
     * @param  {Array} widgetIds - widget id array
     * @param  {Function} callback - callback function
     */
    function fetchWidgetsMeta(params, widgetIds = [], callback) {
        common.db.collection("widgets").find({_id: {$in: widgetIds}}).toArray(function(e, widgets = []) {
            if (e) {
                log.d("Could not fetch widgets", e, widgetIds);
            }

            var appIds = [],
                appObjIds = [];

            for (let i = 0; i < widgets.length; i++) {
                for (var j = 0; j < widgets[i].apps.length; j++) {
                    if (appIds.indexOf(widgets[i].apps[j]) === -1) {
                        appIds.push(widgets[i].apps[j]);
                    }
                }
            }

            for (let i = 0; i < appIds.length; i++) {
                appObjIds.push(common.db.ObjectID(appIds[i]));
            }

            common.db.collection("apps").find({_id: {$in: appObjIds}}, {name: 1}).toArray(function(er, apps = []) {
                if (er) {
                    return callback(er);
                }

                return callback(null, [widgets, apps]);
            });
        });
    }
    /**
     * Function to fetch shared members
     * @param  {Array} ids - ids array
     * @param  {Array} emails - emails array
     * @param  {Function} callback - callback function
     */
    function fetchSharedMembers(ids, emails, callback) {
        var dashboardUserIds = [];
        for (var i = 0; i < ids.length; i++) {
            dashboardUserIds.push(common.db.ObjectID(ids[i]));
        }

        common.db.collection("members").find({$or: [{_id: { $in: dashboardUserIds }}, {email: { $in: emails }} ]}, {_id: 1, full_name: 1, email: 1}).toArray(function(err, users) {
            return callback(null, users);
        });
    }

    /**
     * Function to validate dashboard id
     * @param  {String} dashboardId - dashboard id
     * @param  {Function} cb - callback function
     */
    function validateDashboardId(dashboardId, cb) {
        common.db.collection("dashboards").findOne({_id: common.db.ObjectID(dashboardId)}, function(err, dashboard) {
            if (err || !dashboard) {
                return cb(err, false);
            }

            return cb(null, dashboard);
        });
    }

    /**
     * Function to validate widget
     * @param  {Object} widget - widget object
     * @returns {Boolean} widget valid status
     */
    function isWidgetValid(widget) {
        var requiredProps = ["widget_type", "apps"];

        for (var i = 0; i < requiredProps.length; i++) {
            if (widget[requiredProps[i]] === undefined) {
                return false;
            }
        }

        return true;
    }

    // /**
    //  * Function to sanitize widget
    //  * @param  {Object} widget - widget object
    //  * @returns {Object} widget
    //  */
    // function sanitizeWidget(widget) {
    //     var allowedProps = ["widget_type", "data_type", "apps", "title", "position", "size", "events", "breakdowns", "metrics", "bar_color"];

    //     for (var widgetProp in widget) {
    //         if (allowedProps.indexOf(widgetProp) == -1) {
    //             delete widget[widgetProp];
    //         }
    //     }

    //     return widget;
    // }

    /**
     * Function to check if member has view access to the dashboard
     * @param  {Object} member - user
     * @param  {Object} dashboard - dashboard object
     * @param  {Function} cb - callback function
     * @returns {Boolean} view access status
     */
    function hasViewAccessToDashboard(member, dashboard, cb) {
        var memberGroupIds = member.group_id || [];

        if (!dashboard) {
            return cb(null, false);
        }

        if (dashboard.share_with === "all-users") {
            return cb(null, true);
        }

        if (member.global_admin) {
            return cb(null, true);
        }

        if (member._id + "" === dashboard.owner_id) {
            return cb(null, true);
        }

        if (dashboard.share_with === "none") {
            return cb(null, false);
        }

        //shared_with_view and shared_with_view were used before when we saved member ids
        //Later we shifted to saving email ids and these old keys are used just for backward compaitibility
        //Although they are unset on dashbaord update, but remove them once all clients are on updated dashboards model

        if ((Array.isArray(dashboard.shared_with_view) && dashboard.shared_with_view.indexOf(member._id + "") !== -1) ||
            (Array.isArray(dashboard.shared_email_view) && dashboard.shared_email_view.indexOf(member.email) !== -1)) {
            return cb(null, true);
        }

        if ((Array.isArray(dashboard.shared_with_edit) && dashboard.shared_with_edit.indexOf(member._id + "") !== -1) ||
            (Array.isArray(dashboard.shared_email_edit) && dashboard.shared_email_edit.indexOf(member.email) !== -1)) {
            return cb(null, true);
        }

        if (Array.isArray(dashboard.shared_user_groups_edit)) {
            for (let i = 0; i < dashboard.shared_user_groups_edit.length; i++) {
                if (memberGroupIds.indexOf(dashboard.shared_user_groups_edit[i]) !== -1) {
                    return cb(null, true);
                }
            }
        }

        if (Array.isArray(dashboard.shared_user_groups_view)) {
            for (let i = 0; i < dashboard.shared_user_groups_view.length; i++) {
                if (memberGroupIds.indexOf(dashboard.shared_user_groups_view[i]) !== -1) {
                    return cb(null, true);
                }
            }
        }

        return cb(null, false);
    }

    /**
     * Function to check if member has edit access to dashboard
     * @param  {Object} member - user
     * @param  {Object} dashboard - dashboard object
     * @param  {Function} cb - callback function
     * @returns {Boolean} edit access status
     */
    function hasEditAccessToDashboard(member, dashboard, cb) {
        var memberGroupIds = member.group_id || [];

        if (member.global_admin) {
            return cb(null, true);
        }

        if (member._id + "" === dashboard.owner_id) {
            return cb(null, true);
        }

        if (dashboard.share_with === "none") {
            return cb(null, false);
        }

        if ((Array.isArray(dashboard.shared_with_edit) && dashboard.shared_with_edit.indexOf(member._id + "") !== -1) ||
            (Array.isArray(dashboard.shared_email_edit) && dashboard.shared_email_edit.indexOf(member.email) !== -1)) {
            return cb(null, true);
        }

        if (Array.isArray(dashboard.shared_user_groups_edit)) {
            for (let i = 0; i < dashboard.shared_user_groups_edit.length; i++) {
                if (memberGroupIds.indexOf(dashboard.shared_user_groups_edit[i]) !== -1) {
                    return cb(null, true);
                }
            }
        }

        return cb(null, false);
    }

    /**
     * Function to check sharing status
     * @param  {Object} member - user
     * @param  {String} shareWith - sharing info
     * @param  {Array} sharedEmailEdit - shared to edit
     * @param  {Array} sharedEmailView - shared to view
     * @param  {Array} sharedUserGroupEdit - shared user groups to edit
     * @param  {Array} sharedUserGroupView - shared user groups to view
     * @returns {Boolean} sharing status 
     */
    function checkSharingStatus(member, shareWith, sharedEmailEdit, sharedEmailView, sharedUserGroupEdit, sharedUserGroupView) {
        var globalAdmin = member.global_admin;
        var restrict = member.restrict || [];
        var shartingStatus = plugins.getConfig("dashboards").sharing_status;
        var sharing = true;

        if ((shareWith === "all-users") ||
            (shareWith === "selected-users" && (sharedEmailEdit.length || sharedEmailView.length || sharedUserGroupEdit.length || sharedUserGroupView.length))) {
            sharing = shartingStatus || (globalAdmin && (restrict.indexOf("#/manage/configurations") < 0));
        }

        return sharing;
    }

    /**
     * Function to check if user can see the sharing status
     * @param  {Object} member - user
     * @param  {Object} dashboard - dashbaord object
     * @returns {Boolean} visible sharing status
     */
    function canSeeDashboardShares(member, dashboard) {
        if (member.global_admin) {
            return true;
        }

        if (member._id + "" === dashboard.owner_id) {
            return true;
        }

        return false;
    }

    plugins.register("/export", async function({plugin, selectedIds, app_id, params}) {
        if (plugin === "dashboards") {
            const data = await exportPlugin(selectedIds, app_id, params);
            return data;
        }
    });


    plugins.register("/import/validate", function({params, pluginData, pluginName}) {
        if (pluginName.startsWith('dashboard')) {
            return validateImport(params, pluginData);
        }
        else {
            return false;
        }
    });

    plugins.register("/import", async function({params, importData}) {
        if (importData.name === 'dashboards') {
            await importDashboard(params, importData);
            return true;
        }
        else if (importData.name === 'dashboard.widgets') {
            await importWidgets(params, importData);
            return true;
        }
        return false;
    });

    /**
     * Export Plugin data for given array  of ids
     * 
     * @param {String[]} ids ids of documents to be exported
     * @param {String} app_id app id
     * @param {Object<params>} params params Object
     * @returns {Promise<{name:string, data: Object, dependencies: Object[]}>} Export Data 
     */
    async function exportPlugin(ids, app_id, params) {
        let dependencies = [];
        let dashboards = await common.db.collection("dashboards").find({_id: {$in: ids.map(id=>common.db.ObjectID(id)) }}).toArray();
        let widgetIds = dashboards.map(dash => {
            dash.owner_id = "OWNER_ID";
            if (dash.widgets && dash.widgets.length) {
                return dash.widgets;
            }
        });
        widgetIds = widgetIds.reduce((acc, val)=>acc.concat(val), []); // make unique
        let widgets = await common.db.collection("widgets").find({_id: {$in: widgetIds }}).toArray();
        widgets.forEach(widget=>{
            widget.apps = ['APP_ID']; // single app export only
        });
        dependencies.push({
            name: 'dashboard.widgets',
            data: widgets,
            dependencies: []
        });
        let fetchedDependencies = await extractAndFetchDependencies(app_id, widgets, params);
        dependencies = dependencies.concat(fetchedDependencies);

        return {
            name: 'dashboards',
            data: dashboards,
            dependencies: dependencies
        };
    }

    /**
     * @param {String} app_id app id
     * @param {Object<Widget>[]} widgets Widgets
     * @param {Object} params params object
     */
    async function extractAndFetchDependencies(app_id, widgets, params) {
        let dependencies = [];
        let appIds = [];
        await Promise.all(widgets.map(async widget=>{
            appIds = appIds.concat(widget.apps);
            switch (widget.widget_type) {
            case 'funnels': {
                let funnelIds = [];
                try {
                    widget.funnel_type.forEach(ftype=>{
                        let index = ftype.indexOf("***");
                        if (index > -1) {
                            funnelIds.push(ftype.substring(index + 3));
                        }
                    });
                }
                catch (e) {
                    // ignore
                }
                if (funnelIds.length) {
                    let funnels = await params.fetchDependencies(app_id, funnelIds, 'funnels', params);
                    dependencies.push(...funnels);
                }
                break;
            }
            case 'drill': {
                let drillIds = widget.drill_report;
                if (drillIds.length) {
                    let longTasks = await params.fetchDependencies(app_id, drillIds, 'drill_reports', params);
                    dependencies.push(...longTasks);
                }
                break;
            }
            case 'cohorts': {
                let cohortIds = widget.cohorts;
                if (cohortIds.length) {
                    let cohorts = await params.fetchDependencies(app_id, cohortIds, 'cohorts', params);
                    dependencies.push(...cohorts);
                }
                break;
            }
            case 'formulas': {
                let formulaIds = widget.cmetrics;
                if (formulaIds.length) {
                    let longTasks = await params.fetchDependencies(app_id, formulaIds, 'formula_reports', params);
                    dependencies.push(...longTasks);
                }
                break;
            }
            default: {
                break;
            }
            }
        }));
        appIds = [...new Set(appIds)];
        let strDependencies = JSON.stringify(dependencies);
        appIds.forEach(appId=>{
            strDependencies.replace(appId, 'APP_ID');
        });
        return JSON.parse(strDependencies);
    }

    /**
     * Validation before import
     * 
     * @param {Object} params params object 
     * @param {Object} dashboard formula Object
     * @returns {Promise<Object>} validation result
    */
    function validateImport(params, dashboard) {
        return {
            code: 200,
            message: "success",
            data: {
                newId: common.db.ObjectID(),
                oldId: dashboard._id
            }
        };
    }

    /**
     * Insert Dashboard Objects
     * 
     * @param {Object} params params object
     * @param {Object} importData iomport data Object
     * @returns {Promise} promise array of all inserts
     */
    function importDashboard(params, importData) {
        return new Promise((resolve, reject)=>{
            importData.data._id = common.db.ObjectID(importData.data._id);
            importData.data.widgets = importData.data.widgets.map(id=>common.db.ObjectID(id));
            common.db.collection("dashboards").insert(importData.data, function(err, result) {
                if (!err && result && result.insertedIds && result.insertedIds[0]) {
                    plugins.dispatch("/systemlogs", {params: params, action: "dashboard_added", data: importData.data});
                    resolve();
                }
                else {
                    console.log("Failed to import dahsboard");
                    reject();
                }
            });
        });
    }
    /**
     * Insert Widget Objects
     * 
     * @param {Object} params params object
     * @param {Object} importData iomport data Object
     * @returns {Promise} promise array of all inserts
     */
    function importWidgets(params, importData) {
        return new Promise((resolve, reject)=>{
            importData.data._id = common.db.ObjectID(importData.data._id);
            common.db.collection("widgets").insert(importData.data, function(er, result) {
                if (!er && result && result.insertedIds && result.insertedIds[0]) {
                    plugins.dispatch("/systemlogs", {params: params, action: "widget_added", data: importData.data});
                    resolve();
                }
                else {
                    console.log("failed to import widgets for dashboard");
                    reject();
                }
            });
        });
    }
    /**
	 * Function to format date
     * @param  {Object} report - report object
     * @param  {Function} moment - moment function
     */
    function formatDate(report, moment) {
        report.date_range = report.date_range || "30days";
        var dateRange = report.date_range;

        var endDate = new Date();
        endDate.setHours(23, 59);
        var reportTimeObj = {};
        reportTimeObj.end = endDate.getTime();
        var startDate, monthName;
        switch (dateRange) {
        // case "month":
        //     startDate = new Date("1 Jan" + endDate.getFullYear());
        //     startDate.setHours(23, 59);
        //     monthName = moment.localeData().monthsShort(moment([0, startDate.getMonth()]), "");
        //     reportTimeObj.date = startDate.getDate()+" "+monthName;
        //     monthName = moment.localeData().monthsShort(moment([0, endDate.getMonth()]), "");
        //     reportTimeObj.date += " - "+endDate.getDate()+" "+monthName + ", " + endDate.getFullYear();
        //     break;
        // case "day":
        //     if(endDate.getDate() == 1){
        //         reportTimeObj.start = reportTimeObj.end;
        //         startDate = new Date(reportTimeObj.start);
        //         monthName = moment.localeData().monthsShort(moment([0, startDate.getMonth()]), "");
        //         reportTimeObj.date = startDate.getDate()+" "+monthName + ", " + endDate.getFullYear()
        //     }else{
        //         reportTimeObj.start = reportTimeObj.end - endDate.getDate()*24*60*59*1000;
        //         startDate = new Date(reportTimeObj.start);
        //         monthName = moment.localeData().monthsShort(moment([0, startDate.getMonth()]), "");
        //         reportTimeObj.date = startDate.getDate()+" "+monthName;
        //         monthName = moment.localeData().monthsShort(moment([0, endDate.getMonth()]), "");
        //         reportTimeObj.date += " - "+endDate.getDate()+" "+monthName + ", " + endDate.getFullYear();
        //     }
        //     break;
        case "yesterday":
            endDate = new Date();
            endDate.setDate(endDate.getDate() - 1);
            endDate.setHours(23, 59);
            reportTimeObj.end = endDate.getTime();
            reportTimeObj.start = reportTimeObj.end - 24 * 60 * 59 * 1000;
            startDate = new Date(reportTimeObj.start);
            monthName = moment.localeData().monthsShort(moment([0, startDate.getMonth()]), "");
            reportTimeObj.date = startDate.getDate() + " " + monthName + ", " + startDate.getFullYear();
            break;
            // case "hour":
            //     reportTimeObj.start = reportTimeObj.end;
            //     var startDate = new Date(reportTimeObj.start);
            //     monthName = moment.localeData().monthsShort(moment([0, startDate.getMonth()]), "");
            //     reportTimeObj.date = startDate.getDate()+" "+monthName + ", " + startDate.getFullYear();
            //     break;
        case "7days":
            reportTimeObj.start = reportTimeObj.end - 7 * 24 * 60 * 59 * 1000;
            startDate = new Date(reportTimeObj.start);
            monthName = moment.localeData().monthsShort(moment([0, startDate.getMonth()]), "");
            reportTimeObj.date = startDate.getDate() + " " + monthName + (startDate.getFullYear() !== endDate.getFullYear() ? ", " + startDate.getFullYear() : "");
            monthName = moment.localeData().monthsShort(moment([0, endDate.getMonth()]), "");
            reportTimeObj.date += " - " + endDate.getDate() + " " + monthName + ", " + endDate.getFullYear();
            break;
        case "30days":
            reportTimeObj.start = reportTimeObj.end - 30 * 24 * 60 * 59 * 1000;
            startDate = new Date(reportTimeObj.start);
            monthName = moment.localeData().monthsShort(moment([0, startDate.getMonth()]), "");
            reportTimeObj.date = startDate.getDate() + " " + monthName + (startDate.getFullYear() !== endDate.getFullYear() ? ", " + startDate.getFullYear() : "");
            monthName = moment.localeData().monthsShort(moment([0, endDate.getMonth()]), "");
            reportTimeObj.date += " - " + endDate.getDate() + " " + monthName + ", " + endDate.getFullYear();
            break;
        case "60days":
            reportTimeObj.start = reportTimeObj.end - 60 * 24 * 60 * 59 * 1000;
            startDate = new Date(reportTimeObj.start);
            monthName = moment.localeData().monthsShort(moment([0, startDate.getMonth()]), "");
            reportTimeObj.date = startDate.getDate() + " " + monthName + (startDate.getFullYear() !== endDate.getFullYear() ? ", " + startDate.getFullYear() : "");
            monthName = moment.localeData().monthsShort(moment([0, endDate.getMonth()]), "");
            reportTimeObj.date += " - " + endDate.getDate() + " " + monthName + ", " + endDate.getFullYear();
            break;
        default:
            break;
        }

        report.timeObj = reportTimeObj;
    }

}(pluginOb));

module.exports = pluginOb;