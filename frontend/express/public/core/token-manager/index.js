import { views } from '../../javascripts/countly/vue/core.js';
import app from '../../javascripts/countly/countly.template.js';

import TokenManagerMain from './components/TokenManagerMain.vue';
import './stylesheets/_main.scss';

// Create main view
const getMainView = function() {
    return new views.BackboneWrapper({
        component: TokenManagerMain,
        vuex: []
    });
};

// Register route
app.route('/manage/token_manager', 'tokenManager', function() {
    this.renderWhenReady(getMainView());
});
