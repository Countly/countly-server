/*global app, countlyVue, countlyVueExample, countlyGlobal, countlyCommon, validators */

var TableView = countlyVue.views.BaseView.extend({
    template: '#vue-example-table-template',
    computed: {
        tableRows: function() {
            return this.$store.getters["countlyVueExample/table/rows"];
        },
        tableDiff: function() {
            return this.$store.getters["countlyVueExample/table/diff"];
        },
        rTableData: function() {
            return this.$store.getters["countlyVueExample/tooManyRecords/paged"];
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
            tableColumns: [
                {
                    type: "cly-detail-toggler",
                    sortable: false,
                    width: "10px",
                },
                {
                    label: 'Status',
                    field: 'status',
                    type: 'boolean',
                    sortable: false
                },
                {
                    label: 'ID',
                    field: '_id',
                    type: 'number',
                },
                {
                    type: "text",
                    field: "name",
                    label: "Name",
                },
                {
                    type: "text",
                    field: "description",
                    label: "Description",
                },
                {
                    type: "cly-options",
                    width: "20px",
                    items: [
                        {
                            icon: "fa fa-pencil",
                            label: "Edit",
                            event: "edit-record",
                        },
                        {
                            icon: "fa fa-trash",
                            label: "Delete",
                            event: "delete-record",
                        },
                        {
                            icon: "fa fa-trash",
                            label: "Delete (with undo)",
                            event: "delayed-delete-record",
                            disabled: !(countlyGlobal.member.global_admin || countlyGlobal.admin_apps[countlyCommon.ACTIVE_APP_ID])
                        }
                    ]
                },
            ],
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
        updateStatusInfo: function() {
            var newStatusInfo = this.tableDiff.map(function(item) {
                return {
                    _id: item.key,
                    status: item.newValue
                };
            });
            this.$store.dispatch("countlyVueExample/myRecords/status", newStatusInfo);
        },
        unpatchStatusChanges: function() {
            this.$store.commit("countlyVueExample/table/unpatch", {fields: ["status"]});
        },
        refresh: function() {
            this.$store.dispatch("countlyVueExample/myRecords/fetchAll");
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
        updateRemoteParams: function(remoteParams) {
            this.$store.commit("countlyVueExample/tooManyRecords/setRequestParams", remoteParams);
            this.$store.dispatch("countlyVueExample/tooManyRecords/fetchPaged");
        },
        setRowData: function(row, fields) {
            this.$store.commit("countlyVueExample/table/patch", {row: row, fields: fields});
        },
        onDelayedDelete: function(row) {
            var self = this;
            this.$store.commit("countlyVueExample/table/patch", {
                row: row,
                fields: {
                    _delayedDelete: new countlyVue.helpers.DelayedAction(
                        "You deleted a record.",
                        function() {
                            self.$store.dispatch("countlyVueExample/myRecords/remove", row._id);
                        },
                        function() {
                            self.$store.commit("countlyVueExample/table/unpatch", {row: row, fields: ["_delayedDelete"]});
                        })
                }
            }
            );
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

var ExampleDrawer = countlyVue.components.BaseDrawer.extend({
    computed: {
        stepValidations: function() {
            return {
                "step1": !(this.$v.editedObject.name.$invalid || this.$v.editedObject.field1.$invalid || this.$v.editedObject.field2.$invalid),
                "step3": !(this.$v.editedObject.selectedProps.$invalid)
            };
        }
    },
    data: function() {
        return {
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
    methods: {
        beforeLeavingStep: function() {
            if (this.currentStepId === "step1") {
                [this.$v.editedObject.name, this.$v.editedObject.field1, this.$v.editedObject.field2].forEach(function(validator) {
                    validator.$touch();
                });
            }
            else if (this.currentStepId === "step3") {
                this.$v.editedObject.selectedProps.$touch();
            }
        },
        afterObjectCopy: function(newState) {
            if (newState._id !== null) {
                this.title = "Edit Record";
                this.saveButtonLabel = "Save Changes";
            }
            else {
                this.title = "Create New Record";
                this.saveButtonLabel = "Create Record";
            }
            return newState;
        }
    },
    validations: {
        editedObject: {
            name: {
                required: validators.required
            },
            field1: {
                required: validators.required
            },
            field2: {
                required: validators.required
            },
            selectedProps: {
                required: validators.required,
                minLength: validators.minLength(2)
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
        "example-drawer": ExampleDrawer
    },
    methods: {
        onDrawerSubmit: function(doc) {
            this.$store.dispatch("countlyVueExample/myRecords/save", doc);
        }
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