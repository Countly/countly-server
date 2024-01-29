var pluginOb = {},
    plugins = require('../../pluginManager.js'),
    common = require('../../../api/utils/common.js'),
    customDashboards = require('./parts/dashboards.js'),
    path = require('path'),
    fs = require('fs'),
    log = common.log('dashboards:api'),
    authorize = require('../../../api/utils/authorizer'),
    render = require('../../../api/utils/render'),
    versionInfo = require('../../../frontend/express/version.info'),
    ip = require("../../../api/parts/mgmt/ip"),
    localize = require('../../../api/utils/localization.js'),
    async = require('async'),
    mail = require("../../../api/parts/mgmt/mail"),
    { validateUser } = require('../../../api/utils/rights.js');

var ejs = require("ejs");

plugins.setConfigs("dashboards", {
    sharing_status: true
});

(function() {

    /**
     * @api {get} /o/dashboards Get dashboard
     * @apiName GetDashboard
     * @apiGroup Dashboards
     * @apiPermission user
     * @apiDescription Get all the widgets and app related information for the dashbaord
     *
     * @apiQuery {String} dashboard_id Id of the dashbaord for which data is to be fetched
     * @apiQuery {String} period Period for which time period to provide data, possible values (month, 60days, 30days, 7days, yesterday, hour or [startMiliseconds, endMiliseconds] as [1417730400000,1420149600000])
     * @apiQuery {String} [action] Set to refresh if page is being refreshed
     *
     * @apiSuccess {Object[]} widgets List of all widgets
     * @apiSuccess {Object[]} apps List of apps
     *
     * @apiSuccessExample {json} Success-Response:
     * {
            "widgets": [
                {
                "_id": "5b7590767c266d66f301054f",
                "widget_type": "retention_segments",
                "apps": [
                    "5b3a716fc07e2036b53f1d51"
                ],
                "interval": "adaily",
                "bar_color": 1,
                "retention_type": "full",
                "isPluginWidget": true,
                "position": [
                    0,
                    0
                ],
                "size": [
                    4,
                    4
                ],
                "title": "",
                "dashData": {}
                },
                {
                "_id": "5b75909b7c266d66f3010551",
                "widget_type": "funnels",
                "apps": [
                    "5b2ba948b9d3cc64ee7a770b"
                ],
                "funnel_type": [
                    "5b2ba948b9d3cc64ee7a770b***133b9e9abc407f855534007f28d047cf"
                ],
                "bar_color": 1,
                "isPluginWidget": true,
                "position": [
                    4,
                    4
                ],
                "size": [
                    4,
                    3
                ],
                "dashData": {}
                }
            ],
            "apps": [
                {
                "_id": "5b2ba948b9d3cc64ee7a771b",
                "name": "Trinity"
                },
                {
                "_id": "5b3a716fc07e2036b53f1d52",
                "name": "appcodingeasy"
                },
                {
                "_id": "5b63132ddf1b7a194a91838f",
                "name": "App with data"
                }
            ]
        }
     */
    plugins.register("/o/dashboards", function(ob) {
        var paths = ob.paths;

        if (typeof paths[3] === "undefined") {
            var params = ob.params,
                dashboardId = params.qstring.dashboard_id;

            if (typeof dashboardId === "undefined" || dashboardId.length !== 24) {
                common.returnMessage(params, 401, 'Invalid parameter: dashboard_id');
                return true;
            }

            validateUser(params, function() {
                var member = params.member,
                    memberId = member._id + "";

                common.db.collection("dashboards").findOne({_id: common.db.ObjectID(dashboardId)}, function(err, dashboard) {
                    if (!err && dashboard) {
                        async.parallel([
                            hasViewAccessToDashboard.bind(null, params.member, dashboard),
                            hasEditAccessToDashboard.bind(null, params.member, dashboard),
                            fetchMembersData.bind(null, [dashboard.owner_id], [])
                        ], function(er, res) {
                            var hasViewAccess = res[0];
                            var hasEditAccess = res[1];
                            var ownerData = res[2];

                            if (er || !hasViewAccess) {
                                return common.returnOutput(params, {error: true, dashboard_access_denied: true});
                            }

                            if (dashboard.owner_id === memberId || member.global_admin) {
                                dashboard.is_owner = true;
                            }

                            if (hasEditAccess) {
                                dashboard.is_editable = true;
                            }

                            if (ownerData && ownerData.length) {
                                dashboard.owner = ownerData[0];
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

                        fetchWidgetsMeta(params, dashboard.widgets, false, function(metaerr, meta) {
                            if (metaerr) {
                                return callback(metaerr);
                            }

                            var widgets = meta[0] || [];
                            var apps = meta[1] || [];

                            if (!widgets.length) {
                                return callback(null, {widgets: widgets, apps: apps});
                            }

                            customDashboards.fetchAllWidgetsData(params, widgets, function(data) {
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
                            fetchMembersData.bind(null, sharedViewIds, sharedViewEmails), //View users
                            fetchMembersData.bind(null, sharedEditIds, sharedEditEmails) //Edit users
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

    /**
     * @api {get} /o/dashboards/widget Get widget info
     * @apiName GetWidgetInfo
     * @apiGroup Dashboards
     * @apiPermission user
     * @apiDescription Fetch the data corresponding to a particular widget
     *
     * @apiQuery {String} dashboard_id Id of the dashbaord for which data is to be fetched
     * @apiQuery {String} widget_id Id of the widget for which the data is to be fetched
     * @apiQuery {period} widget_id Time period for which the data is to be fetched
     *
     * @apiSuccessExample {json} Success-Response:
     * [
            {
                "_id": "5b7aca9539d00a70e69b6762",
                "widget_type": "number",
                "data_type": "session",
                "apps": [
                "5b2ba948b9d3cc64ee7a770b"
                ],
                "metrics": [
                "t"
                ],
                "data": {}
            }
        ]
     */
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

        validateUser(params, function() {
            common.db.collection("dashboards").findOne({_id: common.db.ObjectID(dashboardId), widgets: {$in: [common.db.ObjectID(widgetId)]}}, function(err, dashboard) {
                if (!err && dashboard) {
                    hasViewAccessToDashboard(params.member, dashboard, function(er, status) {
                        if (er || !status) {
                            return common.returnOutput(params, {error: true, dashboard_access_denied: true});
                        }

                        fetchWidgetsMeta(params, [common.db.ObjectID(widgetId)], false, function(e, meta) {
                            var widgets = meta[0] || [];
                            customDashboards.fetchAllWidgetsData(params, widgets, function(data) {
                                common.returnOutput(params, data);
                            });
                        });
                    });
                }
                else {
                    common.returnMessage(params, 404, "Such dashboard and widget combination does not exist.");
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

        customDashboards.fetchAllWidgetsData(params, widgets, function(data) {
            common.returnOutput(params, data);
        });

        return true;
    });

    /**
     * @api {get} /o/dashboards/all Get all dashboards
     * @apiName GetAllDashboards
     * @apiGroup Dashboards
     * @apiPermission user
     * @apiDescription Fetch all the custom dashboards with widget info
     *
     * @apiQuery {String} app_id ID of the app for which to query
     *
     * @apiSuccessExample {json} Success-Response:
     * [
            {
                "_id": "5b2bacee8ad47667f394cb33",
                "name": "Inital-dash",
                "owner_id": "5b2ba91a04e23d64d2f55de0",
                "shared_with_edit": [
                "5b2ba91a04e23d64d2f55de0"
                ],
                "shared_with_view": [
                "5b2ba91a04e23d64d2f55de0",
                "5b71574113f0137abd7427a3"
                ],
                "theme": "1",
                "widgets": [
                "5b2bb596a5817c4168624664",
                "5b3d05bacdc9ea0f434ea28d",
                "5b3f90eb6eecfc3eefaaca07",
                "5b44a025510fc63c9d11f3e9"
                ],
                "is_owner": true,
                "is_editable": true
            },
            {
                "_id": "5b71899c13f0137abd7427d1",
                "name": "drill",
                "owner_id": "5b2ba91a04e23d64d2f55de0",
                "shared_with_edit": [
                "5b2ba91a04e23d64d2f55de0"
                ],
                "shared_with_view": [
                "5b2ba91a04e23d64d2f55de0"
                ],
                "theme": "7",
                "widgets": [
                "5b7189a913f0137abd7427d2",
                "5b718a0e13f0137abd7427d3"
                ],
                "is_owner": true,
                "is_editable": true
            },
            {
                "_id": "5b7590697c266d66f301054e",
                "name": "fixes",
                "owner_id": "5b2ba91a04e23d64d2f55de0",
                "shared_with_edit": [
                "5b2ba91a04e23d64d2f55de0"
                ],
                "shared_with_view": [
                "5b2ba91a04e23d64d2f55de0"
                ],
                "theme": "1",
                "widgets": [
                "5b7590767c266d66f301054f"
                ],
                "is_owner": true,
                "is_editable": true
            }
        ]
     */
    plugins.register("/o/dashboards/all", function(ob) {
        var params = ob.params;
        let just_schema = params.qstring.just_schema;

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
            let projection = {};
            if (just_schema) {
                projection = {_id: 1, name: 1, owner_id: 1, created_at: 1};
            }
            common.db.collection("dashboards").find(filterCond, projection).toArray(function(err, dashboards) {
                if (err || !dashboards || !dashboards.length) {
                    return common.returnOutput(params, []);
                }

                if (!just_schema) {
                    async.forEach(dashboards, function(dashboard, done) {
                        async.parallel([
                            hasEditAccessToDashboard.bind(null, member, dashboard),
                            fetchWidgetsMeta.bind(null, params, dashboard.widgets, false),
                            fetchMembersData.bind(null, [dashboard.owner_id], [])
                        ], function(perr, result) {
                            if (perr) {
                                return done(perr);
                            }

                            var hasEditAccess = result[0];
                            var widgetsMeta = result[1] || [];
                            var ownerData = result[2];

                            if (dashboard.owner_id === memberId || member.global_admin) {
                                dashboard.is_owner = true;
                            }

                            if (hasEditAccess) {
                                dashboard.is_editable = true;
                            }

                            if (ownerData && ownerData.length) {
                                dashboard.owner = ownerData[0];
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
                }
                else {
                    dashboards.forEach((dashboard) => {
                        if (dashboard.owner_id === memberId || member.global_admin) {
                            dashboard.is_owner = true;
                        }
                    });
                    common.returnOutput(params, dashboards);
                }
            });
        });

        return true;
    });

    plugins.register("/o/dashboards/widget-layout", function(ob) {
        var params = ob.params;

        validateUser(params, function() {

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

    /**
     * @api {get} /i/dashboards/create Create a dashboard
     * @apiName CreateDashboard
     * @apiGroup Dashboards
     * @apiPermission user
     * @apiDescription Create your own custom dashboard
     *
     * @apiQuery {String} name Name of the dashboard
     * @apiQuery {Array} shared_email_edit Emails of user who can edit the dashboard
     * @apiQuery {Array} shared_email_view Emails of the users who can view the dashboard
     * @apiQuery {Array} shared_user_groups_edit Group ids of users who can edit the dashboard
     * @apiQuery {Array} shared_user_groups_view Group ids of users who can view the dashboard
     * @apiQuery {String} share_with "all-users", "selected-users" or "none"
     * @apiQuery {String} [copy_dash_id] Id of the dashboard to copy. To be used when duplicating dashboards
     *
     */
    plugins.register("/i/dashboards/create", function(ob) {
        var params = ob.params;

        validateUser(params, function() {
            var dashboardName = params.qstring.name,
                sharedEmailEdit = params.qstring.shared_email_edit || [],
                sharedEmailView = params.qstring.shared_email_view || [],
                sharedUserGroupEdit = params.qstring.shared_user_groups_edit || [],
                sharedUserGroupView = params.qstring.shared_user_groups_view || [],
                send_email_invitation = params.qstring.send_email_invitation,
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

            async.series(seriesTasks, async function(err) {
                if (err) {
                    return common.returnMessage(params, 500, "Failed to create dashboard");
                }

                var dashId = dataWrapper.dashboard_id;
                if (send_email_invitation === 'true') {
                    let {viewEmailList, editEmailList} = await getEmailList(params.member, shareWith, sharedEmailEdit, sharedEmailView,
                        sharedUserGroupEdit, sharedUserGroupView);
                    sendEmailInvitaion(params.member, viewEmailList, editEmailList, dashboardName, dashId);
                }
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
                    theme: theme,
                    created_at: new Date().getTime()
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
                    widgets.forEach(function(widget, idx) {
                        plugins.dispatch("/dashboard/widget/created", {params: params, widget: Object.assign({}, {_id: result.insertedIds[idx]}, widget)});
                    });
                });
            }
        });

        return true;
    });

    /**
     * @api {get} /i/dashboards/update Update a dashboard
     * @apiName UpdateDashboard
     * @apiGroup Dashboards
     * @apiPermission user
     * @apiDescription Update your custom dashboard
     *
     * @apiQuery {String} name Name of the dashboard
     * @apiQuery {Array} shared_email_edit Emails of user who can edit the dashboard
     * @apiQuery {Array} shared_email_view Emails of the users who can view the dashboard
     * @apiQuery {Array} shared_user_groups_edit Group ids of users who can edit the dashboard
     * @apiQuery {Array} shared_user_groups_view Group ids of users who can view the dashboard
     * @apiQuery {String} share_with "all-users", "selected-users" or "none"
     * @apiQuery {String} [copy_dash_id] Id of the dashboard to copy. To be used when duplicating dashboards
     * @apiQuery {String} dashboard_id Id of the dashboard which has to be updated
     *
     */
    plugins.register("/i/dashboards/update", function(ob) {
        var params = ob.params;

        validateUser(params, function() {
            var dashboardId = params.qstring.dashboard_id,
                dashboardName = params.qstring.name,
                sharedEmailEdit = params.qstring.shared_email_edit,
                sharedEmailView = params.qstring.shared_email_view,
                sharedUserGroupEdit = params.qstring.shared_user_groups_edit,
                sharedUserGroupView = params.qstring.shared_user_groups_view,
                theme = params.qstring.theme || 1,
                shareWith = params.qstring.share_with || "",
                send_email_invitation = params.qstring.send_email_invitation,
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
                            async function(e, res) {
                                if (!e && res) {
                                    if (send_email_invitation === 'true') {
                                        const previousList = await getEmailList(params.member, dashboard.shareWith, dashboard.shared_email_edit, dashboard.shared_email_view, dashboard.shared_user_groups_edit, dashboard.shared_user_groups_view);

                                        let {viewEmailList, editEmailList} = await getEmailList(params.member, shareWith, sharedEmailEdit, sharedEmailView,
                                            sharedUserGroupEdit, sharedUserGroupView);

                                        viewEmailList = viewEmailList.filter((i) => {
                                            if (previousList.viewEmailList.indexOf(i) === -1) {
                                                return true;
                                            } return false;
                                        });
                                        editEmailList = editEmailList.filter((i) => {
                                            if (previousList.editEmailList.indexOf(i) === -1) {
                                                return true;
                                            } return false;
                                        });

                                        sendEmailInvitaion(params.member, viewEmailList, editEmailList, dashboardName, dashboardId);
                                    }
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

    /**
     * @api {get} /i/dashboards/delete Delete a dashboard
     * @apiName DeleteDashboard
     * @apiGroup Dashboards
     * @apiPermission user
     * @apiDescription Delete your custom dashboard
     *
     * @apiQuery {String} dashboard_id Id of the dashboard which has to be deleted
     *
     */
    plugins.register("/i/dashboards/delete", function(ob) {
        var params = ob.params;

        validateUser(params, function() {
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

    /**
     * @api {get} /i/dashboards/add-widget Add a widget
     * @apiName AddWidget
     * @apiGroup Dashboards
     * @apiPermission user
     * @apiDescription Create a new widget
     *
     * @apiQuery {String} dashboard_id Id of the dashboard to which the widget has to be added
     * @apiQuery {String} widget Object with widget info
     *
     */
    plugins.register("/i/dashboards/add-widget", function(ob) {
        var params = ob.params;

        validateUser(params, function() {

            var dashboardId = params.qstring.dashboard_id,
                widget = params.qstring.widget || {};

            try {
                widget = JSON.parse(common.sanitizeHTML(widget));
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

            if (widget.widget_type === "note") {
                widget.contenthtml = sanitizeNote(widget.contenthtml);
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
                                    plugins.dispatch("/dashboard/widget/created", {params: params, widget: Object.assign({}, {_id: newWidgetId}, widget)});
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

    /**
     * @api {get} /i/dashboards/update-widget Update a widget
     * @apiName UpdateWidget
     * @apiGroup Dashboards
     * @apiPermission user
     * @apiDescription Update the widget
     *
     * @apiQuery {String} dashboard_id Id of the dashboard that contains the widget
     * @apiQuery {String} widget_id Id of the widget to be updated
     * @apiQuery {String} widget Object with widget info
     *
     */
    plugins.register("/i/dashboards/update-widget", function(ob) {
        var params = ob.params;

        validateUser(params, function() {

            var dashboardId = params.qstring.dashboard_id,
                widgetId = params.qstring.widget_id,
                widget = params.qstring.widget || {};

            try {
                widget = JSON.parse(common.sanitizeHTML(widget));
            }
            catch (SyntaxError) {
                log.d('Parse widget failed', widget);
            }

            if (widget.widget_type === "note") {
                widget.contenthtml = sanitizeNote(widget.contenthtml);
            }

            if (!dashboardId || dashboardId.length !== 24) {
                common.returnMessage(params, 400, 'Invalid parameter: dashboard_id');
                return true;
            }

            if (!widgetId || widgetId.length !== 24) {
                common.returnMessage(params, 400, 'Invalid parameter: widget_id');
                return true;
            }

            common.db.collection("dashboards").findOne({_id: common.db.ObjectID(dashboardId), widgets: {$in: [common.db.ObjectID(widgetId)]}}, function(err, dashboard) {
                if (err || !dashboard) {
                    common.returnMessage(params, 400, "Such dashboard and widget combination does not exist.");
                }
                else {
                    async.parallel([
                        hasEditAccessToDashboard.bind(null, params.member, dashboard),
                        hasViewAccessToDashboard.bind(null, params.member, dashboard)
                    ], function(error, results) {
                        var hasEditAccess = results[0];
                        var hasViewAccess = results[1];
                        var unsetQuery = {};
                        if (widget.feature === "core") {
                            unsetQuery.$unset = {"isPluginWidget": ""};
                        }
                        if (hasEditAccess) {
                            common.db.collection("widgets").findAndModify({_id: common.db.ObjectID(widgetId)}, {}, {$set: widget, ...unsetQuery }, {new: false}, function(er, result) {
                                if (er || !result || !result.value) {
                                    common.returnMessage(params, 500, "Failed to update widget");
                                }
                                else {
                                    plugins.dispatch("/systemlogs", {params: params, action: "widget_edited", data: {before: result.value, update: widget}});
                                    plugins.dispatch("/dashboard/widget/updated", {params: params, widget: {before: result.value, update: widget}});
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

    /**
     * @api {get} /i/dashboards/remove-widget Remove a widget
     * @apiName RemoveWidget
     * @apiGroup Dashboards
     * @apiPermission user
     * @apiDescription Remove the widget
     *
     * @apiQuery {String} dashboard_id Id of the dashboard that contains the widget
     * @apiQuery {String} widget_id Id of the widget to be updated
     *
     */
    plugins.register("/i/dashboards/remove-widget", function(ob) {
        var params = ob.params;

        validateUser(params, function() {

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

            common.db.collection("dashboards").findOne({_id: common.db.ObjectID(dashboardId), widgets: {$in: [common.db.ObjectID(widgetId)]}}, function(err, dashboard) {
                if (err || !dashboard) {
                    common.returnMessage(params, 400, "Such dashboard and widget combination does not exist.");
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
                                            var logData = widgetResult.value;
                                            logData.dashboard = dashboard.name;

                                            plugins.dispatch("/systemlogs", {params: params, action: "widget_deleted", data: logData});
                                            plugins.dispatch("/dashboard/widget/deleted", {params: params, widget: widgetResult.value});
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
                                options.dimensions = {width: 800, padding: 100};
                                options.token = token;
                                options.source = "dashboards/" + imageName;
                                options.timeout = 120000;
                                options.cbFn = function(opt) {
                                    var rep = opt.report || {};
                                    var reportDateRange = rep.date_range || "30days";
                                    // eslint-disable-next-line no-undef
                                    countlyCommon.setPeriod(reportDateRange);
                                    // eslint-disable-next-line no-undef
                                    var app = window.app;
                                    app.activeView.vm.$emit("cly-date-change");
                                    // eslint-disable-next-line no-undef
                                    var $ = window.$;
                                    $("html").addClass("email-screen");
                                };

                                options.waitForRegexAfterCbfn = true;

                                //options.beforeScrnCbFn = function() {
                                // eslint-disable-next-line no-undef
                                //var $ = window.$;
                                //$(".funnels table colgroup col:first-child").width("145px");
                                //$(".funnels table colgroup col:last-child").width("80px");
                                //};

                                options.waitForRegex = new RegExp(/o\/dashboards?/gi);

                                options.id = "#content";

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

                                                var message = {
                                                    template: template,
                                                    data: {"host": host, "report": report, "version": versionInfo, "properties": props, "image": image, "unsubscribe_link": ""}
                                                };
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
     * @param  {Boolean} allProps - send all props or not
     * @param  {Function} callback - callback function
     */
    function fetchWidgetsMeta(params, widgetIds = [], allProps, callback) {
        common.db.collection("widgets").find({_id: {$in: widgetIds}}).toArray(function(e, widgets = []) {
            if (e) {
                log.e("Could not fetch widgets", e, widgetIds);
            }

            for (var i = 0; i < widgets.length; i++) {
                customDashboards.mapWidget(widgets[i]);
            }

            customDashboards.fetchWidgetApps(params, widgets, function(err, apps = {}) {
                var allApps = [];
                for (var appId in apps) {
                    if (allProps) {
                        allApps.push(apps[appId]);
                    }
                    else {
                        allApps.push({_id: apps[appId]._id, name: apps[appId].name, image: apps[appId].image, has_image: apps[appId].has_image, type: apps[appId].type, created_at: apps[appId].created_at});
                    }
                }

                return callback(null, [widgets, allApps]);
            });
        });
    }
    /**
     * Function to fetch shared members
     * @param  {Array} ids - ids array
     * @param  {Array} emails - emails array
     * @param  {Function} callback - callback function
     */
    function fetchMembersData(ids, emails, callback) {
        var dashboardUserIds = [];
        for (var i = 0; i < ids.length; i++) {
            dashboardUserIds.push(common.db.ObjectID(ids[i]));
        }

        common.db.collection("members").find({$or: [{_id: { $in: dashboardUserIds }}, {email: { $in: emails }} ]}, {_id: 1, full_name: 1, email: 1, username: 1}).toArray(function(err, users) {
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

    /**
     * Function to encode HTML
     * @param  {String} html - HTML string
     * @returns {String} encoded HTML
     */
    function escapeHtml(html) {
        return html.replace(/[&<>"']/g, function(match) {
            switch (match) {
            case '&':
                return '&amp;';
            case '<':
                return '&lt;';
            case '>':
                return '&gt;';
            case '"':
                return '&quot;';
            case "'":
                return '&#39;';
            default:
                return match;
            }
        });
    }

    /**
     * Function to sanitize note widget
     * @param  {String} contenthtml - note widget HTML
     * @returns {String} note widget valid HTML
     */
    function sanitizeNote(contenthtml) {
        contenthtml = common.sanitizeHTML(contenthtml, {a: ["href"]});
        //Keep only valid links
        var regex = /<a\s+(?:[^>]*\s+)?href="([^"]*)"/g;
        contenthtml = contenthtml.replace(regex, function(match, href) {
            if (href.startsWith('http://') || href.startsWith('https://')) {
                return match;
            }
            else {
                return match.replace(href, '#');
            }
        });
        contenthtml = escapeHtml(contenthtml);
        return contenthtml;
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
     * Get emaillist for view & edit permission
     * @param {Object} member - countly member object
     * @param {String} shareWith - share type
     * @param {Array} sharedEmailEdit - email address list shared to edit 
     * @param {Array} sharedEmailView - email address list shared to view
     * @param {Array} sharedUserGroupEdit - group ids from countly user group
     * @param {Array} sharedUserGroupView - group ids from countly user group 
     * @returns {Object} {viewEmailList, editEmailList} - email list for view & edit permission
     */
    async function getEmailList(member, shareWith, sharedEmailEdit, sharedEmailView, sharedUserGroupEdit, sharedUserGroupView) {
        let viewEmailList = [];
        let editEmailList = [];
        if (shareWith === 'all-users') {
            const allMemberEmail = await common.db.collection("members").find({_id: {$ne: member._id}}, {"email": 1, "_id": -1}).toArray();
            viewEmailList = viewEmailList.concat(allMemberEmail.map(item => item.email));
        }
        if (sharedUserGroupView && sharedUserGroupView.length > 0) {
            const viewGroupEmail = await common.db.collection("members").find({_id: {$ne: member._id}, group_id: {$in: sharedUserGroupView }}, {"email": 1, "_id": -1}).toArray();
            viewEmailList = viewEmailList.concat(viewGroupEmail.map(item => item.email));
        }
        if (sharedUserGroupEdit && sharedUserGroupEdit.length > 0) {
            const editGroupEmail = await common.db.collection("members").find({_id: {$ne: member._id}, group_id: {$in: sharedUserGroupEdit }}, {"email": 1, "_id": -1}).toArray();
            editEmailList = editEmailList.concat(editGroupEmail.map(item => item.email));
        }

        viewEmailList = viewEmailList.concat(sharedEmailView);
        editEmailList = editEmailList.concat(sharedEmailEdit);

        viewEmailList = viewEmailList.filter((item, idx) => {
            if (viewEmailList.indexOf(item) !== idx) {
                return false;
            }
            return true;
        });


        editEmailList = editEmailList.filter((item, idx) => {
            if (editEmailList.indexOf(item) !== idx) {
                return false;
            }
            return true;
        });
        return {viewEmailList, editEmailList};
    }

    /**
     * Send email base on configuration
     * @param {object} member - dashboard owner
     * @param {array} viewEmailList - email address list shared to edit 
     * @param {array} editEmailList - email address list shared to view
     * @param {string} dashboardName - dashboard name
     * @param {string} dashboardID - generated dashboard ID
     */
    async function sendEmailInvitaion(member, viewEmailList, editEmailList, dashboardName, dashboardID) {
        const templateString = await readReportTemplate();

        versionInfo.page = (!versionInfo.title) ? "http://count.ly" : null;
        versionInfo.title = versionInfo.title || "Countly";


        localize.getProperties(member.lang, function(gpErr, props) {
            ip.getHost(function(e, host) {
                host = host + common.config.path;
                const templateVariabies = {
                    host: host,
                    version: versionInfo,
                    dashboardName: dashboardName,
                    dashboardLink: host + "/dashboard#/custom/" + dashboardID,
                    subTitle: props["dashboards.dashboard-invite-subtitle"],
                    contentView: props["dashboards.dashboard-invite-content"],
                    contentEdit: props["dashboards.dashbhoard-invite-content-edit"],
                    dashboardLinkButtonText: props["dashboards.dashboard-invite-link-text"],
                };
                const viewMsg = {
                    bcc: viewEmailList,
                    from: versionInfo.title,
                    subject: props["dashboards.dashboard-invite-title"],
                    html: ejs.render(templateString, Object.assign({}, templateVariabies, {editPermission: false})),
                };
                const editMsg = {
                    bcc: editEmailList,
                    from: versionInfo.title,
                    subject: props["dashboards.dashboard-invite-title"],
                    html: ejs.render(templateString, Object.assign({}, templateVariabies, {editPermission: true})),
                };
                sendEmail(viewMsg);
                sendEmail(editMsg);
            });
        });

    }

    /**
    * load ReportTemplate file
    * @returns {Promise} - template promise object.
    */
    const readReportTemplate = () => {
        return new Promise((resolve, reject) => {
            const templatePath = path.resolve(__dirname, '../frontend/public/templates/invite-email.html');
            fs.readFile(templatePath, 'utf8', function(err1, template) {
                if (err1) {
                    return reject(err1);
                }
                return resolve(template);
            });
        }).catch((e) => console.log(e));
    };

    /**
     * send email with email libs
     * @param {object} msg - email sending object
     */
    function sendEmail(msg) {
        if (mail.sendPoolMail) {
            mail.sendPoolMail(msg, null);

        }
        else {
            mail.sendMail(msg, null);
        }
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

    plugins.register("/dashboard/data", async function({params, apps, widget}) {
        try {
            switch (widget.widget_type) {
            case 'analytics':
                await customDashboards.fetchAnalyticsData(params, apps, widget);
                break;
            case 'events':
                await customDashboards.fetchEventsData(params, apps, widget);
                break;
            case 'push':
                await customDashboards.fetchPushData(params, apps, widget);
                break;
            case 'crashes':
                await customDashboards.fetchCrashData(params, apps, widget);
                break;
            case 'note':
                await customDashboards.fetchNoteData(params, apps, widget);
                break;
            default:
                break;
            }
        }
        catch (e) {
            log.d("Error while fetching data for widget - ", widget);
            log.d("Error - ", e);
        }
    });

    plugins.register("/o/dashboard/data", function(ob) {
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

        validateUser(params, function() {
            common.db.collection("dashboards").findOne({_id: common.db.ObjectID(dashboardId), widgets: {$in: [common.db.ObjectID(widgetId)]}}, function(err, dashboard) {
                if (!err && dashboard) {
                    hasViewAccessToDashboard(params.member, dashboard, function(er, status) {
                        if (er || !status) {
                            return common.returnOutput(params, {error: true, dashboard_access_denied: true});
                        }

                        fetchWidgetsMeta(params, [common.db.ObjectID(widgetId)], true, function(e, meta) {
                            var widgets = meta[0] || [];
                            var allApps = meta[1] || [];

                            var apps = {};

                            if (allApps) {
                                for (var k = 0; k < allApps.length; k++) {
                                    apps[allApps[k]._id + ""] = allApps[k];
                                }
                            }

                            var newParams = {
                                qstring: params.qstring,
                                member: params.member
                            };

                            var widget = widgets[0] || {};

                            plugins.dispatch("/dashboard/data", {
                                params: JSON.parse(JSON.stringify(newParams)),
                                apps: JSON.parse(JSON.stringify(apps)),
                                widget: widget
                            }, function() {
                                common.returnOutput(params, widget);
                            });
                        });
                    });
                }
                else {
                    common.returnMessage(params, 404, "Such dashboard and widget combination does not exist.");
                }
            });
        });

        return true;
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
                if (widget.drill_query && widget.drill_query.length) {
                    let drillIds = widget.drill_query
                        .map(q => {
                            return q._id;
                        })
                        .filter(qId => !!qId);
                    if (drillIds.length) {
                        let drillQueries = await params.fetchDependencies(app_id, drillIds, 'drill_query', params);
                        dependencies.push(...drillQueries);
                    }
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
                if (widget.cmetric_refs && widget.cmetric_refs.length) {
                    let formulaIds = widget.cmetric_refs
                        .map(metric => {
                            return metric._id;
                        })
                        .filter(fId => !!fId);
                    if (formulaIds.length) {
                        let formulas = await params.fetchDependencies(app_id, formulaIds, 'formulas', params);
                        dependencies.push(...formulas);
                    }
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
            if (importData.data?._id) {
                importData.data._id = common.db.ObjectID(importData.data._id);
            }
            if (importData.data?.widget_type === 'formulas') {
                delete importData.data.cmetrics;
            }
            if (importData.data?.widget_type === 'drill') {
                delete importData.data.drill_report;
            }
            common.db.collection("widgets").insert(importData.data, function(er, result) {
                if (!er && result && result.insertedIds && result.insertedIds[0]) {
                    plugins.dispatch("/systemlogs", {params: params, action: "widget_added", data: importData.data});
                    plugins.dispatch("/dashboard/widget/created", { params: params, widget: importData.data });
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
