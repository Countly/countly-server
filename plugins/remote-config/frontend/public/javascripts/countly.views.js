/*global $, _,countlyQueryBuilder, app, moment, countlyGlobal, countlyVue, countlyCommon, countlyAuth, CV, CountlyHelpers, countlyRemoteConfig */

(function() {
    var FEATURE_NAME = "remote_config";

    var ParametersDrawer = countlyVue.views.create({
        template: CV.T("/remote-config/templates/parameters-drawer.html"),
        computed: {
            isDrillEnabled: function() {
                return countlyGlobal.plugins.indexOf("drill") > -1 ? true : false;
            },
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
            };
        },
        methods: {
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
            onSubmit: function(doc) {
                var self = this;
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
                this.$store.dispatch(action, doc)
                    .then(function() {
                        self.$emit("submit");
                    });
            },
            onCopy: function(doc) {
                if (doc._id) {
                    if (doc.description === "-") {
                        doc.description = "";
                    }
                    if (typeof (default_value) === 'object') {
                        doc.default_value = JSON.stringify(doc.default_value);
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
                }
                else {
                    this.title = "Add parameter";
                    this.saveButtonLabel = "Save";
                    this.showDescription = false;
                    this.valuesList = [];
                    this.showExpirationDate = false;
                }
            },
            openJsonEditor: function() {
                this.$store.dispatch("countlyRemoteConfig/parameters/showJsonEditor", true);
            }
        }
    });

    var JsonEditor = countlyVue.views.create({
        template: CV.T("/remote-config/templates/json-editor.html"),
        data: function() {
            return {
                jsonerror: "",
                jsonstr: ""
            };
        },
        computed: {
            centerDialogVisible: function() {
                return this.$store.getters["countlyRemoteConfig/parameters/showJsonEditor"];
            }
        },
        methods: {
            validateJson: function() {
                this.jsonerror = "";
                try {
                    // try to parse
                    if (this.jsonstr) {
                        JSON.parse(this.jsonstr);
                    }
                }
                catch (e) {
                    this.jsonerror = JSON.stringify(e.message);
                }
            },
            prettyFormat: function() {
                // reset error
                var jsonValue = "";
                try {
                    // try to parse
                    jsonValue = JSON.parse(this.jsonstr);
                    this.jsonstr = JSON.stringify(jsonValue, null, 2);
                }
                catch (e) {
                    // Do nothing
                }
            },
            submit: function() {
                this.$store.dispatch("countlyRemoteConfig/parameters/showJsonEditor", false);
            },
            cancel: function() {
                this.$store.dispatch("countlyRemoteConfig/parameters/showJsonEditor", false);
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
                colorTag: [{
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

                ]
            };
        },
        methods: {
            onSubmit: function(doc) {
                var self = this;
                doc.condition_color = this.selectedTag.value;
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
            "json-editor": JsonEditor

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
                if (conditions.length === 0) {
                    return "1 condition";
                }
                return conditions.length + 1 + "conditions";
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