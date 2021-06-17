/* globals app, countlyCommon, countlyCrashes, countlyVue, moment */

(function() {
    var CrashStatisticsTabLabelView = countlyVue.views.BaseView.extend({
        props: {
            title: {type: String},
            tooltip: {type: String},
            data: {type: Object},
            negateTrend: {type: Boolean, default: false}
        },
        computed: {
            colorClass: function() {
                if (this.$props.data.trend === "n") {
                    return "neutral";
                }
                else {
                    return ((this.$props.negateTrend ^ this.$props.data.trend === "u") ? "up" : "down");
                }
            },
            iconClass: function() {
                if (this.$props.data.trend === "n") {
                    return "minus-round";
                }
                else {
                    return ((this.$props.data.trend === "u") ? "arrow-up-c" : "arrow-down-c");
                }

            }
        },
        template: '<div class="text-medium color-cool-gray-100 bu-mb-1">\
                       <div class="text-medium color-cool-gray-100 bu-mb-1">\
                           {{title}}\
                           <cly-tooltip-icon icon="ion ion-help-circled" :tooltip="tooltip"></cly-tooltip-icon>\
                       </div>\
                       <div class="text-medium color-cool-gray-100 bu-columns bu-is-gapless bu-is-mobile">\
                           <h2>{{data.total}}</h2>\
                           <div :class="\'text-medium font-weight-bold crashes-trend crashes-trend--\' + colorClass">\
                               <i class="ion" :class="\'ion-\' + iconClass"></i>\
                               {{data.change}}\
                           </div>\
                       </div>\
                   </div>'
    });

    var CrashOverviewView = countlyVue.views.BaseView.extend({
        template: "#crashes-overview",
        components: {"crash-tab-label": CrashStatisticsTabLabelView},
        data: function() {
            return {
                appId: countlyCommon.ACTIVE_APP_ID,
                currentTab: (this.$route.params && this.$route.params.tab) || "crash-groups",
                statisticsGraphTab: "total-occurances",
                selectedCrashgroups: [],
                formatDate: function(row, col, cell) {
                    return moment(cell * 1000).format("lll");
                }
            };
        },
        computed: {
            dashboardData: function() {
                return this.$store.getters["countlyCrashes/overview/dashboardData"];
            },
            chartData: function() {
                return function(metric, name) {
                    return this.$store.getters["countlyCrashes/overview/chartData"](metric, name);
                };
            },
            statistics: function() {
                return this.$store.getters["countlyCrashes/overview/statistics"];
            },
            crashgroupRows: function() {
                return this.$store.getters["countlyCrashes/overview/crashgroupRows"];
            }
        },
        methods: {
            refresh: function() {
                this.$store.dispatch("countlyCrashes/overview/refresh");
            },
            handleRowClick: function(row) {
                window.location.href = window.location.href + "/" + row._id;
            },
            handleSelectionChange: function(selectedRows) {
                this.$data.selectedCrashgroups = selectedRows.map(function(row) { return row._id; })
            }
        },
        beforeCreate: function() {
            this.$store.dispatch("countlyCrashes/overview/refresh");
        }
    });

    var getOverviewView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: CrashOverviewView,
            vuex: [{clyModel: countlyCrashes}],
            templates: [
                {
                    namespace: "crashes",
                    mapping: {
                        overview: "crashes-vue/templates/overview.html"
                    }
                }
            ]
        });
    };

    var CrashgroupView = countlyVue.views.BaseView.extend({
        template: "#crashes-crashgroup",
        data: function() {
            return {
                appId: countlyCommon.ACTIVE_APP_ID
            };
        }
    });

    var getCrashgroupView = function(group) {
        return new countlyVue.views.BackboneWrapper({
            component: CrashgroupView,
            vuex: [{clyModel: countlyCrashes}],
            templates: [
                {
                    namespace: "crashes",
                    mapping: {
                        crashgroup: "crashes-vue/templates/crashgroupNew.html"
                    }
                }
            ]
        });
    };

    app.route("/crashes", "crashes", function() {
        console.log("crashesview");
        this.renderWhenReady(getOverviewView());
    });

    app.route("/crashes/:group", "crashgroup", function(group) {
        console.log("crashgroupview");
        this.renderWhenReady(getCrashgroupView(group));
    });
})();