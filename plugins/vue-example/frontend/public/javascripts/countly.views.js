/*global $, jQuery, app, countlyView, countlyVue, countlyCommon, T, CountlyHelpers */

var ExampleComponent = {
    template: '/vue-example/templates/main.html',
    mixins: [countlyVue.mixins.refreshable],
    data: function() {
        return {
            refreshed: 0
        }
    },
    computed: {
        count: function(){
            return this.$store.state.vueExample.count;
        }
    },
    methods: {
        plus: function(){
            this.$store.commit("vueExample/increment");
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