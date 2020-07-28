/*global app, countlyVue, countlyVueExample */

var ExampleComponent = {
    template: '/vue-example/templates/main.html',
    mixins: [
        countlyVue.mixins.autoRefresh,
        countlyVue.mixins.i18n
    ],
    computed: {
        tableRows: function() {
            return this.$store.getters["vueExample/pairs"];
        }
    },
    data: function() {
        return {
            targetName: "John Doe",
            targetValue: 10,
            tableColumns: [
                {
                    "sType": "string",
                    "sTitle": "Name"
                },
                {
                    "sType": "numeric",
                    "sTitle": "Total"
                }
            ]
        };
    },
    methods: {
        add: function() {
            this.$store.commit("vueExample/addPair", {name: this.targetName, value: this.targetValue});
            this.targetName = "";
            this.targetValue = 0;
        },
        refresh: function() {}
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