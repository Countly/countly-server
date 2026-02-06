import { views } from '../../javascripts/countly/vue/core.js';
import app from '../../javascripts/countly/countly.template.js';

import HomeView from './components/HomeView.vue';
import store from './store/index.js';
import './stylesheets/_main.scss';

// Create BackboneWrapper instance (reused by dashboard routing in app-lifecycle.js)
app.HomeView = new views.BackboneWrapper({
    component: HomeView,
    vuex: [{clyModel: store}]
});

// Register route
app.route("/home", "home", function() {
    var params = {};
    this.HomeView.params = params;
    this.renderWhenReady(this.HomeView);
});
