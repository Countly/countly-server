/*global $, jQuery, app, countlyView, countlyVue, countlyCommon, T, CountlyHelpers */

var ExampleComponent = {
    template: '/vue-example/templates/main.html',
    mixins: [countlyVue.mixins.refreshable],
    data: function() {
        return {
            count: 0,
            refreshed: 0
        }
    },
    methods: {
        plus: function(){
            this.count++;
        },
        refresh: function() {
            this.refreshed++;
        }
    }
};

var vuex = [{
    clyModel: countlyVueExample
}]

var exampleView = new countlyVue.views.BackboneWrapper({
    component: ExampleComponent,
    vuex: vuex
});

app.vueExampleView = exampleView;

app.route("/vue/example", 'vue-example', function() {
    this.renderWhenReady(this.vueExampleView);
});