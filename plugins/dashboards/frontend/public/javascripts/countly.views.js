/*global app, countlyVue, countlyDashboards, countlyAuth, countlyGlobal, CV, _, groupsModel, Backbone, GridStack, CountlyHelpers, $, screenfull*/

(function() {
    var AUTHENTIC_GLOBAL_ADMIN = (countlyGlobal.member.global_admin && ((countlyGlobal.member.restrict || []).indexOf("#/manage/configurations") < 0));

    /**
     * To whom it may concern,
     * Dashboard sharing is only allowed for global admins or dashboard owners.
     * Other people cannot edit the dashbaord.
     * The users with whom the dashboard is shared with, can only update its widgets,
     * and not the dashboard settings itself.
     *
     * - prikshit
     *
     * If a widget feature is not allowed to the user, he cannot edit or delete the widget.
     * Nor can he create a widget of that feature. We won't show him that respective widget in the drawer
     * at all. In this case the user can only see the widget in the dashboard grid.
     * The user can only create widgets of features he has access to.
     *
     * We have key called "isAllowed" in the widget settings object to check if the widget
     * is allowed to a user or not.
     * It is also passed to the widget grid component as a prop called "is-allowed".
     * For those who have their own action buttons in the widget grid, they should
     * hide them if "is-allowed" is false. For example - drill.
     *
     * A user with view only permission cannot edit, resize or move widgets in the dashboard.
     */

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

                    var drawer = component.drawer.getEmpty();
                    var featureName = drawer.feature;
                    var widgetType = drawer.widget_type;
                    var allowed = true;

                    if (!widgetType) {
                        allowed = false;
                        countlyDashboards.factory.log("Widget type is mandatory!");
                    }

                    if (!featureName) {
                        allowed = false;
                        countlyDashboards.factory.log("Feature name is mandatory!");
                    }

                    if (!countlyAuth.validateRead(featureName)) {
                        allowed = false;
                        countlyDashboards.factory.log(featureName + " feature is not allowed to this user.");
                        countlyDashboards.factory.log("Therefore he cannot edit, delete or create a widget of this type.");
                        countlyDashboards.factory.log("The user can only view the widget in the dashboard grid.");
                    }

                    component.isAllowed = allowed;

                    acc[component.type].push(component);
                    return acc;
                }, {});

                return w;
            }
        },
        methods: {
            onReset: function(widget) {
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
                    if (this.widgetId) {
                        // it is create
                        defaultEmpty._id = this.widgetId;
                        defaultEmpty.__action = "edit";
                    }
                    this.loadDrawer("widgets", Object.assign({}, defaultEmpty));
                }
            },
            widgetSettingsGetter: function(widget, def) {
                /**
                 * def should be true only when the settings are required by the grid.
                 * We want to set it to true then so that we can show a widget in the grid.
                 * This covers the case when the widget data is invalid or widget is disabled.
                 */
                var widgets = this.__widgets;

                if (!widget.widget_type) {
                    countlyDashboards.factory.log("Widget type is not defined");
                    return false;
                }

                var defaultSetting = {
                    type: widget.widget_type,
                    grid: {
                        dimensions: function() {
                            var width = widget.size && widget.size[0];
                            var height = widget.size && widget.size[1];
                            return {
                                width: width,
                                height: height,
                                minWidth: width,
                                minHeight: height
                            };
                        }
                    },
                    drawer: {
                        getEmpty: function() {
                            return {};
                        }
                    }
                };

                var registrations = widgets[widget.widget_type];

                if (!registrations) {
                    countlyDashboards.factory.log("Soooo, unfortunately, we don't have any widget settings for " + widget.widget_type);
                    countlyDashboards.factory.log("Possible reason is - The widget wasn't registered correctly in the UI.");
                    countlyDashboards.factory.log("Please check the widget registration. Thanks :)");
                    countlyDashboards.factory.log("Also it could be that the plugin associated with the widget is disabled.");

                    return def ? defaultSetting : false;
                }

                var setting = registrations.find(function(registration) {
                    return registration.getter(widget);
                });

                if (!setting) {
                    countlyDashboards.factory.log("No setting found for the " + widget.widget_type + " widget type based on the widget getter. Please register the widget settings correctly.");
                    return def ? defaultSetting : false;
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

    var DimensionsMixin = {
        methods: {
            getDefaultDimensions: function(visualization) {
                var dimensions;

                switch (visualization) {
                case 'number':
                    dimensions = {
                        minWidth: 2,
                        minHeight: 3,
                        width: 2,
                        height: 4
                    };
                    break;
                case 'line':
                case 'series':
                case 'over-time':
                case 'time-series':
                    dimensions = {
                        minWidth: 4,
                        minHeight: 4,
                        width: 4,
                        height: 4
                    };
                    break;
                case 'bar-chart':
                    dimensions = {
                        minWidth: 4,
                        minHeight: 4,
                        width: 4,
                        height: 4
                    };
                    break;
                case 'pie-chart':
                    dimensions = {
                        minWidth: 4,
                        minHeight: 3,
                        width: 4,
                        height: 4
                    };
                    break;
                case 'table':
                    dimensions = {
                        minWidth: 4,
                        minHeight: 3,
                        width: 4,
                        height: 6
                    };
                    break;
                default:
                    dimensions = {
                        minWidth: 4,
                        minHeight: 3,
                        width: 4,
                        height: 4
                    };
                }
                return dimensions;
            },
            returnDimensions: function(settings, widget) {
                var dimensions;
                /**
                 * Make sure that all widgets have the same key name saving visualization type.
                 * The name of the key is visualization.
                 */
                var defaultDimensions = this.getDefaultDimensions(widget.visualization || widget.visualization_type || widget.visualitionType);
                var newDimensions = settings.grid.dimensions && settings.grid.dimensions();

                if (newDimensions) {
                    dimensions = newDimensions;
                }
                else if (defaultDimensions) {
                    dimensions = defaultDimensions;
                }
                else {
                    countlyDashboards.factory.log("No dimensions were found for the widget!");
                }
                //maintaining backward compatibilty of previous minHeight,minWidth
                if (widget.size && widget.size.length === 2) {
                    var prevWidth = widget.size[0];
                    var prevHeight = widget.size[1];
                    if (prevHeight < dimensions.minHeight) {
                        dimensions.height = prevHeight;
                        dimensions.minHeight = prevHeight;
                    }
                    if (prevWidth < dimensions.minWidth) {
                        dimensions.width = prevWidth;
                        dimensions.minWidth = prevWidth;
                    }
                }
                return dimensions;
            }
        }
    };

    var WidgetValidationMixin = {
        mixins: [DimensionsMixin],
        methods: {
            validateWidgetSize: function(settings, widget, dimension) {
                var size;

                switch (dimension) {
                case "w":
                    size = widget.size && widget.size[0];
                    size = this.calculateWidth(settings, widget, size);
                    break;
                case "h":
                    size = widget.size && widget.size[1];
                    size = this.calculateHeight(settings, widget, size);
                    break;
                }

                return size;
            },
            validateWidgetDimension: function(settings, widget, dimension) {
                var dimensions = this.returnDimensions(settings, widget);
                var dim;

                switch (dimension) {
                case "w":
                    dim = dimensions.minWidth;
                    dim = this.calculateWidth(settings, widget, dim); //?? dont need this

                    break;
                case "h":
                    dim = dimensions.minHeight;
                    dim = this.calculateHeight(settings, widget, dim);
                    break;
                }

                return dim;
            },
            calculateWidth: function(settings, widget, width) {
                var dimensions = this.returnDimensions(settings, widget);
                var minWidth = dimensions.minWidth;
                var w = width;

                if (!w || w < minWidth) {
                    /**
                     * Minimum width of the widget should be equal to whats mentioned
                     * in its settings while registering the widget.
                     */
                    w = minWidth;
                    countlyDashboards.factory.log("Width should be atleast equal to " + minWidth + "! Old width = " + width + ", New width = " + w);
                }

                return w;
            },
            calculateHeight: function(settings, widget, height) {
                var dimensions = this.returnDimensions(settings, widget);
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
                /**
                 * Method not used anymore.
                 * No widget will be locked.
                 */
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
                /**
                 * Method not used anymore.
                 * All widgets can be resized.
                 */
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
                /**
                 * Method not used anymore.
                 * All widgets can be moved.
                 */
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
                var disabled = false;

                if (widget.feature === "core") {
                    return disabled;
                }
                if (widget.isPluginWidget) {
                    /**
                     * For all plugin widgets, feature name is the plugin name.
                     */
                    var feature = widget.feature;

                    /**
                     * In feature names we don't have hyphens. Hyphens are repalced with underscores.
                     * Also feature names should be same as plugin folder name.
                     * If it isn't talk to furkan.
                     */

                    disabled = countlyGlobal.plugins.map(function(p) {
                        return p.replaceAll("-", "_");
                    }).indexOf(feature) < 0;
                    disabled = !!disabled;
                }

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
                this.$store.dispatch("countlyDashboards/requests/drawerOpenStatus", true);
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
                sharedGroupView: [],
                allGroups: []
            };
        },
        computed: {
            canShare: function() {
                var canShare = this.sharingAllowed && (this.controls.initialEditedObject.is_owner || AUTHENTIC_GLOBAL_ADMIN);
                return canShare;
            },
            elSelectKey: function() {
                var key = this.allGroups.map(function(g) {
                    return g._id;
                }).join(",");

                return key;
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
                            else {
                                delete doc.shared_user_groups_edit;
                                delete doc.shared_user_groups_view;
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

                        deleteShares = true;
                    }
                }
                else {
                    /**
                     * Sharing is disabled globally
                     */
                    if (__action === "create" || __action === "duplicate") {
                        doc.share_with = "none";
                    }

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
                            CountlyHelpers.notify({
                                message: "Dashboard created successfully!",
                                type: "success"
                            });

                            app.navigate('#/custom/' + id, true);
                        }

                        if (__action === "edit") {
                            CountlyHelpers.notify({
                                message: "Dashboard edited successfully!",
                                type: "success"
                            });
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
            },
            onClose: function() {
                this.$store.dispatch("countlyDashboards/requests/drawerOpenStatus", false);
            },
        },
        mounted: function() {
            if (this.groupSharingAllowed) {
                var self = this;
                groupsModel.initialize().then(function() {
                    var groups = _.sortBy(groupsModel.data(), 'name');

                    var userGroups = groups.map(function(g) {
                        return {
                            name: g.name,
                            value: g._id
                        };
                    });

                    self.allGroups = userGroups;
                });
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
            },
            loading: {
                type: Boolean,
                default: true
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
                            self.$store.dispatch("countlyDashboards/requests/isProcessing", true);
                            self.$store.dispatch("countlyDashboards/widgets/get", doc._id).then(function() {
                                self.$store.dispatch("countlyDashboards/requests/isProcessing", false);
                            });
                            CountlyHelpers.notify({
                                message: "Widget edited successfully!",
                                type: "success"
                            });
                        }
                        else {
                            obj.id = id;
                            self.$store.dispatch("countlyDashboards/requests/isProcessing", true);
                            self.$emit("add-widget", obj);
                            CountlyHelpers.notify({
                                message: "Widget created successfully!",
                                type: "success"
                            });
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
            onClose: function() {
                this.$store.dispatch("countlyDashboards/requests/drawerOpenStatus", false);
            },
            onWidgetTypeReset: function(v) {
                this.reset({widget_type: v});
            },
            reset: function(widget) {
                this.$emit("reset", widget);
            }
        }
    });

    var GridComponent = countlyVue.views.BaseView.extend({
        template: '#dashboards-grid',
        mixins: [countlyVue.mixins.hasDrawers("widgets"), WidgetsMixin, WidgetValidationMixin, DimensionsMixin],
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
                widgetId: null
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
            }
        },
        methods: {
            onWidgetAction: function(command, data) {
                var self = this;
                var d = JSON.parse(JSON.stringify(data));
                var setting = this.widgetSettingsGetter(d);

                if (!setting && command !== "delete") {
                    countlyDashboards.factory.log("Well this is very strange.");
                    countlyDashboards.factory.log("On widget action, atleast one of the widget registrations should be returned.");
                    countlyDashboards.factory.log("Kindly check your widget getter, maybe something is wrong there.");
                    return;
                }

                switch (command) {
                case "edit":
                    var empty = setting.drawer.getEmpty();
                    d.__action = "edit";
                    this.$store.dispatch("countlyDashboards/requests/drawerOpenStatus", true);
                    var settings = Object.assign({}, empty, d);
                    this.widgetId = settings._id;
                    this.openDrawer("widgets", settings);
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
                                CountlyHelpers.notify({
                                    message: "Widget deleted successfully!",
                                    type: "success"
                                });
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

                var dimensions = this.returnDimensions(setting, widget);

                var validatedWidth = this.calculateWidth(setting, widget, dimensions.width);
                var validatedHeight = this.calculateHeight(setting, widget, dimensions.height);
                var validatedMinWidth = this.calculateWidth(setting, widget, dimensions.minWidth);
                var validatedMinHeight = this.calculateHeight(setting, widget, dimensions.minHeight);

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
            getRowWidgets: function(y) {
                var allGridElements = this.savedGrid();

                allGridElements = this.sortWidgetByGeography(allGridElements);

                /** Get all the widgets in the same row */
                var rowWidgets = allGridElements.filter(function(item) {
                    return item.y === y;
                });

                return rowWidgets;
            },
            initGrid: function() {
                var self = this;

                this.grid = GridStack.init({
                    cellHeight: 80,
                    margin: 8,
                    animate: true,
                    float: false
                });

                this.updateAllWidgetsGeography();

                if (!this.canUpdate) {
                    this.disableGrid();
                }

                this.grid.on("resizestart", function() {
                    self.$nextTick(function() {
                        self.$store.dispatch("countlyDashboards/requests/gridInteraction", true);
                        self.$store.dispatch("countlyDashboards/requests/markSanity", false);
                    });
                });

                this.grid.on("resizestop", function() {
                    /**
                     * After the resizestop event, change event is fired by the grid if there are
                     * changes in the positioning and size of OTHER widgets in the grid.
                     * We update the widget geography of OTHER widgets in vuex and server from the
                     * change event.
                     *
                     * But we need to update the geography of this widget form here itself.
                     * Since the change in this widget does not fire the change event for itself.
                     * Case - when there is a single widget in the grid, resizing it does not call
                     * the change event.
                     */

                    self.updateAllWidgetsGeography();
                    setTimeout(function() {
                        /**
                         * Or we could set grid interaction to false from the then of updateAllWidgetsGeography
                         */
                        self.$store.dispatch("countlyDashboards/requests/gridInteraction", false);
                    }, 500);
                });

                this.grid.on("dragstart", function() {
                    self.$nextTick(function() {
                        self.$store.dispatch("countlyDashboards/requests/gridInteraction", true);
                        self.$store.dispatch("countlyDashboards/requests/markSanity", false);
                    });
                });

                this.grid.on("dragstop", function() {
                    self.updateAllWidgetsGeography();
                    setTimeout(function() {
                        /**
                         * Or we could set grid interaction to false from the then of updateAllWidgetsGeography
                         */
                        self.$store.dispatch("countlyDashboards/requests/gridInteraction", false);
                    }, 500);
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

                        /**
                         * Starting batch update.
                         */
                        self.grid.batchUpdate();

                        /**
                         * Since its nomore a new widget, we can set new to false.
                         */
                        self.updateGridWidget(node.el, {new: false});

                        /**
                         * Committing batch update.
                         */
                        self.grid.commit();

                        var s = [node.w, node.h];
                        var p = [node.x, node.y];

                        self.$store.dispatch("countlyDashboards/widgets/update", {id: widgetId, settings: {position: p, size: s}}).then(function(res) {
                            if (res) {
                                self.$store.dispatch("countlyDashboards/widgets/get", widgetId).then(function() {
                                    self.removeGridWidget(node.el);
                                    self.$store.dispatch("countlyDashboards/requests/isProcessing", false);
                                });
                            }
                        });
                    }
                });
            },
            updateWidgetGeography: function(widgetId, settings) {
                var self = this;

                this.$store.dispatch("countlyDashboards/widgets/syncGeography", {_id: widgetId, settings: settings});
                setTimeout(function() {
                    self.$store.dispatch("countlyDashboards/widgets/update", {id: widgetId, settings: settings});
                }, 10);
            },
            updateAllWidgetsGeography: function() {
                var allGridWidgets = this.savedGrid();

                for (var i = 0; i < allGridWidgets.length; i++) {
                    var n = allGridWidgets[i];
                    var wId = n.id;
                    var size = [n.w, n.h];
                    var position = [n.x, n.y];

                    this.updateWidgetGeography(wId, {size: size, position: position});
                }
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

                            var locked = false;
                            var noResize = false;
                            var noMove = false;

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
            },
            autoPosition: function(allWidgets) {
                var autoposition = false;
                allWidgets.forEach(function(widget) {
                    if (!widget.position) {
                        autoposition = true;
                    }
                });
                return autoposition;
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
                fullscreen: false,
                preventTimeoutInterval: null
            };
        },
        computed: {
            noSelectedDashboard: function() {
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
            },
            isInitLoad: function() {
                var isInit = this.$store.getters["countlyDashboards/requests/isInitializing"];
                return isInit;
            },
            isRefreshing: function() {
                var isRefreshing = this.$store.getters["countlyDashboards/requests/isRefreshing"];
                return isRefreshing;
            },
            isDrawerOpen: function() {
                var isOpen = this.$store.getters["countlyDashboards/requests/drawerOpenStatus"];
                return isOpen;
            },
            isWidgetProcessing: function() {
                var isProcessing = this.$store.getters["countlyDashboards/requests/isProcessing"];
                return isProcessing;
            },
            isGridInteraction: function() {
                var isInteraction = this.$store.getters["countlyDashboards/requests/gridInteraction"];
                return isInteraction;
            },
            isRequestSane: function() {
                var isSane = this.$store.getters["countlyDashboards/requests/isSane"];
                return isSane;
            }
        },
        created: function() {
            var self = this;
            var fullscreeToggle = function() {
                if (document.fullscreenElement) {
                    $("html").addClass("full-screen");
                    self.preventTimeoutInterval = setInterval(function() {
                        $(document).trigger("extend-dashboard-user-session");
                    }, 1000);
                    $(document).idleTimer("pause");
                    self.fullscreen = true;
                }
                else {
                    $("html").removeClass("full-screen");
                    clearInterval(self.preventTimeoutInterval);
                    $(document).idleTimer("reset");
                    self.fullscreen = false;
                }
            };
            document.removeEventListener('fullscreenchange', fullscreeToggle);
            document.addEventListener('fullscreenchange', fullscreeToggle);
        },
        methods: {
            refresh: function() {
                var isRefreshing = this.isRefreshing;
                var isInitializing = this.isInitLoad;
                var isDrawerOpen = this.isDrawerOpen;
                var isWidgetProcessing = this.isWidgetProcessing;
                var isGridInteraction = this.isGridInteraction;
                var isRequestSane = this.isRequestSane;

                if (!isRequestSane) {
                    /**
                     * So turns out that the previous request wasn't sane. This happens
                     * if grid interaction takes place while the request is in progress.
                     *
                     * Lets return and skip this refresh request just as a safety measure.
                     */

                    if (!isRefreshing && !isInitializing && !isGridInteraction && !isWidgetProcessing) {
                        /**
                         * We can mark requset sanity as true now. Since the previous request
                         * is not in progress anymore. And since it wasn't sane, no updates
                         * would have followed through on the vuex store. Check getDashboard action.
                         * It doesn't update the vuex if the request is not sane.
                         */
                        this.$store.dispatch("countlyDashboards/requests/markSanity", true);
                    }

                    return;
                }

                if (isInitializing || isRefreshing || isDrawerOpen || isWidgetProcessing || isGridInteraction) {
                    return;
                }

                this.dateChanged(true);
            },
            dateChanged: function(isRefresh) {
                var self = this;
                this.$store.dispatch("countlyDashboards/requests/isRefreshing", true);

                this.$store.dispatch("countlyDashboards/getDashboard", {id: this.dashboardId, isRefresh: isRefresh}).then(function() {
                    self.$store.dispatch("countlyDashboards/requests/isRefreshing", false);
                });
            },
            onDashboardAction: function(command, data) {
                var self = this;
                var d = JSON.parse(JSON.stringify(data));

                switch (command) {
                case "fullscreen":
                    if (screenfull.enabled && !screenfull.isFullscreen) {
                        screenfull.request();
                    }
                    else {
                        screenfull.exit();
                    }
                    break;
                case "edit":
                    d.__action = "edit";
                    this.$store.dispatch("countlyDashboards/requests/drawerOpenStatus", true);
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

                    this.$store.dispatch("countlyDashboards/requests/drawerOpenStatus", true);
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
                                CountlyHelpers.notify({
                                    message: "Dashboard deleted successfully!",
                                    type: "success"
                                });

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
                this.$store.dispatch("countlyDashboards/requests/drawerOpenStatus", true);
                this.openDrawer("widgets", Object.assign({}, empty, defaultEmpty));
            },
            addWidgetToGrid: function(widget) {
                this.$refs.grid.addWidget(widget);
            },
            exitFullScreen: function() {
                screenfull.exit();
            }
        },
        beforeMount: function() {
            var self = this;

            this.$store.dispatch("countlyDashboards/setDashboard", {id: this.dashboardId, isRefresh: false}).then(function() {
                self.$store.dispatch("countlyDashboards/requests/isInitializing", false);
            });
        },
        beforeDestroy: function() {
            this.$store.dispatch("countlyDashboards/requests/reset");
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


    var DashboardsMenu = countlyVue.views.create({
        template: CV.T('/dashboards/templates/dashboards-menu.html'),
        mixins: [countlyVue.mixins.hasDrawers("dashboards"), DashboardMixin],
        components: {
            "dashboards-drawer": DashboardDrawer
        },
        data: function() {
            return {
                canCreate: true,
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
            identifySelected: function() {
                var dashboards = this.$store.getters["countlyDashboards/all"];

                var currLink = Backbone.history.fragment;

                if (/^\/custom/.test(currLink) === false) {
                    var selected = this.$store.getters["countlySidebar/getSelectedMenuItem"];
                    if (selected.menu === "dashboards") {
                        /**
                         * Incase the selected menu is already dashboards, we need to reset
                         * the selected item to {}. Since we did not find the menu item.
                         *
                         * This is important as there are urls in countly like /versions,
                         * which are not in the sidebar. So for them we don't need to highlight
                         * anything.
                         */
                        this.$store.dispatch("countlySidebar/updateSelectedMenuItem", { menu: "dashboards", item: {} });
                    }

                    return;
                }

                currLink = currLink.split("/");
                var id = currLink[currLink.length - 1];

                var currMenu = dashboards.find(function(d) {
                    return d._id === id;
                });

                /**
                 * Even if we don't find a dashboard, we should atleast set the
                 * menu item to dashboards.
                 */
                this.$store.dispatch("countlySidebar/updateSelectedMenuItem", {menu: "dashboards", item: currMenu || {}});
            }
        },
        beforeCreate: function() {
            this.module = countlyDashboards.getVuexModule();
            CV.vuex.registerGlobally(this.module);
        },
        beforeMount: function() {
            var self = this;
            this.$store.dispatch("countlyDashboards/getAll").then(function() {
                self.identifySelected();
            });
        }
    });

    countlyVue.container.registerData("/sidebar/menu/main", {
        name: "dashboards",
        icon: "cly-icon-sidebar-dashboards",
        tooltip: CV.i18n("sidebar.dashboard-tooltip"),
        component: DashboardsMenu
    });


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

/**
 * Race conditions in dashbaords -
 *
 * 1. Someone tries to drag or resize widgets and as soon as they do so, there is a refresh
 * call initiated which fetches the old positions and sizes of widgets. So even though the
 * positions and sizes were updated on the server, the widgets are not updated on the client.
 * The solution to this would be not to initiatite a refresh while users are interacting
 * with the dashboard.
 *
 * 2. Maybe the refresh was initiated earlier than the widget was being resized or repositioned.
 * But the api is taking a very long time to respond. Meanwhile, even though we updated the
 * positions, the widgets are not updated on the client as the refresh call that was initiated,
 * sends old values for positions and sizes. This is the case when refresh initiated,
 * widgets resized or dragged and the api sends response after that with old widget
 * positions and sizes. This can heppen since we fetch the widgets data in the very
 * beginning in the api.
 * We have fixed this by marking request sanity and checking for it before updating vuex.
 */