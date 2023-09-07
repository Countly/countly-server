/* global app, countlyVue,CV,countlyCommon,countlyCities,countlyCountry, countlyLocation,countlyGlobal,windows*/

var CityView = countlyVue.views.create({
    template: CV.T("/core/geo-countries/templates/cities.html"),
    component: countlyCities,
    data: function() {
        return {
            appId: countlyCommon.ACTIVE_APP_ID,
            description: CV.i18n('countries.city.description'),
            path: countlyGlobal.path,
            region: this.$route.params.region || "TR",
            title: countlyLocation.getCountryName(this.$route.params.region || "TR")
        };
    },
    mounted: function() {
        this.$store.dispatch('countlyCities/onSetRegion', this.$route.params.region);
        this.refresh(true);
    },
    methods: {
        refresh: function(force) {
            if (force) {
                this.$store.dispatch('countlyCities/fetchData', force);
            }
            else {
                this.$store.dispatch('countlyCities/fetchData', false);
            }
        }
    },
    computed: {
        data: function() {
            return this.$store.state.countlyCities.data;
        },
        dateChanged: function() {
            this.refresh(true);
        },
        totalData: function() {
            return this.$store.state.countlyCountry.data;
        },
        chooseProperties: function() {
            var totals = this.countryTotals;

            return [
                {"value": "t", "label": CV.i18n('common.table.total-sessions'), "trend": totals.t.trend, "number": countlyCommon.getShortNumber(totals.t.total || 0), "trendValue": totals.t.change},
                {"value": "u", "label": CV.i18n('common.table.total-users'), "trend": totals.u.trend, "number": countlyCommon.getShortNumber(totals.u.total || 0), "trendValue": totals.u.change},
                {"value": "n", "label": CV.i18n('common.table.new-users'), "trend": totals.n.trend, "number": countlyCommon.getShortNumber(totals.n.total || 0), "trendValue": totals.n.change}
            ];
        },
        countryTotals: function() {
            var totals = this.data.totals;
            totals = totals || {"u": {}, "t": {}, "n": {}};
            totals.t = totals.t || {};
            totals.u = totals.u || {};
            totals.n = totals.n || {};
            return totals;
        },
        countriesData: function() {
            var data = {};
            var totals = this.countryTotals;
            var value = totals.t.total || 1;
            data[this.$route.params.region] = {"value": value};
            return data;
        },
        citiesData: function() {
            var data = this.data.cities || [];
            var selectedProperty = this.$store.state.countlyCities.selectedProperty || "t";
            var cityData = {};
            if (data.length > 0) {
                for (var k = 0; k < data.length; k++) {
                    cityData[data[k].city] = {"value": data[k][selectedProperty]};
                }
            }
            var retObj = {};
            retObj[this.$route.params.region] = cityData;
            return retObj;
        },
        cityTable: function() {
            return this.data.table || [];
        },
        selectedPropertyTitle: function() {
            var selectedProperty = this.$store.state.countlyCities.selectedProperty || "t";
            if (selectedProperty === 't') {
                return CV.i18n('common.table.total-sessions');
            }
            else if (selectedProperty === 'u') {
                return CV.i18n('common.table.total-users');
            }
            else if (selectedProperty === 'n') {
                return CV.i18n('common.table.new-users');
            }
        },
        selectedProperty: {
            set: function(value) {
                this.$store.dispatch('countlyCities/onSetSelectedProperty', value);
            },
            get: function() {
                return this.$store.state.countlyCities.selectedProperty;
            }
        },
        isLoading: function() {
            return this.$store.state.countlyCities.isLoading;
        }
    }
});

var CountryView = countlyVue.views.create({
    template: CV.T("/core/geo-countries/templates/countries.html"),
    data: function() {

        var buttonText = "";
        var buttonLink = "#/analytics/geo/countries/All";
        if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].country) {
            buttonText = CV.i18n('common.show') + " " + countlyLocation.getCountryName(countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].country);
            buttonLink = "#/analytics/geo/countries/" + countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].country;
        }
        else {
            buttonText = CV.i18n('common.show') + " " + CV.i18n("countries.table.country");
        }
        return {
            appId: countlyCommon.ACTIVE_APP_ID,
            description: CV.i18n('countries.description'),
            path: "",
            buttonText: buttonText,
            buttonLink: buttonLink
        };
    },
    mounted: function() {
        this.refresh(true);
    },
    methods: {
        refresh: function(force) {
            this.$store.dispatch('countlyCountry/fetchData', force);
        },
        swithToCityView: function() {
            windows.location.href = this.path;
        },
        regionClick: function(region) {
            this.path = "#/analytics/geo/countries/" + region;
            this.$refs.toCityViewLink.href = this.path;
            this.$refs.toCityViewLink.click();
        },
    },
    computed: {
        data: function() {
            return this.$store.state.countlyCountry.data || {};
        },
        chooseProperties: function() {
            var totals = this.data.totals || {};
            totals.t = totals.t || {};
            totals.u = totals.u || {};
            totals.n = totals.n || {};
            return [
                {"value": "t", "label": CV.i18n('common.table.total-sessions'), "trend": totals.t.trend, "number": countlyCommon.getShortNumber(totals.t.total || 0), "trendValue": totals.t.change},
                {"value": "u", "label": CV.i18n('common.table.total-users'), "trend": totals.u.trend, "number": countlyCommon.getShortNumber(totals.u.total || 0), "trendValue": totals.u.change},
                {"value": "n", "label": CV.i18n('common.table.new-users'), "trend": totals.n.trend, "number": countlyCommon.getShortNumber(totals.n.total || 0), "trendValue": totals.n.change}
            ];
        },
        geoChartData: function() {
            var geoChart = [];
            var table = this.data.table || [];
            var selectedProperty = this.$store.state.countlyCountry.selectedProperty || "t";

            var title = "";
            if (selectedProperty === "t") {
                geoChart.push(["Country", CV.i18n('common.table.total-sessions'), {role: 'tooltip', p: {html: true}}]);
                title = CV.i18n('common.table.total-sessions');
            }
            else if (selectedProperty === "u") {
                geoChart.push(["Country", CV.i18n('common.table.total-users'), {role: 'tooltip', p: {html: true}}]);
                title = CV.i18n('common.table.total-users');
            }
            else {
                geoChart.push(["Country", CV.i18n('common.table.new-users'), {role: 'tooltip', p: {html: true}}]);
                title = CV.i18n('common.table.new-users');
            }
            for (var k = 0; k < table.length; k++) {
                var cc = "<img src='" + countlyGlobal.path + "/images/flags/" + (table[k].code || "unknown") + ".png'/><p class='number'>" + table[k][selectedProperty] + "</p><p>" + title + "</p>";
                geoChart.push([{"v": table[k].country, "f": table[k].countryTranslated}, table[k][selectedProperty], cc]);
            }
            return geoChart;
        },
        countriesData: function() {
            var geoChart = {};
            var table = this.data.table || [];
            var selectedProperty = this.$store.state.countlyCountry.selectedProperty || "t";
            for (var k = 0; k < table.length; k++) {
                geoChart[table[k].country] = {"value": table[k][selectedProperty]};
            }
            return geoChart;
        },
        countryTable: function() {

            this.data.table = this.data.table || [];
            for (var z = 0; z < this.data.table.length; z++) {
                this.data.table[z].flag = countlyGlobal.path + "/images/flags/" + (this.data.table[z].code || "unknown") + ".svg";
            }
            return this.data.table;
        },
        selectedProperty: {
            set: function(value) {
                this.$store.dispatch('countlyCountry/onSetSelectedProperty', value);
            },
            get: function() {
                return this.$store.state.countlyCountry.selectedProperty;
            }
        },
        selectedPropertyTitle: function() {
            var selectedProperty = this.$store.state.countlyCountry.selectedProperty || "t";
            if (selectedProperty === 't') {
                return CV.i18n('common.table.total-sessions');
            }
            else if (selectedProperty === 'u') {
                return CV.i18n('common.table.total-users');
            }
            else if (selectedProperty === 'n') {
                return CV.i18n('common.table.new-users');
            }
        },
        isLoading: function() {
            return this.$store.state.countlyCountry.isLoading;
        },
        topDropdown: function() {
            if (this.externalLinks && Array.isArray(this.externalLinks) && this.externalLinks.length > 0) {
                return this.externalLinks;
            }
            else {
                return null;
            }
        }
    },
    mixins: [
        countlyVue.container.dataMixin({
            'externalLinks': '/analytics/countries/links',
        })
    ]
});

var GeoAnalyticsView = countlyVue.views.create({
    template: CV.T("/core/geo-countries/templates/geo-analytics.html"),
    mixins: [
        countlyVue.container.tabsMixin({
            "geoAnalyticsTabs": "/analytics/geo"
        }),
        countlyVue.container.mixins(["/analytics/geo"])
    ],
    data: function() {
        return {
            selectedTab: (this.$route.params && this.$route.params.tab) || "countries"
        };
    },
    computed: {
        tabs: function() {
            return this.geoAnalyticsTabs;
        }
    }
});


var CountriesHomeWidget = countlyVue.views.create({
    template: CV.T("/core/geo-countries/templates/countriesHomeWidget.html"),
    computed: {
        selectedPropertyTitle: function() {
            var selectedProperty = this.selectedProperty || "t";
            if (selectedProperty === 't') {
                return CV.i18n('common.table.total-sessions');
            }
            else if (selectedProperty === 'u') {
                return CV.i18n('common.table.total-users');
            }
            else if (selectedProperty === 'n') {
                return CV.i18n('common.table.new-users');
            }
        },
        isLoading: function() {
            return this.$store.state.countlyCountry.isLoading;
        }
    },
    data: function() {
        var buttonText = "";
        var buttonLink = "#/analytics/geo/countries/All";
        if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].country) {
            buttonText = CV.i18n('common.show') + " " + countlyLocation.getCountryName(countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].country);
            buttonLink = "#/analytics/geo/countries/" + countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].country;
        }
        else {
            buttonText = CV.i18n('common.show') + " " + CV.i18n("countries.table.country");
        }

        return {
            path: "",
            buttonText: buttonText,
            buttonLink: buttonLink,
            chooseProperties: this.calculateProperties(),
            countriesData: this.calculateCountriesData(),
            selectedProperty: "t",
            headerData: {
                label: CV.i18n("countries.title"),
                description: CV.i18n('countries.description'),
                linkTo: {"label": CV.i18n('countries.go-to-countries'), "href": "#/analytics/geo/countries"}
            }
        };
    },
    beforeCreate: function() {
        this.module = countlyCountry.getVuexModule();
        CV.vuex.registerGlobally(this.module);
    },
    beforeDestroy: function() {
        CV.vuex.unregister(this.module.name);
    },
    mounted: function() {
        var self = this;
        this.$store.dispatch('countlyCountry/fetchData', true).then(function() {
            self.chooseProperties = self.calculateProperties();
            self.countriesData = self.calculateCountriesData();
        });
    },
    methods: {
        refresh: function(force) {
            var self = this;
            this.$store.dispatch('countlyCountry/fetchData', force).then(function() {
                self.chooseProperties = self.calculateProperties();
                self.countriesData = self.calculateCountriesData();
            });
        },
        swithToCityView: function() {
            windows.location.href = this.path;
        },
        regionClick: function(region) {
            this.path = "#/analytics/geo/countries/" + region;
            this.$refs.toCityViewLink.href = this.path;
            this.$refs.toCityViewLink.click();
        },
        calculateProperties: function() {
            var countlyCountry = this.$store.state.countlyCountry || {};
            var totals = countlyCountry.data || {};
            totals = totals.totals || {};
            totals.t = totals.t || {};
            totals.u = totals.u || {};
            totals.n = totals.n || {};
            return [
                {"value": "t", "label": CV.i18n('common.table.total-sessions'), "trend": totals.t.trend || "u", "number": countlyCommon.getShortNumber(totals.t.total || 0), "trendValue": totals.t.change || "NaN"},
                {"value": "u", "label": CV.i18n('common.table.total-users'), "trend": totals.t.trend || "u", "number": countlyCommon.getShortNumber(totals.u.total || 0), "trendValue": totals.u.change || "NaN"},
                {"value": "n", "label": CV.i18n('common.table.new-users'), "trend": totals.t.trend || "u", "number": countlyCommon.getShortNumber(totals.n.total || 0), "trendValue": totals.n.change || "NaN"}
            ];
        },
        calculateCountriesData: function() {
            var geoChart = {};
            var countlyCountry = this.$store.state.countlyCountry || {};
            var data = countlyCountry.data || {};
            var table = data.table || [];
            var selectedProperty = this.selectedProperty || "t";
            for (var k = 0; k < table.length; k++) {
                geoChart[table[k].country] = {"value": table[k][selectedProperty]};
            }
            return geoChart;
        },
    },
    watch: {
        selectedProperty: function() {
            this.refresh();
        }
    }
});


countlyVue.container.registerData("/home/widgets", {
    _id: "countries-dashboard-widget",
    permission: "core",
    label: CV.i18n('countries.title'),
    enabled: {"default": true}, //object. For each type set if by default enabled
    available: {"default": true}, //object. default - for all app types. For other as specified.
    order: 8, //sorted by ascending
    placeBeforeDatePicker: false,
    component: CountriesHomeWidget
});


var getGeoAnalyticsView = function() {
    var tabsVuex = countlyVue.container.tabsVuex(["/analytics/geo"]);
    return new countlyVue.views.BackboneWrapper({
        component: GeoAnalyticsView,
        vuex: tabsVuex,
        templates: countlyVue.container.templates(['/geo/external/templates'])
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
    var ViewWrapper = new countlyVue.views.BackboneWrapper({
        component: CityView,
        vuex: [
            {
                clyModel: countlyCities
            }
        ]
    });
    var params = {region: region};
    ViewWrapper.params = params;
    this.renderWhenReady(ViewWrapper);
});

countlyVue.container.registerTab("/analytics/geo", {
    priority: 1,
    name: "countries",
    permission: "core",
    title: CV.i18n('sidebar.analytics.countries'),
    route: "#/analytics/geo/countries",
    component: CountryView,
    vuex: [{
        clyModel: countlyCountry
    }]
});
