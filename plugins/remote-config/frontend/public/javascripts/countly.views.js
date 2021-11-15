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

    var ColorTag = countlyVue.views.BaseView.extend({
        data: function() {
            return {
                selectedColorKey: this.defaultColorKey
            };
        },
        methods: {
            click: function(event) {
                this.selectedColorKey = event.target.getAttribute('data-color');
                this.$emit("input", Number(this.selectedColorKey));
            },
        },

        props: {
            value: Number,
            tags: {
                type: Array,
                default: []
            },
            defaultColorKey: {
                type: Number,
                default: 1
            }
        },
        template: '<div class="bu-is-flex bu-is-flex-wrap-wrap bu-is-align-items-center">\
                                <div class="cly-vue-remote-config-conditions-drawer__color-tag-wrapper"  v-for="(tag,idx) in tags" :data-color="tag.key">{{ tag.label }}\
                                <div v-if="tag.key == selectedColorKey" @click="click" class="cly-vue-remote-config-conditions-drawer__color-tag cly-vue-remote-config-conditions-drawer__color-tag__selected bu-is-flex bu-is-align-items-center bu-is-justify-content-center" :style="{backgroundColor: tag.colorCode}" :data-color="tag.key">\
                                    <i class="ion-checkmark cly-vue-remote-config-conditions-drawer__checkmark"></i>\
                                </div>\
                                <div v-else @click="click" class="cly-vue-remote-config-conditions-drawer__color-tag bu-is-flex bu-is-align-items-center bu-is-justify-content-center" :style="{backgroundColor: tag.colorCode}" :data-color="tag.key"></div>\
                                </div>\
                    </div>'
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
        components: {
            "color-tag": ColorTag
        },
        props: {
            controls: {
                type: Object
            }
        },
        computed: {
            managedPropertySegmentation: {
                get: function() {
                    return this.conditionPropertySegmentation;

                },
                set: function(value) {
                    if (!_.isEmpty(value.query)) {
                        this.conditionPropertySegmentation.query = value.query;
                    }
                    if (value.queryText) {
                        this.conditionPropertySegmentation.queryText = value.queryText;
                        if (value.queryText.includes("Random Percentile")) {
                            this.showSeedValue = true;
                            return;
                        }
                    }
                    this.showSeedValue = false;
                }
            }
        },
        data: function() {
            var additionalProperties = [];

            additionalProperties.push(new countlyQueryBuilder.Property({
                id: 'condition.randomPercentile',
                name: "Random Percentile",
                type: countlyQueryBuilder.PropertyType.NUMBER,
                group: 'User Properties',

            }));
            return {
                selectedColorKey: 1,
                useDescription: false,
                conditionPropertySegmentation: { query: {}, byVal: []},
                showSeedValue: false,
                additionalProperties: additionalProperties,
                title: "",
                saveButtonLabel: "",
                defaultColorKey: 1,
                colorTag: [{
                    key: 1,
                    colorCode: "#6C47FF"
                },
                {
                    key: 2,
                    colorCode: "#39C0C8"
                },
                {
                    key: 3,
                    colorCode: "#F96300"
                },
                {
                    key: 4,
                    colorCode: "#F34971"
                },
                {
                    key: 5,
                    colorCode: "#F5C900"
                }

                ]
            };
        },
        methods: {
            onSubmit: function(doc) {
                var self = this;
                doc.condition_color = this.selectedColorKey;
                if (!doc.condition_description || !self.useDescription) {
                    doc.condition_description = "-";
                }
                if (!_.isEmpty(self.conditionPropertySegmentation.query)) {
                    doc.condition = self.conditionPropertySegmentation.query;
                }
                if (self.conditionPropertySegmentation.queryText) {
                    doc.condition_definition = self.conditionPropertySegmentation.queryText;
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
                        this.defaultColorKey = doc.condition_color;
                    }
                    if (doc.condition_description === "-") {
                        doc.condition_description = "";
                    }
                    this.title = "Update condition";
                    this.saveButtonLabel = "Save";
                    if (!_.isEmpty(doc.condition)) {
                        this.conditionPropertySegmentation.query = JSON.parse(doc.condition);

                    }
                    if (doc.condition_definition) {
                        this.conditionPropertySegmentation.queryText = doc.condition_definition;

                    }
                    if (doc.condition_description) {
                        this.useDescription = true;
                    }
                }
                else {
                    this.title = "Add condition";
                    this.saveButtonLabel = "Save";
                    this.conditionPropertySegmentation.query = {};
                    this.conditionPropertySegmentation.queryText = "";
                    this.useDescription = false;
                    this.selectedColorKey = 1;
                    this.defaultColorKey = 1;
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