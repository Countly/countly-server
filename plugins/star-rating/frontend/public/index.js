import countlyVue, { i18n } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { app } from '../../../../frontend/express/public/javascripts/countly/countly.template.js';
import countlyGlobal from '../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { countlyCommon } from '../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { registerTab, registerMixin } from '../../../../frontend/express/public/javascripts/countly/vue/container.js';
import { getGlobalStore } from '../../../../frontend/express/public/javascripts/countly/vue/data/store.js';

import RatingsMain from './components/RatingsMain.vue';
import WidgetDetail from './components/WidgetDetail.vue';
import UsersTab from './components/UsersTab.vue';
import starRatingPlugin from './store/index.js';

import './assets/main.scss';

var FEATURE_NAME = 'star_rating';

var ratingsMainView = new countlyVue.views.BackboneWrapper({
    component: RatingsMain,
    templates: [
        "/drill/templates/query.builder.v2.html"
    ]
});

var widgetDetailView = new countlyVue.views.BackboneWrapper({
    component: WidgetDetail,
    templates: [
        "/drill/templates/query.builder.v2.html"
    ]
});

app.ratingsMainView = ratingsMainView;
app.widgetDetailView = widgetDetailView;

app.route("/feedback/ratings", 'ratings', function() {
    this.renderWhenReady(this.ratingsMainView);
});

app.route("/feedback/ratings/:tab", 'ratings-with-tab', function(tab) {
    this.ratingsMainView.params = {
        tab: tab
    };
    this.renderWhenReady(this.ratingsMainView);
});

app.route("/feedback/ratings/widgets/:widget", 'widget-detail', function(widget) {
    this.widgetDetailView.params = {
        id: widget
    };
    this.renderWhenReady(this.widgetDetailView);
});

registerTab("/users/tabs", {
    priority: 1,
    title: 'Feedback',
    name: 'feedback',
    permission: FEATURE_NAME,
    pluginName: "star-rating",
    component: UsersTab
});

registerMixin("/manage/export/export-features", {
    pluginName: "star-rating",
    beforeCreate: function() {
        var self = this;
        $.when(starRatingPlugin.requestFeedbackWidgetsData()).then(function() {
            var widgets = starRatingPlugin.getFeedbackWidgetsData();
            var widgetsList = [];
            widgets.forEach(function(widget) {
                widgetsList.push({
                    id: widget._id,
                    name: widget.popup_header_text
                });
            });

            var selectItem = {
                id: "feedback_widgets",
                name: "Feedback Widgets",
                children: widgetsList
            };
            if (widgetsList.length) {
                self.$store.dispatch("countlyConfigTransfer/addConfigurations", selectItem);
            }
        });
    }
});

app.addMenu("reach", {code: "feedback", permission: FEATURE_NAME, text: "sidebar.feedback", icon: '<div class="logo ion-android-star-half"></div>', priority: 20});
app.addSubMenu("feedback", {
    code: "star-rating",
    permission: FEATURE_NAME,
    pluginName: "star-rating",
    url: "#/feedback/ratings",
    text: "star.menu-title",
    icon: '<div class="logo ion-android-star-half"></div>',
    priority: 30
});

app.addPageScript("/manage/reports", function() {
    window.countlyReporting.addMetric({name: jQuery.i18n.map["reports.star-rating"], pluginName: "star-rating", value: "star-rating"});
});

if (!getGlobalStore().getters['countlyConfigurations/predefinedLabels']["feedback.main_color"]) {
    getGlobalStore().commit('countlyConfigurations/registerLabel', {id: "feedback.main_color", value: "feedback.main_color-title"});
    getGlobalStore().commit('countlyConfigurations/registerLabel', {id: "feedback.font_color", value: "feedback.font_color-title"});
    getGlobalStore().commit('countlyConfigurations/registerLabel', {id: "feedback.feedback_logo", value: "feedback.logo-title"});
    getGlobalStore().commit('countlyConfigurations/registerInput', {id: "feedback.main_color", value: {input: "cly-colorpicker", helper: "feedback.main_color.description", attrs: {resetValue: '#2FA732'}}});
    getGlobalStore().commit('countlyConfigurations/registerInput', {id: "feedback.font_color", value: {input: "cly-colorpicker", helper: "feedback.font_color.description", attrs: {resetValue: '#2FA732'}}});
    getGlobalStore().commit('countlyConfigurations/registerInput', {id: "feedback.feedback_logo", value: {
        input: "image",
        helper: "feedback.logo.description",
        image_size: "feedback_logo",
        attrs: {
            name: "feedback_logo",
            action: countlyGlobal.path + "/i/feedback/upload",
            data: {auth_token: countlyGlobal.auth_token}
        },
        errorMessage: "",
        success: function() {
            getGlobalStore().getters['countlyConfigurations/predefinedInputs']["feedback.feedback_logo"].errorMessage = "";
            if (this.$root && this.$root.$children) {
                for (var i = 0; i < this.$root.$children.length; i++) {
                    if (this.$root.$children[i].configsData) {
                        this.$root.$children[i].onChange("feedback_logo", "feedback_logo");
                        break;
                    }
                }
            }
        },
        error: function(err) {
            var message = jQuery.i18n.map["feedback.error"];
            if (err && err.message) {
                try {
                    var parts = JSON.parse(err.message);
                    var m = parts.message || parts.error || parts.result;
                    message = jQuery.i18n.map[m] || m;
                }
                catch (ex) {
                    message = jQuery.i18n.map["feedback.error"];
                }
            }
            getGlobalStore().getters['countlyConfigurations/predefinedInputs']["feedback.feedback_logo"].errorMessage = message;
        },
        data: function() {
            return {
                id: countlyCommon.ACTIVE_APP_ID
            };
        },
        before: function(file) {
            var type = file.type;
            if (type !== "image/png" && type !== "image/gif" && type !== "image/jpeg") {
                getGlobalStore().getters['countlyConfigurations/predefinedInputs']["feedback.feedback_logo"].errorMessage = jQuery.i18n.map["feedback.imagef-error"];
                return false;
            }
            if (file.size > 1.5 * 1024 * 1024) {
                getGlobalStore().getters['countlyConfigurations/predefinedInputs']["feedback.feedback_logo"].errorMessage = jQuery.i18n.map["feedback.image-error"];
                return false;
            }
            return true;
        }
    }});
}

if (app.appManagementViews && !app.appManagementViews.feedbackApp) {
    var segments = window.location.href.split('/');
    var manageIndex = segments.indexOf('apps');
    var feedbackId = countlyCommon.ACTIVE_APP_ID;
    if (manageIndex !== -1) {
        feedbackId = segments[manageIndex + 1];
    }
    app.addAppManagementInput("feedbackApp", i18n("feedback.title"),
        {
            "feedbackApp.main_color": {input: "cly-colorpicker", attrs: {resetValue: '#2FA732'}, defaultValue: ""},
            "feedbackApp.font_color": {input: "cly-colorpicker", attrs: {resetValue: '#2FA732'}, defaultValue: ""},
            "feedbackApp.feedback_logo": {
                input: "image",
                helper: "feedback.logo.description",
                image_size: "feedback_logo" + feedbackId,
                attrs: {
                    action: countlyGlobal.path + "/i/feedback/upload"
                },
                errorMessage: "",
                success: function() {
                    getGlobalStore().getters['countlyConfigurations/predefinedInputs']["feedback.feedback_logo"].errorMessage = "";
                    if (this.$root && this.$root.$children) {
                        for (var ii = 0; ii < this.$root.$children.length; ii++) {
                            if (this.$root.$children[ii].appDetails) {
                                this.$root.$children[ii].onChange("feedbackApp.feedback_logo", "feedback_logo" + feedbackId);
                                break;
                            }
                        }
                    }
                },
                error: function(err) {
                    var message = jQuery.i18n.map["feedback.error"];
                    if (err && err.message) {
                        try {
                            var parts = JSON.parse(err.message);
                            var m = parts.message || parts.error || parts.result;
                            message = jQuery.i18n.map[m] || m;
                        }
                        catch (ex) {
                            message = jQuery.i18n.map["feedback.error"];
                        }
                    }
                    getGlobalStore().getters['countlyConfigurations/predefinedInputs']["feedback.feedback_logo" + feedbackId].errorMessage = message;
                },
                before: function(file) {
                    segments = window.location.href.split('/');
                    manageIndex = segments.indexOf('apps');
                    feedbackId = segments[manageIndex + 1] || countlyCommon.ACTIVE_APP_ID;
                    var type = file.type;
                    if (type !== "image/png" && type !== "image/gif" && type !== "image/jpeg") {
                        getGlobalStore().getters['countlyConfigurations/predefinedInputs']["feedback.feedback_logo" + feedbackId].errorMessage = jQuery.i18n.map["feedback.imagef-error"];
                        return false;
                    }
                    if (file.size > 1.5 * 1024 * 1024) {
                        getGlobalStore().getters['countlyConfigurations/predefinedInputs']["feedback.feedback_logo" + feedbackId].errorMessage = jQuery.i18n.map["feedback.image-error"];
                        return false;
                    }
                    return true;
                }
            }
        });
}

export { starRatingPlugin };
export default starRatingPlugin;
