import Vue from 'vue';
import { app } from '../../../../frontend/express/public/javascripts/countly/countly.template.js';
import { views } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';

import './store/index.js';
import GuidesView from './components/GuidesView.vue';
import GuidesSearchView from './components/GuidesSearchView.vue';
import ViewGuide from './components/ViewGuide.vue';

import './assets/main.scss';

Vue.component("view-guide", ViewGuide);

var getGuidesView = function() {
    return new views.BackboneWrapper({
        component: GuidesView,
        vuex: []
    });
};

var getGuidesSearchView = function() {
    return new views.BackboneWrapper({
        component: GuidesSearchView,
        vuex: []
    });
};

app.route("/guides", "guides-overview", function() {
    app.navigate("/guides/overview", true);
});

app.route("/guides/overview", "guides-overview", function() {
    var guidesView = getGuidesView();
    guidesView.params = { primaryTab: "overview" };
    this.renderWhenReady(guidesView);
});

app.route("/guides/walkthroughs", "guides-walkthroughs", function() {
    var guidesView = getGuidesView();
    guidesView.params = { primaryTab: "walkthroughs" };
    this.renderWhenReady(guidesView);
});

app.route("/guides/walkthroughs/*secondaryTab", "guides-walkthroughs", function(secondaryTab) {
    var guidesView = getGuidesView();
    guidesView.params = { primaryTab: "walkthroughs", secondaryTab: secondaryTab };
    this.renderWhenReady(guidesView);
});

app.route("/guides/articles", "guides-articles", function() {
    var guidesView = getGuidesView();
    guidesView.params = { primaryTab: "articles" };
    this.renderWhenReady(guidesView);
});

app.route("/guides/articles/*secondaryTab", "guides-articles", function(secondaryTab) {
    var guidesView = getGuidesView();
    guidesView.params = { primaryTab: "articles", secondaryTab: secondaryTab };
    this.renderWhenReady(guidesView);
});

app.route("/guides/search", "guides-search", function() {
    var searchView = getGuidesSearchView();
    searchView.params = {};
    this.renderWhenReady(searchView);
});

app.route("/guides/search/:query", "guides-search-query", function(query) {
    var searchView = getGuidesSearchView();
    searchView.params = { query: query };
    this.renderWhenReady(searchView);
});
