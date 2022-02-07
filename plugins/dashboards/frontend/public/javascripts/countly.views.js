/*global $, app, countlyVue, countlyDashboards, countlyAuth, countlyGlobal, CV, _, Backbone, GridStack, CountlyHelpers */

(function() {
    var FEATURE_NAME = "dashboards";

    var WidgetsMixin = {
        computed: {
            __widgets: function() {
                var w = countlyVue.container.dataMixin({
                    widgets: "/custom/dashboards/widget"
                });

                w = w.data().widgets;

                w = w.reduce(function(acc, component) {
                    if (!acc[component.type]) {
                        acc[component.type] = [];
                    }

                    acc[component.type].push(component);
                    return acc;
                }, {});

                return w;
            }
        },
        methods: {
            onReset: function(widgetType) {
                var widget = {
                    widget_type: widgetType
                };

                /**
                 * First we will get widget settings based on getter function.
                 * If nothing is returned, we will resort to getting primary widget settings.
                 */
                var widgetSettings = this.widgetSettingsGetter(widget);

                if (!widgetSettings) {
                    widgetSettings = this.widgetSettingsPrimary(widget);
                }

                if (widgetSettings) {
                    var defaultEmpty = widgetSettings.drawer.getEmpty();
                    this.loadDrawer("widgets", Object.assign({}, defaultEmpty));
                }
            },
            widgetSettingsGetter: function(widget) {
                var widgets = this.__widgets;

                if (!widget.widget_type) {
                    countlyDashboards.factory.log("Widget type is not defined");
                    return false;
                }

                var registrations = widgets[widget.widget_type];

                if (!registrations) {
                    countlyDashboards.factory.log("Soooo, unfortunately, we don't have any widget settings for " + widget.widget_type);
                    countlyDashboards.factory.log("Possible reason is - The widget wasn't registered correctly in the UI.");
                    countlyDashboards.factory.log("Please check the widget registration. Thanks :)");

                    return false;
                }

                var setting = registrations.find(function(registration) {
                    return registration.getter(widget);
                });

                if (!setting) {
                    countlyDashboards.factory.log("No setting found for the " + widget.widget_type + " widget type based on the widget getter. Please register the widget settings correctly.");
                }


                return setting;
            },
            widgetSettingsPrimary: function(widget) {
                /**
                 * We should only call this function when we are switching between widget types.
                 * Or we need the list of all primary widget settings.
                 * For other cases call the widgetSettingsGetter function.
                 */

                var widgets = this.__widgets;

                if (!widget.widget_type) {
                    countlyDashboards.factory.log("Widget type is not defined");
                    return;
                }

                var registrations = widgets[widget.widget_type];

                if (!registrations) {
                    countlyDashboards.factory.log("Soooo, unfortunately, we don't have any widget settings for " + widget.widget_type);
                    countlyDashboards.factory.log("Possible reason is - The widget wasn't registered correctly in the UI.");
                    countlyDashboards.factory.log("Please check the widget registration. Thanks :)");

                    return false;
                }

                var setting = registrations.find(function(registration) {
                    return registration.primary;
                });

                if (!setting) {
                    countlyDashboards.factory.log("No primary widget found for " + widget.widget_type + " !. Please set primary to true in the widget registration.");
                }

                return setting;
            }
        }
    };

    var DimensionsValidationMixin = {
        data: function() {
            return {
                MIN_WIDTH: 3,
                MIN_HEIGHT: 3
            };
        },
        methods: {
            validateWidgetPosition: function(widget, axis) {
                var pos;

                switch (axis) {
                case "x":
                    pos = widget.position && widget.position[0];
                    break;
                case "y":
                    pos = widget.position && widget.position[1];
                    break;
                }

                return pos;
            },
            validateWidgetSize: function(widget, dimension) {
                var size;

                switch (dimension) {
                case "w":
                    size = widget.size && widget.size[0];
                    size = this.calculateWidth(size);

                    break;
                case "h":
                    size = widget.size && widget.size[1];
                    size = this.calculateHeight(size);
                    break;
                }

                return size;
            },
            validateWidgetDimension: function(settings, dimension) {
                var dimensions = settings.grid.dimensions();
                var dim;

                switch (dimension) {
                case "w":
                    dim = dimensions.minWidth;
                    dim = this.calculateWidth(dim);

                    break;
                case "h":
                    dim = dimensions.minHeight;
                    dim = this.calculateHeight(dim);

                    break;
                }

                return dim;
            },
            calculateWidth: function(width) {
                /**
                 * This function returns the width that is a multiple of 3 and closest to the old width.
                 */
                var w = width;

                if (!w || w < this.MIN_WIDTH) {
                    /**
                     * We should return minimum width mentioned in the widgets settings.
                     * Lets do this later.
                     */
                    w = this.MIN_WIDTH;
                    countlyDashboards.factory.log("Width should be atleast equal to " + this.MIN_WIDTH + "! Old width = " + width + ", New width = " + w);
                }

                var rem = w % this.MIN_WIDTH;
                if (rem !== 0) {
                    var quo = parseInt(w / 3);
                    var prevNum = quo * 3;
                    var nextNum = (quo + 1) * 3;
                    if (((w - prevNum) - (nextNum - w)) > 0) {
                        w = nextNum;
                    }
                    else {
                        w = prevNum;
                    }

                    countlyDashboards.factory.log("Width should be a multiple of " + this.MIN_WIDTH + "! Old width = " + width + ", New width = " + w);
                }

                return w;
            },
            calculateHeight: function(height) {
                var h = height;
                if (!h || h < this.MIN_HEIGHT) {
                    /**
                     * We should return minimum width mentioned in the widgets settings.
                     * Lets do this later.
                     */
                    h = this.MIN_HEIGHT;
                    countlyDashboards.factory.log("Height should be atleast equal to " + this.MIN_HEIGHT + "! Old height = " + height + ", New height = " + h);
                }

                return h;
            }
        }
    };

    var DashboardMixin = {
        methods: {
            addDashboard: function() {
                var empty = countlyDashboards.factory.dashboards.getEmpty();
                empty.__action = "create";
                this.openDrawer("dashboards", empty);
            }
        }
    };

    var DisabledWidget = countlyVue.views.BaseView.extend({
        template: '#dashboards-disabled',
        props: {
            widget: {
                type: Object,
                default: function() {
                    return {};
                }
            }
        }
    });

    var InvalidWidget = countlyVue.views.BaseView.extend({
        template: '#dashboards-invalid',
        props: {
            widget: {
                type: Object,
                default: function() {
                    return {};
                }
            }
        }
    });

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
                groupSharingAllowed: countlyGlobal.plugins.indexOf("groups") > -1 && countlyGlobal.member.global_admin,
                constants: {
                    sharingOptions: [
                        {
                            value: "all-users",
                            name: this.i18nM("dashboards.share.all-users"),
                            description: this.i18nM("dashboards.share.all-users.description"),
                        },
                        {
                            value: "selected-users",
                            name: this.i18nM("dashboards.share.selected-users"),
                            description: this.i18nM("dashboards.share.selected-users.description"),
                        },
                        {
                            value: "none",
                            name: this.i18nM("dashboards.share.none"),
                            description: this.i18nM("dashboards.share.none.description"),
                        }
                    ]
                }
            };
        },
        computed: {
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

                var empty = countlyDashboards.factory.dashboards.getEmpty();
                var obj = {};

                for (var key in empty) {
                    obj[key] = doc[key];
                }

                this.$store.dispatch(action, obj).then(function(id) {
                    if (id) {
                        if (__action === "duplicate" ||
                        __action === "create") {
                            app.navigate('#/custom/' + id, true);
                        }
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

    var NoWidget = countlyVue.views.BaseView.extend({
        template: '#dashboards-nowidget',
        methods: {
            newWidget: function() {
                this.$emit("new-widget");
            }
        }
    });

    var NoDashboard = countlyVue.views.BaseView.extend({
        template: '#dashboards-nodashboard',
        mixins: [countlyVue.mixins.hasDrawers("dashboards"), DashboardMixin],
        components: {
            "dashboards-drawer": DashboardDrawer
        }
    });

    var WidgetComponent = countlyVue.views.BaseView.extend({
        template: '#dashboards-widget',
        mixins: [DimensionsValidationMixin],
        props: {
            widget: {
                type: Object,
                default: function() {
                    return {};
                }
            },
            settings: {
                type: Object,
                default: function() {
                    return {
                        grid: {
                            dimensions: function() {
                                return {};
                            }
                        },
                        drawer: {
                            getEmpty: function() {
                                return {};
                            }
                        }
                    };
                }
            }
        },
        components: {
            "widget-disabled": DisabledWidget,
            "widget-invalid": InvalidWidget
        },
        computed: {
            canUpdate: function() {
                var dashboard = this.$store.getters["countlyDashboards/selected"];
                return dashboard.data && dashboard.data.is_editable;
            }
        },
        methods: {
            isWidgetDisabled: function(widget) {
                return widget.isPluginWidget && (countlyGlobal.plugins.indexOf(widget.widget_type) < 0);
            },
            isWidgetInvalid: function(widget) {
                var invalid = true;

                var dashData = widget.dashData;

                if (dashData) {
                    invalid = dashData.isValid === false ? true : false;
                    invalid = dashData.isProcessing ? false : invalid;
                }

                if (widget.client_fetch) {
                    invalid = false;
                }

                return invalid;
            }
        },
        mounted: function() {
            /**
             * Emitting ready event tells the grid to make this widget.
             * Making a widget means that it is now a part of the grid
             * and ready for user interaction.
             */
            this.$emit("ready", this.widget._id);
        }
    });

    var WidgetDrawer = countlyVue.views.create({
        template: CV.T('/dashboards/templates/widget-drawer.html'),
        mixins: [WidgetsMixin],
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
                var widgetTypes = [];

                for (var key in this.__widgets) {
                    var setting = this.widgetSettingsPrimary({widget_type: key});
                    if (setting) {
                        widgetTypes.push(setting);
                    }
                }

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
                var isEdited = __action === "edit";

                if (isEdited) {
                    action = "countlyDashboards/widgets/update";
                }

                var setting = this.widgetSettingsGetter(doc);

                if (!setting) {
                    countlyDashboards.factory.log("Well this is very strange.");
                    countlyDashboards.factory.log("On widget submit, atleast one of the widget registrations should be returned.");
                    countlyDashboards.factory.log("Kindly check your widget getter, maybe something is wrong there.");

                    return;
                }

                if (setting.drawer.beforeSaveFn) {
                    var returnVal = setting.drawer.beforeSaveFn(doc, isEdited);
                    if (returnVal) {
                        doc = returnVal;
                    }
                }

                var empty = setting.drawer.getEmpty();
                var obj = {};

                /**
                 * Don't send all widget properties to the server.
                 * Send only the ones specified in the widget's drawer settings (getEmpty)
                 */

                for (var key in empty) {
                    obj[key] = doc[key];
                }

                obj = JSON.parse(JSON.stringify(obj));

                this.$store.dispatch(action, {id: doc._id, settings: obj}).then(function(id) {
                    if (id) {
                        if (isEdited) {
                            self.$store.dispatch("countlyDashboards/widgets/get", doc._id);
                        }
                        else {
                            obj.id = id;
                            self.$emit("add-widget", obj);
                        }
                    }
                });
            },
            onCopy: function(doc) {
                this.title = this.i18nM("dashboards.add-new-widget-heading");
                this.saveButtonLabel = this.i18nM("dashbaords.create-widget");

                if (doc.__action === "edit") {
                    this.title = this.i18nM("dashboards.edit-widget-heading");
                    this.saveButtonLabel = this.i18nM("dashboards.save-widget");
                }

                /**
                 * Here we first call the widgetSettingsGetter since onCopy is called
                 * when the widget drawer is being opened.
                 * There are two cases - Widget add and Widget update.
                 */
                var setting = this.widgetSettingsGetter(doc);

                if (!setting) {
                    countlyDashboards.factory.log("Well this is very strange.");
                    countlyDashboards.factory.log("On widget onCopy, atleast one of the widget registrations should be returned.");
                    countlyDashboards.factory.log("Kindly check your widget getter, maybe something is wrong there.");

                    return;
                }

                if (setting) {
                    if (setting.drawer.beforeLoadFn) {
                        var returnVal = setting.drawer.beforeLoadFn(doc, doc.__action === "edit");
                        if (returnVal) {
                            return returnVal;
                        }
                    }
                }
            },
            reset: function(v) {
                this.$emit("reset", v);
            }
        }
    });

    var GridComponent = countlyVue.views.BaseView.extend({
        template: '#dashboards-grid',
        mixins: [countlyVue.mixins.hasDrawers("widgets"), WidgetsMixin, DimensionsValidationMixin],
        components: {
            "widgets-drawer": WidgetDrawer,
            "widget": WidgetComponent
        },
        data: function() {
            return {
                grid: null,
            };
        },
        computed: {
            allWidgets: function() {
                var allWidgets = JSON.parse(JSON.stringify(this.$store.getters["countlyDashboards/widgets/all"]));
                return allWidgets;
            }
        },
        methods: {
            onWidgetAction: function(command, data) {
                var self = this;
                var d = JSON.parse(JSON.stringify(data));

                var setting = this.widgetSettingsGetter(d);

                if (!setting) {
                    countlyDashboards.factory.log("Well this is very strange.");
                    countlyDashboards.factory.log("On widget action, atleast one of the widget registrations should be returned.");
                    countlyDashboards.factory.log("Kindly check your widget getter, maybe something is wrong there.");

                    return;
                }

                var empty = setting.drawer.getEmpty();

                switch (command) {
                case "edit":
                    d.__action = "edit";
                    self.openDrawer("widgets", Object.assign({}, empty, d));
                    break;

                case "delete":
                    d.__action = "delete";
                    CountlyHelpers.confirm(this.i18nM("dashboards.delete-widget-text"), "popStyleGreen", function(result) {
                        if (!result) {
                            return false;
                        }

                        self.$store.dispatch("countlyDashboards/widgets/delete", d._id).then(function(res) {
                            if (res) {
                                var node = document.getElementById(d._id);
                                self.removeGridWidget(node);
                                self.$store.dispatch("countlyDashboards/widgets/remove", d._id);
                            }
                        });

                    }, [this.i18nM("common.no-dont-delete"), this.i18nM("dashboards.delete-widget")], {title: this.i18nM("dashboards.delete-widget-title")});
                    break;
                }
            },
            addWidget: function(widget) {
                /**
                 * So widget has been created on the server.
                 * Now we want to add it to the grid.
                 * Since there is no direct way to communicate between vue and gridstack,
                 * we need to add it to the grid manually.
                 *
                 * After the widget is added to the grid manually,
                 * grid will trigger "added" event
                 */
                var id = widget.id;
                var setting = this.widgetSettingsGetter(widget);

                if (!setting) {
                    countlyDashboards.factory.log("This can never happen! \
                    addWidget is called after submit. Please check the WidgetDrawer's onSubmit.");

                    return;
                }

                if (id) {
                    var node = {
                        id: id,
                        autoPosition: true,
                        w: setting.grid.dimensions().width,
                        h: setting.grid.dimensions().height,
                        minW: setting.grid.dimensions().minWidth,
                        minH: setting.grid.dimensions().minHeight,
                        new: true
                    };

                    this.addGridWidget(node);
                }
            },
            onReady: function(id) {
                this.makeGridWidget(id);
            },
            redrawRowWigets: function() {
                var self = this;

                var allGridElements = this.grid.save(false);

                allGridElements = _.sortBy(allGridElements, function(a) {
                    return (a.y * 10) + a.x;
                });

                var Y;
                var rowMaxH;
                var rowUpdateRequired = false;
                var updateIndex = 0;
                var widgetId;
                var nodeEl;

                /**
                 * Starting batch update.
                 */
                self.grid.batchUpdate();

                for (var i = 0; i < allGridElements.length; i++) {
                    var node = allGridElements[i];
                    var y = node.y;
                    var h = node.h;

                    if (!Number.isInteger(Y)) {
                        Y = y;
                    }

                    if (!Number.isInteger(rowMaxH)) {
                        rowMaxH = h;
                    }

                    if (y !== Y) {
                        /**
                         * Since the allGridElements is sorted by x and y,
                         * we can assume that all the widgets are in the same row
                         * as long as y === Y.
                         *
                         * They are different, we need to check if we need to update
                         * heights for the widgets in the row.
                         */

                        if (rowUpdateRequired) {
                            while (updateIndex < i) {
                                widgetId = allGridElements[updateIndex].id;
                                nodeEl = document.getElementById(widgetId);

                                /**
                                 * This update will only be applied after we call the
                                 * grid commit method.
                                 */
                                self.updateGridWidget(nodeEl, {h: rowMaxH});
                                updateIndex++;
                            }
                        }

                        /**
                         * At last we will update the variables for this new row.
                         */

                        Y = y;
                        rowMaxH = h;
                        rowUpdateRequired = false;
                        updateIndex = i;
                    }

                    if (rowMaxH !== h) {
                        if (rowMaxH < h) {
                            rowMaxH = h;
                        }

                        rowUpdateRequired = true;
                    }

                    if (i === (allGridElements.length - 1)) {
                        /**
                         * For the last item, we need to run update explicitly.
                         * Since the above update block will never be executed.
                         */
                        if (rowUpdateRequired) {
                            while (updateIndex < allGridElements.length) {
                                widgetId = allGridElements[updateIndex].id;
                                nodeEl = document.getElementById(widgetId);

                                /**
                                 * This update will only be applied after we call the
                                 * grid commit method.
                                 */
                                self.updateGridWidget(nodeEl, {h: rowMaxH});
                                updateIndex++;
                            }
                        }
                    }
                }

                /**
                 * Committing batch update.
                 */
                self.grid.commit();
            },
            initGrid: function() {
                var self = this;
                this.grid = GridStack.init({
                    cellHeight: 100,
                    margin: 10,
                    animate: true,
                    float: false
                });

                this.grid.on("change", function(event, items) {
                    for (var i = 0; i < items.length; i++) {
                        var node = items[i];
                        var widgetId = node.id;
                        var setWidth = node.w;
                        var setHeight = node.h;

                        var validatedWidth = self.calculateWidth(setWidth);
                        var validatedHeight = self.calculateHeight(setHeight);

                        var finalWidth = setWidth;
                        var finalHeight = setHeight;
                        var updateUi = false;

                        if (validatedWidth !== setWidth) {
                            /**
                             * Widths can only change as per the calculateWidth logic
                             */
                            finalWidth = validatedWidth;
                            updateUi = true;
                        }

                        if (validatedHeight !== setHeight) {
                            /**
                             * Heights can only change as per the calculateWidth logic
                             */
                            finalHeight = validatedHeight;
                            updateUi = true;
                        }

                        if (updateUi) {
                            /**
                             * Widget width should be set to the validated width and height
                             */
                            self.updateGridWidget(node.el, {w: finalWidth, h: finalHeight});
                        }

                        var size = [finalWidth, finalHeight];
                        var position = [node.x, node.y];

                        /**
                         * You can even check if the widget position is a multiple of 3.
                         * Lets do this later.
                         */

                        self.updateWidget(widgetId, {size: size, position: position});
                    }

                    self.redrawRowWigets();
                });

                this.grid.on("added", function(event, element) {
                    /**
                     * This event is emitted when the widget is added to the grid.
                     * After it has been added to grid we need to update it in vuex aswell.
                     * But before we update it in vuex we need to update its size and position.
                     *
                     * We cannot add widgets to vuex without size or position since its a
                     * reactive property on which "allWidgets" variable depends.
                     *
                     * So, once we update the size and position of the widget, then we fetch it
                     * from the server and add it to vuex.
                     *
                     * Next, we remove the dummy widget that we added manually to grid,
                     * since its of no use anymore. Its only use was to place the widget in the grid
                     * in an available space. Vue's reactivity will create the widget
                     * automatically in the grid once its added to vuex.
                     */
                    var node = element[0];

                    if (node && node.new) {
                        var widgetId = node.id;
                        var position = [node.x, node.y];
                        var size = [node.w, node.h];

                        self.$store.dispatch("countlyDashboards/widgets/update", {id: widgetId, settings: {position: position, size: size}}).then(function(res) {
                            if (res) {
                                self.$store.dispatch("countlyDashboards/widgets/get", widgetId).then(function() {
                                    self.removeGridWidget(node.el);
                                });
                            }
                        });
                    }
                });
            },
            updateWidget: function(widgetId, settings) {
                var self = this;

                setTimeout(function() {
                    self.$store.dispatch("countlyDashboards/widgets/update", {id: widgetId, settings: settings});
                }, 100);
            },
            updateGridWidget: function(el, settings) {
                this.grid.update(el, settings);
            },
            addGridWidget: function(node) {
                if (this.grid) {
                    this.grid.addWidget(node);
                }
            },
            makeGridWidget: function(id) {
                /**
                 * this.grid will be null on first load.
                 * Since ready event is fired by the children on mounting.
                 * And until they all mount, mount of this component will not be called.
                 * Hence no grid.
                 *
                 * However, once we have grid available, and we are creating a new widget,
                 * we have to make it. Making means that the widget is now a part of the grid
                 * and ready for user interaction.
                 *
                 * For the first load, initGrid is doing the work of makeWidget.
                 */

                if (this.grid) {
                    this.grid.makeWidget("#" + id);
                }
            },
            compactGrid: function() {
                this.grid.compact();
            },
            removeGridWidget: function(el) {
                if (this.grid) {
                    this.grid.removeWidget(el);
                }
            },
            destroyGrid: function() {
                if (this.grid) {
                    this.grid.destroy();
                }
            }
        },
        mounted: function() {
            this.initGrid();
        },
        beforeDestroy: function() {
            this.destroyGrid();
        }
    });

    var HomeComponent = countlyVue.views.BaseView.extend({
        template: "#dashboards-main",
        mixins: [countlyVue.mixins.hasDrawers("dashboards"), countlyVue.mixins.hasDrawers("widgets"), WidgetsMixin],
        components: {
            "no-dashboard": NoDashboard,
            "no-widget": NoWidget,
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
            noDashboards: function() {
                var selected = this.$store.getters["countlyDashboards/selected"];
                return !(selected.id && selected.data);
            },
            noWidgets: function() {
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
                if (!this.drawers.dashboards.isOpened && !this.drawers.widgets.isOpened) {
                    /**
                     * Refresh only if the drawers are not open at the moment.
                     */
                    this.getDashboardData(true);
                }
            },
            dateChanged: function() {
                this.getDashboardData(true);
            },
            getDashboardData: function(isRefresh) {
                this.$store.dispatch("countlyDashboards/setDashboard", {id: this.dashboardId, isRefresh: isRefresh});
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

                        self.$store.dispatch("countlyDashboards/delete", d._id).then(function(res) {
                            if (res) {
                                app.navigate('#/custom');
                                /**
                                 * Set the current dashboard id to null
                                 */
                                self.dashboardId = null;
                            }
                        });

                    }, [this.i18nM("common.no-dont-delete"), this.i18nM("dashboards.yes-delete-dashboard")], {title: this.i18nM("dashboards.delete-dashboard-title"), image: "delete-dashboard"});
                    break;
                }
            },
            newWidget: function() {
                var empty = {};
                var setting = this.widgetSettingsPrimary({widget_type: "analytics"});

                var defaultEmpty = setting.drawer.getEmpty();

                empty.__action = "create";
                this.openDrawer("widgets", Object.assign({}, empty, defaultEmpty));
            },
            addWidgetToGrid: function(widget) {
                this.$refs.grid.addWidget(widget);
            }
        },
        beforeMount: function() {
            this.getDashboardData();
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
                        nowidget: "/dashboards/templates/transient/no-widget.html",
                        nodashboard: "/dashboards/templates/transient/no-dashboard.html",
                        disabled: "/dashboards/templates/transient/disabled-widget.html",
                        invalid: "/dashboards/templates/transient/invalid-widget.html",
                        grid: "/dashboards/templates/grid.html",
                        widget: "/dashboards/templates/widget.html",
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
            mixins: [countlyVue.mixins.hasDrawers("dashboards"), DashboardMixin],
            components: {
                "dashboards-drawer": DashboardDrawer
            },
            data: function() {
                return {
                    canCreate: countlyAuth.validateCreate(FEATURE_NAME),
                    searchQuery: "",
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
                    var query = this.searchQuery;

                    var dashboards = this.$store.getters["countlyDashboards/all"];
                    this.identifySelectedDashboard(dashboards);

                    if (!query) {
                        return dashboards;
                    }

                    query = (query + "").trim().toLowerCase();

                    return dashboards.filter(function(option) {
                        var compareTo = option.name || "";
                        return compareTo.toLowerCase().indexOf(query) > -1;
                    });
                }
            },
            methods: {
                onDashboardMenuItemClick: function(dashboard) {
                    this.$store.dispatch("countlySidebar/updateSelectedMenuItem", {menu: "dashboards", item: dashboard});
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
                        countlyDashboards.factory.log("Dashboard not found - " + id + ", Dashboards = " + dashboards);
                    }

                    this.$store.dispatch("countlySidebar/updateSelectedMenuItem", {menu: "dashboards", item: currMenu || {}});
                }
            },
            beforeCreate: function() {
                this.module = countlyDashboards.getVuexModule();
                CV.vuex.registerGlobally(this.module);
            },
            beforeMount: function() {
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