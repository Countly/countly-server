/*global $, app, countlyGlobal, countlyVue, countlyCommon, countlyAuth, CV, CountlyHelpers, countlyRemoteConfig */

(function() {
    var FEATURE_NAME = "remote_config";

    var ParametersDrawer = countlyVue.views.create({
        template: CV.T("/remote-config/templates/parameters-drawer.html"),
        props: {
            controls: {
                type: Object
            }
        },
        data: function() {
            return {
                title: "",
                saveButtonLabel: ""
            };
        },
        methods: {
            onSubmit: function(doc) {
                var self = this;
                var action = "countlyRemoteConfig/parameters/create";
                if (doc._id) {
                    action = "countlyRemoteConfig/parameters/update";
                }

                this.$store.dispatch(action, doc)
                    .then(function() {
                        self.$emit("submit");
                    });
            },
            onCopy: function(doc) {
                if (doc._id) {
                    this.title = "Update parameter";
                    this.saveButtonLabel = "Save";
                }
                else {
                    this.title = "Add parameter";
                    this.saveButtonLabel = "Save";
                }
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
        data: function() {
            return {
                title: "",
                saveButtonLabel: ""
            };
        },
        methods: {
            onSubmit: function(doc) {
                var self = this;
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
                    this.title = "Update condition";
                    this.saveButtonLabel = "Save";
                }
                else {
                    this.title = "Add condition";
                    this.saveButtonLabel = "Save";
                }
            }
        }
    });

    var ParametersComponent = countlyVue.views.BaseView.extend({
        template: "#remote-config-parameters",
        mixins: [countlyVue.mixins.hasDrawers("parameters")],
        components: {
            drawer: ParametersDrawer
        },
        computed: {
            tableRows: function() {
                return this.$store.getters["countlyRemoteConfig/parameters/all"];
            }
        },
        methods: {
            create: function() {
                this.openDrawer("parameters", countlyRemoteConfig.factory.parameters.getEmpty());
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
            return {
                dynamicTab: (this.$route.params && this.$route.params.tab) || "parameters",
                tabs: [
                    {
                        title: "Parameters",
                        name: "parameters",
                        component: ParametersComponent,
                        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/remote-config/parameters"
                    },
                    {
                        title: "Conditions",
                        name: "conditions",
                        component: ConditionsComponent,
                        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/remote-config/conditions"
                    },
                ]
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

        return new countlyVue.views.BackboneWrapper({
            component: MainComponent,
            vuex: vuex,
            templates: [
                {
                    namespace: "remote-config",
                    mapping: {
                        main: "/remote-config/templates/main.html",
                        parameters: "/remote-config/templates/parameters.html",
                        conditions: "/remote-config/templates/conditions.html",
                    }
                }
            ]
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
            if (countlyGlobal.plugins.indexOf("drill") > -1) {
                app.addMenu("improve", {code: "remote-config", url: "#/remote-config", text: "sidebar.remote-config", icon: '<div class="logo"><i class="material-icons" style="transform:rotate(90deg)"> call_split </i></div>', priority: 30});
            }
        }
    });
})();