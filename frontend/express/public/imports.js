import Vue from 'vue';
import Vuex from 'vuex';
window.Vue = Vue;
window.Vuex = Vuex;

import jQuery from 'jquery';
window.jQuery = jQuery;
window.$ = jQuery;

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
