/*global app, countlyVue, countlyVueExample */

var TableView = countlyVue.views.BaseView.extend({
    template: '#vue-example-table-template',
    computed: {
        tableRows: function() {
            return this.$store.getters["vueExample/pairs"];
        }
    },
    data: function() {
        return {
            targetName: "John Doe",
            targetValue: 0,
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
            this.targetValue += 1;
        }
    }
});

var TimeGraphView = countlyVue.views.BaseView.extend({
    template: '#vue-example-tg-template',
    mixins: [
        countlyVue.mixins.refreshOnParentActive
    ],
    computed: {
        randomNumbers: function() {
            return this.$store.getters["vueExample/randomNumbers"];
        }
    },
    methods: {
        refresh: function() {
            if (this.isParentActive) {
                this.$store.dispatch("vueExample/updateRandomArray");
            }
        }
    },
    mounted: function() {
        this.refresh();
    }
});

var MainView = countlyVue.views.BaseView.extend({
    template: '#vue-example-main-template',
    components: {
        "table-view": TableView,
        "tg-view": TimeGraphView
    }
});

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
            'tg-template': '/vue-example/templates/tg.html',
            'main-template': '/vue-example/templates/main.html'
        }
    }
});

app.vueExampleView = exampleView;

app.route("/vue/example", 'vue-example', function() {
    this.renderWhenReady(this.vueExampleView);
});