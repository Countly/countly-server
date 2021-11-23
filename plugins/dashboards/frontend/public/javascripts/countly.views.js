/*global $, app, countlyVue, countlyDashboards, countlyAuth, countlyGlobal, CV, Backbone, GridStack, CountlyHelpers */

(function() {
    var FEATURE_NAME = "dashboards";

    var DashboardDrawer = countlyVue.views.create({
        template: CV.T('/dashboards/templates/dashboards-drawer.html'),
        props: {
            controls: {
                type: Object
            }
        },
        data: function() {
            return {
                title: "",
                saveButtonLabel: "",
                sharingAllowed: countlyGlobal.sharing_status || (countlyGlobal.member.global_admin && ((countlyGlobal.member.restrict || []).indexOf("#/manage/configurations") < 0)),
                groupSharingAllowed: countlyGlobal.plugins.indexOf("groups") > -1 && countlyGlobal.member.global_admin
            };
        },
        computed: {
            sharingOptions: function() {
                var options = countlyDashboards.factory.dashboards.sharingOptions();
                var opt = [];
                for (var i = 0; i < options.length; i++) {
                    if (options[i] === "all-users") {
                        opt.push({
                            value: options[i],
                            name: this.i18nM("dashboards.share.all-users"),
                            description: this.i18nM("dashboards.share.all-users.description"),
                        });
                    }

                    if (options[i] === "selected-users") {
                        opt.push({
                            value: options[i],
                            name: this.i18nM("dashboards.share.selected-users"),
                            description: this.i18nM("dashboards.share.selected-users.description"),
                        });
                    }

                    if (options[i] === "none") {
                        opt.push({
                            value: options[i],
                            name: this.i18nM("dashboards.share.none"),
                            description: this.i18nM("dashboards.share.none.description"),
                        });
                    }
                }
                return opt;
            },
            allGroups: function() {
                return [];
            }
        },
        methods: {
            onSubmit: function(doc) {
                var action = "countlyDashboards/create";
                var __action = doc.__action;

                if (__action === "edit") {
                    action = "countlyDashboards/update";
                }

                if (__action === "duplicate") {
                    action = "countlyDashboards/duplicate";
                }

                delete doc.__action;

                this.$store.dispatch(action, doc).then(function(id) {
                    if (__action === "duplicate" ||
                        __action === "create") {
                        app.navigate('#/custom/' + id, true);
                    }
                });
            },
            onCopy: function(doc) {
                this.title = this.i18nM("dashboards.create-new-dashboard-heading");
                this.saveButtonLabel = this.i18nM("dashboards.create-dashboard");

                if (doc.__action === "edit") {
                    this.title = this.i18nM("dashboards.edit-dashboard-heading");
                    this.saveButtonLabel = this.i18nM("dashboards.save-dashboard");
                }

                if (doc.__action === "duplicate") {
                    this.title = this.i18nM("dashboards.duplicate-dashboard-heading");
                    this.saveButtonLabel = this.i18nM("dashboards.create-dashboard");
                }
            }
        }
    });

    var WidgetDrawer = countlyVue.views.create({
        template: CV.T('/dashboards/templates/widget-drawer.html'),
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
        computed: {
            widgetTypes: function() {
                var c = countlyVue.container.dataMixin({
                    components: "/custom/dashboards/widget"
                });

                var widgetTypes = c.data().components;

                widgetTypes.sort(function(a, b) {
                    return a.priority - b.priority;
                });

                return widgetTypes;
            }
        },
        methods: {
            onSubmit: function(doc) {
                var action = "countlyDashboards/widgets/create";
                var __action = doc.__action;
                var self = this;

                if (__action === "edit") {
                    action = "countlyDashboards/widgets/update";
                }

                delete doc.__action;

                this.$store.dispatch(action, doc).then(function(id) {
                    self.$store.dispatch("countlyDashboards/widgets/get", id).then(function() {

                    });
                });
            },
            onCopy: function(doc) {
                this.title = this.i18nM("dashboards.add-new-widget-heading");
                this.saveButtonLabel = this.i18nM("dashbaords.create-widget");

                if (doc.__action === "edit") {
                    this.title = this.i18nM("dashboards.edit-widget-heading");
                    this.saveButtonLabel = this.i18nM("dashboards.save-widget");
                }
            }
        }
    });

    var EmptyComponent = countlyVue.views.BaseView.extend({
        template: '#dashboards-empty',
    });

    var GridComponent = countlyVue.views.BaseView.extend({
        template: '#dashboards-grid',
        mixins: [countlyVue.mixins.hasDrawers("widgets")],
        components: {
            "widgets-drawer": WidgetDrawer
        },
        data: function() {
            return {};
        },
        computed: {
            allWidgets: function() {
                return this.$store.getters["countlyDashboards/widgets/all"];
            },
            components: function() {
                var c = countlyVue.container.dataMixin({
                    components: "/custom/dashboards/widget"
                });

                c = c.data().components;

                var components = c.reduce(function(acc, component) {
                    acc[component.type] = component;
                    return acc;
                }, {});

                return components;
            },
            canUpdate: function() {
                var dashboard = this.$store.getters["countlyDashboards/selected"];
                return dashboard.data.is_editable;
            }
        },
        methods: {
            initGrid: function() {
                this.grid = GridStack.init({
                    cellHeight: 100,
                    margin: 10,
                    animate: true,
                });

                this.grid.on("dragstop", function(event, element) {
                    var node = element.gridstackNode;
                    console.log(node);
                });
            },
            onWidgetAction: function(command, data) {
                var self = this;
                var d = JSON.parse(JSON.stringify(data));

                switch (command) {
                case "edit":
                    d.__action = "edit";
                    self.openDrawer("widgets", d);
                    break;

                case "delete":
                    d.__action = "delete";
                    CountlyHelpers.confirm(this.i18nM("dashboards.delete-widget-text"), "popStyleGreen", function(result) {
                        if (!result) {
                            return false;
                        }

                        self.$store.dispatch("countlyDashboards/widgets/delete", d._id);

                    }, [this.i18nM("common.no-dont-delete"), this.i18nM("dashboards.delete-widget")], {title: this.i18nM("dashboards.delete-widget-title")});
                    break;
                }
            },
        },
        mounted: function() {
            this.initGrid();
        }
    });

    var HomeComponent = countlyVue.views.BaseView.extend({
        template: "#dashboards-main",
        mixins: [countlyVue.mixins.hasDrawers("dashboards"), countlyVue.mixins.hasDrawers("widgets")],
        components: {
            "dashboards-empty": EmptyComponent,
            "dashboards-grid": GridComponent,
            "dashboards-drawer": DashboardDrawer,
            "widgets-drawer": WidgetDrawer
        },
        data: function() {
            return {
                dashboardId: this.$route.params && this.$route.params.dashboardId
            };
        },
        computed: {
            isEmpty: function() {
                return !this.$store.getters["countlyDashboards/widgets/all"].length;
            },
            dashboard: function() {
                var selected = this.$store.getters["countlyDashboards/selected"];
                return selected.data || {};
            },
            canUpdate: function() {
                return this.dashboard.is_editable;
            }
        },
        methods: {
            refresh: function() {
                //this.$store.dispatch("countlyDashboards/setDashboard", this.dashboardId, true);
            },
            onDashboardAction: function(command, data) {
                var self = this;
                var d = JSON.parse(JSON.stringify(data));

                switch (command) {
                case "edit":
                    d.__action = "edit";
                    self.openDrawer("dashboards", d);
                    break;

                case "duplicate":
                    d.__action = "duplicate";
                    d.name = "Copy - " + d.name;
                    self.openDrawer("dashboards", d);
                    break;

                case "delete":
                    d.__action = "delete";
                    CountlyHelpers.confirm(this.i18n("dashboards.delete-dashboard-text", d.name), "popStyleGreen", function(result) {
                        if (!result) {
                            return false;
                        }

                        self.$store.dispatch("countlyDashboards/delete", d._id);

                    }, [this.i18nM("common.no-dont-delete"), this.i18nM("dashboards.yes-delete-dashboard")], {title: this.i18nM("dashboards.delete-dashboard-title"), image: "delete-dashboard"});
                    break;
                }
            },
            addWidget: function() {
                var empty = countlyDashboards.factory.widgets.getEmpty();
                empty.__action === "create";
                this.openDrawer("widgets", empty);
            }
        },
        mounted: function() {
            this.$store.dispatch("countlyDashboards/setDashboard", this.dashboardId);
        }
    });

    var getMainView = function() {
        var vuex = [
            {
                clyModel: countlyDashboards
            }
        ];

        return new countlyVue.views.BackboneWrapper({
            component: HomeComponent,
            vuex: vuex,
            templates: [
                {
                    namespace: "dashboards",
                    mapping: {
                        main: "/dashboards/templates/index.html",
                        empty: "/dashboards/templates/empty.html",
                        grid: "/dashboards/templates/grid.html"
                    }
                }
            ]
        });
    };

    if (countlyAuth.validateRead(FEATURE_NAME)) {
        app.route("/custom", '', function() {
            var mainView = getMainView();
            this.renderWhenReady(mainView);
        });

        app.route('/custom/*dashboardId', '', function(dashboardId) {
            var mainView = getMainView();
            var params = {
                dashboardId: dashboardId
            };

            mainView.params = params;
            this.renderWhenReady(mainView);
        });
    }

    if (countlyAuth.validateRead(FEATURE_NAME)) {

        var DashboardsMenu = countlyVue.views.create({
            template: CV.T('/dashboards/templates/dashboards-menu.html'),
            mixins: [countlyVue.mixins.hasDrawers("dashboards")],
            components: {
                "dashboards-drawer": DashboardDrawer
            },
            data: function() {
                return {
                    canCreate: countlyAuth.validateCreate(FEATURE_NAME),
                };
            },
            computed: {
                selectedDashboard: function() {
                    var selected = this.$store.getters["countlySidebar/getSelectedMenuItem"];

                    if (selected.menu === "dashboards") {
                        return selected.item;
                    }

                    return {};
                },
                allDashboards: function() {
                    var dashboards = this.$store.getters["countlyDashboards/all"];
                    this.identifySelectedDashboard(dashboards);
                    return dashboards;
                }
            },
            methods: {
                onDashboardMenuItemClick: function(dashboard) {
                    this.$store.dispatch("countlySidebar/updateSelectedMenuItem", {menu: "dashboards", item: dashboard});
                    app.navigate('#/custom/' + dashboard._id, true);
                },
                identifySelectedDashboard: function(dashboards) {
                    var currLink = Backbone.history.fragment;

                    if (/^\/custom/.test(currLink) === false) {
                        return;
                    }

                    currLink = currLink.split("/");
                    var id = currLink[currLink.length - 1];

                    var currMenu = dashboards.find(function(d) {
                        return d._id === id;
                    });

                    if (!currMenu) {
                        // eslint-disable-next-line no-console
                        console.log("Dashboard not found - ", id, dashboards);
                    }

                    this.$store.dispatch("countlySidebar/updateSelectedMenuItem", {menu: "dashboards", item: currMenu || {}});
                },
                addDashboard: function() {
                    var empty = countlyDashboards.factory.dashboards.getEmpty();
                    empty.__action === "create";
                    this.openDrawer("dashboards", empty);
                }
            },
            beforeCreate: function() {
                this.module = countlyDashboards.getVuexModule();
                CV.vuex.registerGlobally(this.module);
            },
            mounted: function() {
                this.$store.dispatch("countlyDashboards/getAll");
            }
        });

        countlyVue.container.registerData("/sidebar/menu/main", {
            name: "dashboards",
            icon: "ion-android-apps",
            component: DashboardsMenu
        });
    }

    countlyVue.container.registerMixin("/manage/export/export-features", {
        beforeCreate: function() {
            var self = this;
            $.when(countlyDashboards.initialize(null, true))
                .then(function() {
                    var dashboards = countlyDashboards.getAllDashboards();
                    var dashboardsList = [];
                    dashboards.forEach(function(dashboard) {
                        dashboardsList.push({
                            name: dashboard.name,
                            id: dashboard._id
                        });
                    });
                    var selectItem = {
                        id: "dashboards",
                        name: "Dashboards",
                        children: dashboardsList
                    };
                    if (dashboardsList.length) {
                        self.$store.dispatch("countlyConfigTransfer/addConfigurations", selectItem);
                    }
                });
        }
    });

})();