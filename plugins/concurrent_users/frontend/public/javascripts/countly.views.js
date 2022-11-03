/*global $,countlyGlobal, countlyCommon,app,countlyConcurrentUsers,countlyLive,_,countlyVue,CV,moment, CountlyHelpers, store*/

(function() {
    var FEATURE_NAME = "concurrent_users";
    var OnlineUsersView = countlyVue.views.create({
        template: CV.T("/concurrent_users/templates/online_users.html"),
        data: function() {
            return {
                description: CV.i18n('concurrent-users.online-users-desc'),
                description2: CV.i18n('concurrent-users.real-time-desc'),
                tableData: [],
                drillDisabled: false,
                drillCalculating: false,
                topData: [],
                highLow: {"high": [], "low": []},
                maximumOnlineUsers: {},
                realTimeGraphs: this.calculateRealTimeGraphs(),
                onlineCount: 0,
                maxOnlineCount: "",
                isLoading: true
            };
        },
        mounted: function() {
            var self = this;
            var promises = countlyConcurrentUsers.initialize(true);
            promises.push(countlyLive.initialize());
            Promise.all(promises).then(function() {
                self.calculateAllData();
                self.isLoading = false;
            });
        },
        methods: {
            refresh: function() {
                var self = this;
                var promises = countlyConcurrentUsers.initialize();
                promises.push(countlyLive.initialize());
                Promise.all(promises).then(function() {
                    self.calculateAllData();
                    self.isLoading = false;
                });
            },
            calculateAllData: function() {
                this.topData = this.calculateTopData();
                this.highLow = this.calculateHighLow();
                this.maximumOnlineUsers = this.calculateMaxOnlineUsers();
                this.realTimeGraphs = this.calculateRealTimeGraphs();

                var onlineUserCounts = countlyLive.getOnlineUsers();
                this.onlineCount = countlyCommon.formatNumber(onlineUserCounts.o);
                this.maxOnlineCount = countlyCommon.formatNumber(onlineUserCounts.mo);
            },
            calculateHighLow: function() {
                var days = countlyConcurrentUsers.getGraphData(countlyCommon.ACTIVE_APP_ID + ":d");
                var formatter = function(e) {
                    return {l: e.l, v: countlyCommon.formatNumber(e.v)};
                };
                days.sorted = days.sorted || [];
                var high = days.sorted.slice(0, 3).map(formatter);
                var low = days.sorted.slice(days.sorted.length - 3).map(formatter);
                return {"high": high, "low": low};
            },
            calculateTopData: function() {
                var topData = countlyConcurrentUsers.getMetricTops();

                for (var k = 0; k < topData.length; k++) {
                    if (topData[k].metric) {
                        topData[k].name = CV.i18n("concurrent-users.top." + topData[k].metric) || topData[k].name;
                        topData[k].description = CV.i18n("concurrent-users.top." + topData[k].metric + "-desc") || "";
                    }
                    topData[k].bars = topData[k].bars.filter(function(a) {
                        return a.percent > 0;
                    });
                    for (var z = 0; z < topData[k].bars.length; z++) {
                        topData[k].bars[z].bar = [{percentage: topData[k].bars[z].percent, color: "#017AFF"}];
                    }
                }
                return topData;

            },
            calculateMaxOnlineUsers: function() {
                var days = countlyConcurrentUsers.getGraphData(countlyCommon.ACTIVE_APP_ID + ":d");

                var labels = [];
                var data = [];
                for (var k = 0; k < days.points.length; k++) {
                    labels.push(days.points[k].lshort || days.points[k].l);
                    data.push(days.points[k].v);
                }
                return {"xAxis": {"data": labels}, series: [{"name": CV.i18n('common.users'), "data": data}]};
            },
            calculateRealTimeGraphs: function() {

                var retObj = {};
                var graphDataHour = countlyConcurrentUsers.getGraphData(countlyCommon.ACTIVE_APP_ID + ":h");
                var labels = [];
                var data = [];

                for (var k = 0; k < graphDataHour.points.length; k++) {
                    labels.push(CV.i18n('concurrent-users.widget-hours', "- " + ((graphDataHour.points.length - k) / 2)));
                    data.push(graphDataHour.points[k].v);
                }
                retObj.hours = {"avg": countlyCommon.formatNumber(graphDataHour.avg), "yAxis": {minInterval: 1, splitNumber: 3}, "xAxis": {"data": labels}, series: [{"name": CV.i18n('common.online-users'), "data": data, "color": "#FF9045"}]};

                var graphDataMinute = countlyConcurrentUsers.getGraphData(countlyCommon.ACTIVE_APP_ID + ":m");

                var labels2 = [];
                var data2 = [];

                for (var k2 = 0; k2 < graphDataMinute.points.length; k2++) {
                    labels2.push(CV.i18n('concurrent-users.widget-minutes', "- " + (graphDataMinute.points.length - k2)));
                    data2.push(graphDataMinute.points[k2].v);
                }
                retObj.minutes = {"avg": countlyCommon.formatNumber(graphDataMinute.avg), "yAxis": {minInterval: 1, splitNumber: 3}, "xAxis": {"data": labels2}, series: [{"name": CV.i18n('common.online-users'), "data": data2, "color": "#39C0C8"}]};

                var minData = countlyConcurrentUsers.getGraphData(countlyCommon.ACTIVE_APP_ID + ":m").points.map(function(x) {
                    return x.v;
                });
                var sparkPoints = minData.slice(Math.max(0, minData.length - 10), minData.length);

                retObj.now = {
                    "yAxis": {"show": false, axisLabel: {inside: true}, axisTick: { inside: true}},
                    "xAxis": {"data": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"], "show": false, axisLabel: {inside: true}, axisTick: { inside: true}},
                    series: [{
                        "name": CV.i18n('common.users'),
                        "data": sparkPoints,
                        areaStyle: {
                            color: {
                                type: 'linear',
                                x: 0,
                                y: 0,
                                x2: 0,
                                y2: 1,
                                colorStops: [{
                                    offset: 0, color: 'rgba(88,160,253,1)'
                                }, {
                                    offset: 0.5, color: 'rgba(88,160,253,0.7)'
                                }, {
                                    offset: 1, color: 'rgba(88,160,253,0)'
                                }]
                            }
                        },
                    }]
                };


                return retObj;
            }
        },
        computed: {
            topDropdown: function() {
                if (this.externalLinks && Array.isArray(this.externalLinks) && this.externalLinks.length > 0) {
                    return this.externalLinks;
                }
                else {
                    return null;
                }
            }
        },
        mixins: [
            countlyVue.container.dataMixin({
                'externalLinks': '/analytics/online-users/links'
            })
        ]
    });


    var CompareOnlineUsersView = countlyVue.views.create({
        template: CV.T("/concurrent_users/templates/compare_online_users.html"),
        data: function() {
            return {
                maxLimit: 5,
                selectedApps: countlyConcurrentUsers.getCompareApps(true),
                appGraphs: [],
                tableData: [],
                isLoading: false
            };
        },
        mounted: function() {
            var self = this;
            countlyConcurrentUsers.setMode("compare");
            Promise.all(countlyConcurrentUsers.initialize(true)).then(function() {
                self.calculateData();
            });
        },
        methods: {
            refresh: function(force) {
                var self = this;
                if (force) {
                    this.isLoading = true;
                }
                Promise.all(countlyConcurrentUsers.initialize(true)).then(function() {
                    self.calculateData();
                    self.isLoading = false;
                });
            },
            compareApps: function() {
                countlyConcurrentUsers.setCompareApps(this.selectedApps);
                this.refresh(true);
            },
            calculateData: function() {
                var compareApps = countlyConcurrentUsers.getCompareApps();

                if (compareApps.length === 0) {
                    return;
                }
                var tableData = _.map(compareApps, function(id) {
                    var dd = countlyConcurrentUsers.getGraphData(id + ":d");
                    var min = 0;
                    var max = 0;
                    if (dd && dd.min && dd.min.v) {
                        min = dd.min.v;
                    }
                    if (dd && dd.max && dd.max.v) {
                        max = dd.max.v;
                    }
                    return {
                        app: countlyGlobal.apps[id].name || id,
                        o: countlyConcurrentUsers.getCount(id),
                        h: countlyConcurrentUsers.getGraphData(id + ":h").avg,
                        m: countlyConcurrentUsers.getGraphData(id + ":m").avg,
                        dh: max,
                        dl: min
                    };
                });
                this.tableData = tableData;
                var newGraphs = [];
                for (var k = 0; k < compareApps.length; k++) {
                    if (countlyGlobal.apps[compareApps[k]]) {

                        var graphDataHour = countlyConcurrentUsers.getGraphData(compareApps[k] + ":h");
                        var labels = [];
                        var data = [];

                        for (var z = 0; z < graphDataHour.points.length; z++) {
                            labels.push(CV.i18n('concurrent-users.widget-hours', "- " + ((graphDataHour.points.length - z) / 2)));
                            data.push(graphDataHour.points[z].v);
                        }

                        newGraphs.push({
                            "appdata": {"image": 'background-image: url("' + (countlyGlobal.apps[compareApps[k]].image || 'appimages/' + compareApps[k] + '.png') + '")', "name": countlyGlobal.apps[compareApps[k]].name, "_id": compareApps[k]},
                            "graph": {
                                "n": countlyCommon.formatNumber(countlyConcurrentUsers.getCount(compareApps[k])),
                                "avg": countlyCommon.formatNumber(graphDataHour.avg),
                                "xAxis": {"data": labels},
                                "yAxis": {splitNumber: 2, minInterval: 1},
                                series: [{"name": CV.i18n('common.online-users'), "data": data, "color": "#39C0C8"}]
                            }
                        });
                    }
                }

                for (var k2 = 0; k2 < graphDataHour.points.length; k2++) {
                    labels.push(CV.i18n('concurrent-users.widget-hours', "- " + ((graphDataHour.points.length + 1 - k2) / 2)));
                    data.push(graphDataHour.points[k2].v);
                }

                this.appGraphs = newGraphs;
            }

        },
        computed: {
            topDropdown: function() {
                if (this.externalLinks && Array.isArray(this.externalLinks) && this.externalLinks.length > 0) {
                    return this.externalLinks;
                }
                else {
                    return null;
                }
            },
            allApps: function() {
                var apps = [];
                for (var appid in countlyGlobal.apps) {
                    apps.push({"value": appid, "name": countlyGlobal.apps[appid].name});
                }
                return apps;
            }
        },
        mixins: [
            countlyVue.container.dataMixin({
                'externalLinks': '/analytics/online-users/links'
            }),
            countlyVue.mixins.commonFormatters
        ]
    });


    var ConcurrentDashboardWidget = countlyVue.views.create({
        template: CV.T("concurrent_users/templates/concurrentHomeWidget.html"),
        mixins: [ countlyVue.mixins.commonFormatters],
        data: function() {
            var ts = moment().valueOf();
            ts = Math.round(ts / 1000) - 60 * 60;

            return {
                timeGraph: {"series": []},
                liveGraphs: [],
                userLink: '#/users/request/{"app_id":"' + countlyCommon.ACTIVE_APP_ID + '","event":"[CLY]_session","method":"segmentation_users","queryObject":"{\\"up.ls\\":{\\"$gte\\":' + ts + '}}","period":"hour","bucket":"daily","projectionKey":[]}',
                headerData: {
                    label: CV.i18n("concurrent-users.real-time"),
                    description: CV.i18n("concurrent-users.title-desc"),
                    linkTo: {"label": CV.i18n('concurrent-users.go-to-online-users'), "href": "#/analytics/users/online-users"},
                }
            };
        },
        mounted: function() {
            var self = this;
            $.when(countlyLive.initialize()).then(function() {
                self.calculateAllData();
            });
        },
        computed: {
            haveLink: function() {
                if (countlyGlobal.plugins && countlyGlobal.plugins.indexOf("drill") > -1 && countlyGlobal.plugins.indexOf("users") > -1) {
                    return true;
                }
                else {
                    return false;
                }
            }
        },
        methods: {
            refresh: function() {
                var self = this;
                $.when(countlyLive.initialize()).then(function() {
                    self.calculateAllData();
                });
            },
            calculateAllData: function() {

                //setting up live gauge data
                var onlineUserCounts = countlyLive.getOnlineUsers();

                this.liveGraphs = [
                    {"title": CV.i18n("common.online-users"), "value": onlineUserCounts.o, "max": countlyCommon.getShortNumber(Math.max(onlineUserCounts.o, onlineUserCounts.mo)), "color": "#017AFF"},
                    {"title": CV.i18n("common.table.new-users"), "value": onlineUserCounts.n, "max": countlyCommon.getShortNumber(Math.max(onlineUserCounts.n, onlineUserCounts.mn)), "color": "#FF9382"}
                ];

                this.liveGraphs[0].number = (onlineUserCounts.o || 0) / (Math.max(onlineUserCounts.o, onlineUserCounts.mo) || 1) * 100;
                this.liveGraphs[1].number = (onlineUserCounts.n || 0) / (Math.max(onlineUserCounts.n, onlineUserCounts.mn) || 1) * 100;



                var data = [];
                var data2 = [];
                var labels = [];
                var liveGraphData = countlyLive.getOnlineUsersGraphData();
                for (var i = 0; i < liveGraphData.length; i++) {
                    labels.push((i - 60) + " min");
                    data.push(liveGraphData[i].o);
                    data2.push(liveGraphData[i].n);
                }
                this.timeGraph = {
                    "yAxis": { axisTick: { inside: true}, splitNumber: 2, minInterval: 1},
                    "xAxis": {"data": labels, "show": true, axisLabel: {margin: 0}},
                    series: [
                        {
                            "name": CV.i18n('common.online-users'),
                            "type": "bar",
                            barGap: '-100%',
                            "data": data,
                            color: "#017AFF",
                            itemStyle: {
                                color: "#cce4ff",
                                borderWidth: 2,
                                borderColor: "#017AFF",
                            },
                        },
                        {
                            "name": CV.i18n('common.table.new-users'),
                            "data": data2,
                            color: "#FFC1B8",
                            itemStyle: {
                                color: "#FFC1B8",
                                borderWidth: 2,
                                borderColor: "#FF9382",
                            },
                        },
                    ]
                };
            }
        }
    });


    var GridComponent = countlyVue.views.create({
        template: CV.T('/concurrent_users/templates/widget.html'),
        mixins: [countlyVue.mixins.customDashboards.global],
        computed: {
            title: function() {
                if (this.data.title) {
                    return this.data.title;
                }
                if (this.data.metrics && this.data.metrics[0] === 'max') {
                    return countlyGlobal.apps[this.data.apps].type === "web" ? CV.i18n('web.concurrent-users.max-online') : CV.i18n('mobile.concurrent-users.max-online');
                }
                else {
                    return countlyGlobal.apps[this.data.apps].type === "web" ? CV.i18n('web.concurrent-users.real-time') : CV.i18n('mobile.concurrent-users.real-time');
                }
            },
            widgetData: function() {
                this.data = this.data || {};
                this.data.dashData = this.data.dashData || {};
                this.data.dashData.data = this.data.dashData.data || {};
                var graph = this.data.dashData.data.graphData || {};
                var dd = [];
                var labels = [];
                var title = this.i18n("concurrent-users.real-time");
                this.data.period = '30days';

                if (this.data.mode === "max") {
                    title = this.i18n("concurrent-users.max-online");
                    graph.ns_o = graph.ns_o || [];
                    for (var z = 0; z < graph.ns_o.length; z++) {
                        var iid = graph.ns_o[z]._id.split('_') || [];
                        var key = moment(iid[1] || "", 'YYYYMMDD').format("MM/DD");
                        labels.push(key);
                        dd.push(graph.ns_o[z].mx);
                    }
                }
                else {
                    var aa = this.data.apps[0] + ":m";
                    graph = graph[aa] || {};
                    graph.p = graph.p || [];

                    for (var zz = 0; zz < graph.p.length; zz++) {
                        dd.push(graph.p[zz]);
                        labels.push(CV.i18n('concurrent-users.widget-minutes', "- " + (graph.p.length - zz)));
                    }
                }
                return {
                    "series": [{"data": dd, "color": "#F5C900", "name": title}],
                    "xAxis": {"data": labels}
                };
            }
        }
    });

    var DrawerComponent = countlyVue.views.create({
        template: "#concurrentusers-drawer",
        data: function() {
            return {};
        },
        computed: {
            metrics: function() {
                return [
                    { label: this.i18n("concurrent-users.real-time"), value: "last" },
                    { label: this.i18n("concurrent-users.max-online"), value: "max" }
                ];

            }
        },
        mounted: function() {
            if (this.scope.editedObject.breakdowns.length === 0) {
                this.scope.editedObject.breakdowns = ['online'];
            }
        },
        methods: {
            onDataTypeChange: function(v) {
                var widget = this.scope.editedObject;
                this.$emit("reset", {widget_type: widget.widget_type, data_type: v});
            },
            onBreakdownChange: function(v) {
                var widget = this.scope.editedObject;
                this.$emit("reset", {widget_type: widget.widget_type, data_type: widget.data_type, breakdowns: [v]});
            }
        },
        props: {
            scope: {
                type: Object,
                default: function() {
                    return {};
                }
            }
        }
    });

    countlyVue.container.registerData("/custom/dashboards/widget", {
        type: "analytics",
        label: CV.i18n("concurrent-users.title"),
        priority: 1,
        primary: false,
        getter: function(widget) {
            return widget.widget_type === "analytics" && widget.data_type === "user-analytics" && widget.breakdowns && Array.isArray(widget.breakdowns) && widget.breakdowns[0] === 'online';
        },
        templates: [
            {
                namespace: "concurrentusers",
                mapping: {
                    "drawer": "/concurrent_users/templates/widgetDrawer.html"
                }
            }
        ],
        drawer: {
            component: DrawerComponent,
            getEmpty: function() {
                return {
                    title: "",
                    feature: FEATURE_NAME,
                    widget_type: "analytics",
                    data_type: "user-analytics",
                    app_count: 'single',
                    metrics: [],
                    apps: [],
                    visualization: "",
                    color: 0,
                    breakdowns: ['online'],
                    isPluginWidget: true

                };
            },
            beforeLoadFn: function() {
            },
            beforeSaveFn: function() {
            }
        },
        grid: {
            component: GridComponent
        }

    });


    countlyVue.container.registerTab("/analytics/users", {
        priority: 2,
        permission: FEATURE_NAME,
        route: "#/analytics/users/online-users",
        name: "online-users",
        title: 'concurrent-users.title',
        component: OnlineUsersView,
        vuex: []
    });
    var compareOnlineView = new countlyVue.views.BackboneWrapper({
        component: CompareOnlineUsersView,
        vuex: []
    });

    app.compareOnlineView = compareOnlineView;

    app.route("/analytics/users/online-users/compare", "views", function() {
        var params = {};
        this.compareOnlineView.params = params;
        this.renderWhenReady(this.compareOnlineView);
    });

    app.configurationsView.registerLabel("concurrent_users_reset", CV.i18n("management-applications.user-reset"));

    app.addAppManagementInput("concurrent_users_reset",
        CV.i18n('concurrent-users.app-settings-title'),
        {
            "concurrent_users_reset":
            {
                input: "el-button",
                label: CV.i18n('concurrent-users.reset'),
                click: function() {
                    CountlyHelpers.confirm(CV.i18n('concurrent-users.reset-subtitle'), "red", function(result) {
                        if (!result) {
                            return true;
                        }
                        var urlParams = store.get("countly_fragment_name");
                        var selectedAppId = urlParams.split('/manage/apps/')[1];
                        countlyConcurrentUsers.resetMaxValue({
                            app_id: selectedAppId || countlyCommon.ACTIVE_APP_ID,
                            callback: function(success) {
                                if (success) {
                                    CountlyHelpers.notify({
                                        message: CV.i18n('concurrent-users.reset-message-success'),
                                        type: 'success'
                                    });
                                }
                                else {
                                    CountlyHelpers.notify({
                                        message: CV.i18n('concurrent-users.reset-message-error'),
                                        type: 'error'
                                    });
                                }
                            }
                        });
                    }, [CV.i18n('common.no'), CV.i18n('concurrent-users.reset-yes')], {title: CV.i18n('concurrent-users.reset-title'), image: 'delete-an-app'});
                },
                attrs: {type: "danger", disabled: false}
            }
        });

    countlyVue.container.registerData("/home/widgets", {
        _id: "concurrent-dashboard-widget",
        permission: FEATURE_NAME,
        label: CV.i18n('concurrent-users.real-time'),
        enabled: {"default": true}, //object. For each type set if by default enabled
        available: {"default": true}, //object. default - for all app types. For other as specified.
        order: 1, //sorted by ascending
        placeBeforeDatePicker: true,
        component: ConcurrentDashboardWidget,
    });
})();