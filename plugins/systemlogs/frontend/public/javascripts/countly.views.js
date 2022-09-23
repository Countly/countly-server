/*global countlySystemLogs, countlyAttribution, countlyCrashes, moment, countlyCommon, countlyGlobal, app, $, jQuery, countlyVue, CV, countlyAuth */

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
                            query: JSON.stringify(self.parsedQuery)
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
                parsedQuery: {},
                selectAction: "all",
                selectUser: "all",
                detailData: {},
                back: false,
                tableStore: tableStore,
                allActions: [{"label": jQuery.i18n.map["systemlogs.all-actions"], value: "all"}],
                allUsers: [{"label": jQuery.i18n.map["systemlogs.all-users"], value: "all"}],
                remoteTableDataSource: countlyVue.vuex.getServerDataSource(tableStore, "systemLogsTable")
            };
        },
        props: {
            query: {
                default: function() {
                    return {};
                }
            }
        },
        watch: {
            query: {
                handler: function(newQuery) {
                    if (typeof newQuery === 'object') {
                        this.parsedQuery = {};
                    }
                    else if (newQuery && newQuery.indexOf('/') > -1) {
                        var parts = newQuery.split('/');
                        if (parts[0] === "filter") {
                            this.back = true;
                        }
                        try {
                            this.parsedQuery = JSON.parse(parts[1]);
                        }
                        catch (error) {
                            this.parsedQuery = {};
                        }
                        this.selectAction = this.parsedQuery.a || "all";
                        this.selectUser = this.parsedQuery.user_id || "all";
                    }
                },
                immediate: true
            }
        },
        beforeCreate: function() {
            var self = this;
            return $.when(countlySystemLogs.initialize())
                .then(function() {
                // get fetched sources datas
                    var meta = countlySystemLogs.getMetaData();
                    if (meta.action) {
                        for (var i = 0; i < meta.action.length; i++) {
                            self.allActions.push({label: jQuery.i18n.map["systemlogs.action." + meta.action[i]] || meta.action[i], value: meta.action[i]});
                        }
                    }
                    if (meta.users) {
                        for (var j = 0; j < meta.users.length; j++) {
                            self.allUsers.push({label: meta.users[j].full_name || meta.users[j].email, value: meta.users[j]._id});
                        }
                    }
                    self.allUsers = self.sortProperties(self.allUsers);
                    self.allActions = self.sortProperties(self.allActions);

                });
        },
        methods: {
            refresh: function(force) {
                if (this.loaded || force) {
                    this.loaded = false;
                    this.tableStore.dispatch("fetchSystemLogsTable", {_silent: !force});
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
                    this.parsedQuery.a = value;
                }
                else {
                    delete this.parsedQuery.a;
                }
                app.navigate("#/manage/logs/systemlogs/query/" + JSON.stringify(this.parsedQuery));
                this.refresh(true);
            },
            changeUser: function(value) {
                if (value !== "all") {
                    this.parsedQuery.user_id = value;
                }
                else {
                    delete this.parsedQuery.user_id;
                }
                app.navigate("#/manage/logs/systemlogs/query/" + JSON.stringify(this.parsedQuery));
                this.refresh(true);
            },
            getExportAPI: function() {
                var query, requestPath, apiQueryData;
                query = this.parsedQuery;
                requestPath = '/o?api_key=' + countlyGlobal.member.api_key +
                "&app_id=" + countlyCommon.ACTIVE_APP_ID + "&method=systemlogs&iDisplayStart=0&export=true" +
                "&query=" + encodeURIComponent(JSON.stringify(query)) +
                "&period=" + countlyCommon.getPeriodForAjax();
                apiQueryData = {
                    api_key: countlyGlobal.member.api_key,
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    path: requestPath,
                    method: "GET",
                    filename: "Auditlogs_on_" + moment().format("DD-MMM-YYYY"),
                    prop: ['aaData']
                };
                return apiQueryData;
            },
            sortProperties: function(arr) {
                arr.sort(function(a, b) {
                    if (a.value === "all") {
                        return -1;
                    }
                    if (b.value === "all") {
                        return 1;
                    }
                    var x = a.label.toLowerCase(),
                        y = b.label.toLowerCase();
                    return x < y ? -1 : x > y ? 1 : 0;
                });
                return arr;
            },
            handleTableRowClick: function(row) {
                // Only expand row if text inside of it are not highlighted
                if (window.getSelection().toString().length === 0) {
                    this.$refs.table.$refs.elTable.toggleRowExpansion(row);
                }
            },
            tableRowClassName: function() {
                return 'bu-is-clickable';
            }
        }
    });

    if (countlyAuth.validateGlobalAdmin()) {
        countlyVue.container.registerTab("/manage/logs", {
            priority: 2,
            route: "#/manage/logs/systemlogs",
            component: SystemLogsView,
            title: "Audit Logs",
            name: "systemlogs",
            permission: FEATURE_NAME,
            vuex: []
        });

        app.addRefreshScript("/manage/compliance#", function() {
            if (app.activeView.dtableactionlogs) {
                app.activeView.dtableactionlogs.fnDraw(false);
            }
        });
    }
})();