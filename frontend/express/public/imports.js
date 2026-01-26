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

import { countlyCommon, CommonConstructor } from './javascripts/countly/countly.common.js';
window.countlyCommon = countlyCommon;
window.CommonConstructor = CommonConstructor;

// import from 'javascripts/countly/countly.config.js';