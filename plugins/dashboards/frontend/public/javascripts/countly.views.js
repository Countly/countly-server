/*global app, countlyVue, countlyDashboards, countlyAuth, countlyGlobal, CV, _, Backbone, GridStack, CountlyHelpers */

(function() {
    var FEATURE_NAME = "dashboards";
    var AUTHENTIC_GLOBAL_ADMIN = (countlyGlobal.member.global_admin && ((countlyGlobal.member.restrict || []).indexOf("#/manage/configurations") < 0));

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

    var WidgetValidationMixin = {
        data: function() {
            return {
                GRID_COLUMNS: 4,
                DEFAULT_MIN_WIDTH: 2,
                MAX_ROW_X_SUM: 6
            };
        },
        methods: {
            validateWidgetSize: function(settings, widget, dimension) {
                var size;

                switch (dimension) {
                case "w":
                    size = widget.size && widget.size[0];
                    size = this.calculateWidth(settings, size);

                    break;
                case "h":
                    size = widget.size && widget.size[1];
                    size = this.calculateHeight(settings, size);
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
                    dim = this.calculateWidth(settings, dim);

                    break;
                case "h":
                    dim = dimensions.minHeight;
                    dim = this.calculateHeight(settings, dim);

                    break;
                }

                return dim;
            },
            calculateWidth: function(settings, width) {
                var dimensions = settings.grid.dimensions();
                var minWidth = dimensions.minWidth;

                var w = width;

                if (minWidth > this.GRID_COLUMNS) {
                    minWidth = this.DEFAULT_MIN_WIDTH;
                    countlyDashboards.factory.log("With the new dashboards, we have " + this.GRID_COLUMNS + " column grid system. So min width cannot be greater than " + this.GRID_COLUMNS + "! Old min width = " + dimensions.minWidth + ", New min width (set to default) = " + minWidth);
                }

                if (!w || w < minWidth) {
                    /**
                     * Minimum width of the widget should be equal to whats mentioned
                     * in its settings while registering the widget.
                     */
                    w = minWidth;
                    countlyDashboards.factory.log("Width should be atleast equal to " + minWidth + "! Old width = " + width + ", New width = " + w);
                }

                if (w > this.GRID_COLUMNS) {
                    /**
                     * If the width is greater than the allowed GRID Columns, lets
                     * reset it to the minimum width of the widget.
                     */
                    w = minWidth;
                    countlyDashboards.factory.log("Width cannot be greater than " + this.GRID_COLUMNS + "! Old width = " + width + ", New width = " + w);
                }

                /**
                    Following code is nomore required.
                    It would have been required if grid stack didn't allow setting
                    custom columns.

                    var widthMultiplier = 4;
                    var rem = w % widthMultiplier;
                    if (rem !== 0) {
                        var quo = parseInt(w / widthMultiplier);
                        var prevNum = quo * widthMultiplier;
                        var nextNum = (quo + 1) * widthMultiplier;
                        if (((w - prevNum) - (nextNum - w)) > 0) {
                            w = nextNum;
                        }
                        else {
                            w = prevNum;
                        }

                        countlyDashboards.factory.log("Width should be a multiple of " + widthMultiplier + "! New width = " + w);
                    }
                */

                return w;
            },
            calculateHeight: function(settings, height) {
                var dimensions = settings.grid.dimensions();
                var minHeight = dimensions.minHeight;

                var h = height;
                if (!h || h < minHeight) {
                    /**
                     * Minimum height of the widget should be equal to whats mentioned
                     * in its settings while registering the widget.
                     */
                    h = minHeight;
                    countlyDashboards.factory.log("Height should be atleast equal to " + minHeight + "! Old height = " + height + ", New height = " + h);
                }

                return h;
            },
            isWidgetLocked: function(widget) {
                var disabled = this.isWidgetDisabled(widget);

                if (disabled) {
                    return true;
                }

                var invalid = this.isWidgetInvalid(widget);

                if (invalid) {
                    return true;
                }

                return false;
            },
            widgetResizeNotAllowed: function(widget) {
                var disabled = this.isWidgetDisabled(widget);

                if (disabled) {
                    return true;
                }

                var invalid = this.isWidgetInvalid(widget);

                if (invalid) {
                    return true;
                }

                return false;
            },
            widgetMoveNotAllowed: function(widget) {
                var disabled = this.isWidgetDisabled(widget);

                if (disabled) {
                    return true;
                }

                var invalid = this.isWidgetInvalid(widget);

                if (invalid) {
                    return true;
                }

                return false;
            },
            isWidgetDisabled: function(widget) {
                var disabled = widget.isPluginWidget && (countlyGlobal.plugins.indexOf(widget.widget_type) < 0);
                disabled = !!disabled;
                return disabled;
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
                sharingAllowed: countlyGlobal.sharing_status || AUTHENTIC_GLOBAL_ADMIN,
                groupSharingAllowed: countlyGlobal.plugins.indexOf("groups") > -1 && AUTHENTIC_GLOBAL_ADMIN,
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
                },
                sharedEmailEdit: [],
                sharedEmailView: [],
                sharedGroupEdit: [],
                sharedGroupView: []
            };
        },
        computed: {
            allGroups: function() {
                return [];
            },
            canShare: function() {
                var canShare = this.sharingAllowed && (this.controls.initialEditedObject.is_owner || AUTHENTIC_GLOBAL_ADMIN);
                return canShare;
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

                var deleteShares = false;

                if (this.sharingAllowed) {
                    if (this.canShare) {
                        if (doc.share_with === "selected-users") {
                            doc.shared_email_edit = this.sharedEmailEdit;
                            doc.shared_email_view = this.sharedEmailView;

                            if (this.groupSharingAllowed) {
                                doc.shared_user_groups_edit = this.sharedGroupEdit;
                                doc.shared_user_groups_view = this.sharedGroupView;
                            }
                        }
                        else {
                            deleteShares = true;
                        }
                    }
                    else {
                        /**
                         * If the user cannot share, then the dashbaord should stay in none
                         * sharing mode or whatever is already present (set by the original
                         * dashboard owner).
                         */

                        if (__action === "create" || __action === "duplicate") {
                            doc.share_with = "none";
                        }

                        if (__action === "edit") {
                            /**
                             * If the user cannot share a dashboard and is trying to edit it,
                             * lets not send the share_with key to the server. So that it stays
                             * in its original sharing state.
                             */
                            delete doc.share_with;
                        }

                        deleteShares = true;
                    }
                }
                else {
                    /**
                     * Sharing is disabled globally
                     */
                    doc.share_with = "none";
                    deleteShares = true;
                }

                if (deleteShares) {
                    delete doc.shared_email_edit;
                    delete doc.shared_email_view;
                    delete doc.shared_user_groups_edit;
                    delete doc.shared_user_groups_view;
                }

                for (var key in empty) {
                    /**
                     * This check is important since we don't want to send all the keys
                     * to the server.
                     * Especially in case where the user doesn't have the sharing permission.
                     * In that case we don't want to send the sharing fields to the server.
                     * Otherwise the existing keys will be overwritten.
                     */
                    if (Object.prototype.hasOwnProperty.call(doc, key)) {
                        obj[key] = doc[key];
                    }
                }

                /**
                 * This is just a runtime only key.
                 * Should not be sent back to the server.
                 */
                delete obj.is_owner;

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

                this.sharedEmailEdit = doc.shared_email_edit || [];
                this.sharedEmailView = doc.shared_email_view || [];
                this.sharedGroupEdit = doc.shared_user_groups_edit || [];
                this.sharedGroupView = doc.shared_user_groups_view || [];

                if (!this.sharingAllowed) {
                    if (doc.__action === "create" ||
                        doc.__action === "duplicate") {
                        doc.share_with = "none";
                    }
                }
            }
        }
    });

    var NoWidget = countlyVue.views.BaseView.extend({
        template: '#dashboards-nowidget',
        props: {
            canUpdate: {
                type: Boolean,
                default: true
            }
        },
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
        mixins: [WidgetValidationMixin],
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
            },
            autoPosition: {
                type: Boolean,
                default: false
            }
        },
        components: {
            "widget-disabled": DisabledWidget,
            "widget-invalid": InvalidWidget
        },
        computed: {
            canUpdateGrid: function() {
                var dashboard = this.$store.getters["countlyDashboards/selected"];
                return (dashboard.data && dashboard.data.is_editable) ? true : false;
            }
        },
        mounted: function() {
            /**
             * Emitting ready event tells the grid to make this widget.
             * Making a widget means that it is now a part of the grid
             * and ready for user interaction.
             *
             * CASE - While creating a new widget.
             * There is a dummy widget added to the grid while creating
             * the widget. We do this to place it in the available space.
             * We should remove it before making the widget since its nomore required.
             * Currently we are removing it after the widget has been mounted
             * and this is finished making.
             * Maybe we should do that before mounting and making since after making
             * the added event is fired by the grid which inturn fires change event
             * and that contains the extra dummy widget that we added while creating
             * the widget.
             * Lets think about this and do this later.
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
        mixins: [countlyVue.mixins.hasDrawers("widgets"), WidgetsMixin, WidgetValidationMixin],
        props: {
            loading: {
                type: Boolean,
                default: true
            },
            canUpdate: {
                type: Boolean,
                default: true
            }
        },
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

                /**
                 * This validation should have been carried out in the
                 * WidgetComponent when settings change, but we are doing it here
                 * so that we don't have to watch for setting changes in the
                 * WidgetComponent as that would been a performance hit.
                 */
                this.validateWidgets(allWidgets);

                return allWidgets;
            },
            autoPosition: function() {
                /**
                 * This computed property is created for backward compatibility of
                 * the grid system.
                 * In the older dashborads, we used 12 column grid system, but in
                 * new dashboard we are using 4 column grid system.
                 * In the 4 column grid system, total sum of x coordinates of all
                 * widgets can be maximum 6. If the sum is greater than that, it means
                 * the widget is still following the old grid structure.
                 *
                 * Widget can be positioned at x = 0, 1, 2, 3. Total sum = 6
                 *
                 * We should remove this computed property after all customers are
                 * moved to the new dashboards and are following the new grid system.
                 */
                var allGeography = this.$store.getters["countlyDashboards/widgets/allGeography"];
                var autoPosition = false;

                var positions = allGeography.map(function(w) {
                    var position = w.position;

                    if (!Array.isArray(position) || (position.length !== 2)) {
                        autoPosition = true;
                        return;
                    }

                    if (!Number.isInteger(position[0]) || !Number.isInteger(position[1])) {
                        autoPosition = true;
                        return;
                    }

                    return {
                        x: position[0],
                        y: position[1],
                    };
                });

                if (autoPosition) {
                    return autoPosition;
                }

                var sortedGeography = this.sortWidgetByGeography(positions);

                var rowXSum = 0;
                var Y;

                for (var i = 0; i < sortedGeography.length; i++) {
                    var node = sortedGeography[i];
                    var y = node.y;
                    var x = node.x;

                    if (x > this.GRID_COLUMNS) {
                        autoPosition = true;
                        break;
                    }

                    if (!Number.isInteger(Y)) {
                        Y = y;
                    }

                    if (Y !== y) {
                        /**
                         * Means its a new row now.
                         */
                        Y = y;
                        rowXSum = 0;
                    }

                    rowXSum += x;

                    if (rowXSum > this.MAX_ROW_X_SUM) {
                        autoPosition = true;
                        break;
                    }
                }

                return autoPosition;
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

                var dimensions = setting.grid.dimensions();
                var validatedWidth = this.calculateWidth(setting, dimensions.width);
                var validatedHeight = this.calculateHeight(setting, dimensions.height);
                var validatedMinWidth = this.calculateWidth(setting, dimensions.minWidth);
                var validatedMinHeight = this.calculateHeight(setting, dimensions.minHeight);

                if (id) {
                    var node = {
                        id: id,
                        autoPosition: true,
                        w: validatedWidth,
                        h: validatedHeight,
                        minW: validatedMinWidth,
                        minH: validatedMinHeight,
                        new: true
                    };

                    this.addGridWidget(node);
                }
            },
            onReady: function(id) {
                this.makeGridWidget(id);
            },
            sortWidgetByGeography: function(widgets) {
                /**
                 * We want to sort the grid elements by their x and y coordinates in
                 * ascending order.
                 */

                var w = _.sortBy(widgets, function(a) {
                    return (a.y * 10) + a.x;
                });

                return w;
            },
            maxMinRowHeight: function(widgets) {
                var maxMinRowH = widgets.reduce(function(acc, item) {
                    if (acc < item.minH) {
                        acc = item.minH;
                    }

                    return acc;
                }, 0);

                return maxMinRowH;
            },
            getRowWidgets: function(y) {
                var allGridElements = this.savedGrid();

                allGridElements = this.sortWidgetByGeography(allGridElements);

                /** Get all the widgets in the same row */
                var rowWidgets = allGridElements.filter(function(item) {
                    return item.y === y;
                });

                return rowWidgets;
            },
            updateRowHeight: function(widgets, h) {
                var maxMinRowH = this.maxMinRowHeight(widgets);

                if (h < maxMinRowH) {
                    /**
                     * Row height should be atleast equal to the maximum minimum row height.
                     * max(minH)
                     */
                    h = maxMinRowH;
                }

                for (var i = 0; i < widgets.length; i++) {
                    var widgetId = widgets[i].id;
                    var nodeEl = document.getElementById(widgetId);

                    this.updateGridWidget(nodeEl, {h: h});
                }

                return h;
            },
            syncWidgetHeights: function() {
                var allGridElements = this.savedGrid();

                allGridElements = this.sortWidgetByGeography(allGridElements);

                var Y;
                var rowMaxH; // Maximum height of the row
                var updateIndex = 0;
                var rowWidgets = [];

                /**
                 * Starting batch update.
                 */
                this.grid.batchUpdate();

                for (var i = 0; i < allGridElements.length; i++) {
                    var node = allGridElements[i];

                    if (!Number.isInteger(Y)) {
                        Y = node.y;
                    }

                    if (!Number.isInteger(rowMaxH)) {
                        rowMaxH = node.h;
                    }

                    if (node.y !== Y) {
                        /**
                         * Since the allGridElements is sorted by x and y,
                         * we can assume that all the widgets are in the same row
                         * as long as node.y === Y.
                         *
                         * If they are different, we need to check if we need to update
                         * heights for the widgets in the row.
                         */

                        rowWidgets = allGridElements.slice(updateIndex, i);
                        this.updateRowHeight(rowWidgets, rowMaxH);

                        /**
                         * At last we will update the variables for this new row.
                         */

                        Y = node.y;
                        rowMaxH = node.h;
                        updateIndex = i;
                        rowWidgets = [];
                    }

                    if (rowMaxH !== node.h) {
                        if (rowMaxH < node.h) {
                            rowMaxH = node.h;
                        }
                    }

                    if (i === (allGridElements.length - 1)) {
                        /**
                         * For the last item, we need to run update explicitly.
                         * Since the above update block will never be executed.
                         */
                        rowWidgets = allGridElements.slice(updateIndex, (i + 1));
                        this.updateRowHeight(rowWidgets, rowMaxH);

                        Y = node.y;
                        rowMaxH = node.h;
                        updateIndex = i;
                        rowWidgets = [];
                    }
                }

                /**
                 * Committing batch update.
                 */
                this.grid.commit();
            },
            initGrid: function() {
                var self = this;
                var i;

                this.grid = GridStack.init({
                    cellHeight: 80,
                    margin: 8,
                    animate: true,
                    float: false,
                    column: 4
                });

                self.syncWidgetHeights();

                var allGridWidgets = this.savedGrid();

                for (i = 0; i < allGridWidgets.length; i++) {
                    var n = allGridWidgets[i];
                    var wId = n.id;
                    var size = [n.w, n.h];
                    var position = [n.x, n.y];

                    this.updateWidgetGeography(wId, {size: size, position: position});
                }

                if (!this.canUpdate) {
                    this.disableGrid();
                }

                this.grid.on("change", function(event, items) {
                    for (i = 0; i < items.length; i++) {
                        var node = items[i];
                        var widgetId = node.id;

                        var s = [node.w, node.h];
                        var p = [node.x, node.y];

                        self.updateWidgetGeography(widgetId, {size: s, position: p});
                    }

                    self.syncWidgetHeights();
                });

                this.grid.on("resizestop", function(event, element) {
                    var node = element.gridstackNode;

                    var rowWidgets = self.getRowWidgets(node.y);

                    /**
                     * Starting batch update.
                     */
                    self.grid.batchUpdate();

                    var finalRowH = self.updateRowHeight(rowWidgets, node.h);

                    /**
                     * Committing batch update.
                     */
                    self.grid.commit();

                    /**
                     * After the resizestop event, change event is fired by the grid if there are
                     * changes in the positioning and size of OTHER widgets in the grid.
                     * We update the widget geography of OTHER widgets in vuex and server from the
                     * change event.
                     *
                     * But we need to update the geography of this widget form here itself.
                     * Since the change in this widget does not fire the change event for itself.
                     * Case - when there is a single widget in the grid, reisizing it does not call
                     * the change event.
                     */

                    var widgetId = node.id;
                    var s = [node.w, finalRowH];
                    var p = [node.x, node.y];

                    self.updateWidgetGeography(widgetId, {size: s, position: p});
                });

                this.grid.on("dragstop", function(event, element) {
                    var node = element.gridstackNode;

                    var rowWidgets = self.getRowWidgets(node.y);

                    var setHeight = node.h;

                    if (rowWidgets.length) {
                        /**
                         * Since all widgets in the row should have same heights,
                         * row height equals to the height of any widget in the row.
                         *
                         * Rather than changing the heights of the other widgets immediately,
                         * lets check if we can change added widgets height to match
                         * the heights of the other widgets in this row.
                         */
                        var currentRowHeight = rowWidgets[0].h;

                        if (setHeight !== currentRowHeight) {
                            setHeight = currentRowHeight;
                        }
                    }

                    /**
                     * Starting batch update.
                     */
                    self.grid.batchUpdate();

                    self.updateRowHeight(rowWidgets, setHeight);

                    /**
                     * Committing batch update.
                     */
                    self.grid.commit();

                    /**
                     * After dragstop event, change event is also fired.
                     * In the change event we sync heights of all rows, so no need to do that here.
                     */
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

                        var rowWidgets = self.getRowWidgets(node.y);

                        var setHeight = node.h;

                        if (rowWidgets.length) {
                        /**
                         * Since all widgets in the row should have same heights,
                         * row height equals to the height of any widget in the row.
                         *
                         * Rather than changing the heights of the other widgets immediately,
                         * lets check if we can change added widgets height to match
                         * the heights of the other widgets in this row.
                         */
                            var currentRowHeight = rowWidgets[0].h;

                            if (setHeight !== currentRowHeight) {
                                setHeight = currentRowHeight;
                            }
                        }

                        /**
                         * Starting batch update.
                         */
                        self.grid.batchUpdate();

                        var finalRowH = self.updateRowHeight(rowWidgets, setHeight);
                        /**
                         * Since its nomore a new widget, we can set new to false.
                         */
                        self.updateGridWidget(node.el, {new: false});

                        /**
                         * Committing batch update.
                         */
                        self.grid.commit();

                        var s = [node.w, finalRowH];
                        var p = [node.x, node.y];

                        self.$store.dispatch("countlyDashboards/widgets/update", {id: widgetId, settings: {position: p, size: s}}).then(function(res) {
                            if (res) {
                                self.$store.dispatch("countlyDashboards/widgets/get", widgetId).then(function() {
                                    self.removeGridWidget(node.el);
                                    self.$emit("widget-added", widgetId);
                                });
                            }
                        });
                    }
                });
            },
            updateWidgetGeography: function(widgetId, settings) {
                var self = this;

                this.syncWidgetGeography({_id: widgetId, size: settings.size, position: settings.position});

                setTimeout(function() {
                    self.$store.dispatch("countlyDashboards/widgets/update", {id: widgetId, settings: settings});
                }, 50);
            },
            syncWidgetGeography: function(widget) {
                this.$store.dispatch("countlyDashboards/widgets/syncGeography", widget);
            },
            savedGrid: function() {
                return this.grid.save(false);
            },
            validateWidgets: function(allWidgets) {
                if (this.grid) {
                    var self = this;
                    this.$nextTick(function() {
                        /**
                         * Lets execute the following code on the nextTick.
                         * If we execute it on the same tick, the event loop is
                         * blocked and the grid becomes very laggy and unresponsive.
                         *
                         * Following code mainly fixes the issue when the grid is in
                         * loading state with some placeholder widgets in the grid,
                         * that are locked and cannot move and resize themselves.
                         * We need to update them when the widgets data arrive so that
                         * users can interact with them (i.e. move or resize them).
                         */
                        self.grid.batchUpdate();

                        for (var i = 0; i < allWidgets.length; i++) {
                            var widget = allWidgets[i];
                            var widgetId = widget._id;

                            var locked = self.isWidgetLocked(widget);
                            var noResize = self.widgetResizeNotAllowed(widget);
                            var noMove = self.widgetMoveNotAllowed(widget);

                            var nodeEl = document.getElementById(widgetId);

                            if (!self.canUpdate) {
                                locked = true;
                                noResize = true;
                                noMove = true;
                            }

                            var setting = {
                                locked: locked,
                                noMove: noMove,
                                noResize: noResize,
                            };

                            /**

                            Lets not update the width and heights of widgets.
                            Because this is running int he nextTick, we get size
                            consistency issues then.

                            var w = widget.size && widget.size[0];
                            var h = widget.size && widget.size[1];

                            if (Number.isInteger(w) && Number.isInteger(h)) {
                                setting.w = w;
                                setting.h = h;
                            }

                             */

                            self.updateGridWidget(nodeEl, setting);
                        }

                        self.grid.commit();
                    });
                }
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
                    /**
                     * On making the widget "added" event is fired by the grid.
                     */
                    this.grid.makeWidget("#" + id);
                }
            },
            disableGrid: function() {
                this.grid.disable();
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
                dashboardId: this.$route.params && this.$route.params.dashboardId,
                ADDING_WIDGET: false,
                isInitLoad: true
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
                var dashboard = selected.data || {};

                dashboard.creation = {};

                if (dashboard.created_at) {
                    var formattedTime = this.parseTimeAgo(dashboard.created_at) || {};
                    dashboard.creation.time = formattedTime.text;
                }

                if (dashboard.owner && dashboard.owner.full_name) {
                    dashboard.creation.by = dashboard.owner.full_name;
                }

                return dashboard;
            },
            canUpdateGrid: function() {
                return !!this.dashboard.is_editable;
            },
            canUpdateDashboard: function() {
                return !!(AUTHENTIC_GLOBAL_ADMIN || this.dashboard.is_owner);
            }
        },
        methods: {
            refresh: function() {
                if (this.ADDING_WIDGET) {
                    return;
                }

                if (!this.drawers.dashboards.isOpened && !this.drawers.widgets.isOpened) {
                    /**
                     * Refresh only if the drawers are not open at the moment.
                     */
                    this.dateChanged(true);
                }
            },
            dateChanged: function(isRefresh) {
                this.$store.dispatch("countlyDashboards/getDashboard", {id: this.dashboardId, isRefresh: isRefresh});
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
                    d.name = "Copy - " + d.name;
                    var empty = countlyDashboards.factory.dashboards.getEmpty();

                    var obj = {};
                    for (var key in empty) {
                        /**
                         * Copy the keys from existing dashboard.
                         * Otherwise fallback to the default ones.
                         */
                        obj[key] = d[key] || empty[key];
                    }

                    obj.__action = "duplicate";

                    self.openDrawer("dashboards", obj);
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
                this.ADDING_WIDGET = true;
                this.$refs.grid.addWidget(widget);
            },
            onWidgetAdded: function() {
                this.ADDING_WIDGET = false;
            }
        },
        beforeMount: function() {
            var self = this;
            this.$store.dispatch("countlyDashboards/setDashboard", {id: this.dashboardId, isRefresh: false}).then(function(res) {
                if (res) {
                    self.isInitLoad = false;
                }
            });
        }
    });

    var getMainView = function() {
        var vuex = [
            {
                clyModel: countlyDashboards
            }
        ];

        var templates = [
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
        ];

        var widgets = WidgetsMixin.computed.__widgets();

        /**
         * We get the templates from all the widget registrations below and load them on initial
         * view render.
         *
         * The fact that dashboards plugin is loaded at the very end i.e. after all the plugins
         * have finished loading, we can be sure that all the plugins must have registered their
         * dashboard widgets.
         */
        for (var type in widgets) {
            for (var i = 0; i < widgets[type].length; i++) {
                var widget = widgets[type][i];

                if (Array.isArray(widget.templates)) {
                    templates = templates.concat(widget.templates);
                }
            }
        }

        return new countlyVue.views.BackboneWrapper({
            component: HomeComponent,
            vuex: vuex,
            templates: templates
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
                        countlyDashboards.factory.log("Dashboard not found - " + id + ", Dashboards = " + JSON.stringify(dashboards));
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
            icon: "cly-icon-sidebar-dashboards",
            tooltip: CV.i18n("sidebar.dashboard-tooltip"),
            component: DashboardsMenu
        });
    }

    countlyVue.container.registerMixin("/manage/export/export-features", {
        beforeCreate: function() {
            var self = this;
            this.$store.dispatch("countlyDashboards/getAll").then(function(res) {
                if (res) {
                    var dashboards = [];

                    res.forEach(function(dashboard) {
                        dashboards.push({
                            name: dashboard.name,
                            id: dashboard._id
                        });
                    });

                    if (dashboards.length) {
                        var selectItem = {
                            id: "dashboards",
                            name: "Dashboards",
                            children: dashboards
                        };

                        self.$store.dispatch("countlyConfigTransfer/addConfigurations", selectItem);
                    }
                }
            });
        }
    });

})();