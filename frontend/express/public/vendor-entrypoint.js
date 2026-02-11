// Vendor Dependencies Bundle
// Pre-builds all npm packages into a separate IIFE bundle.
// The main build externalizes these packages and references window globals instead.
// Rebuild this only when npm dependencies change: npm run build:vite:vendor

// === Framework ===
import Vue from 'vue';
window.Vue = Vue;

import Vuex from 'vuex';
window.Vuex = Vuex;

// === Validation ===
import * as VeeValidate from 'vee-validate';
window.VeeValidate = VeeValidate;

import * as _VeeValidateRules from 'vee-validate/dist/rules';
// Strip 'default' key — CJS namespace includes the raw module object under 'default',
// which is not a validator and causes VeeValidate.extend() to fail
window.__vendor_VeeValidateRules = {..._VeeValidateRules};
delete window.__vendor_VeeValidateRules.default;

// Register VeeValidate components and rules here (in the same scope as Vue & VeeValidate)
// so there are no cross-bundle interop issues with Rollup's namespace wrappers.
Vue.component('validation-provider', VeeValidate.ValidationProvider);
Vue.component('validation-observer', VeeValidate.ValidationObserver);
Object.keys(window.__vendor_VeeValidateRules).forEach(function(rule) {
    VeeValidate.extend(rule, window.__vendor_VeeValidateRules[rule]);
});
window.__vendorVeeValidateInitialized = true;

// === UI Framework ===
import ElementUI from 'element-ui/src/index.js';
window.ELEMENT = ElementUI;

import emitter from 'element-ui/src/mixins/emitter';
window.__vendor_elementEmitter = emitter;

import * as ElementTiptap from 'element-tiptap';
window.ElementTiptap = ElementTiptap;

// === Utilities ===
import cronstrue from 'cronstrue';
window.cronstrue = cronstrue;

import VueClipboard from 'vue-clipboard2';
window.__vendor_VueClipboard = VueClipboard;

import VTooltip from 'v-tooltip';
window.VTooltip = VTooltip;

import hljs from 'highlight.js';
window.hljs = hljs;

// === Vue Components ===
import vue2Dropzone from 'vue2-dropzone';
window.__vendor_vue2Dropzone = vue2Dropzone;

import vuescroll from 'vuescroll';
window.__vendor_vuescroll = vuescroll;

import vuedraggable from 'vuedraggable';
window.__vendor_vuedraggable = vuedraggable;

import VueECharts from 'vue-echarts';
window.__vendor_VueECharts = VueECharts;

import * as echarts from 'echarts';
window.__vendor_echarts = echarts;

import * as VueColor from 'vue-color';
window.__vendor_VueColor = VueColor;

import vueInViewportMixin from 'vue-in-viewport-mixin';
window.__vendor_vueInViewportMixin = vueInViewportMixin;

// === Maps & Grid ===
import L from 'leaflet';
window.__vendor_leaflet = L;

import * as Vue2Leaflet from 'vue2-leaflet';
window.__vendor_Vue2Leaflet = Vue2Leaflet;

import Sortable from 'sortablejs';
window.__vendor_Sortable = Sortable;

import * as gridstack from 'gridstack';
window.__vendor_gridstack = gridstack;

// === Core Utilities ===
import _ from 'underscore';
window._ = _;

import lodash from 'lodash';
window.__vendor_lodash = lodash;

import moment from 'moment';
window.moment = moment;

import store from 'storejs';
window.store = store;

import jQuery from 'jquery';
window.jQuery = jQuery;
window.$ = jQuery;

// === Other ===
import * as uuid from 'uuid';
window.__vendor_uuid = uuid;

import Countly from 'countly-sdk-web';
window.__vendor_CountlySDK = Countly;
