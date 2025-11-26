/*global countlyVue, app, CV, countlyMutationStatus*/

var MutationStatusView = countlyVue.views.create({
    template: CV.T('/core/mutation-status/templates/mutation-status.html'),
    data: function() {
        return {
            isLoading: false,
            mutationStatusData: []
        };
    },
    mounted: function() {
        this.fetchData();
    },
    methods: {
        fetchData: function() {
            this.isLoading = true;
            var self = this;
            countlyMutationStatus.fetchData().then(function(res) {
                var mutation = Array.isArray(res)
                    ? res.find(function(item) {
                        return item && item.provider === 'mutation';
                    }) || {}
                    : res || {};
                self.mutationStatusData = Array.isArray(mutation.metrics?.queue) ? mutation.metrics.queue : [];
                self.isLoading = false;
            });
        },
        formatDate(val) {
            // todo: need a date formatter here.
            return val;
        }
    }

});

app.route("/mutation-status", 'mutationStatus', function() {
    this.renderWhenReady(new CV.views.BackboneWrapper({
        component: MutationStatusView
    }));
});
