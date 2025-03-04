/* global countlyVue, app, countlyAggregationManager, CV*/


var AggregatorStatusView = countlyVue.views.create({
    template: CV.T('/core/aggregator-status/templates/aggregator-status.html'),
    data: function() {
        return {
            tableData: []
        };
    },
    mounted: function() {
        var self = this;
        countlyAggregationManager.fetchData().then(function(data) {
            self.tableData = data;
        });
    },
    methods: {
        getTable: function() {
            return this.tableData;
        },
        refresh: function() {
            var self = this;
            countlyAggregationManager.fetchData().then(function(data) {
                self.tableData = data;
            });
        }
    },
    computed: {
        aggregatorRows: function() {
            return this.getTable();
        }

    }
});

app.route("/aggregator", 'aggregators', function() {
    this.renderWhenReady(new CV.views.BackboneWrapper({
        component: AggregatorStatusView,
        vuex: [{clyModel: countlyAggregationManager}]
    }));
});
