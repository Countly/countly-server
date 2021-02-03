/*global app, countlyVue, countlyVueExample */

(function() {
    var TableView = countlyVue.views.BaseView.extend({
        template: '#vue-example-table-template',
        computed: {
            tableRows: function() {
                return this.$store.getters["countlyVueExample/myRecords/all"];
            },
            rTableData: function() {
                return this.$store.getters["countlyVueExample/tooManyRecords"];
            }
        },
        watch: {
            selectXModeBuffer: function(newVal) {
                this.selectX = {
                    mode: newVal,
                    currentVal: newVal === 'single-list' ? null : []
                };
            }
        },
        data: function() {
            var manyItems = [];

            for (var i = 0;i <= 50;i++) {
                if (i > 0 && i % 10 === 0) {
                    manyItems.push({name: (i - i % 10) + "s"});
                }
                manyItems.push({name: "Type " + i, value: i});
            }
            return {
                localTableTrackedFields: ['status'],
                remoteTableDataSource: countlyVue.vuex.getServerDataSource(this.$store, "countlyVueExample", "tooManyRecords"),
                dropdownsDisabled: false,
                autoCommitDisabled: false,
                allOptionsTabHidden: false,
                selectXOptions: [{
                    "label": "A Items",
                    "name": "type-1",
                    "options": [
                        {"label": "hello0", "value": 0},
                        {"label": "hello1", "value": 1},
                        {"label": "hello2", "value": 2},
                        {"label": "hello3", "value": 3},
                        {"label": "hello4", "value": 4},
                        {"label": "hello5", "value": 5},
                        {"label": "hello6", "value": 6},
                        {"label": "hello7", "value": 7},
                        {"label": "hello8", "value": 8},
                        {"label": "hello9", "value": 9},
                        {"label": "hello10", "value": 10},
                        {"label": "hello11", "value": 11},
                    ]
                },
                {
                    "label": "B Items",
                    "name": "type-2",
                    "options": [
                        {"label": "user0", "value": 12},
                        {"label": "user1", "value": 13},
                    ]
                }],
                selectXModeBuffer: 'single-list',
                selectX: {
                    currentVal: null,
                    mode: 'single-list',
                },
                listBoxOptions: [
                    {"label": "hello0", "value": 0},
                    {"label": "hello1", "value": 1},
                    {"label": "hello2", "value": 2},
                    {"label": "hello3", "value": 3},
                    {"label": "hello4", "value": 4},
                    {"label": "hello5", "value": 5},
                    {"label": "hello6", "value": 6},
                    {"label": "hello7", "value": 7},
                    {"label": "hello8", "value": 8},
                    {"label": "hello9", "value": 9},
                    {"label": "hello10", "value": 10},
                    {"label": "hello11", "value": 11},
                ],
                selectedLB: 0,
                activeTab: null,
                typedText: 'Type sth...',
                selectedRadio: 2,
                availableRadio: [
                    {label: "Type 1", value: 1},
                    {label: "Type 2", value: 2},
                    {label: "Type 3", value: 3, description: "Some description..."},
                ],
                selectedGenericRadio: 2,
                availableGenericRadio: [
                    {label: "Type 1", value: 1, cmp: {'template': '<div>Template</div>'}},
                    {label: "Type 2", value: 2},
                    {label: "Type 3", value: 3},
                ],
                selectedCheckFlag: true,
                selectedCheck: [1, 2],
                availableCheck: [
                    {label: "Type 1", value: 1},
                    {label: "Type 2", value: 2},
                    {label: "Type 3", value: 3},
                ],
                selectWModel: 1, // it would automatically find the record {"name": "Type 1", "value": 1}
                selectWItems: manyItems,
                selectDWModel: null,
                selectDWItems: manyItems,
                rTableColumns: [
                    {
                        label: 'ID',
                        field: '_id',
                        type: 'number',
                    },
                    {
                        type: "text",
                        field: "name",
                        label: "Name",
                    }
                ]
            };
        },
        methods: {
            refresh: function() {
                this.$store.dispatch("countlyVueExample/myRecords/fetchAll");
                this.$store.dispatch("countlyVueExample/fetchTooManyRecords");
            },
            add: function() {
                this.$emit("open-drawer", "main", countlyVueExample.factory.getEmpty());
            },
            onEditRecord: function(row) {
                var self = this;
                this.$store.dispatch("countlyVueExample/myRecords/fetchSingle", row._id).then(function(doc) {
                    self.$emit("open-drawer", "main", doc);
                });
            },
            onDelete: function(row) {
                this.$store.dispatch("countlyVueExample/myRecords/remove", row._id);
            },
            onDSSearch: function(query) {
                var self = this;
                setTimeout(function() {
                    // Mimic an async search event
                    if (query && query !== "") {
                        self.selectDWItems = [
                            {name: "Related with (" + query + ") 1", value: 1},
                            {name: "Related with (" + query + ") 2", value: 2},
                            {name: "Related with (" + query + ") 3", value: 3},
                        ];
                    }
                    else {
                        var manyItems = [];
                        for (var i = 1;i <= 50;i++) {
                            manyItems.push({name: "Type " + i, value: i});
                        }
                        self.selectDWItems = manyItems;
                    }
                }, 500);
            }
        }
    });

    var TimeGraphView = countlyVue.views.BaseView.extend({
        template: '#vue-example-tg-template',
        data: function() {
            return {
                paths: [{
                    "label": "Previous Period",
                    "color": "#DDDDDD",
                    "mode": "ghost"
                }, {
                    "label": "Total Sessions",
                    "color": "#52A3EF"
                }],
                activeTab: null,
                activeGraphTab: null
            };
        },
        computed: {
            randomNumbers: function() {
                return this.$store.getters["countlyVueExample/graphPoints"];
            },
            barData: function() {
                return this.$store.getters["countlyVueExample/barData"];
            },
            pieData: function() {
                return this.$store.getters["countlyVueExample/pieData"];
            },
            lineData: function() {
                return this.$store.getters["countlyVueExample/lineData"];
            }
        },
        methods: {
            refresh: function() {
                this.$store.dispatch("countlyVueExample/fetchGraphPoints");
            }
        }
    });

    var ExampleDrawer = countlyVue.views.BaseView.extend({
        template: '#drawer-template',
        data: function() {
            return {
                title: '',
                saveButtonLabel: '',
                constants: {
                    "visibilityOptions": [
                        {label: "Global", value: "global", description: "Can be seen by everyone."},
                        {label: "Private", value: "private", description: "Can be seen by the creator."}
                    ],
                    "availableProps": [
                        {label: "Type 1", value: 1},
                        {label: "Type 2", value: 2},
                        {label: "Type 3", value: 3}
                    ]
                }
            };
        },
        props: {
            controls: {
                type: Object
            }
        },
        methods: {
            onSubmit: function(doc) {
                this.$store.dispatch("countlyVueExample/myRecords/save", doc);
            },
            onClose: function($event) {
                this.$emit("close", $event);
            },
            onCopy: function(newState) {
                if (newState._id !== null) {
                    this.title = "Edit Record";
                    this.saveButtonLabel = "Save Changes";
                }
                else {
                    this.title = "Create New Record";
                    this.saveButtonLabel = "Create Record";
                }
            }
        }
    });

    var MainView = countlyVue.views.BaseView.extend({
        template: '#vue-example-main-template',
        mixins: [countlyVue.mixins.hasDrawers("main")],
        components: {
            "table-view": TableView,
            "tg-view": TimeGraphView,
            "drawer": ExampleDrawer
        },
        beforeCreate: function() {
            this.$store.dispatch("countlyVueExample/initialize");
        }
    });

    var vuex = [{
        clyModel: countlyVueExample
    }];

    var exampleView = new countlyVue.views.BackboneWrapper({
        component: MainView,
        vuex: vuex,
        templates: [
            "/vue-example/templates/empty.html",
            "/vue-example/templates/drawer.html",
            {
                namespace: 'vue-example',
                mapping: {
                    'table-template': '/vue-example/templates/table.html',
                    'tg-template': '/vue-example/templates/tg.html',
                    'main-template': '/vue-example/templates/main.html'
                }
            }
        ]
    });

    app.vueExampleView = exampleView;

    app.route("/vue/example", 'vue-example', function() {
        var params = {};
        this.vueExampleView.params = params;
        this.renderWhenReady(this.vueExampleView);
    });

})();