import countlyVue from '../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { app } from '../../../../frontend/express/public/javascripts/countly/countly.template.js';
import { countlyCommon } from '../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { registerMixin } from '../../../../frontend/express/public/javascripts/countly/vue/container.js';
import Vue from 'vue';
import countlyGlobal from '../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { validateRead } from '../../../../frontend/express/public/javascripts/countly/countly.auth.js';

import countlyPopulator from './store/index.js';
import PopulatorView from './components/PopulatorView.vue';
import AppLockedView from './components/AppLockedView.vue';
import EnvironmentDetail from './components/EnvironmentDetail.vue';
import PopulatorTemplateDrawer from './components/PopulatorTemplateDrawer.vue';
import LeftContainer from './components/common/LeftContainer.vue';
import NumberSelector from './components/common/NumberSelector.vue';
import ConditionSelector from './components/common/ConditionSelector.vue';
import SectionDetail from './components/common/SectionDetail.vue';
import PopulatorSection from './components/common/PopulatorSection.vue';

import './assets/main.scss';

var FEATURE_NAME = 'populator';

// Global component registrations (used by tag name in templates)
Vue.component("cly-populator-left-container", LeftContainer);
Vue.component("cly-populator-number-selector", NumberSelector);
Vue.component("cly-populator-condition-selector", ConditionSelector);
Vue.component("cly-populator-section-detail", SectionDetail);
Vue.component("cly-populator-section", PopulatorSection);
Vue.component("cly-populator-template-drawer", PopulatorTemplateDrawer);

var getPopulatorView = function() {
    return new countlyVue.views.BackboneWrapper({
        component: PopulatorView
    });
};

var getAppLockedView = function() {
    return new countlyVue.views.BackboneWrapper({
        component: AppLockedView
    });
};

app.route("/manage/populate*state", "populate", function() {
    if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].locked) {
        this.renderWhenReady(getAppLockedView());
    }
    else if (validateRead("populator")) {
        this.renderWhenReady(getPopulatorView());
    }
    else {
        app.navigate("/", true);
    }
});

app.route("/manage/populate/environment/:id", "environment-detail", function(id) {
    var view = new countlyVue.views.BackboneWrapper({
        component: EnvironmentDetail
    });
    view.params = {id: id};
    this.renderWhenReady(view);
});

app.addSubMenu("management", {code: "populate", permission: FEATURE_NAME, url: "#/manage/populate", text: "populator.plugin-title", priority: 30, classes: "populator-menu"});

registerMixin("/manage/export/export-features", {
    pluginName: "populator",
    beforeCreate: function() {
        var self = this;
        countlyPopulator.getTemplates(countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type, function(templates) {
            var templateList = [];
            templates.forEach(function(template) {
                if (!template.isDefault) {
                    templateList.push({
                        id: template._id,
                        name: template.name
                    });
                }
            });
            var selectItem = {
                id: "populator",
                name: "Populator Templates",
                children: templateList
            };
            if (templateList.length) {
                self.$store.dispatch("countlyConfigTransfer/addConfigurations", selectItem);
            }
        });
    }
});
