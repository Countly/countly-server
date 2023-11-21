/* global countlyVue,CV,countlyCommon, CommonConstructor, $, countlySession,countlyTotalUsers,app, jQuery, countlyGraphNotesCommon*/
var UserAnalyticsOverview = countlyVue.views.create({
    template: CV.T("/core/user-analytics-overview/templates/overview.html"),
    data: function() {
        return {
            description: CV.i18n('user-analytics.overview-desc'),
            tableData: [],
            graphOptions: this.createSeries(),
            lineLegend: this.createLineLegend(),
            lineOptions: this.createSeries(),
            isLoading: true
        };
    },
    mounted: function() {
        var self = this;
        $.when(countlySession.initialize(), countlyTotalUsers.initialize("users")).then(function() {
            self.calculateAllData();
            self.isLoading = false;
        });
    },
    methods: {
        refresh: function(force) {
            var self = this;
            if (force) {
                self.isLoading = true;
            }
            $.when(countlySession.initialize(), countlyTotalUsers.initialize("users")).then(function() {
                self.calculateAllData();
                self.isLoading = false;
            });
        },
        calculateAllData: function() {
            var userDP = countlySession.getUserDP();
            this.lineOptions = this.createSeries(userDP.chartDP);
            this.tableData = this.calculateTableData();
            this.lineLegend = this.createLineLegend();
        },
        formatExportFunction: function() {
            var userDP = countlySession.getUserDP();
            var table = [];
            for (var k = 0; k < userDP.chartData.length; k++) {
                var item = {};
                item[CV.i18n('common.date')] = userDP.chartData[k].date;
                item[CV.i18n('common.table.total-users')] = userDP.chartData[k].u;
                item[CV.i18n('common.table.new-users')] = userDP.chartData[k].n;
                item[CV.i18n('common.table.returning-users')] = userDP.chartData[k].returning;
                table.push(item);
            }
            return table;

        },
        calculateTableData: function() {
            var userDP = countlySession.getUserDP();
            for (var k = 0; k < userDP.chartData.length; k++) {
                userDP.chartData[k].dateVal = k; //because we get them all always sorted by date
            }
            return userDP.chartData;
        },
        createSeries: function(data) {
            var series = [];

            if (data) {
                for (var k = 0; k < data.length; k++) {
                    series.push({"name": data[k].label, data: this.fixArray(data[k].data)});
                }
            }
            else {
                series.push({"name": CV.i18n('common.table.total-users'), data: []});
                series.push({"name": CV.i18n('common.table.new-users'), data: []});
                series.push({"name": CV.i18n('common.table.returning-users'), data: []});
            }

            return {series: series};
        },
        fixArray: function(array) {
            var aa = [];
            for (var k = 0; k < array.length; k++) {
                aa.push(array[k][1]);
            }
            return aa;
        },
        createLineLegend: function() {

            var sessionData = countlySession.getSessionData();
            sessionData = sessionData || {};
            sessionData.usage = sessionData.usage || {};
            sessionData.usage["total-users"] = sessionData.usage["total-users"] || {};
            sessionData.usage["new-users"] = sessionData.usage["new-users"] || {};
            sessionData.usage["returning-users"] = sessionData.usage["returning-users"] || {};

            var legend = {"type": "primary", data: []};

            legend.data = [
                {
                    "name": jQuery.i18n.map["common.table.total-users"],
                    "value": countlyCommon.formatNumber(sessionData.usage["total-users"].total),
                    "trend": (sessionData.usage["total-users"].trend === "d" ? "down" : "up"),
                    "tooltip": CV.i18n("common.table.total-users-desc"),
                    "percentage": sessionData.usage["total-users"].change,
                    "isEstimate": sessionData.usage["total-users"].isEstimate,
                    "estimateTooltip": CV.i18n("users.total-users-estimate-tooltip")
                },
                {
                    "name": jQuery.i18n.map["common.table.new-users"],
                    "value": countlyCommon.formatNumber(sessionData.usage["new-users"].total),
                    "trend": (sessionData.usage["new-users"].trend === "d" ? "down" : "up"),
                    "tooltip": CV.i18n("common.table.new-users-desc"),
                    "percentage": sessionData.usage["new-users"].change
                },
                {
                    "name": jQuery.i18n.map["common.table.returning-users"],
                    "value": countlyCommon.formatNumber(sessionData.usage["returning-users"].total),
                    "trend": (sessionData.usage["returning-users"].trend === "d" ? "down" : "up"),
                    "tooltip": CV.i18n("common.table.returning-users-desc"),
                    "percentage": sessionData.usage["returning-users"].change
                }
            ];

            return legend;
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
    },
    mixins: [
        countlyVue.container.dataMixin({
            'externalLinks': '/analytics/users/links'
        }),
        countlyVue.mixins.commonFormatters
    ]
});

var UserAnalyticsView = countlyVue.views.create({
    template: CV.T("/core/user-analytics-overview/templates/user-analytics.html"),
    mixins: [
        countlyVue.container.tabsMixin({
            "userAnalyticsTabs": "/analytics/users"
        })
    ].concat(countlyVue.container.mixins(["/analytics/users"])),
    data: function() {
        return {
            selectedTab: (this.$route.params && this.$route.params.tab) || "overview"
        };
    },
    computed: {
        tabs: function() {
            return this.userAnalyticsTabs;
        }
    }
});

var getUserAnalyticsView = function() {
    var tabsVuex = countlyVue.container.tabsVuex(["/analytics/users"]);
    return new countlyVue.views.BackboneWrapper({
        component: UserAnalyticsView,
        vuex: tabsVuex,
        templates: []
    });
};
app.route("/analytics/users", "user-analytics", function() {
    var ViewWrapper = getUserAnalyticsView();
    this.renderWhenReady(ViewWrapper);
});


app.route("/analytics/users/*tab", "user-analytics-tab", function(tab) {
    var ViewWrapper = getUserAnalyticsView();
    var params = {
        tab: tab
    };
    ViewWrapper.params = params;
    this.renderWhenReady(ViewWrapper);
});
//Analytics->User analytics - overview widget
var GridComponent = countlyVue.views.create({
    template: CV.T('/dashboards/templates/widgets/analytics/widget.html'), //using core dashboard widget template
    mixins: [countlyVue.mixins.customDashboards.global, countlyVue.mixins.customDashboards.widget, countlyVue.mixins.customDashboards.apps, countlyVue.mixins.zoom, countlyVue.mixins.hasDrawers("annotation"), countlyVue.mixins.graphNotesCommand],
    components: {
        "drawer": countlyGraphNotesCommon.drawer
    },
    data: function() {
        return {
            showBuckets: false,
            map: {
                "u": this.i18n("common.table.total-users"),
                "r": this.i18n("common.table.returning-users"),
                "n": this.i18n("common.table.new-users")
            },
        };
    },
    computed: {
        title: function() {
            if (this.data.title) {
                return this.data.title;
            }

            return this.i18n("user-analytics.overview-title");
        },
        metricLabels: function() {
            this.data = this.data || {};
            var listed = [];

            for (var k = 0; k < this.data.metrics.length; k++) {
                listed.push(this.map[this.data.metrics[k]] || this.data.metrics[k]);
            }
            return listed;
        },
        timelineGraph: function() {
            this.data = this.data || {};
            this.data.dashData = this.data.dashData || {};
            this.data.dashData.data = this.data.dashData.data || {};

            var series = [];
            var dates = [];
            var appIndex = 0;
            var multiApps = false;
            if (Object.keys(this.data.dashData.data).length > 0) {
                multiApps = true;
            }

            for (var app in this.data.dashData.data) {
                for (var k = 0; k < this.data.metrics.length; k++) {
                    var name = this.map[this.data.metrics[k]] || this.data.metrics[k];

                    if (multiApps) {
                        name = (this.__allApps[app] && this.__allApps[app].name || app) + " (" + name + ")";
                    }
                    series.push({ "data": [], "name": name, "app": app, "metric": this.data.metrics[k], color: countlyCommon.GRAPH_COLORS[series.length]});
                }
                for (var date in this.data.dashData.data[app]) {
                    if (appIndex === 0) {
                        dates.push(date);
                    }
                    for (var kk = 0; kk < this.data.metrics.length; kk++) {
                        if (this.data.metrics[kk] === 'r') {
                            var vv = this.data.dashData.data[app][date].u - this.data.dashData.data[app][date].n;
                            series[appIndex * this.data.metrics.length + kk].data.push(vv);
                        }
                        else {
                            series[appIndex * this.data.metrics.length + kk].data.push(this.data.dashData.data[app][date][this.data.metrics[kk]] || 0);
                        }
                    }
                }
                appIndex++;
            }
            if (this.data.custom_period) {
                return {
                    lineOptions: {xAxis: { data: dates}, "series": series, patchXAxis: false}
                };
            }
            else if (countlyCommon && countlyCommon.periodObj && countlyCommon.periodObj.daysInPeriod === 1 && countlyCommon.periodObj.isSpecialPeriod === true) {
                dates = [dates[0] + " 00:00", dates[0] + " 24:00"];
                for (var z = 0; z < series.length; z++) {
                    series[z].data.push(series[z].data[0]);
                }
                return {
                    lineOptions: {xAxis: { data: dates}, "series": series, patchXAxis: false}
                };
            }
            else {
                var xAxisData = [];
                var period = countlyCommon && countlyCommon.getPeriod();

                var chartsCommon = new CommonConstructor();
                chartsCommon.setPeriod(period, undefined, true);
                var tickObj = chartsCommon.getTickObj(undefined, false, true);
                var ticks = tickObj.ticks;
                for (var i = 0; i < ticks.length; i++) {
                    var tick = ticks[i];
                    var tickIndex = tick[0];
                    var tickValue = tick[1];
                    while (xAxisData.length < tickIndex) {
                        xAxisData.push("");
                    }
                    xAxisData.push(tickValue);
                }

                return {
                    lineOptions: {"series": series, xAxis: { data: xAxisData }, patchXAxis: false},
                };
            }
        },
        stackedBarTimeSeriesOptions: function() {
            return this.timelineGraph.lineOptions;
        },
        stackedBarOptions: function() {
            var data = this.timelineGraph;
            for (var k = 0; k < data.lineOptions.series.length; k++) {
                data.lineOptions.series[k].stack = "A";
            }
            return data.lineOptions;
        },
        number: function() {
            this.data = this.data || {};
            var mm = 'u';
            if (this.data && this.data.metrics && this.data.metrics[0]) {
                mm = this.data.metrics[0];
            }
            var value = {};
            this.data.dashData = this.data.dashData || {};
            this.data.dashData.data = this.data.dashData.data || {};
            for (var app in this.data.dashData.data) {
                value = this.data.dashData.data[app];
                if (mm === 'r') {
                    var returning = {"trend": "u"};
                    if (value.u && value.n) {
                        returning.total = (value.u.total || 0) - (value.n.total || 0);
                        returning["prev-total"] = (value.u["prev-total"] || 0) - (value.n["prev-total"] || 0);
                    }
                    else {
                        returning.total = 0;
                        returning["prev-total"] = 0;
                    }
                    if (returning["prev-total"] > returning.total) {
                        returning.trend = "d";
                    }
                    returning.change = countlyCommon.getPercentChange(returning["prev-total"], returning.total);
                    returning.trend = returning.change.trend;
                    returning.change = returning.change.percent;

                    value.r = returning;
                }
                if (value[mm]) {
                    value = value[mm];
                }
            }
            return value;
        },
        legendLabels: function() {
            var labels = {};

            var graphData = this.timelineGraph;
            var series = graphData.lineOptions.series;

            for (var i = 0; i < series.length; i++) {
                if (!labels[series[i].app]) {
                    labels[series[i].app] = [];
                }

                labels[series[i].app].push({
                    appId: series[i].app,
                    color: series[i].color,
                    label: this.map[series[i].metric] || series[i].metric
                });
            }

            return labels;
        }
    },
    methods: {
        refresh: function() {
            this.refreshNotes();
        },
        valFormatter: countlyCommon.getShortNumber,
        onWidgetCommand: function(event) {
            if (event === 'add' || event === 'manage' || event === 'show') {
                this.graphNotesHandleCommand(event);
                return;
            }
            else if (event === 'zoom') {
                this.triggerZoom();
                return;
            }
            else {
                return this.$emit('command', event);
            }
        },
    }
});

var DrawerComponent = countlyVue.views.create({
    template: "#usersoverview-drawer",
    data: function() {
        return {
        };
    },
    computed: {
        metrics: function() {
            return [
                { label: this.i18n("common.table.total-users"), value: "u" },
                { label: this.i18n("common.table.new-users"), value: "n" },
                { label: this.i18n("common.table.returning-users"), value: "r" }
            ];
        },
        enabledVisualizationTypes: function() {
            if (this.scope.editedObject.app_count === 'single') {
                return ['time-series', 'bar-chart', 'number'];
            }
            else if (this.scope.editedObject.app_count === 'multiple') {
                return ['time-series', 'bar-chart'];
            }
            else {
                return [];
            }
        },
        isMultipleMetric: function() {
            var multiple = false;
            var appCount = this.scope.editedObject.app_count;
            var visualization = this.scope.editedObject.visualization;

            if (appCount === 'single') {
                if (visualization === 'bar-chart' || visualization === 'time-series') {
                    multiple = true;
                }
            }

            return multiple;
        },
    },
    mounted: function() {
        if (this.scope.editedObject.breakdowns.length === 0) {
            this.scope.editedObject.breakdowns = ['overview'];
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
    label: CV.i18n("user-analytics.overview-title"),
    priority: 1,
    primary: false,
    getter: function(widget) {
        var kk = widget.breakdowns || [];
        if (widget.widget_type === "analytics" && widget.data_type === "user-analytics" && (kk.length === 0 || kk[0] === 'overview' || (kk[0] !== "active" && kk[0] !== "online"))) {
            return true;
        }
        else {
            return false;
        }
    },
    templates: [
        {
            namespace: "usersoverview",
            mapping: {
                "drawer": "/core/user-analytics-overview/templates/widgetDrawer.html"
            }
        }
    ],
    drawer: {
        component: DrawerComponent,
        getEmpty: function() {
            return {
                title: "",
                feature: "core",
                widget_type: "analytics",
                data_type: "user-analytics",
                app_count: 'single',
                metrics: [],
                apps: [],
                visualization: "",
                breakdowns: ['overview'],
                custom_period: null
            };
        },
        beforeLoadFn: function(/*doc, isEdited*/) {
        },
        beforeSaveFn: function(/*doc*/) {
        }
    },
    grid: {
        component: GridComponent,
        dimensions: function() {
            return {
                minWidth: 2,
                minHeight: 4,
                width: 2,
                height: 4
            };
        }
    }

});


countlyVue.container.registerTab("/analytics/users", {
    priority: 1,
    route: "#/analytics/users/overview",
    name: "overview",
    permission: "core",
    title: 'user-analytics.overview-title',
    component: UserAnalyticsOverview,
    vuex: []
});

