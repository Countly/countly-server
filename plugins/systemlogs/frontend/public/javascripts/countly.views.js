/*global countlyAuth, countlySystemLogs, countlyAttribution, countlyCrashes, moment, countlyCommon, countlyGlobal, app, $, jQuery, countlyVue, CV */

(function() {
    var FEATURE_NAME = "systemlogs";
    var SystemLogsViewExpanded = countlyVue.views.create({
        template: CV.T("/systemlogs/templates/logs-expanded.html"),
        props: {
            row: {
                type: Object,
                default: {}
            }
        },
        computed: {
            change: function() {
                if (typeof this.row.i.before !== "undefined" && typeof this.row.i.after !== "undefined") {
                    return true;
                }
                return false;
            }
        }
    });
    var SystemLogsView = countlyVue.views.create({
        template: CV.T('/systemlogs/templates/logs.html'),
        components: {
            "expand-table": SystemLogsViewExpanded
        },
        data: function() {
            var self = this;
            var tableStore = countlyVue.vuex.getLocalStore(countlyVue.vuex.ServerDataTable("systemLogsTable", {
                columns: ['_id', "ts", "u", "ip"],
                onRequest: function() {
                    self.loaded = false;
                    return {
                        type: "GET",
                        url: countlyCommon.API_URL + "/o",
                        data: {
                            app_id: countlyCommon.ACTIVE_APP_ID,
                            method: 'systemlogs',
                            period: countlyCommon.getPeriodForAjax(),
                            query: JSON.stringify(self.$route.params.query)
                        }
                    };
                },
                onReady: function(context, rows) {
                    self.loaded = true;
                    var row;
                    for (var i = 0; i < rows.length; i++) {
                        row = rows[i];
                        row.actionName = jQuery.i18n.map["systemlogs.action." + row.a] || row.a;
                        self.detailData[row._id] = row;
                        row.displayTs = moment(new Date(row.ts * 1000)).format("ddd, D MMM YYYY HH:mm:ss");
                        row.href = row.user_id ? "#/manage/users/" + row.user_id : "";
                        if (typeof row.i === "object") {
                            if (typeof row.i.app_id !== "undefined") {
                                if (typeof countlyGlobal.apps[row.i.app_id] !== "undefined") {
                                    row.app_name = jQuery.i18n.map["systemlogs.for-app"] + ": " + countlyGlobal.apps[row.i.app_id].name;
                                }
                                else {
                                    row.app_name = jQuery.i18n.map["systemlogs.for-app"] + ": " + row.i.app_id;
                                }
                            }
                            if (typeof row.i.user_id !== "undefined") {
                                row.user_name = (self.allUsers[row.i.user_id]) ? jQuery.i18n.map["systemlogs.for-user"] + ": " + self.allUsers[row.i.user_id] : jQuery.i18n.map["systemlogs.for-user"] + ": " + row.i.user_id;
                            }
                            if (typeof row.i.campaign_id !== "undefined" && typeof countlyAttribution !== "undefined") {
                                row.campaign_id = jQuery.i18n.map["systemlogs.for-campaign"] + ": " + countlyAttribution.getCampaignName(row.i.campaign_id);
                            }
                            if (typeof row.i.crash_id !== "undefined" && typeof countlyCrashes !== "undefined") {
                                row.crash_id = jQuery.i18n.map["systemlogs.for-crash"] + ": " + countlyCrashes.getCrashName(row.i.crash_id);
                            }
                            if (typeof row.i.appuser_id !== "undefined") {
                                row.appuser_id = jQuery.i18n.map["systemlogs.for-appuser"] + ": " + row.i.appuser_id;
                            }
                            if (typeof row.i._id !== "undefined") {
                                row.name = jQuery.i18n.map["systemlogs.for-id"] + ": " + row.i._id;
                                if (row.i.name) {
                                    row.name += " (" + row.i.name + ")";
                                }
                            }
                        }
                    }
                    return rows;
                }
            }));
            return {
                loaded: true,
                selectAction: this.$route.params.query.a || "all",
                selectUser: this.$route.params.query.user_id || "all",
                detailData: {},
                back: this.$route.params.back || false,
                tableStore: tableStore,
                allActions: {"all": jQuery.i18n.map["systemlogs.all-actions"]},
                allUsers: {"all": jQuery.i18n.map["systemlogs.all-users"]},
                remoteTableDataSource: countlyVue.vuex.getServerDataSource(tableStore, "systemLogsTable")
            };
        },
        beforeCreate: function() {
            var self = this;
            return $.when(countlySystemLogs.initialize())
                .then(function() {
                // get fetched sources datas
                    var meta = countlySystemLogs.getMetaData();
                    if (meta.action) {
                        for (var i = 0; i < meta.action.length; i++) {
                            self.allActions[meta.action[i]] = jQuery.i18n.map["systemlogs.action." + meta.action[i]] || meta.action[i];
                        }
                    }
                    if (meta.users) {
                        for (var j = 0; j < meta.users.length; j++) {
                            self.allUsers[meta.users[j]._id] = meta.users[j].full_name || meta.users[j].email;
                        }
                    }
                });
        },
        methods: {
            refresh: function(force) {
                if (this.loaded || force) {
                    this.loaded = false;
                    this.tableStore.dispatch("fetchSystemLogsTable");
                }
            },
            dateChange: function() {
                this.refresh(true);
            },
            goBack: function() {
                app.back();
            },
            changeAction: function(value) {
                if (value !== "all") {
                    this.$route.params.query.a = value;
                }
                else {
                    delete this.$route.params.query.a;
                }
                app.navigate("#/manage/systemlogs/query/" + JSON.stringify(this.$route.params.query));
                this.refresh(true);
            },
            changeUser: function(value) {
                if (value !== "all") {
                    this.$route.params.query.user_id = value;
                }
                else {
                    delete this.$route.params.query.user_id;
                }
                app.navigate("#/manage/systemlogs/query/" + JSON.stringify(this.$route.params.query));
                this.refresh(true);
            }
        }
    });

    //register views
    app.systemLogsView = new countlyVue.views.BackboneWrapper({
        component: SystemLogsView,
        vuex: [] //empty array if none
    });

    if (countlyAuth.validateRead(FEATURE_NAME)) {
        app.route('/manage/systemlogs', 'systemlogs', function() {
            this.systemLogsView.params = {query: {}};
            this.renderWhenReady(this.systemLogsView);
        });

        app.route('/manage/systemlogs/query/*query', 'systemlogs_query', function(query) {
            try {
                query = JSON.parse(query);
            }
            catch (ex) {
                query = {};
            }
            this.systemLogsView.params = {query: query};
            this.renderWhenReady(this.systemLogsView);
        });

        app.route('/manage/systemlogs/filter/*query', 'systemlogs_query', function(query) {
            try {
                query = JSON.parse(query);
            }
            catch (ex) {
                query = {};
            }
            this.systemLogsView.params = {query: query, back: true};
            this.renderWhenReady(this.systemLogsView);
        });

        app.addPageScript("/manage/compliance#", function() {
            if (app.activeView && app.activeView.tabs) {
                var ul = app.activeView.tabs.find("ul");
                $("<li><a href='#consent-actionlogs'>" + jQuery.i18n.map["consent.export-history"] + "</a></li>").appendTo(ul);
                $("<div id='consent-actionlogs'></div>").appendTo(app.activeView.tabs);
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
        if (countlyAuth.validateRead(FEATURE_NAME)) {
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

        if (app.configurationsView) {
            app.configurationsView.registerLabel('systemlogs', 'systemlogs.title');
            app.configurationsView.registerLabel('systemlogs.preventIPTracking', 'systemlogs.prevent-ip-tracking');
            app.configurationsView.registerInput("systemlogs.preventIPTracking", function(value) {
                var input = '<div class="on-off-switch">';

                if (value) {
                    input += '<input type="checkbox" name="on-off-switch" class="on-off-switch-checkbox" id="systemlogs.preventIPTracking" checked>';
                }
                else {
                    input += '<input type="checkbox" name="on-off-switch" class="on-off-switch-checkbox" id="systemlogs.preventIPTracking">';
                }

                input += '<label class="on-off-switch-label" for="systemlogs.preventIPTracking"></label>';
                input += '<span class="text">' + jQuery.i18n.map["plugins.enable"] + '</span>';
                input += "</div>";
                return input;
            });
        }
    });
})();