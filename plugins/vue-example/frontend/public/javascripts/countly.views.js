/*global $, jQuery, app, countlyView, countlyVueWrapperView, clyVueMixins, countlyCommon, T, CountlyHelpers, Vue */

var ExampleComponent = {
    template: '<div>Refreshed {{refreshed}} times. Hello world {{count}} times. <button v-on:click="plus">+</button></div>',
    mixins: [clyVueMixins.clyRefreshable],
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

var exampleView = new countlyVueWrapperView({
    component: ExampleComponent
});

app.vueExampleView = exampleView;

app.route("/vue/example", 'vue-example', function() {
    this.renderWhenReady(this.vueExampleView);
});