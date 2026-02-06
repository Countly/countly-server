import { views } from '../../javascripts/countly/vue/core.js';
import app from '../../javascripts/countly/countly.template.js';

import VersionHistoryView from './components/VersionHistory.vue';
import countlyVersionHistoryManager from '../../javascripts/countly/countly.version.history.js';
import './stylesheets/_main.scss';

/**
 * Get the version history view wrapped for Backbone routing
 * @returns {Object} Backbone wrapper view
 */
var getVersionHistoryView = function() {
    return new views.BackboneWrapper({
        component: VersionHistoryView,
        vuex: [],
        templates: []
    });
};

// Register route
app.route("/versions", 'versions', function() {
    countlyVersionHistoryManager.initialize().then(function() {
        var ViewWrapper = getVersionHistoryView();
        this.renderWhenReady(ViewWrapper);
    }.bind(this));
});
