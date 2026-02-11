import countlyDashboards from '../store/index.js';
import { getGlobalStore } from '../../../../../frontend/express/public/javascripts/countly/vue/data/store.js';

export default {
    computed: {
        __widgets: function() {
            var dict = getGlobalStore().state.countlyContainer.dict;
            var w = (dict && dict["/custom/dashboards/widget"] && dict["/custom/dashboards/widget"].data) || [];

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

                component.isAllowed = allowed;

                acc[component.type].push(component);
                return acc;
            }, {});

            return w;
        }
    },
    methods: {
        onReset: function(widget) {
            var widgetSettings = this.widgetSettingsGetter(widget);

            if (!widgetSettings) {
                widgetSettings = this.widgetSettingsPrimary(widget);
            }

            if (widgetSettings) {
                var defaultEmpty = widgetSettings.drawer.getEmpty();
                if (this.widgetId) {
                    defaultEmpty._id = this.widgetId;
                    defaultEmpty.__action = "edit";
                }
                this.loadDrawer("widgets", Object.assign({}, defaultEmpty));
            }
        },
        widgetSettingsGetter: function(widget, def) {
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
