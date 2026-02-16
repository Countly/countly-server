import { app } from '../../../../frontend/express/public/javascripts/countly/countly.template.js';
import { i18n, views } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { registerData } from '../../../../frontend/express/public/javascripts/countly/vue/container.js';

import SourcesContainer from './components/SourcesContainer.vue';
import SourcesHomeWidget from './components/SourcesHomeWidget.vue';
import KeywordsHomeWidget from './components/KeywordsHomeWidget.vue';
import SourcesDashboardWidget from './components/SourcesDashboardWidget.vue';
import SourcesWidgetDrawer from './components/SourcesWidgetDrawer.vue';

import './store/index.js';

import './assets/main.scss';

var FEATURE_NAME = "sources";

// --- Routes ---

var getSourcesView = function() {
    return new views.BackboneWrapper({
        component: SourcesContainer
    });
};

app.route("/analytics/acquisition", 'acqusition', function() {
    this.renderWhenReady(getSourcesView());
});

app.route("/analytics/acquisition/*search-terms", 'acqusition', function() {
    var view = getSourcesView();
    view.params = {tab: 'keywords'};
    this.renderWhenReady(view);
});

// --- Menu ---

app.addSubMenuForType("web", "analytics", {code: "analytics-acquisition", permission: FEATURE_NAME, url: "#/analytics/acquisition", text: "sidebar.acquisition", priority: 28});
app.addSubMenuForType("mobile", "analytics", {code: "analytics-acquisition", permission: FEATURE_NAME, url: "#/analytics/acquisition", text: "sidebar.acquisition", priority: 28});

// --- Home Widgets ---

registerData("/home/widgets", {
    _id: "sources-dashboard-widget",
    permission: FEATURE_NAME,
    label: i18n('sidebar.acquisition'),
    enabled: {"default": true},
    available: {"default": false, "mobile": true, "web": true},
    placeBeforeDatePicker: false,
    order: 3,
    component: SourcesHomeWidget
});

registerData("/home/widgets", {
    _id: "keywords-dashboard-widget",
    permission: FEATURE_NAME,
    label: i18n('keywords.top_terms'),
    enabled: {"default": true},
    available: {"default": false, "web": true},
    placeBeforeDatePicker: false,
    order: 5,
    width: 6,
    component: KeywordsHomeWidget
});

// --- Custom Dashboard Widget ---

registerData("/custom/dashboards/widget", {
    type: "analytics",
    label: i18n("sources.title"),
    permission: FEATURE_NAME,
    priority: 1,
    primary: false,
    getter: function(widget) {
        return widget.widget_type === "analytics" && widget.data_type === "sources";
    },
    drawer: {
        component: SourcesWidgetDrawer,
        getEmpty: function() {
            return {
                title: "",
                feature: FEATURE_NAME,
                widget_type: "analytics",
                app_count: 'single',
                data_type: "sources",
                apps: [],
                visualization: "table",
                custom_period: null,
                metrics: ["t"],
                bar_color: 1,
                isPluginWidget: true
            };
        },
        beforeSaveFn: function() {
        }
    },
    grid: {
        component: SourcesDashboardWidget,
        onClick: function() {}
    }
});
