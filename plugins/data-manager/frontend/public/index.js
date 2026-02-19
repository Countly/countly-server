import { views } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { app } from '../../../../frontend/express/public/javascripts/countly/countly.template.js';
import { isJSON } from '../../../../frontend/express/public/javascripts/countly/countly.helpers.js';

import countlyDataManager from './store/index.js';
import MainView from './components/MainView.vue';
import EventDetailView from './components/EventDetailView.vue';
import EventGroupDetailView from './components/EventGroupDetailView.vue';

import './assets/main.scss';

var FEATURE_NAME = "data_manager";
var SUB_FEATURE_REDACTION = FEATURE_NAME + '_redaction';
var SUB_FEATURE_TRANSFORMATIONS = FEATURE_NAME + '_transformations';

var vuex = [{
    clyModel: countlyDataManager
}];

// NOTE: defaultTemplates for the BackboneWrapper templates option
// In the SFC world, these inline x-templates are now proper SFC components
// imported directly by the components that use them. However, the drill extension
// may still need them loaded. Check if EXTENDED_VIEWS has defaultTemplates.
var EXTENDED_VIEWS = (window.countlyDataManager && window.countlyDataManager.extended && window.countlyDataManager.extended.views) || {};
var defaultTemplates = EXTENDED_VIEWS.defaultTemplates || [];

var getMainView = function() {
    return new views.BackboneWrapper({
        component: MainView,
        vuex: vuex,
        templates: defaultTemplates,
    });
};

var getEventDetailView = function() {
    return new views.BackboneWrapper({
        component: EventDetailView,
        vuex: vuex,
        templates: defaultTemplates,
    });
};

var getEventGroupDetailView = function() {
    return new views.BackboneWrapper({
        component: EventGroupDetailView,
        vuex: vuex
    });
};

app.route("/manage/data-manager/:primaryTab", 'data-manager', function(primaryTab) {
    var mainView = getMainView();
    mainView.params = { primaryTab: primaryTab };
    this.renderWhenReady(mainView);
});

app.route("/manage/data-manager/:primaryTab/:secondaryTab", 'data-manager', function(primaryTab, secondaryTab) {
    var mainView = getMainView();
    mainView.params = { primaryTab: primaryTab, secondaryTab: secondaryTab };
    this.renderWhenReady(mainView);
});

app.route("/manage/data-manager/events/events/*query", 'data-manager-event-detail', function(query) {
    var detailView = getEventDetailView();
    var queryUrlParameter = query && isJSON(query) ? JSON.parse(query) : query;
    detailView.params = { eventId: queryUrlParameter };
    this.renderWhenReady(detailView);
});

app.route("/manage/data-manager/events/event-groups/:eventGroupId", 'data-manager-event-group-detail', function(eventGroupId) {
    var detailView = getEventGroupDetailView();
    detailView.params = { eventGroupId: eventGroupId };
    this.renderWhenReady(detailView);
});

app.addSubMenu("management", { code: "data-manager", permission: [FEATURE_NAME, SUB_FEATURE_REDACTION, SUB_FEATURE_TRANSFORMATIONS], pluginName: "data-manager", url: "#/manage/data-manager/", text: "data-manager.plugin-title", priority: 20 });
