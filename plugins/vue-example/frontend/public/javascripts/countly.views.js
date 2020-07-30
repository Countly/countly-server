/*global app, countlyVue, countlyVueExample */

var TableExampleView = {
    template: '#vue-example-table-template',
    mixins: [
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
        }
    }
};

var MainView = {
    template: '#vue-example-main-template',
    mixins: [
        countlyVue.mixins.autoRefresh,
        countlyVue.mixins.i18n
    ],
    computed: {
        randomNumbers: function() {
            return this.$store.getters["vueExample/randomNumbers"];
        }
    },
    components: {
        "table-view": TableExampleView
    },
    methods: {
        refresh: function() {
            this.$store.dispatch("vueExample/updateRandomArray");
        }
    }
};

var vuex = [{
    clyModel: countlyVueExample
}];

var exampleView = new countlyVue.views.BackboneWrapper({
    component: MainView,
    vuex: vuex,
    templates: {
        namespace: 'vue-example',
        mapping: {
            'table-template': '/vue-example/templates/table.html',
            'main-template': '/vue-example/templates/main.html'
        }
    }
});

app.vueExampleView = exampleView;

app.route("/vue/example", 'vue-example', function() {
    this.renderWhenReady(this.vueExampleView);
});