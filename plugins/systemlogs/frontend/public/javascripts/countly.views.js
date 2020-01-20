/*global CountlyHelpers, countlySystemLogs, SystemLogsView, countlyAttribution, pathsToSectionNames, countlyCrashes, moment, countlyView, countlyCommon, countlyGlobal, Handlebars, app, $, jQuery*/

window.SystemLogsView = countlyView.extend({
    initialize: function() {

    },
    beforeRender: function() {
        if (this.template) {
            return $.when(countlySystemLogs.initialize()).then(function() {});
        }
        else {
            var self = this;
            return $.when($.get(countlyGlobal.path + '/systemlogs/templates/logs.html', function(src) {
                self.template = Handlebars.compile(src);
            }), countlySystemLogs.initialize()).then(function() {});
        }
    },
    getExportAPI: function(tableID) {
        if (tableID === 'd-table-actionlogs') {
            var query = app.activeView.action_query || {a: {$in: ["export_app_user", "app_user_deleted", "export_app_user_deleted"]}};
            query["i.app_id"] = countlyCommon.ACTIVE_APP_ID;

            var requestPath = '/o?api_key=' + countlyGlobal.member.api_key +
            "&app_id=" + countlyCommon.ACTIVE_APP_ID + "&method=systemlogs&iDisplayStart=0" +
            "&query=" + encodeURIComponent(JSON.stringify(query)) +
            "&period=" + countlyCommon.getPeriodForAjax();
            var apiQueryData = {
                api_key: countlyGlobal.member.api_key,
                app_id: countlyCommon.ACTIVE_APP_ID,
                path: requestPath,
                method: "GET",
                filename: "Systemlogs_on_" + moment().format("DD-MMM-YYYY"),
                prop: ['aaData']
            };
            return apiQueryData;
        }
        return null;
    },
    renderCommon: function(isRefresh) {
        var meta = countlySystemLogs.getMetaData();
        var activeAction = jQuery.i18n.map["systemlogs.all-actions"];
        var activeUser = jQuery.i18n.map["systemlogs.all-users"];
        var i;
        if (this._query) {
            if (this._query.a) {
                activeAction = jQuery.i18n.prop("systemlogs.action." + this._query.a);
            }

            if (this._query.user_id) {
                for (i = 0; i < meta.users.length; i++) {
                    if (meta.users[i]._id === this._query.user_id) {
                        activeUser = meta.users[i].full_name;
                        break;
                    }
                }
            }
        }

        this.templateData = {
            "page-title": jQuery.i18n.map["systemlogs.title"],
            "active-action": activeAction,
            "actions": meta.action,
            "active-user": activeUser,
            "users": meta.users,
            query: this._query,
            back: this._back
        };

        var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            if (!app.hasRoutingHistory()) {
                $(".back-link").css('display', 'none');
            }

            $(".back-link").click(function() {
                app.back();
            });

            var tableData = [];

            this.dtable = $('#systemlogs-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaSorting": [[ 1, "desc" ]],
                "bServerSide": true,
                "sAjaxSource": countlyCommon.API_PARTS.data.r + "?api_key=" + countlyGlobal.member.api_key + "&app_id=" + countlyCommon.ACTIVE_APP_ID + "&method=systemlogs",
                "fnServerData": function(sSource, aoData, fnCallback) {
                    $.ajax({
                        "dataType": 'json',
                        "type": "POST",
                        "url": sSource,
                        "data": aoData,
                        "success": function(data) {
                            fnCallback(data);
                            tableData = data.aaData;
                            CountlyHelpers.reopenRows(self.dtable, self.expandTable, self);
                        }
                    });
                },
                "fnServerParams": function(aoData) {
                    if (self._query) {
                        aoData.push({ "name": "query", "value": JSON.stringify(self._query) });
                    }
                    aoData.push({ "name": "period", "value": countlyCommon.getPeriodForAjax() });
                },
                "fnRowCallback": function(nRow, aData) {
                    $(nRow).attr("id", aData._id);
                },
                "aoColumns": [
                    CountlyHelpers.expandRowIconColumn(),
                    {
                        "mData": function(row, type) {
                            if (type === "display") {
                                return moment(new Date(row.ts * 1000)).format("ddd, D MMM YYYY HH:mm:ss");
                            }
                            else {
                                return row.ts;
                            }
                        },
                        "sType": "string",
                        "sExport": "systemlogs",
                        "sTitle": jQuery.i18n.map["systemlogs.timestamp"]
                    },
                    {
                        "mData": function(row, type) {
                            if (row.user_id && type === "display") {
                                return "<a href='#/manage/users/" + row.user_id + "' class='table-link-user green' title='" + row.u + "'>" + row.u + "</a>";
                            }
                            else {
                                return "<span title='" + row.u + "'>" + row.u + "</span>";
                            }
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["systemlogs.user"],
                        bSortable: false,
                        "sClass": "trim"
                    },
                    {
                        "mData": function(row) {
                            return row.ip;
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["systemlogs.ip-address"],
                        bSortable: false
                    },
                    {
                        "mData": function(row) {
                            var ret = "<p>" + ((jQuery.i18n.map["systemlogs.action." + row.a]) ? jQuery.i18n.map["systemlogs.action." + row.a] : row.a) + "</p>";
                            if (typeof row.i === "object") {
                                if (typeof row.i.app_id !== "undefined" && countlyGlobal.apps[row.i.app_id]) {
                                    ret += "<p title='" + row.i.app_id + "'>" + jQuery.i18n.map["systemlogs.for-app"] + ": " + countlyGlobal.apps[row.i.app_id].name + "</p>";
                                }
                                if (typeof row.i.user_id !== "undefined") {
                                    var id = row.i.user_id;
                                    for (i = 0; i < meta.users.length; i++) {
                                        if (meta.users[i]._id === row.i.user_id) {
                                            id = meta.users[i].full_name;
                                            break;
                                        }
                                    }
                                    ret += "<p title='" + id + "'>" + jQuery.i18n.map["systemlogs.for-user"] + ": " + id + "</p>";
                                }
                                if (typeof row.i.campaign_id !== "undefined" && typeof countlyAttribution !== "undefined") {
                                    ret += "<p title='" + row.i.campaign_id + "'>" + jQuery.i18n.map["systemlogs.for-campaign"] + ": " + countlyAttribution.getCampaignName(row.i.campaign_id) + "</p>";
                                }
                                if (typeof row.i.crash_id !== "undefined" && typeof countlyCrashes !== "undefined") {
                                    ret += "<p title='" + row.i.crash_id + "'>" + jQuery.i18n.map["systemlogs.for-crash"] + ": " + countlyCrashes.getCrashName(row.i.crash_id) + "</p>";
                                }
                                if (typeof row.i.appuser_id !== "undefined") {
                                    ret += "<p title='" + row.i.appuser_id + "'>" + jQuery.i18n.map["systemlogs.for-appuser"] + ": " + row.i.appuser_id + "</p>";
                                }
                                if (typeof row.i.before !== "undefined" && typeof row.i.after !== "undefined") {
                                    if (!jQuery.isEmptyObject(row.i.before)) {
                                        if (typeof row.i.before._id !== "undefined") {
                                            ret += "<p title='" + row.i.before._id + "'>" + jQuery.i18n.map["systemlogs.for-id"] + ": " + row.i.before._id + "</p>";
                                        }
                                    }
                                }
                            }
                            return ret;
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["systemlogs.action"],
                        bSortable: false
                    }
                ]
            }));

            this.dtable.stickyTableHeaders();
            //this.dtable.fnSort( [ [0,'desc'] ] );
            CountlyHelpers.expandRows(this.dtable, this.expandTable, this);

            app.addDataExport("systemlogs", function() {
                var ret = [];
                var elem;
                var users = {};
                for (i = 0; i < meta.users.length; i++) {
                    users[meta.users[i]._id] = meta.users[i];
                }
                if (tableData) {
                    for (i = 0; i < tableData.length; i++) {
                        elem = {};
                        elem[jQuery.i18n.map["systemlogs.timestamp"]] = moment(parseInt(tableData[i].ts) * 1000).format("ddd, D MMM YYYY HH:mm:ss");
                        if (tableData[i].user_id && users[tableData[i].user_id]) {
                            elem[jQuery.i18n.map["systemlogs.user"]] = users[tableData[i].user_id].email + " (" + users[tableData[i].user_id].username + ")";
                        }
                        else {
                            elem[jQuery.i18n.map["systemlogs.user"]] = tableData[i].u;
                        }
                        elem[jQuery.i18n.map["systemlogs.ip-address"]] = tableData[i].ip;
                        elem[jQuery.i18n.map["systemlogs.action"]] = ((jQuery.i18n.map["systemlogs.action." + tableData[i].a]) ? jQuery.i18n.map["systemlogs.action." + tableData[i].a] : tableData[i].a);
                        elem[jQuery.i18n.map["systemlogs.data"]] = "";
                        elem[jQuery.i18n.map["systemlogs.before"]] = "";
                        elem[jQuery.i18n.map["systemlogs.after"]] = "";
                        if (typeof tableData[i].i === "object") {
                            if (typeof tableData[i].i.before !== "undefined" && typeof tableData[i].i.after !== "undefined") {
                                var data = {};
                                for (var d in tableData[i].i) {
                                    if (d !== "before" && d !== "after" && d !== "update") {
                                        data[d] = tableData[i].i[d];
                                    }
                                }
                                elem[jQuery.i18n.map["systemlogs.data"]] = JSON.stringify(data);
                                elem[jQuery.i18n.map["systemlogs.before"]] = JSON.stringify(tableData[i].i.before);
                                elem[jQuery.i18n.map["systemlogs.after"]] = JSON.stringify(tableData[i].i.after);
                            }
                            else if (!jQuery.isEmptyObject(tableData[i].i)) {
                                elem[jQuery.i18n.map["systemlogs.data"]] = JSON.stringify(tableData[i].i);
                            }
                        }
                        else {
                            elem[jQuery.i18n.map["systemlogs.data"]] = tableData[i].i;
                        }
                        ret.push(elem);
                    }
                }
                return ret;
            });

            $(".action-segmentation .segmentation-option").on("click", function() {
                if (!self._query) {
                    self._query = {};
                }
                self._query.a = $(this).data("value");
                if (self._query.a === "") {
                    delete self._query.a;
                }
                app.navigate("#/manage/systemlogs/query/" + JSON.stringify(self._query));
                self.dtable.fnPageChange(0);
                self.refresh();
            });

            $(".user-segmentation .segmentation-option").on("click", function() {
                if (!self._query) {
                    self._query = {};
                }
                self._query.user_id = $(this).data("value");
                if (self._query.user_id === "") {
                    delete self._query.user_id;
                }
                app.navigate("#/manage/systemlogs/query/" + JSON.stringify(self._query));
                self.dtable.fnPageChange(0);
                self.refresh();
            });
        }
    },
    refresh: function() {
        this.dtable.fnDraw(false);
    },
    renderField: function(key, field, sub) {
        var ret = "";
        if (field && field.constructor === Array) {
            if (sub) {
                ret += field.join(", ");
            }
            else {
                ret += "<ul>";
                if (key === "restrict" && typeof pathsToSectionNames !== "undefined") {
                    field = pathsToSectionNames(field).split(", ");
                }
                for (var i = 0; i < field.length; i++) {
                    if (field[i] !== "") {
                        if (key === "user_of" || key === "admin_of") {
                            if (countlyGlobal.apps[field[i]]) {
                                ret += "<li>" + countlyGlobal.apps[field[i]].name + "</li>";
                            }
                            else {
                                ret += "<li>" + field[i] + "</li>";
                            }
                        }
                        else {
                            ret += "<li>" + this.renderField(i, field[i]) + "</li>";
                        }
                    }
                }
                ret += "</ul>";
            }
        }
        else if (field && typeof field === "object") {
            if (!jQuery.isEmptyObject(field)) {
                ret += "<ul>";
                for (i in field) {
                    ret += "<li>" + i + " = " + this.renderField(i, field[i], true) + "</li>";
                }
                ret += "</ul>";
            }
        }
        else if (!isNaN(field) && (Math.round(parseFloat(field, 10)) + "").length === 10) {
            ret += moment(parseFloat(field, 10) * 1000).format("ddd, D MMM YYYY HH:mm:ss");
        }
        else if (!isNaN(field) && (Math.round(parseFloat(field, 10)) + "").length === 13) {
            ret += moment(parseFloat(field, 10)).format("ddd, D MMM YYYY HH:mm:ss");
        }
        else if (key === "map") {
            ret += field.replace(/\n/g, '<br />');
        }
        else if (field !== null && field !== undefined) {
            ret += field;
        }
        return ret;
    },
    expandTable: function(row, self) {
        // `d` is the original data object for the row
        if (typeof row.i === "object") {
            var ret = "<div class='datatablesubrow'>";
            if (typeof row.i.before !== "undefined" && typeof row.i.after !== "undefined") {
                if (!jQuery.isEmptyObject(row.i.before)) {
                    ret += "<p>" + jQuery.i18n.map["systemlogs.changed-data"] + ":</p>";
                    ret += "<table style='width:100%;'>";
                    ret += "<tr>";
                    ret += "<th style='width:20%;'>" + jQuery.i18n.map["systemlogs.field"] + "</th><th style='width:40%;'>" + jQuery.i18n.map["systemlogs.before"] + "</th><th style='width:40%;'>" + jQuery.i18n.map["systemlogs.after"] + "</th>";
                    ret += '</tr>';
                    for (var i in row.i.before) {
                        ret += "<tr>";
                        ret += "<td>" + i + "</td><td>" + self.renderField(i, row.i.before[i]) + "</td><td>" + self.renderField(i, row.i.after[i]) + "</td>";
                        ret += "</tr>";
                    }
                    ret += "</table>";
                }
            }
            else if (!jQuery.isEmptyObject(row.i)) {
                ret += "<p>" + jQuery.i18n.map["systemlogs.has-data"] + ":</p>";
                ret += "<table style='width:100%;'>";
                ret += "<tr><th>" + jQuery.i18n.map["systemlogs.field"] + "</th><th>" + jQuery.i18n.map["systemlogs.value"] + "</th></tr>";
                for (i in row.i) {
                    ret += "<tr><td style='width:20%;'>" + i + "</td><td style='width:80%;'>" + self.renderField(i, row.i[i]) + "</td></tr>";
                }
                ret += "</table>";
            }
            if (ret === "<div class='datatablesubrow'>") {
                ret = "<p>" + jQuery.i18n.map["systemlogs.no-data"] + "</p>";
            }
            return ret + "</div>";
        }
        else {
            return row.i;
        }
    }
});

//register views
app.systemLogsView = new SystemLogsView();
if (countlyGlobal.member.global_admin) {
    app.route('/manage/systemlogs', 'systemlogs', function() {
        this.systemLogsView._query = null;
        this.renderWhenReady(this.systemLogsView);
    });

    app.route('/manage/systemlogs/query/*query', 'systemlogs_query', function(query) {
        try {
            query = JSON.parse(query);
        }
        catch (ex) {
            query = null;
        }
        this.systemLogsView._query = query;
        this.renderWhenReady(this.systemLogsView);
    });

    app.route('/manage/systemlogs/filter/*query', 'systemlogs_query', function(query) {
        try {
            query = JSON.parse(query);
        }
        catch (ex) {
            query = null;
        }
        this.systemLogsView._query = query;
        this.systemLogsView._back = true;
        this.renderWhenReady(this.systemLogsView);
    });

    app.addPageScript("/manage/compliance#", function() {
        if (app.activeView && app.activeView.tabs) {
            app.activeView.tabs.tabs('add', '#consent-actionlogs', jQuery.i18n.map["consent.export-history"]);
            app.activeView.tabs.tabs("refresh");
            $.when(countlySystemLogs.initialize()).then(function() {
                var html = "<div class='widget-header include-dateselector'><div class='left'><div style='overflow: auto'><div class='title small'>" + jQuery.i18n.map["consent.export-history"] + "</div></div>" +
                    "<div style='width:400px; display: block;'>" +
                    "<div class='cly-select float filter_actions-segmentation'>" +
                        "<div class='select-inner'>" +
                            "<div class='text-container'>" +
                                "<div class='text'>" + jQuery.i18n.map["common.all"] + "</div>" +
                            "</div>" +
                            "<div class='right combo'></div>" +
                        "</div>" +
                        "<div class='select-items square' style='width:300px;'>" +
                            "<div>" +
                                "<div data-value='all' class='segmentation-option item'>" + jQuery.i18n.map["common.all"] + "</div>" +
                                "<div data-value='export_app_user' class='segmentation-option item'>" + jQuery.i18n.map["systemlogs.action.export_app_user"] + "</div>" +
                                "<div data-value='app_user_deleted' class='segmentation-option item'>" + jQuery.i18n.map["systemlogs.action.app_user_deleted"] + "</div>" +
                                "<div data-value='export_app_user_deleted' class='segmentation-option item'>" + jQuery.i18n.map["systemlogs.action.export_app_user_deleted"] + "</div>" +
                            "</div>" +
                        "</div>" +
                    "</div>" +
                    "</div>" +
                "</div></div><div class='graph-description' style='border-bottom: none; line-height: 17px;' data-localize='consent.exports-desc'>" + jQuery.i18n.map["consent.exports-desc"] + "</div><table data-view='systemLogsView' id='d-table-actionlogs' class='d-table sortable help-zone-vb' cellpadding='0' cellspacing='0'></table>";
                $("#consent-actionlogs").append(html);
                $(".filter_actions-segmentation .segmentation-option").on("click", function() {
                    var val = $(this).data("value");
                    if (val && val !== "all") {
                        app.activeView.action_query = {a: val};
                    }
                    else {
                        app.activeView.action_query = {a: {$in: ["export_app_user", "app_user_deleted", "export_app_user_deleted"]}};
                    }
                    app.activeView.dtableactionlogs.fnDraw(false);
                });
                app.activeView.dtableactionlogs = $('#d-table-actionlogs').dataTable($.extend({}, $.fn.dataTable.defaults, {
                    "iDisplayLength": 30,
                    "aaSorting": [[ 0, "desc" ]],
                    "bServerSide": true,
                    "bFilter": false,
                    "sAjaxSource": countlyCommon.API_PARTS.data.r + "?api_key=" + countlyGlobal.member.api_key + "&app_id=" + countlyCommon.ACTIVE_APP_ID + "&method=systemlogs",
                    "fnServerData": function(sSource, aoData, fnCallback) {
                        self.request = $.ajax({
                            "dataType": 'json',
                            "type": "POST",
                            "url": sSource,
                            "data": aoData,
                            "success": function(data) {
                                fnCallback(data);
                            }
                        });
                    },
                    "fnServerParams": function(aoData) {
                        var query = app.activeView.action_query || {a: {$in: ["export_app_user", "app_user_deleted", "export_app_user_deleted"]}};
                        query["i.app_id"] = countlyCommon.ACTIVE_APP_ID;
                        aoData.push({ "name": "query", "value": JSON.stringify(query) });
                        aoData.push({ "name": "period", "value": countlyCommon.getPeriodForAjax() });
                    },
                    "oLanguage": {
                        "sInfoFiltered": ""
                    },
                    "aoColumns": [
                        {
                            "mData": function(row, type) {
                                if (type === "display") {
                                    return moment(new Date(row.ts * 1000)).format("ddd, D MMM YYYY HH:mm:ss");
                                }
                                else {
                                    return row.ts;
                                }
                            },
                            "sType": "string",
                            "sExport": "systemlogs",
                            "sTitle": jQuery.i18n.map["systemlogs.timestamp"]
                        },
                        {
                            "mData": function(row, type) {
                                if (row.user_id && type === "display") {
                                    return "<a href='#/manage/users/" + row.user_id + "' class='table-link-user green' title='" + row.u + "'>" + row.u + "</a>";
                                }
                                else {
                                    return "<span title='" + row.u + "'>" + row.u + "</span>";
                                }
                            },
                            "sType": "string",
                            "sTitle": jQuery.i18n.map["systemlogs.user"],
                            bSortable: false,
                            "sClass": "trim"
                        },
                        {
                            "mData": function(row) {
                                return row.ip;
                            },
                            "sType": "string",
                            "sTitle": jQuery.i18n.map["systemlogs.ip-address"],
                            bSortable: false
                        },
                        {
                            "mData": function(row) {
                                var ret = "<p>" + ((jQuery.i18n.map["systemlogs.action." + row.a]) ? jQuery.i18n.map["systemlogs.action." + row.a] : row.a) + "</p>";
                                if (typeof row.i === "object") {
                                    if (typeof row.i.app_id !== "undefined" && countlyGlobal.apps[row.i.app_id]) {
                                        ret += "<p title='" + row.i.app_id + "'>" + jQuery.i18n.map["systemlogs.for-app"] + ": " + countlyGlobal.apps[row.i.app_id].name + "</p>";
                                    }
                                    if (typeof row.i.appuser_id !== "undefined") {
                                        ret += "<p title='" + row.i.appuser_id + "'>" + jQuery.i18n.map["systemlogs.for-appuser"] + ": " + row.i.appuser_id + "</p>";
                                    }
                                    else if (typeof row.i.uids !== "undefined") {
                                        ret += "<p title='" + row.i.uids + "'>" + jQuery.i18n.map["systemlogs.for-appuser"] + ": " + row.i.uids + "</p>";
                                    }
                                    else if (typeof row.i.user_ids !== "undefined") {
                                        ret += "<p title='" + row.i.user_ids + "'>" + jQuery.i18n.map["systemlogs.for-appuser"] + ": " + row.i.user_ids + "</p>";
                                    }
                                    else if (typeof row.i.id !== "undefined") {
                                        ret += "<p title='" + row.i.id + "'>" + jQuery.i18n.map["systemlogs.for-appuser"] + ": " + row.i.id + "</p>";
                                    }
                                }
                                return ret;
                            },
                            "sType": "string",
                            "sTitle": jQuery.i18n.map["systemlogs.action"],
                            bSortable: false
                        }
                    ]
                }));
            });
        }
    });
    app.addRefreshScript("/manage/compliance#", function() {
        if (app.activeView.dtableactionlogs) {
            app.activeView.dtableactionlogs.fnDraw(false);
        }
    });
}

$(document).ready(function() {
    if (countlyGlobal.member.global_admin) {
        app.addMenu("management", {code: "systemlogs", url: "#/manage/systemlogs", text: "systemlogs.title", icon: '<div class="logo-icon fa fa-book"></div>', priority: 50});
    }

    app.addPageScript("/manage/users", function() {
        setTimeout(function() {
            $("#user-table").on("click", "tr", function() {
                var container = $(this);
                if (container.find("td.details").length === 0) {
                    setTimeout(function() {
                        container = container.next("tr");
                        var id = container.find(".user_id").val();
                        container.find(".button-container").append("<a class='icon-button light' data-localize='systemlogs.view-user-actions' href='#/manage/systemlogs/filter/{\"user_id\":\"" + id + "\"}'>" + jQuery.i18n.map["systemlogs.view-user-actions"] + "</a>");
                    }, 0);
                }
            });
        }, 1000);
    });
});