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

// import from 'javascripts/countly/countly.config.js';