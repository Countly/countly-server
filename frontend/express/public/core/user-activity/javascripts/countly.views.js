/* global countlyVue,CV,countlyUserActivity,app,CountlyHelpers*/
(function() {
    var UserActivityView = countlyVue.views.create({
        template: CV.T("/core/user-activity/templates/user-activity.html"),
        data: function() {
            return {
                description: CV.i18n('user-activity.decription'),
                barChartItemsLegends: {
                    all: CV.i18n('user-activity.barchart-all-users'),
                    sevenDays: CV.i18n('user-activity.barchart-seven-days'),
                    thirtyDays: CV.i18n('user-activity.barchart-thirty-days')
                },
                progressBarColor: "#39C0C8",
                DECIMAL_PLACES_FORMAT: 2,
            };
        },
        computed: {
            userActivity: function() {
                return this.$store.state.countlyUserActivity.userActivity;
            },
            userActivityFilters: {
                get: function() {
                    return this.$store.state.countlyUserActivity.userActivityFilters;
                },
                set: function(value) {
                    this.$store.dispatch('countlyUserActivity/onSetUserActivityFilters', value);
                    this.$store.dispatch('countlyUserActivity/fetchAll');
                }
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
        },
        methods: {
            refresh: function() {
                this.$store.dispatch('countlyUserActivity/fetchAll');
            },
            formatPercentage: function(value) {
                return CountlyHelpers.formatPercentage(value);
            },
            addEmptyRowIfNotFound: function(rowsArray, index) {
                if (!rowsArray[index]) {
                    rowsArray.push({});
                }
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
})();

