import jQuery from 'jquery';
import { app } from '../../../../frontend/express/public/javascripts/countly/countly.template.js';
import { i18n, views } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { registerTab, registerData } from '../../../../frontend/express/public/javascripts/countly/vue/container.js';
import { countlyCommon } from '../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { validateRead } from '../../../../frontend/express/public/javascripts/countly/countly.auth.js';
import { isPluginEnabled } from '../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import { getGlobalStore } from '../../../../frontend/express/public/javascripts/countly/vue/data/store.js';

import { countlyViews, countlyViewsPerSession } from './store/index.js';

import ViewsView from './components/ViewsView.vue';
import EditViewsView from './components/EditViewsView.vue';
import ViewsPerSessionView from './components/ViewsPerSessionView.vue';
import ViewsHomeWidget from './components/ViewsHomeWidget.vue';
import ViewsGridWidget from './components/ViewsGridWidget.vue';
import ViewsDrawerWidget from './components/ViewsDrawerWidget.vue';

import './assets/main.scss';

var FEATURE_NAME = 'views';

// --- Routes ---

var viewsHomeView = new views.BackboneWrapper({
    component: ViewsView,
    vuex: [{clyModel: countlyViews}]
});

var viewsEditView = new views.BackboneWrapper({
    component: EditViewsView,
    vuex: [{clyModel: countlyViews}]
});

app.viewsHomeView = viewsHomeView;
app.viewsEditView = viewsEditView;

app.route("/analytics/views", "views-home", function() {
    var params = {};
    this.viewsHomeView.params = params;
    this.renderWhenReady(this.viewsHomeView);
});

app.route("/analytics/views/manage", "views", function() {
    var params = {};
    this.viewsEditView.params = params;
    this.renderWhenReady(this.viewsEditView);
});

// --- Tab Registration ---

registerTab("/analytics/sessions", {
    priority: 4,
    name: "views-per-session",
    permission: FEATURE_NAME,
    title: i18n('views-per-session.title'),
    route: "#/analytics/sessions/views-per-session",
    dataTestId: "session-views-per-session",
    component: ViewsPerSessionView,
    vuex: [{
        clyModel: countlyViewsPerSession
    }]
});

// --- Home Widget ---

registerData("/home/widgets", {
    _id: "views-dashboard-widget",
    label: i18n('views.title'),
    permission: FEATURE_NAME,
    enabled: {"default": true},
    available: {"default": true},
    placeBeforeDatePicker: false,
    width: 6,
    order: 4,
    component: ViewsHomeWidget
});

// --- Custom Dashboard Widget ---

registerData("/custom/dashboards/widget", {
    type: "analytics",
    permission: FEATURE_NAME,
    label: i18n("views.widget-type"),
    priority: 1,
    primary: false,
    getter: function(widget) {
        return widget.widget_type === "analytics" && widget.data_type === "views";
    },
    drawer: {
        component: ViewsDrawerWidget,
        getEmpty: function() {
            return {
                title: "",
                feature: FEATURE_NAME,
                widget_type: "analytics",
                data_type: "views",
                app_count: 'single',
                metrics: [],
                apps: [],
                custom_period: null,
                visualization: "table",
                isPluginWidget: true
            };
        },
        beforeLoadFn: function(/*doc, isEdited*/) {
        },
        beforeSaveFn: function(/*doc*/) {
        }
    },
    grid: {
        component: ViewsGridWidget
    }
});

// --- Drill Page Script ---

app.addPageScript("/drill#", function() {
    var drillClone;
    var self = app.drillView;
    var record_views = countlyGlobal.record_views;
    if (countlyGlobal.apps && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins.drill && typeof countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins.drill.record_views !== "undefined") {
        record_views = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins.drill.record_views;
    }
    if (record_views) {

        jQuery("#drill-types").append('<div id="drill-type-views" class="item"><div class="inner"><span class="icon views"></span><span class="text">' + jQuery.i18n.map["views.title"] + '</span></div></div>');
        jQuery("#drill-type-views").on("click", function() {
            if (jQuery(this).hasClass("active")) {
                return true;
            }

            jQuery("#drill-types").find(".item").removeClass("active");
            jQuery(this).addClass("active");
            jQuery("#event-selector").hide();

            jQuery("#drill-no-event").fadeOut();
            jQuery("#segmentation-start").fadeOut().remove();

            var currEvent = "[CLY]_view";

            self.graphType = "line";
            self.graphVal = "times";
            self.filterObj = {};
            self.byVal = "";
            self.drillChartDP = {};
            self.drillChartData = {};
            self.activeSegmentForTable = "";
            window.countlySegmentation.reset();

            jQuery("#drill-navigation").find(".menu[data-open=table-view]").hide();

            jQuery.when(window.countlySegmentation.initialize(currEvent)).then(function() {
                jQuery("#drill-filter-view").replaceWith(drillClone.clone(true));
                self.adjustFilters();
                if (!self.keepQueryTillExec) {
                    self.draw(true, false);
                }
            });
        });
        setTimeout(function() {
            drillClone = jQuery("#drill-filter-view").clone(true);
        }, 0);
    }
}, FEATURE_NAME);

// --- App Switch Callback ---

app.addAppSwitchCallback(function(appId) {
    if (app._isFirstLoad !== true && validateRead(FEATURE_NAME) && isPluginEnabled(FEATURE_NAME)) {
        countlyViews.loadList(appId);
    }
});

// --- Sub-Menu ---

app.addSubMenu("analytics", {code: "analytics-views", permission: FEATURE_NAME, url: "#/analytics/views", text: "views.title", priority: 25});

// --- Configuration Labels ---

getGlobalStore().commit('countlyConfigurations/registerLabel', {id: "views", value: "views.title"});
getGlobalStore().commit('countlyConfigurations/registerLabel', {id: "views.view_limit", value: "views.view-limit"});
