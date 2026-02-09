import { views, i18n } from '../../javascripts/countly/vue/core.js';
import { registerTab, registerData, tabsVuex, templates } from '../../javascripts/countly/vue/container.js';
import app from '../../javascripts/countly/countly.template.js';

import GeoAnalyticsView from './components/GeoAnalyticsView.vue';
import CountryView from './components/CountryView.vue';
import CityView from './components/CityView.vue';
import CountriesHomeWidget from './components/CountriesHomeWidget.vue';
import countryStore from './store/countly.country.js';
import citiesStore from './store/countly.cities.js';
import './stylesheets/_main.scss';
import './widget.js';

// Register countries tab under geo analytics.
registerTab("/analytics/geo", {
    priority: 1,
    name: "countries",
    permission: "core",
    title: i18n('sidebar.analytics.countries'),
    route: "#/analytics/geo/countries",
    component: CountryView,
    dataTestId: "countries",
    vuex: [{
        clyModel: countryStore
    }]
});

// Register home widget.
registerData("/home/widgets", {
    _id: "countries-dashboard-widget",
    permission: "core",
    label: i18n('countries.title'),
    enabled: {"default": true},
    available: {"default": true},
    order: 8,
    placeBeforeDatePicker: false,
    component: CountriesHomeWidget
});

// =============================================================================
// Routes
// =============================================================================

var getGeoAnalyticsView = function() {
    var geoTabsVuex = tabsVuex(["/analytics/geo"]);
    return new views.BackboneWrapper({
        component: GeoAnalyticsView,
        vuex: geoTabsVuex,
        // TO-DO: Remove runtime templates when activity-map plugin migrates to SFC.
        // Use registerData + dataMixin with dynamic <component :is> instead.
        templates: templates(['/geo/external/templates'])
    });
};

app.route("/analytics/geo", "analytics-geo", function() {
    var ViewWrapper = getGeoAnalyticsView();
    this.renderWhenReady(ViewWrapper);
});

app.route("/analytics/geo/*tab", "analytics-geo", function(tab) {
    var ViewWrapper = getGeoAnalyticsView();
    var params = {
        tab: tab
    };
    ViewWrapper.params = params;
    this.renderWhenReady(ViewWrapper);
});

app.route("/analytics/geo/countries/*region", "analytics-geo", function(region) {
    var ViewWrapper = new views.BackboneWrapper({
        component: CityView,
        vuex: [
            {
                clyModel: citiesStore
            }
        ]
    });
    var params = {region: region};
    ViewWrapper.params = params;
    this.renderWhenReady(ViewWrapper);
});
