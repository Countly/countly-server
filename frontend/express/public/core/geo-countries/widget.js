import { i18nM } from '../../javascripts/countly/vue/core.js';
import { registerData } from '../../javascripts/countly/vue/container.js';
import GeoWidgetDrawer from './components/GeoWidgetDrawer.vue';
import GeoWidgetComponent from './components/GeoWidgetComponent.vue';

registerData("/custom/dashboards/widget", {
    type: "analytics",
    label: i18nM("dashboards.widget-type.analytics"),
    priority: 1,
    primary: false,
    getter: function(widget) {
        return widget.widget_type === "analytics" && widget.data_type === "geo";
    },
    drawer: {
        component: GeoWidgetDrawer,
        getEmpty: function() {
            return {
                title: "",
                feature: "geo",
                widget_type: "analytics",
                app_count: 'single',
                data_type: "geo",
                apps: [],
                visualization: "",
                custom_period: null,
                metrics: ["t"],
                breakdowns: ["countries"],
                bar_color: 1
            };
        },
        beforeSaveFn: function(/*doc*/) {
        }
    },
    grid: {
        component: GeoWidgetComponent,
        dimensions: function() {
            return {
                minWidth: 2,
                minHeight: 4,
                width: 2,
                height: 4
            };
        },
        onClick: function() {}
    }
});
