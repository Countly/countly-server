import Vue from 'vue';
import Vuex from 'vuex';
window.Vue = Vue;
window.Vuex = Vuex;

// Import and configure VeeValidate
import * as VeeValidate from 'vee-validate';
import * as rules from 'vee-validate/dist/rules';
window.VeeValidate = VeeValidate;
Vue.use(VeeValidate);
Vue.component('validation-provider', VeeValidate.ValidationProvider);
Vue.component('validation-observer', VeeValidate.ValidationObserver);
Object.keys(rules).forEach(rule => VeeValidate.extend(rule, rules[rule]));
VeeValidate.extend('arrmin', {
    validate: function(value, args) {
        return value.length >= args.length;
    },
    params: ['length']
});
VeeValidate.extend('arrmax', {
    validate: function(value, args) {
        return value.length <= args.length;
    },
    params: ['length']
});
VeeValidate.extend('json', {
    validate: function(value) {
        try {
            JSON.parse(value);
            return true;
        }
        catch (error) {
            return false;
        }
    }
});

// Element UI
import ELEMENT from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import Clickoutside from 'element-ui/lib/utils/clickoutside.js';
import Emitter from 'element-ui/lib/mixins/emitter.js';
ELEMENT.utils = { Clickoutside, Emitter }; // TODO: remove this
window.ELEMENT = ELEMENT;
Vue.directive("click-outside", Clickoutside);
Vue.use(ELEMENT);

// Vue clipboard
import VueClipboard from 'vue-clipboard2';
Vue.use(VueClipboard);

import jQuery from 'jquery';
window.jQuery = jQuery;
window.$ = jQuery;

import './javascripts/utils/jquery.i18n.properties.js';
import './javascripts/utils/jquery.idle-timer.js';

import underscore from 'underscore';
window._ = underscore;

import { merge, mergeWith } from 'lodash';
window._merge = merge;
window.merge = merge;
window._mergeWith = mergeWith;
window.mergeWith = mergeWith;

import moment from 'moment';
window.moment = moment;

import store from 'storejs';
window.store = store;

import Backbone from './javascripts/utils/backbone-min.js';
window.Backbone = Backbone;

import countlyView from './javascripts/countly/countly.view.js';
window.countlyView = countlyView;

import * as CountlyHelpers from './javascripts/countly/countly.helpers.js';
window.CountlyHelpers = CountlyHelpers;
window.T = CountlyHelpers.T;

import * as countlyAuth from './javascripts/countly/countly.auth.js';
window.countlyAuth = countlyAuth;

import { countlyCommon, CommonConstructor } from './javascripts/countly/countly.common.js';
window.countlyCommon = countlyCommon;
window.CommonConstructor = CommonConstructor;

import countlyTotalUsers from './javascripts/countly/countly.total.users.js';
window.countlyTotalUsers = countlyTotalUsers;

import * as countlyEvent from './javascripts/countly/countly.event.js';
window.countlyEvent = countlyEvent;

import countlySession from './javascripts/countly/countly.session.js';
window.countlySession = countlySession;

import countlyDeviceList from './javascripts/countly/countly.device.list.js';
window.countlyDeviceList = countlyDeviceList;

import countlyOsMapping from './javascripts/countly/countly.device.osmapping.js';
window.countlyOsMapping = countlyOsMapping;

import countlyDevice from './javascripts/countly/countly.device.js';
window.countlyDevice = countlyDevice;

import countlyDeviceDetails from './javascripts/countly/countly.device.detail.js';
window.countlyDeviceDetails = countlyDeviceDetails;

import countlyAppVersion from './javascripts/countly/countly.app.version.js';
window.countlyAppVersion = countlyAppVersion;

import countlyCarrier from './javascripts/countly/countly.carrier.js';
window.countlyCarrier = countlyCarrier;

import countlyAppUsers from './javascripts/countly/countly.app.users.js';
window.countlyAppUsers = countlyAppUsers;

import countlyTokenManager from './javascripts/countly/countly.token.manager.js';
window.countlyTokenManager = countlyTokenManager;

import countlyVersionHistoryManager from './javascripts/countly/countly.version.history.js';
window.countlyVersionHistoryManager = countlyVersionHistoryManager;

import countlyLocation, { setup as setupCountlyLocation } from './javascripts/countly/countly.location.js';
setupCountlyLocation();
window.countlyLocation = countlyLocation;

import countlyVue from './javascripts/countly/vue/core.js';
window.countlyVue = countlyVue;
window.CV = countlyVue;

import * as countlyVueContainer from './javascripts/countly/vue/container.js';
window.countlyVue.container = countlyVueContainer;

import * as countlyTemplate from './javascripts/countly/countly.template.js';
window.countlyTemplate = countlyTemplate;
window.app = countlyTemplate.app;
window.AppRouter = countlyTemplate.AppRouter;

import countlyCMS from './javascripts/countly/countly.cms.js';
window.countlyCMS = countlyCMS;

import * as countlyTaskManager from './javascripts/countly/countly.task.manager.js';
window.countlyTaskManager = countlyTaskManager;