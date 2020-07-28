/*global app, countlyVue, countlyVueExample */

var ExampleComponent = {
    template: '/vue-example/templates/main.html',
    mixins: [
        countlyVue.mixins.autoRefresh,
        countlyVue.mixins.i18n
    ],
    data: function() {
        return {
            refreshed: 0
        };
    },
    computed: {
        count: function() {
            return this.$store.state.vueExample.count;
        },
        message: function() {
            return this.i18n("vue-example.message", this.refreshed, this.count);
        }
    },
    methods: {
        plus: function() {
            this.$store.commit("vueExample/increment");
        },
        refresh: function() {
            this.refreshed++;
        }
    }
};

var vuex = [{
    clyModel: countlyVueExample
}];

var exampleView = new countlyVue.views.BackboneWrapper({
    component: ExampleComponent,
    vuex: vuex
});

app.vueExampleView = exampleView;

app.route("/vue/example", 'vue-example', function() {
    this.renderWhenReady(this.vueExampleView);
});