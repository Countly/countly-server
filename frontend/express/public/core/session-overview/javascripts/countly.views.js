/* global countlyVue,CV,countlySessionOverview,app,countlyCommon, $, countlySession,countlyTotalUsers*/
var SessionOverviewView = countlyVue.views.create({
    template: CV.T("/core/session-overview/templates/session-overview.html"),
    mixins: [countlyVue.mixins.commonFormatters],
    data: function() {
        return {};
    },
    computed: {
        sessionOverview: function() {
            return this.$store.state.countlySessionOverview.sessionOverview;
        },
        isLoading: function() {
            return this.$store.getters['countlySessionOverview/isLoading'];
        },
        sessionOverviewRows: function() {
            return this.$store.state.countlySessionOverview.sessionOverview.rows;
        },
        sessionOverviewOptions: function() {
            return {
                xAxis: {
                    data: this.xAxisSessionOverviewDatePeriods
                },
                series: this.yAxisSessionOverviewCountSeries
            };
        },
        xAxisSessionOverviewDatePeriods: function() {
            return this.$store.state.countlySessionOverview.sessionOverview.rows.map(function(tableRow) {
                return tableRow.date;
            });
        },
        yAxisSessionOverviewCountSeries: function() {
            return this.sessionOverview.series.map(function(sessionOverviewSerie) {
                return {
                    data: sessionOverviewSerie.data,
                    name: sessionOverviewSerie.label,
                };
            });
        },
        legend: function() {
            var result = {
                show: true,
                type: "primary",
                data: this.$store.state.countlySessionOverview.sessionOverview.trends
            };
            return result;
        }
    },
    methods: {
        refresh: function() {
            this.$store.dispatch('countlySessionOverview/fetchAll', false);
        },
        dateChanged: function() {
            this.$store.dispatch('countlySessionOverview/fetchAll', true);
        },
        sortDates: function(a, b) {
            return new Date(a.date) - new Date(b.date);
        }
    },
    mounted: function() {
        this.$store.dispatch('countlySessionOverview/fetchAll', true);
    },

});

//Note: the parent component that renders all session analytics tabs.
var SessionAnalyticsView = countlyVue.views.create({
    template: CV.T("/core/session-overview/templates/session-analytics.html"),
    mixins: [
        countlyVue.container.tabsMixin({
            "sessionAnalyticsTabs": "/analytics/sessions"
        })
    ],
    data: function() {
        return {
            selectedTab: (this.$route.params && this.$route.params.tab) || "overview"
        };
    },
    computed: {
        tabs: function() {
            return this.sessionAnalyticsTabs;
        }
    }
});

var getSessionAnalyticsView = function() {
    var tabsVuex = countlyVue.container.tabsVuex(["/analytics/sessions"]);
    return new countlyVue.views.BackboneWrapper({
        component: SessionAnalyticsView,
        vuex: tabsVuex,
        templates: []
    });
};


//Sessions data widget
var SessionHomeWidget = countlyVue.views.create({
    template: CV.T("/core/session-overview/templates/sessionsHomeWidget.html"),
    data: function() {
        return {
            description: CV.i18n('session-overview.description'),
            dataBlocks: [],
            data: {},
            lineOptions: {"series": []},
            chooseProperties: this.calculateProperties(),
            chosenProperty: "t",
            sessionGraphTab: "t",
            isLoading: true,
            headerData: {
                label: CV.i18n("dashboard.audience"),
                description: CV.i18n("session-overview.description"),
                linkTo: {"label": CV.i18n('dashboard.go-to-sessions'), "href": "#/analytics/sessions"},
            }
        };
    },
    mounted: function() {
        var self = this;
        $.when(countlySession.initialize(), countlyTotalUsers.initialize("users"), countlyCommon.getGraphNotes([countlyCommon.ACTIVE_APP_ID])).then(function() {
            self.calculateAllData();
        });
    },
    methods: {
        refresh: function(force) {
            var self = this;
            if (force) {
                this.isLoading = true;
            }
            $.when(countlySession.initialize(), countlyTotalUsers.initialize("users"), countlyCommon.getGraphNotes([countlyCommon.ACTIVE_APP_ID])).then(function() {
                self.calculateAllData();
            });
        },
        chartData: function(value) {
            return this.calculateSeries(value);
        },
        calculateAllData: function() {
            this.isLoading = false;
            this.chooseProperties = this.calculateProperties();
            this.lineOptions = this.calculateSeries();
        },
        calculateProperties: function() {
            var sessionData = countlySession.getSessionData();
            if (!sessionData || !sessionData.usage || !sessionData.usage['total-sessions']) {
                sessionData = {"usage": {"totals-sessions": {}}};
            }

            var properties = [];
            //keep this way to allow also switching to different columns for different types later.  Supports also more or less columns.
            if (sessionData.usage['total-sessions']) {
                properties.push({
                    "value": "t",
                    "label": CV.i18n('common.table.total-sessions'),
                    "trend": sessionData.usage['total-sessions'].trend,
                    "number": countlyCommon.getShortNumber(sessionData.usage['total-sessions'].total || 0),
                    "trendValue": sessionData.usage['total-sessions'].change,
                    "description": CV.i18n('dashboard.total-sessions-desc'),
                });
            }
            if (sessionData.usage['new-users']) {
                properties.push({
                    "value": "n",
                    "label": CV.i18n('common.table.new-sessions'),
                    "trend": sessionData.usage['new-users'].trend,
                    "number": countlyCommon.getShortNumber(sessionData.usage['new-users'].total || 0),
                    "trendValue": sessionData.usage['new-users'].change,
                    "description": CV.i18n('common.table.new-users-desc')
                });
            }

            if (sessionData.usage['total-duration']) {
                properties.push({
                    "value": "d",
                    "label": CV.i18n('dashboard.time-spent'),
                    "trend": sessionData.usage['total-duration'].trend,
                    "number": countlyCommon.getShortNumber(sessionData.usage['total-duration'].total || 0),
                    "trendValue": sessionData.usage['total-duration'].change,
                    "description": CV.i18n('dashboard.time-spent-desc'),
                    "formatter": function(value) {
                        return countlyCommon.formatSecond(value);
                    }
                });
            }

            if (sessionData.usage['avg-duration-per-session']) {
                properties.push({
                    "value": "d-avg",
                    "label": CV.i18n('dashboard.avg-time-spent'),
                    "trend": sessionData.usage['avg-duration-per-session'].trend,
                    "number": countlyCommon.getShortNumber(sessionData.usage['avg-duration-per-session'].total || 0),
                    "trendValue": sessionData.usage['avg-duration-per-session'].change,
                    "description": CV.i18n('dashboard.avg-time-spent-desc'),
                    "formatter": function(value) {
                        return countlyCommon.formatSecond(Math.round(value));
                    }
                });
            }

            if (sessionData.usage['avg-duration-per-session']) {
                properties.push({
                    "value": "e-avg",
                    "label": CV.i18n('dashboard.avg-reqs-received'),
                    "trend": sessionData.usage['avg-events'].trend,
                    "number": countlyCommon.getShortNumber(sessionData.usage['avg-events'].total || 0),
                    "trendValue": sessionData.usage['avg-events'].change,
                    "description": CV.i18n('dashboard.avg-reqs-received-desc')
                });
            }
            return properties;
        },
        calculateSeries: function(value) {
            var sessionDP = {};
            value = value || this.chosenProperty;
            switch (value) {
            case "t":
                sessionDP = countlySession.getSessionDPTotal();
                break;
            case "n":
                sessionDP = countlySession.getUserDPNew();
                if (sessionDP && sessionDP.chartDP && sessionDP.chartDP.length > 1) {
                    sessionDP.chartDP[1].label = CV.i18n('common.table.new-sessions');
                    sessionDP.chartDP[0].label = CV.i18n('common.table.new-sessions');
                }
                break;
            case "d":
                sessionDP = countlySession.getDurationDP(true); //makes sure I get seconds, not minutes
                if (sessionDP && sessionDP.chartDP && sessionDP.chartDP.length > 1) {
                    sessionDP.chartDP[1].label = CV.i18n('dashboard.time-spent');
                    sessionDP.chartDP[0].label = CV.i18n('dashboard.time-spent');
                }
                break;
            case "d-avg":
                sessionDP = countlySession.getDurationDPAvg(true);//makes sure I get seconds, not minutes
                if (sessionDP && sessionDP.chartDP && sessionDP.chartDP.length > 1) {
                    sessionDP.chartDP[1].label = CV.i18n('dashboard.avg-time-spent');
                    sessionDP.chartDP[0].label = CV.i18n('dashboard.avg-time-spent');
                }
                break;
            case "e-avg":
                sessionDP = countlySession.getEventsDPAvg();
                break;
            }
            var series = [];
            if (sessionDP && sessionDP.chartDP && sessionDP.chartDP[0] && sessionDP.chartDP[1]) {
                series.push({"name": sessionDP.chartDP[1].label, "data": sessionDP.chartDP[1].data});
                series.push({"name": sessionDP.chartDP[0].label + " (" + CV.i18n('common.previous-period') + ")", "data": sessionDP.chartDP[0].data, "color": "#39C0C8", lineStyle: {"color": "#39C0C8"} });
            }
            if (value === "d" || value === "d-avg") {
                return {
                    "series": series,
                    "yAxis": {
                        axisLabel: {
                            formatter: function(value2) {
                                return countlyCommon.formatSecond(Math.round(value2));
                            }
                        }
                    }
                };
            }
            else {
                return {"series": series};
            }
        }
    },
    computed: {
        selectedProperty: {
            set: function(value) {
                this.chosenProperty = value;
                this.calculateAllData();
            },
            get: function() {
                return this.chosenProperty;
            }
        }
    }
});

countlyVue.container.registerData("/home/widgets", {
    _id: "sessions-dashboard-widget",
    permission: "core",
    label: CV.i18n('dashboard.audience'),
    enabled: {"default": true}, //object. For each type set if by default enabled
    available: {"default": true}, //object. default - for all app types. For other as specified.
    order: 0, //sorted by ascending
    placeBeforeDatePicker: false,
    component: SessionHomeWidget,
});


app.route("/analytics/sessions", "sessions", function() {
    var sessionAnalyticsViewWrapper = getSessionAnalyticsView();
    this.renderWhenReady(sessionAnalyticsViewWrapper);
});

app.route("/analytics/sessions/*tab", "sessions-tab", function(tab) {
    var sessionAnalyticsViewWrapper = getSessionAnalyticsView();
    var params = {
        tab: tab
    };
    sessionAnalyticsViewWrapper.params = params;
    this.renderWhenReady(sessionAnalyticsViewWrapper);
});

countlyVue.container.registerTab("/analytics/sessions", {
    priority: 1,
    name: "overview",
    permission: "core",
    title: CV.i18n('session-overview.title'),
    route: "#/analytics/sessions/overview",
    dataTestId: "tab-session-overview",
    component: SessionOverviewView,
    vuex: [{
        clyModel: countlySessionOverview
    }]
});