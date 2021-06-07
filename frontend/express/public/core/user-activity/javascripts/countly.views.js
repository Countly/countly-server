/* global countlyVue,CV,countlyUserActivity,app,CountlyHelpers*/
var UserActivityFilter = countlyVue.views.BaseView.extend({
    template: "#user-activity-filter",
    computed: {
        userActivityFilters: {
            get: function() {
                return this.$store.state.countlyUserActivity.userActivityFilters;
            },
            set: function(value) {
                this.$store.dispatch('countlyUserActivity/onSetUserActivityFilters', value);
            }
        }
    },
    methods: {
        onApplyFilter: function() {
            this.$store.dispatch('countlyUserActivity/fetchAll');
        }
    }
});

var UserActivityBarChart = countlyVue.views.BaseView.extend({
    template: "#user-activity-bar-chart",
    data: function() {
        return {
            barChartItemsLegends: {
                all: CV.i18n('user-activity.barchart-all-users'),
                sevenDays: CV.i18n('user-activity.barchart-seven-days'),
                thirtyDays: CV.i18n('user-activity.barchart-thirty-days')
            },
        };
    },
    computed: {
        userActivity: function() {
            return this.$store.state.countlyUserActivity.userActivity;
        },
        seriesTotal: function() {
            return this.$store.state.countlyUserActivity.seriesTotal;
        },

        userActivityOptions: function() {
            return {
                xAxis: {
                    data: this.xAxisUserActivitySessionBuckets
                },
                series: this.yAxisUserActivityCountSeries
            };
        },
        xAxisUserActivitySessionBuckets: function() {
            return this.$store.state.countlyUserActivity.nonEmptyBuckets;
        },
        yAxisUserActivityCountSeries: function() {
            var self = this;
            return Object.keys(this.userActivity).map(function(userActivityKey) {
                return {
                    data: self.userActivity[userActivityKey].map(function(item) {
                        return item.count;
                    }),
                    name: self.barChartItemsLegends[userActivityKey],
                };
            });
        },
        isLoading: function() {
            return this.$store.state.countlyUserActivity.isLoading;
        }
    }
});

var UserActivityTable = countlyVue.views.BaseView.extend({
    template: "#user-activity-table",
    data: function() {
        return {
            progressBarColor: "#39C0C8",
            DECIMAL_PLACES_FORMAT: 2,
        };
    },
    methods: {
        formatPercentage: function(value) {
            if (isNaN(value)) {
                return 0;
            }
            return parseFloat((Math.round(value * 100)).toFixed(this.DECIMAL_PLACES));
        },
        addEmptyRowIfNotFound: function(rowsArray, index) {
            if (!rowsArray[index]) {
                rowsArray.push({});
            }
        }
    },
    computed: {
        userActivity: function() {
            return this.$store.state.countlyUserActivity.userActivity;
        },
        isLoading: function() {
            return this.$store.state.countlyUserActivity.isLoading;
        },
        seriesTotal: function() {
            return this.$store.state.countlyUserActivity.seriesTotal;
        },
        userActivityRows: function() {
            var rows = [];
            var self = this;
            Object.keys(self.userActivity).forEach((function(userActivityKey) {
                var userActivitySerie = self.userActivity[userActivityKey];
                userActivitySerie.forEach(function(userActivitySerieItem, userActivitySerieItemIndex) {
                    self.addEmptyRowIfNotFound(rows, userActivitySerieItemIndex);
                    rows[userActivitySerieItemIndex].bucket = userActivitySerieItem._id;
                    rows[userActivitySerieItemIndex][userActivityKey] = userActivitySerieItem.count;
                });
            }));
            return rows;
        },
    }
});

var UserActivityView = countlyVue.views.BaseView.extend({
    template: "#user-activity",
    components: {
        "user-activity-filter": UserActivityFilter,
        "user-activity-bar-chart": UserActivityBarChart,
        "user-activity-table": UserActivityTable
    },
    data: function() {
        return {
            description: CV.i18n('user-activity.decription')
        };
    },
    methods: {
        refresh: function() {
            this.$store.dispatch('countlyUserActivity/fetchAll');
        }
    },
    mounted: function() {
        if (this.$route.params) {
            this.$store.dispatch('countlyUserActivity/onSetUserActivityFilters', {query: this.$route.params });
        }
        this.$store.dispatch('countlyUserActivity/fetchAll');
    }
});

var userActivityVuex = [{
    clyModel: countlyUserActivity
}];

var userActivityViewWrapper = new countlyVue.views.BackboneWrapper({
    component: UserActivityView,
    vuex: userActivityVuex,
    templates: [
        "/core/user-activity/templates/user-activity.html",
        "/drill/templates/query.builder.v2.html"
    ]
});

app.route("/analytics/loyalty", "loyalty", function() {
    this.renderWhenReady(userActivityViewWrapper);
});

app.route("/analytics/loyalty/*query", "loyalty_query", function(query) {
    var queryUrlParameter = query && CountlyHelpers.isJSON(query) ? JSON.parse(query) : undefined;
    userActivityViewWrapper.params = queryUrlParameter;
    this.renderWhenReady(userActivityViewWrapper);
});