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
            progressbarColor: "#39C0C8",
            DECIMAL_PLACES_FORMAT: 2,
        };
    },
    methods: {
        getEmptyRows: function() {
            var emptyRows = [];
            for (var counter = 0;counter < this.$store.state.countlyUserActivity.minNonEmptyBucketsLength; counter += 1) {
                emptyRows.push({});
            }
            return emptyRows;
        },
        formatPercentage: function(value) {
            return parseFloat((Math.round(value * 100)).toFixed(this.DECIMAL_PLACES));
        }
    },
    computed: {
        userActivity: function() {
            return this.$store.state.countlyUserActivity.userActivity;
        },
        isLoading: function() {
            return this.$store.state.countlyUserActivity.isLoading;
        },
        nonEmptyBuckets: function() {
            return this.$store.state.countlyUserActivity.nonEmptyBuckets;
        },
        seriesTotal: function() {
            return this.$store.state.countlyUserActivity.seriesTotal;
        },
        userActivityRows: function() {
            var rows = this.getEmptyRows();
            var self = this;
            this.nonEmptyBuckets.forEach(function(bucket, bucketIndex) {
                Object.keys(self.userActivity).forEach((function(userActivityKey) {
                    var userActivitySerie = self.userActivity[userActivityKey];
                    userActivitySerie.forEach(function(userActivitySerieItem) {
                        if (bucket === userActivitySerieItem._id) {
                            rows[bucketIndex].bucket = bucket;
                            rows[bucketIndex][userActivityKey] = userActivitySerieItem.count;
                        }
                    });
                }));
            });
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