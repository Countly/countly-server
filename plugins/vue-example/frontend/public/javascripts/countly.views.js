/*global $, jQuery, app, countlyView, countlyVue, countlyCommon, T, CountlyHelpers */

var ExampleComponent = {
    template: '<div>Refreshed {{refreshed}} times. Hello world {{count}} times. <button v-on:click="plus">+</button></div>',
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
    },
    mounted: function() {
        var self = this;
    }
};

var exampleView = new countlyVue.views.BackboneWrapper({
    component: ExampleComponent
});

app.vueExampleView = exampleView;

app.route("/vue/example", 'vue-example', function() {
    this.renderWhenReady(this.vueExampleView);
});