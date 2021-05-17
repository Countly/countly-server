/*global app, countlySlippingAwayUsers, countlyVue, $, CV */
//TODO-LA: Use query builder component with modal when it becomes available
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
                legend: {
                    top: 'bottom',
                    padding: [0, 0, 20, 0]
                },
                xAxis: {
                    type: "category",
                    data: this.xAxisSlippingAwayUsersPeriods
                },
                yAxis: {
                    type: "value",
                },
                series: [{
                    data: this.yAxisSlippingAwayUsersCount,
                    name: CV.i18n('slipping-away-users.barchart-description'),
                    type: "bar",
                    itemStyle: {
                        color: "#F96300",
                        borderRadius: [2, 2, 0, 0]
                    },
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
            progressbarColor: "#F96300",
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
                Object.assign(data, countlySlippingAwayUsers.helpers.buildFilters(currentFilters));
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
    mounted: function() {
        this.$store.dispatch("countlySlippingAwayUsers/fetchAll");
    }
});

var vuex = [{
    clyModel: countlySlippingAwayUsers
}];

app.route("/analytics/slipping-away", "slipping-away", function() {
    var slippingAwayUsersView = new countlyVue.views.BackboneWrapper({
        component: SlippingAwayUsersView,
        vuex: vuex,
        templates: [
            "/slipping-away-users/templates/SlippingAwayUsers.html",
            "/drill/templates/query.builder.v2.html"
        ]
    });
    this.renderWhenReady(slippingAwayUsersView);
});

$(document).ready(function() {
    app.addSubMenu("users", {code: "slipping-away", url: "#/analytics/slipping-away", text: "slipping-away-users.title", priority: 30});
    if (app.configurationsView) {
        app.configurationsView.registerLabel("slipping-away-users", "slipping-away-users.config-title");
        app.configurationsView.registerLabel("slipping-away-users.p1", "slipping-away-users.config-first-threshold");
        app.configurationsView.registerLabel("slipping-away-users.p2", "slipping-away-users.config-second-threshold");
        app.configurationsView.registerLabel("slipping-away-users.p3", "slipping-away-users.config-third-threshold");
        app.configurationsView.registerLabel("slipping-away-users.p4", "slipping-away-users.config-fourth-threshold");
        app.configurationsView.registerLabel("slipping-away-users.p5", "slipping-away-users.config-fifth-threshold");
    }
});