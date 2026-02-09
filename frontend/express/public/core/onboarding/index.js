import { views } from '../../javascripts/countly/vue/core.js';
import app from '../../javascripts/countly/countly.template.js';
import countlyGlobal from '../../javascripts/countly/countly.global.js';
import { showQuickstartPopover } from '../../javascripts/countly/countly.helpers.js';
import * as countlyCMS from '../../javascripts/countly/countly.cms.js';
import Backbone from '../../javascripts/utils/backbone-min.js';
import moment from 'moment';
import storejs from 'storejs';
import _ from 'underscore';

import AppSetupView from './components/AppSetupView.vue';
import ConsentView from './components/ConsentView.vue';
import store from './store/index.js';
import './stylesheets/_main.scss';

// Routes
app.route('/initial-setup', 'initial-setup', function() {
    this.renderWhenReady(new views.BackboneWrapper({
        component: AppSetupView,
        vuex: [{ clyModel: store }],
    }));
});

app.route('/initial-consent', 'initial-consent', function() {
    this.renderWhenReady(new views.BackboneWrapper({
        component: ConsentView,
        vuex: [{ clyModel: store }],
    }));
});

var hasNewsLetter = typeof countlyGlobal.newsletter === "undefined" ? true : countlyGlobal.newsletter;

app.route('/not-subscribed-newsletter', 'not-subscribed-newsletter', function() {
    if (!hasNewsLetter) {
        window.location.href = '#/home';
        window.location.reload();
    }
    else {
        this.renderWhenReady(new views.BackboneWrapper({
            component: ConsentView,
            vuex: [{ clyModel: store }],
        }));
    }
});

// Quickstart guide CMS fetch (side-effect)
var sessionCount = countlyGlobal.member.session_count || 0;
var isGlobalAdmin = countlyGlobal.member.global_admin;

countlyCMS.fetchEntry('server-quick-start', { populate: true, CMSFirst: true }).then(function(resp) {
    var isConsentPage = /initial-setup|initial-consent|not-responded-consent|not-subscribed-newsletter/.test(window.location.hash);
    if (resp.data && resp.data.length && !isConsentPage) {
        var showForNSessions = resp.data[0].showForNSessions;

        if (!_.isEmpty(countlyGlobal.apps) && sessionCount <= showForNSessions && Array.isArray(resp.data[0].links)) {
            var quickstartHeadingTitle = resp.data[0].title;
            var quickstartItems = resp.data[0].links.filter(function(item) {
                if (item.forUserType === 'all') {
                    return true;
                }
                else if (item.forUserType === 'globalAdmin' && isGlobalAdmin) {
                    return true;
                }

                return false;
            });

            if (quickstartItems.length > 0) {
                var content = store.generateQuickstartContent(quickstartItems, quickstartHeadingTitle);
                showQuickstartPopover(content);
            }
        }
    }
});

// Newsletter prompt logic (side-effect)
if (
    hasNewsLetter &&
    (
        typeof countlyGlobal.member.subscribe_newsletter !== 'boolean' &&
        storejs.get('disable_newsletter_prompt') === false &&
        (countlyGlobal.member.login_count === 3 || moment().dayOfYear() % 90 === 0)
    )
) {
    if (Backbone.history.fragment !== '/not-subscribed-newsletter' && !/initial-setup|initial-consent/.test(window.location.hash)) {
        app.navigate("/not-subscribed-newsletter", true);
    }
}
else if (!countlyGlobal.member.subscribe_newsletter && (countlyGlobal.member.login_count !== 3 && moment().dayOfYear() % 90 !== 0)) {
    storejs.set('disable_newsletter_prompt', false);
}
