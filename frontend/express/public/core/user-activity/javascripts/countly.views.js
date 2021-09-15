/* global countlyVue,CV,countlyUserActivity,app,CountlyHelpers,countlyCommon*/
(function() {
    var UserActivityView = countlyVue.views.create({
        template: CV.T("/core/user-activity/templates/user-activity.html"),
        data: function() {
            return {
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
                    this.$store.dispatch('countlyUserActivity/fetchAll', true);
                }
            },
            isLoading: function() {
                return this.$store.getters['countlyUserActivity/isLoading'];
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
                        data: this.xAxisUserActivitySessionBuckets,
                        axisLabel: {
                            color: "#333C48"
                        }
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
                this.$store.dispatch('countlyUserActivity/fetchAll', false);
            },
            formatPercentage: function(value) {
                return CountlyHelpers.formatPercentage(value);
            },
            formatNumber: function(value) {
                return countlyCommon.formatNumber(value);
            },
            addEmptyRowIfNotFound: function(rowsArray, index) {
                if (!rowsArray[index]) {
                    rowsArray.push({});
                }
            }
        },
        mounted: function() {
            if (this.$route.params && this.$route.params.query) {
                this.$store.dispatch('countlyUserActivity/onSetUserActivityFilters', {query: this.$route.params.query });
            }
            this.$store.dispatch('countlyUserActivity/fetchAll', true);
        }
    });


    //Note: the parent component that renders all user loyalty tabs.
    var UserLoyaltyView = countlyVue.views.create({
        template: CV.T("/core/user-activity/templates/user-loyalty.html"),
        mixins: [
            countlyVue.container.tabsMixin({
                "userLoyaltyTabs": "/analytics/loyalty"
            })
        ],
        data: function() {
            return {
                selectedTab: (this.$route.params && this.$route.params.tab) || "user-activity"
            };
        },
        computed: {
            tabs: function() {
                return this.userLoyaltyTabs;
            }
        },
    });

    var getUserLoyaltyView = function() {
        var tabsVuex = countlyVue.container.tabsVuex(["/analytics/loyalty"]);
        return new countlyVue.views.BackboneWrapper({
            component: UserLoyaltyView,
            vuex: tabsVuex,
            templates: [
                "/drill/templates/query.builder.v2.html"
            ]
        });
    };

    app.route("/analytics/loyalty", "loyalty", function() {
        var userLoyaltyViewWrapper = getUserLoyaltyView();
        this.renderWhenReady(userLoyaltyViewWrapper);
    });

    app.route("/analytics/loyalty/*tab", "loyalty-tab", function(tab) {
        var userLoyaltyViewWrapper = getUserLoyaltyView();
        var params = {
            tab: tab,
        };
        userLoyaltyViewWrapper.params = params;
        this.renderWhenReady(userLoyaltyViewWrapper);
    });

    app.route("/analytics/loyalty/*tab/*query", "loyalty-tab", function(tab, query) {
        var userLoyaltyViewWrapper = getUserLoyaltyView();
        var params = {
            tab: tab,
        };
        var queryUrlParameter = query && CountlyHelpers.isJSON(query) ? JSON.parse(query) : undefined;
        if (queryUrlParameter) {
            params.query = queryUrlParameter;
        }
        userLoyaltyViewWrapper.params = params;
        this.renderWhenReady(userLoyaltyViewWrapper);
    });

    countlyVue.container.registerTab("/analytics/loyalty", {
        priority: 1,
        name: "user-activity",
        title: CV.i18n('user-activity.title'),
        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/analytics/loyalty/user-activity",
        component: UserActivityView,
        vuex: [{
            clyModel: countlyUserActivity
        }],
    });
})();

