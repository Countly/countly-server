/*global app, countlyAuth, countlySlippingAwayUsers, countlyVue, $, CV, CountlyHelpers */
//TODO-LA: Use query builder component with modal when it becomes available

(function() {

    var FEATURE_NAME = "slipping_away_users";

    var SlippingAwayUsersFilter = countlyVue.views.BaseView.extend({
        template: "#slipping-away-users-filter",
        computed: {
            slippingAwayUsersFilters: {
                get: function() {
                    return this.$store.state.countlySlippingAwayUsers.slippingAwayUsersFilters;
                },
                set: function(value) {
                    this.$store.dispatch('countlySlippingAwayUsers/onSetSlippingAwayUsersFilters', value);
                }
            },
        },
        methods: {
            onApplyFilter: function() {
                this.$store.dispatch("countlySlippingAwayUsers/fetchAll");
            },
        }
    });

    var SlippingAwayUsersBarChart = countlyVue.views.BaseView.extend({
        template: "#slipping-away-users-bar-chart",
        data: function() {
            return {};
        },
        computed: {
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
        }
    });

    var SlippingAwayUsersTable = countlyVue.views.BaseView.extend({
        template: "#slipping-away-users-table",
        data: function() {
            return {
                progressBarColor: "#F96300",
            };
        },
        computed: {
            slippingAwayUsers: function() {
                return this.$store.state.countlySlippingAwayUsers.slippingAwayUsers;
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
            }
        }
    });

    var SlippingAwayUsersView = countlyVue.views.BaseView.extend({
        template: "#slipping-away-users",
        components: {
            "slipping-away-users-filter": SlippingAwayUsersFilter,
            "slipping-away-users-bar-chart": SlippingAwayUsersBarChart,
            "slipping-away-users-table": SlippingAwayUsersTable
        },
        data: function() {
            return {
                description: CV.i18n("slipping-away-users.description"),
            };
        },
        methods: {
            refresh: function() {
                this.$store.dispatch("countlySlippingAwayUsers/fetchAll");
            }
        },
        mounted: function() {
            if (this.$route.params) {
                this.$store.dispatch('countlySlippingAwayUsers/onSetSlippingAwayUsersFilters', {query: this.$route.params });
            }
            this.$store.dispatch("countlySlippingAwayUsers/fetchAll");
        }
    });

    var vuex = [{
        clyModel: countlySlippingAwayUsers
    }];

    var slippingAwayUsersView = new countlyVue.views.BackboneWrapper({
        component: SlippingAwayUsersView,
        vuex: vuex,
        templates: [
            "/slipping-away-users/templates/slipping-away-users.html",
            "/drill/templates/query.builder.v2.html"
        ]
    });

    if (countlyAuth.validateRead(FEATURE_NAME)) {
        app.route("/analytics/slipping-away", 'slipping-away', function() {
            this.renderWhenReady(slippingAwayUsersView);
        });
        app.route("/analytics/slipping-away/*query", "slipping-away", function(query) {
            var queryUrlParameter = query && CountlyHelpers.isJSON(query) ? JSON.parse(query) : undefined;
            slippingAwayUsersView.params = queryUrlParameter;
            this.renderWhenReady(slippingAwayUsersView);
        });
    }

    $(document).ready(function() {
        if (countlyAuth.validateRead(FEATURE_NAME)) {
            app.addSubMenu("users", {code: "slipping-away", url: "#/analytics/slipping-away", text: "slipping-away-users.title", priority: 30});
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