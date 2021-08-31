/*global app,countlyAuth,countlySlippingAwayUsers,countlyVue,$,CV,CountlyHelpers,countlyCommon */
(function() {

    var FEATURE_NAME = "slipping_away_users";

    var SlippingAwayUsersView = countlyVue.views.create({
        template: CV.T("/slipping-away-users/templates/slipping-away-users.html"),
        data: function() {
            return {
                description: CV.i18n("slipping-away-users.description"),
                progressBarColor: "#F96300",
            };
        },
        computed: {
            slippingAwayUsersFilters: {
                get: function() {
                    return this.$store.state.countlySlippingAwayUsers.slippingAwayUsersFilters;
                },
                set: function(value) {
                    this.$store.dispatch('countlySlippingAwayUsers/onSetSlippingAwayUsersFilters', value);
                    this.$store.dispatch("countlySlippingAwayUsers/fetchAll", true);
                }
            },
            slippingAwayUsers: function() {
                return this.$store.state.countlySlippingAwayUsers.slippingAwayUsers;
            },
            slippingAwayUsersOptions: function() {
                return {
                    toolbox: {
                        feature: {
                            saveAsImage: { show: true }
                        }
                    },
                    xAxis: {
                        data: this.xAxisSlippingAwayUsersPeriods
                    },
                    series: [{
                        data: this.yAxisSlippingAwayUsersCount,
                        name: CV.i18n('slipping-away-users.barchart-description'),
                    }]
                };
            },
            xAxisSlippingAwayUsersPeriods: function() {
                var periods = [];
                this.slippingAwayUsers.forEach(function(element) {
                    periods.push(element.period);
                });
                return periods;
            },
            yAxisSlippingAwayUsersCount: function() {
                var awayUsersCount = [];
                this.slippingAwayUsers.forEach(function(item) {
                    awayUsersCount.push(item.count);
                });
                return awayUsersCount;
            },
            isLoading: function() {
                return this.$store.state.countlySlippingAwayUsers.isLoading;
            }
        },
        methods: {
            onUserListClick: function(timeStamp) {
                var data = {
                    "lac": {"$lt": timeStamp}
                };
                var currentFilters = this.$store.state.countlySlippingAwayUsers.slippingAwayUsersFilters;
                if (currentFilters.query) {
                    Object.assign(data, CountlyHelpers.buildFilters(currentFilters));
                }
                window.location.hash = '/users/query/' + JSON.stringify(data);
            },
            refresh: function() {
                this.$store.dispatch("countlySlippingAwayUsers/fetchAll", false);
            },
        },
        mounted: function() {
            if (this.$route.params && this.$route.params.query) {
                this.$store.dispatch('countlySlippingAwayUsers/onSetSlippingAwayUsersFilters', {query: this.$route.params.query });
            }
            this.$store.dispatch("countlySlippingAwayUsers/fetchAll", true);
        }
    });

    if (countlyAuth.validateRead(FEATURE_NAME)) {
        countlyVue.container.registerTab("/analytics/loyalty", {
            priority: 2,
            name: "slipping-away-users",
            title: CV.i18n('slipping-away-users.title'),
            route: "#/" + countlyCommon.ACTIVE_APP_ID + "/analytics/loyalty/slipping-away-users",
            component: SlippingAwayUsersView,
            vuex: [{
                clyModel: countlySlippingAwayUsers
            }]
        });
    }

    $(document).ready(function() {
        if (countlyAuth.validateRead(FEATURE_NAME)) {
            if (app.configurationsView) {
                app.configurationsView.registerLabel("slipping-away-users", "slipping.config-title");
                app.configurationsView.registerLabel("slipping-away-users.p1", "slipping.config-first");
                app.configurationsView.registerLabel("slipping-away-users.p2", "slipping.config-second");
                app.configurationsView.registerLabel("slipping-away-users.p3", "slipping.config-third");
                app.configurationsView.registerLabel("slipping-away-users.p4", "slipping.config-fourth");
                app.configurationsView.registerLabel("slipping-away-users.p5", "slipping.config-fifth");
            }
        }
    });
})();