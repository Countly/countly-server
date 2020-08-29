/*global app, countlyVue, countlyVueExample, countlyGlobal, countlyCommon, validators */

var TableView = countlyVue.views.BaseView.extend({
    template: '#vue-example-table-template',
    computed: {
        tableRows: function() {
            return this.$store.getters["vueExample/pairs"];
        }
    },
    data: function() {
        var self = this;
        return {
            targetName: "",
            targetValue: 0,
            activeTab: null,
            tableKeyFn: function(row) {
                return row._id;
            },
            tableColumns: [
                {
                    type: "checkbox",
                    fieldKey: "status",
                    onChange: function(newValue, row) {
                        self.$store.commit("vueExample/setStatus", {_id: row._id, value: newValue});
                    },
                    options: {
                        title: "Status"
                    },
                    dt: {
                        "sWidth": "10%"
                    }
                },
                {
                    type: "field",
                    fieldKey: "_id",
                    options: {
                        title: "ID"
                    },
                    dt: {
                        "sWidth": "4%"
                    },
                },
                {
                    type: "field",
                    fieldKey: "name",
                    options: {
                        dataType: "string",
                        title: "Name"
                    },
                    dt: {
                        "sWidth": "15%"
                    },
                },
                {
                    type: "field",
                    fieldKey: "value",
                    options: {
                        dataType: "numeric",
                        title: "Value"
                    },
                    dt: {
                        "sWidth": "15%"
                    },
                },
                {
                    type: "raw",
                    options: {
                        dataType: "numeric",
                        title: "Custom"
                    },
                    viewFn: function(row, type) {
                        if (type === "display") {
                            var stringBuffer = ['<div class="on-off-switch">'];
                            stringBuffer.push("<strong><div class='custom-action-trigger'>Click to delete this</strong></div>");
                            stringBuffer.push('</div>');
                            return stringBuffer.join('');
                        }
                        else {
                            return row.value;
                        }
                    },
                    customActions: [{
                        selector: ".custom-action-trigger",
                        event: "click",
                        action: {"event": "try-delete-record"}
                    }],
                    dt: {
                        "sWidth": "15%"
                    }
                },
                {
                    type: "options",
                    items: [
                        {
                            icon: "fa fa-trash",
                            label: "Delete",
                            action: {"event": "delete-record"},
                        },
                        {
                            icon: "fa fa-trash",
                            label: "Delete (with undo)",
                            action: {"event": "try-delete-record"},
                            disabled: !(countlyGlobal.member.global_admin || countlyGlobal.admin_apps[countlyCommon.ACTIVE_APP_ID])
                        }
                    ],
                    dt: {
                        "sWidth": "3%"
                    }
                }
            ],
            typedText: 'Type sth...',
            selectedRadio: 2,
            availableRadio: [
                {label: "Type 1", value: 1},
                {label: "Type 2", value: 2},
                {label: "Type 3", value: 3, description: "Some description..."},
            ],
            selectedCheckFlag: true,
            selectedCheck: [1, 2],
            availableCheck: [
                {label: "Type 1", value: 1},
                {label: "Type 2", value: 2},
                {label: "Type 3", value: 3},
            ]
        };
    },
    methods: {
        add: function() {
            this.$emit("open-drawer", "main", countlyVueExample.factory.getEmpty());
        },
        onTryDelete: function(row, callback) {
            callback({
                "undo": {
                    "commit": "delete-record",
                    "message": "You deleted a record."
                }
            });
        },
        onDelete: function(row) {
            this.$store.commit("vueExample/deletePairById", row._id);
        },
        onShow: function(/*row, key*/) {
        }
    }
});

var TimeGraphView = countlyVue.views.BaseView.extend({
    template: '#vue-example-tg-template',
    mixins: [
        countlyVue.mixins.refreshOnParentActive
    ],
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
            return this.$store.getters["vueExample/randomNumbers"];
        },
        barData: function() {
            return this.$store.getters["vueExample/barData"];
        },
        pieData: function() {
            return this.$store.getters["vueExample/pieData"];
        },
        lineData: function() {
            return this.$store.getters["vueExample/lineData"];
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
        afterEditedObjectChanged: function(newState) {
            if (!newState._id) {
                this.title = "Create New Record";
            }
        },
        onSave: function() {
            /*this.targetName = "Your data, your rules.";
            this.targetValue += 1;
            this.$store.commit("vueExample/addPair", {name: this.targetName, value: this.targetValue});*/
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