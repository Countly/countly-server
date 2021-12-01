/*global $, _,countlyQueryBuilder, app, moment, countlyGlobal, countlyVue, countlyCommon, countlyAuth, CV, CountlyHelpers, countlyRemoteConfig */

(function() {
    var FEATURE_NAME = "remote_config";
    var _mixins = countlyVue.mixins;

    var COLOR_TAG = [{
        value: 1,
        label: "#6C47FF"
    },
    {
        value: 2,
        label: "#39C0C8"
    },
    {
        value: 3,
        label: "#F96300"
    },
    {
        value: 4,
        label: "#F34971"
    },
    {
        value: 5,
        label: "#F5C900"
    }

    ];

    var DATA_TYPES = {
        d: CV.i18n("remote-config.type.d"),
        n: CV.i18n("remote-config.type.n"),
        bl: CV.i18n("remote-config.type.bl"),
        s: CV.i18n("remote-config.type.s"),
        l: CV.i18n("remote-config.type.l")
    };

    var ConditionStats = countlyVue.views.BaseView.extend({
        template: '	<table class="cly-vue-remote-config-percentages-breakdown">\
			<thead>\
				<tr>\
					<th class="cly-vue-remote-config-percentages-breakdown__sequence__heading bu-pl-2">\
						#\
					</th>\
					<th class="cly-vue-remote-config-percentages-breakdown__heading">\
						{{i18n("remote-config.condition")}}\
					</th>\
                    		<th class="cly-vue-remote-config-percentages-breakdown__heading">\
						{{i18n("remote-config.percentage")}}\
					</th>\
				</tr>\
			</thead>\
			<tbody>\
                <tr><td><div class="cly-vue-remote-config-percentages-breakdown__sequence bu-py-1 bu-px-2">1</div></td><td><div class="bu-is-align-items-center	bu-is-flex cly-vue-remote-config-percentages-breakdown__data bu-p-1 cly-vue-remote-config-percentages-breakdown__default-value"><span class="bu-ml-2 bu-mr-3">{{i18n("remote-config.default-value")}}</span><span class="cly-vue-remote-config-percentages-breakdown__default-value__value bu-py-1 bu-px-2">{{defaultValue.value}}</span></div></td><td>{{defaultValue.percentage}} {{i18n("remote-config.percent.of.total")}}</td></tr>\
				<tr v-for="(condition, i) in conditions" :key="i">\
                    <td><div class="cly-vue-remote-config-percentages-breakdown__sequence bu-py-1 bu-px-2">{{i+2}}</div>\
                    </td>\
					     <td><div class="bu-is-align-items-center	bu-is-flex cly-vue-remote-config-percentages-breakdown__data bu-p-1 cly-vue-remote-config-percentages-breakdown__condition" :style="{backgroundColor: condition.color}"><span><i class="ion ion-git" style="transform:rotate(90deg)"></i></span><span class="bu-ml-2 bu-mr-3">{{condition.name}}</span><span class="cly-vue-remote-config-percentages-breakdown__condition__value bu-py-1 bu-px-2">{{condition.value}}</span></div></td>\
					<td>\
                    {{condition.percentage}} {{i18n("remote-config.percent.of.total")}}\
					</td>\
				</tr>\
			</tbody>\
		</table>',
        props: {
            parameter: {
                type: Object,
                default: function() {
                    return {};
                }
            }
        },
        computed: {
            conditions: function() {
                var conditions = [];
                var conditionsMap = this.$store.getters["countlyRemoteConfig/parameters/conditionsMap"];
                var self = this;
                if (this.parameter.conditions.length > 0) {
                    this.parameter.conditions.forEach(function(condition) {
                        var conditionProperties = conditionsMap[condition.condition_id];
                        var ob = {
                            color: self.getColor(conditionProperties.condition_color),
                            percentage: condition.c ? ((condition.c) / self.totalConditions).toFixed(2) : 0,
                            name: conditionProperties.condition_name,
                            value: condition.value
                        };
                        conditions.push(ob);
                    });
                }
                return conditions;
            },
            totalConditions: function() {
                var total = 0;
                if (this.parameter.conditions.length > 0) {
                    this.parameter.conditions.forEach(function(condition) {
                        total = total + condition.c ? condition.c : 0;
                    });
                }
                return total;
            },
            defaultValue: function() {
                var ob = {
                    value: this.parameter.default_value,
                    percentage: this.parameter.c ? ((this.parameter.c) / this.totalConditions).toFixed(2) : 0,
                };
                return ob;
            }
        },
        methods: {
            getColor: function(condition_color) {
                var arr = COLOR_TAG.filter(function(item) {
                    return item.value === condition_color;
                });
                return arr[0].label;
            }
        }
    });
    var JsonEditor = countlyVue.views.create({
        template: CV.T("/remote-config/templates/json-editor.html"),
        data: function() {
            return {
                currentVal: ""
            };
        },
        computed: {
        },
        props: {
            value: String,
            isOpen: Boolean
        },
        watch: {
            value: {
                immediate: true,
                handler: function(newValue) {
                    this.currentVal = newValue;
                }
            },
        },
        methods: {
            handleClose: function() {
                this.$store.dispatch("countlyRemoteConfig/parameters/showJsonEditor", false);
                this.$store.dispatch("countlyRemoteConfig/parameters/showJsonEditorForCondition", false);
                this.$emit("input", this.currentVal);
            }
        }
    });
    var ConditionDialog = countlyVue.views.create({
        template: CV.T("/remote-config/templates/condition-dialog.html"),
        mixins: [
            _mixins.MultiStepForm,
        ],
        data: function() {
            var additionalProperties = [];
            var remoteConfigFilterRules = [new countlyQueryBuilder.RowRule({
                name: "cly.remote-config-random-percentile-rule",
                selector: function(row) {
                    return row.property.id === "up.random_percentile";
                },
                actions: [new countlyQueryBuilder.RowAction({
                    id: "disallowOperator",
                    params: {
                        selector: function(operator) {
                            return ["cly.=", "cly.!=", "cly.contains", "cly.between", "cly.isset"].includes(operator.id);
                        }
                    }
                })]
            })];
            additionalProperties.push(new countlyQueryBuilder.Property({
                id: 'up.random_percentile',
                name: CV.i18n("remote-config.conditions.random.percentile"),
                type: countlyQueryBuilder.PropertyType.NUMBER,
                group: 'User Properties',

            }));
            return {
                selectedTag: {},
                conditionDialog: {
                    condition_name: "",
                    condition_color: 1,
                    condition: {},
                    condition_definition: "",
                    seed_value: "",
                    condition_description: ""
                },
                remoteConfigFilterRules: remoteConfigFilterRules,
                useDescription: false,
                managedPropertySegmentation: {},
                conditionPropertySegmentation: { query: {}, byVal: []},
                additionalProperties: additionalProperties,
                defaultTag: {
                    value: 1,
                    label: "#6C47FF"
                },
                colorTag: COLOR_TAG
            };
        },
        computed: {
            isOpen() {
                return this.$store.getters["countlyRemoteConfig/parameters/showConditionDialog"];
            },
            showSeedValue: function() {
                if (!_.isEmpty(this.managedPropertySegmentation.queryText) && this.$refs.conditionQb && this.$refs.conditionQb.meta.usedProps["up.random_percentile"]) {
                    return true;
                }
                return false;
            }
        },
        props: {
            value: Object
        },
        methods: {
            submit: function() {
                var self = this;
                this.$emit("value", this.conditionDialog.condition_name);
                var action = "countlyRemoteConfig/conditions/create";
                this.conditionDialog.condition_color = this.selectedTag.value ? this.selectedTag.value : 1;
                if (!this.conditionDialog.condition_description || !this.useDescription) {
                    this.conditionDialog.condition_description = "-";
                }
                if (!_.isEmpty(this.managedPropertySegmentation.query)) {
                    this.conditionDialog.condition = this.managedPropertySegmentation.query;
                }
                if (this.managedPropertySegmentation.queryText) {
                    this.conditionDialog.condition_definition = this.managedPropertySegmentation.queryText;
                }
                this.$store.dispatch(action, this.conditionDialog).then(function(data) {
                    var ob = {
                        name: self.conditionDialog.condition_name,
                        id: data
                    };
                    self.$emit("input", ob);
                    self.$emit("closeConditionDialog");
                });
                this.$store.dispatch("countlyRemoteConfig/parameters/showConditionDialog", false);

            },
            cancel: function() {
                this.$store.dispatch("countlyRemoteConfig/parameters/showConditionDialog", false);
            },
        }
    });
    var CreateConditionInput = countlyVue.views.create({
        template: '#remote-config-create-condition',
        components: {"json-editor": JsonEditor},
        props: {
            value: {
                type: Object
            },
            label: {
                type: String
            },
            removable: {
                type: Boolean,
                default: true
            },
            conditionIndex: {
                type: Number,
                default: -1
            }
        },
        data: function() {
            return {
                currentId: "",
                dataTypes: [
                    {
                        label: DATA_TYPES.d,
                        value: 'd'
                    },
                    {
                        label: DATA_TYPES.n,
                        value: 'n'
                    },
                    {
                        label: DATA_TYPES.bl,
                        value: 'bl'
                    },
                    {
                        label: DATA_TYPES.s,
                        value: 's'
                    },
                    {
                        label: DATA_TYPES.l,
                        value: 'l'
                    }
                ]
            };
        },
        computed: {
            condition: function() {
                return this.value;
            },
            isOpen() {
                var val = this.$store.getters["countlyRemoteConfig/parameters/showJsonEditorForCondition"];
                if (this.currentId === this.condition.condition_id) {
                    this.condition.open = val;
                }
                return val;
            },
        },
        methods: {
            removeCondition: function() {
                this.$emit("remove-me");
            },
            openJsonEditorForCondition: function() {
                this.currentId = this.condition.condition_id;
                // this.$emit("openJsonEditorForCondition");
                this.condition.open = true;
                this.$store.dispatch("countlyRemoteConfig/parameters/showJsonEditorForCondition", true);
            }
        }
    });
    var ParametersDrawer = countlyVue.views.create({
        template: CV.T("/remote-config/templates/parameters-drawer.html"),
        components: {
            "json-editor": JsonEditor,

            "remote-config-add-condition": CreateConditionInput,
            "condition-dialog": ConditionDialog

        },
        computed: {
            isOpen() {
                return this.$store.getters["countlyRemoteConfig/parameters/showJsonEditor"];
            },
            isDrillEnabled: function() {
                return countlyGlobal.plugins.indexOf("drill") > -1 ? true : false;
            },
            conditionArray: function() {
                return this.$store.getters["countlyRemoteConfig/conditions/all"];
            }
        },
        props: {
            controls: {
                type: Object
            }
        },
        data: function() {
            return {
                title: "",
                saveButtonLabel: "",
                showDescription: false,
                valuesList: [],
                showExpirationDate: false,
                showCondition: false,
                countries: [{
                    "label": "test",
                    "value": "test"
                }],
                currentConditionValue: "",
                conditions: [],
                defaultValue: "",
                createdCondition: {}
            };
        },
        methods: {
            handleSelect: function(item) {
                this.showCondition = false;
                var ob = {
                    name: item.value,
                    condition_id: item.condition_id,
                    open: false
                };
                this.conditions.push(ob);
                this.currentConditionValue = "";
            },
            addNewCondition: function() {
                this.showCondition = true;
            },
            querySearch: function(queryString, cb) {
                var data = queryString ? this.valuesList.filter(this.createFilter(queryString)) : this.valuesList;
                var results = [];
                data.forEach(function(value) {
                    var ob = {
                        value: value
                    };
                    results.push(ob);
                });
                return cb(results);
            },
            createFilter: function(queryString) {
                return function(value) {
                    return value.toLowerCase().indexOf(queryString.toLowerCase()) === 0;
                };
            },
            querySearchForCondition: function(queryStringForCondition, cb) {
                var data = queryStringForCondition ? this.conditionArray.filter(this.createFilterForCondition(queryStringForCondition)) : this.conditionArray;
                var results = [];
                data.forEach(function(value) {
                    var ob = {
                        value: value.condition_name,
                        condition_id: value._id
                    };
                    results.push(ob);
                });
                return cb(results);
            },
            createFilterForCondition: function(queryStringForCondition) {
                return function(value) {
                    return value.condition_name.toLowerCase().indexOf(queryStringForCondition.toLowerCase()) === 0;
                };
            },
            onSubmit: function(doc) {
                var self = this;
                doc.conditions = [];
                doc.default_value = this.defaultValue;
                var action = "countlyRemoteConfig/parameters/create";
                if (doc._id) {
                    action = "countlyRemoteConfig/parameters/update";
                }
                if (!doc.description || !this.showDescription) {
                    doc.description = "-";
                }
                if (doc.status === "Expired" && doc.expiry_dttm > Date.now()) {
                    doc.status = "Running";
                }

                if (this.conditions) {
                    this.conditions.forEach(function(condition, idx) {
                        var ob = {
                            condition_id: self.conditions[idx].condition_id,
                            value: self.conditions[idx].value
                        };
                        doc.conditions.push(ob);
                    });
                }
                this.$store.dispatch(action, doc)
                    .then(function() {
                        self.$emit("submit");
                    });
            },
            onCopy: function(doc) {
                if (doc._id) {
                    this.defaultValue = doc.default_value;

                    if (doc.description === "-") {
                        doc.description = "";
                    }
                    if (typeof (doc.default_value) === 'object') {
                        this.defaultValue = JSON.stringify(doc.default_value);
                    }
                    this.title = "Update parameter";
                    this.saveButtonLabel = "Save";
                    if (doc.description) {
                        this.showDescription = true;
                    }
                    if (doc.valuesList) {
                        this.valuesList = doc.valuesList;
                    }
                    if (doc.expiry_dttm) {
                        this.showExpirationDate = true;
                    }
                    if (doc.conditions) {
                        var conditionsMap = this.$store.getters["countlyRemoteConfig/parameters/conditionsMap"];
                        doc.conditions.forEach(function(item) {
                            if (conditionsMap[item.condition_id]) {
                                item.name = conditionsMap[item.condition_id].condition_name;
                            }
                        });
                        this.conditions = doc.conditions;
                    }
                }
                else {
                    this.conditions = [];
                    this.title = "Add parameter";
                    this.saveButtonLabel = "Save";
                    this.showDescription = false;
                    this.valuesList = [];
                    this.showExpirationDate = false;
                    this.defaultValue = "";
                }
            },
            openJsonEditor: function() {
                this.$store.dispatch("countlyRemoteConfig/parameters/showJsonEditor", true);
            },
            removeConditionAtIndex: function(index) {
                this.$delete(this.conditions, index);
            },
            showConditionDialog: function() {
                this.$store.dispatch("countlyRemoteConfig/parameters/showConditionDialog", true);
            },
            handleConditionDialog: function() {
                this.showCondition = false;
                var ob = {
                    name: this.createdCondition.name,
                    condition_id: this.createdCondition.id,
                    open: false
                };
                this.conditions.push(ob);
            }
        }
    });
    var ConditionsDrawer = countlyVue.views.create({
        template: CV.T("/remote-config/templates/conditions-drawer.html"),
        props: {
            controls: {
                type: Object
            }
        },
        computed: {
            showSeedValue: function() {
                if (!_.isEmpty(this.managedPropertySegmentation.queryText) && this.$refs.qb && this.$refs.qb.meta.usedProps["up.random_percentile"]) {
                    return true;
                }
                return false;
            }
        },
        data: function() {
            var additionalProperties = [];
            var remoteConfigFilterRules = [new countlyQueryBuilder.RowRule({
                name: "cly.remote-config-random-percentile-rule",
                selector: function(row) {
                    return row.property.id === "up.random_percentile";
                },
                actions: [new countlyQueryBuilder.RowAction({
                    id: "disallowOperator",
                    params: {
                        selector: function(operator) {
                            return ["cly.=", "cly.!=", "cly.contains", "cly.between", "cly.isset"].includes(operator.id);
                        }
                    }
                })]
            })];
            additionalProperties.push(new countlyQueryBuilder.Property({
                id: 'up.random_percentile',
                name: CV.i18n("remote-config.conditions.random.percentile"),
                type: countlyQueryBuilder.PropertyType.NUMBER,
                group: 'User Properties',

            }));
            return {
                remoteConfigFilterRules: remoteConfigFilterRules,
                selectedTag: {},
                useDescription: false,
                managedPropertySegmentation: {},
                conditionPropertySegmentation: { query: {}, byVal: []},
                additionalProperties: additionalProperties,
                title: "",
                saveButtonLabel: "",
                defaultTag: {
                    value: 1,
                    label: "#6C47FF"
                },
                colorTag: COLOR_TAG
            };
        },
        methods: {
            onSubmit: function(doc) {
                var self = this;
                doc.condition_color = this.selectedTag.value ? this.selectedTag.value : 1;
                if (!doc.condition_description || !self.useDescription) {
                    doc.condition_description = "-";
                }
                if (!_.isEmpty(self.managedPropertySegmentation.query)) {
                    doc.condition = self.managedPropertySegmentation.query;
                }
                if (self.managedPropertySegmentation.queryText) {
                    doc.condition_definition = self.managedPropertySegmentation.queryText;
                }
                var action = "countlyRemoteConfig/conditions/create";
                if (doc._id) {
                    action = "countlyRemoteConfig/conditions/update";
                }

                this.$store.dispatch(action, doc)
                    .then(function() {
                        self.$emit("submit");
                    });
            },
            onCopy: function(doc) {
                if (doc._id) {
                    if (doc.condition_color) {
                        var arr = this.colorTag.filter(function(item) {
                            return item.value === doc.condition_color;
                        });
                        if (arr.length > 0) {
                            this.defaultTag = arr[0];
                        }
                        else {
                            this.defaultTag = {
                                value: 1,
                                label: "#6C47FF"
                            };
                        }
                    }
                    if (doc.condition_description === "-") {
                        doc.condition_description = "";
                    }
                    this.title = "Update condition";
                    this.saveButtonLabel = "Save";
                    if (!_.isEmpty(doc.condition)) {
                        this.managedPropertySegmentation.query = JSON.parse(doc.condition);

                    }
                    if (doc.condition_definition) {
                        this.managedPropertySegmentation.queryText = doc.condition_definition;

                    }
                    if (doc.condition_description) {
                        this.useDescription = true;
                    }
                }
                else {
                    this.title = "Add condition";
                    this.saveButtonLabel = "Save";
                    this.managedPropertySegmentation.query = {};
                    this.managedPropertySegmentation.queryText = "";
                    this.useDescription = false;
                    this.selectedTag = {};
                    this.defaultTag = {
                        value: 1,
                        label: "#6C47FF"
                    };
                }
            }
        }
    });

    var ParametersComponent = countlyVue.views.BaseView.extend({
        template: "#remote-config-parameters",
        mixins: [countlyVue.mixins.hasDrawers("parameters")],
        components: {
            drawer: ParametersDrawer,
            "condition-stats": ConditionStats
        },
        computed: {
            isDrillEnabled: function() {
                return countlyGlobal.plugins.indexOf("drill") > -1 ? true : false;
            },
            tableRows: function() {
                return this.$store.getters["countlyRemoteConfig/parameters/all"];
            }
        },
        methods: {
            getNumberOfConditionsText: function(conditions) {
                if (conditions.length === 1) {
                    return "1 condition";
                }
                return conditions.length + "conditions";
            },
            getDate: function(ts) {
                if (!ts) {
                    return "-";
                }
                var d = new Date(ts);
                return moment(d).format("MMM Do, YYYY");
            },
            getTime: function(ts) {
                if (!ts) {
                    return "-";
                }
                var d = new Date(ts);
                return moment(d).format("h:mm a");
            },
            create: function() {
                this.openDrawer("parameters", countlyRemoteConfig.factory.parameters.getEmpty());
            },
            startParameter: function(row) {
                if (row.expiry_dttm < Date.now()) {
                    row.expiry_dttm = null;
                }
                row.status = "Running";
                this.$store.dispatch("countlyRemoteConfig/parameters/update", row);
            },
            stopParameter: function(row) {
                if (row.expiry_dttm < Date.now()) {
                    row.expiry_dttm = null;
                }
                row.status = "Stopped";
                this.$store.dispatch("countlyRemoteConfig/parameters/update", row);
            },
            handleCommand: function(command, scope, row) {
                var self = this;
                switch (command) {
                case "edit":
                    self.openDrawer("parameters", row);
                    break;

                case "remove":
                    CountlyHelpers.confirm(this.i18n("remote-config.confirm-parameter-delete", "<b>" + row.parameter_key + "</b>"), "popStyleGreen", function(result) {
                        if (!result) {
                            return false;
                        }

                        self.$store.dispatch("countlyRemoteConfig/parameters/remove", row).then(function() {
                            self.onSubmit();
                        });

                    }, [this.i18n["common.no-dont-delete"], this.i18n["remote-config.yes-delete-parameter"]], {title: this.i18n["remote-config.delete-parameter-title"], image: "delete-email-report"});
                    break;
                }
            },
            onSubmit: function() {
                this.$store.dispatch("countlyRemoteConfig/initialize");
            }
        }
    });

    var ConditionsComponent = countlyVue.views.BaseView.extend({
        template: "#remote-config-conditions",
        mixins: [countlyVue.mixins.hasDrawers("conditions")],
        components: {
            drawer: ConditionsDrawer
        },
        computed: {
            tableRows: function() {
                return this.$store.getters["countlyRemoteConfig/conditions/all"];
            }
        },
        methods: {
            create: function() {
                this.openDrawer("conditions", countlyRemoteConfig.factory.conditions.getEmpty());
            },
            handleCommand: function(command, scope, row) {
                var self = this;

                switch (command) {
                case "edit":
                    self.openDrawer("conditions", row);
                    break;

                case "remove":
                    CountlyHelpers.confirm(this.i18n("remote-config.confirm-condition-delete", "<b>" + name + "</b>"), "popStyleGreen", function(result) {
                        if (!result) {
                            return false;
                        }

                        self.$store.dispatch("countlyRemoteConfig/conditions/remove", row).then(function() {
                            self.onSubmit();
                        });

                    }, [this.i18n["common.no-dont-delete"], this.i18n["remote-config.yes-delete-condition"]], {title: this.i18n["remote-config.delete-condition-title"], image: "delete-email-report"});
                    break;
                }
            },
            onSubmit: function() {
                this.$store.dispatch("countlyRemoteConfig/initialize");
            }
        }
    });

    var MainComponent = countlyVue.views.BaseView.extend({
        template: "#remote-config-main",
        data: function() {
            var tabs = [
                {
                    title: "Parameters",
                    name: "parameters",
                    component: ParametersComponent,
                    route: "#/" + countlyCommon.ACTIVE_APP_ID + "/remote-config/parameters"
                }
            ];
            if (countlyGlobal.plugins.indexOf("drill") > -1) {
                tabs.push({
                    title: "Conditions",
                    name: "conditions",
                    component: ConditionsComponent,
                    route: "#/" + countlyCommon.ACTIVE_APP_ID + "/remote-config/conditions"
                });
            }
            return {
                dynamicTab: (this.$route.params && this.$route.params.tab) || "parameters",
                tabs: tabs
            };
        },
        beforeCreate: function() {
            this.$store.dispatch("countlyRemoteConfig/initialize");
        },
        methods: {
            refresh: function() {
                this.$store.dispatch("countlyRemoteConfig/initialize");
            }
        }
    });

    var getMainView = function() {
        var vuex = [
            {
                clyModel: countlyRemoteConfig
            }
        ];
        var templates = [
            {
                namespace: "remote-config",
                mapping: {
                    main: "/remote-config/templates/main.html",
                    parameters: "/remote-config/templates/parameters.html",
                    conditions: "/remote-config/templates/conditions.html",
                }
            }
        ];
        if (countlyGlobal.plugins.indexOf("drill") > -1) {
            templates.push("/drill/templates/query.builder.v2.html");
        }
        templates.push("/remote-config/templates/create-condition.html");

        return new countlyVue.views.BackboneWrapper({
            component: MainComponent,
            vuex: vuex,
            templates: templates
        });
    };

    app.route("/remote-config", 'remote-config', function() {
        var mainView = getMainView();
        this.renderWhenReady(mainView);
    });

    app.route("/remote-config/*tab", 'remote-config-tab', function(tab) {
        var mainView = getMainView();
        var params = {
            tab: tab
        };
        mainView.params = params;
        this.renderWhenReady(mainView);
    });

    $(document).ready(function() {
        //We shouldn't be using $ (jquery)

        if (countlyAuth.validateRead(FEATURE_NAME)) {
            app.addMenu("improve", {code: "remote-config", url: "#/remote-config", text: "sidebar.remote-config", icon: '<div class="logo"><i class="material-icons" style="transform:rotate(90deg)"> call_split </i></div>', priority: 30});
        }
    });
})();