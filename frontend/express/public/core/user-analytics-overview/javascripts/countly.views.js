/* global countlyVue,CV,countlyCommon, $, countlySession,countlyTotalUsers,app, jQuery*/
var UserAnalyticsOverview = countlyVue.views.create({
    template: CV.T("/core/user-analytics-overview/templates/overview.html"),
    data: function() {
        return {
            description: CV.i18n('user-analytics.overview-desc'),
            tableData: [],
            graphOptions: this.createSeries(),
            lineLegend: this.createLineLegend(),
            lineOptions: this.createSeries()
        };
    },
    mounted: function() {
        var self = this;
        $.when(countlySession.initialize(), countlyTotalUsers.initialize("users")).then(function() {
            self.calculateAllData();
        });
    },
    methods: {
        refresh: function() {
            var self = this;
            $.when(countlySession.initialize(), countlyTotalUsers.initialize("users")).then(function() {
                self.calculateAllData();
            });
        },
        calculateAllData: function() {
            var userDP = countlySession.getUserDP();
            this.lineOptions = this.createSeries(userDP.chartDP);
            this.tableData = this.calculateTableData();
            this.lineLegend = this.createLineLegend();
        },
        calculateTableData: function() {
            var userDP = countlySession.getUserDP();
            for (var k = 0; k < userDP.chartData.length; k++) {
                userDP.chartData[k].dateVal = k; //because we get them all always sorted by date
                userDP.chartData[k].fu = countlyCommon.formatNumber(userDP.chartData[k].u || 0);
                userDP.chartData[k].fr = countlyCommon.formatNumber(userDP.chartData[k].returning || 0);
                userDP.chartData[k].fn = countlyCommon.formatNumber(userDP.chartData[k].n || 0);
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
                    "percentage": sessionData.usage["total-users"].change
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
        })
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

countlyVue.container.registerTab("/analytics/users", {
    priority: 1,
    route: "#/" + countlyCommon.ACTIVE_APP_ID + "/analytics/users/overview",
    name: "overview",
    title: CV.i18n('user-analytics.overview-title'),
    component: UserAnalyticsOverview,
    vuex: []
});

