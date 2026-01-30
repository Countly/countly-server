<template>
    <div class="cly-vue-worldmap">
        <div class="bu-columns bu-is-gapless" style="height: 100%;">
            <div v-if="showNavigation" v-loading="navigationLoading" class="bu-column bu-is-3 cly-vue-worldmap__list">
                <div class="cly-vue-worldmap__back-button bu-p-4" @click="goToMain" v-if="inDetail">
                    <span class="text-medium">&lt;- {{$i18n("countries.back-to-map")}}</span>
                </div>

                <div class="geo-chart-left-side-wrapper bg-white" v-if="!inDetail" :style="inDetailWrapperStyle">
                    <div class="cly-vue-worldmap__list-title bu-p-2">
                        <span class="bu-pl-2 text-uppercase text-small font-weight-bold">{{countriesTitle}}</span>
                    </div>
                    <cly-listbox
                        style="height: calc(100% - 38px);"
                        v-if="locations.length > 0"
                        skin="jumbo"
                        height="auto"
                        :searchable="true"
                        :bordered="false"
                        :options="locations"
                        :value="country"
                        :disabled="loading"
                        @input="goToCountry($event)">
                        <template v-slot:option-prefix="option">
                            <img :src="option.icon"/>
                        </template>
                        <template v-slot:option-label="option">
                            <div class="cly-vue-listbox__item-label color-blue-100">{{option.label}}</div>
                        </template>
                        <template v-slot:option-suffix="option">
                            <span class="bu-pr-2 text-medium color-blue-100">{{formatNumberSafe(option.custom.value)}}</span>
                        </template>
                    </cly-listbox>
                    <div v-if="locations.length < 1" class="geo-chart-empty-state bu-is-flex bu-is-justify-content-center bu-is-flex-direction-column bu-is-align-items-center">
                        <cly-empty-chart></cly-empty-chart>
                    </div>
                </div>
                <div v-else>
                    <div class="cly-vue-worldmap__country-info bu-p-4">
                        <div class="bu-is-flex">
                            <div class="bu-py-3">
                                <img :src="countryIcon(country)" style="width:32px; height: 32px; border-radius:32px; background-color:gray"/>
                            </div>
                            <div class="bu-pl-4 bu-is-flex bu-is-flex-justify-content-center bu-is-flex-direction-column bu-is-justify-content-space-between">
                                <span class="text-medium">
                                    {{countryName}}
                                </span>
                                <div class="bu-is-flex bu-is-align-items-baseline">
                                    <h2 class="bu-pr-2">
                                        {{formatNumberSafe(countryValue)}}
                                    </h2>
                                    <slot v-if="currentViewType === 'regions'" name="regions-info">
                                        <span class="text-medium">{{valueType}}</span>
                                    </slot>
                                    <slot v-else-if="currentViewType === 'cities'" name="cities-info">
                                        <span class="text-medium">{{valueType}}</span>
                                    </slot>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="cly-vue-worldmap__list-title bu-p-2">
                        <span class="bu-pl-2 text-uppercase text-small font-weight-bold">{{currentViewType === 'regions' ? regionsTitle : citiesTitle}}</span>
                    </div>
                </div>

                <div class="geo-chart-left-side-wrapper bg-white" v-if="currentViewType === 'regions'" :style="inDetailWrapperStyle">
                    <cly-listbox
                        v-if="locations.length > 0"
                        skin="jumbo"
                        height="auto"
                        :searchable="true"
                        :bordered="false"
                        :options="locations"
                        :value="focusedRegion"
                        @input="focusToRegion($event)">
                        <template v-slot:option-suffix="option">
                            <span class="bu-pr-2 text-medium color-blue-100">{{formatNumberSafe(option.custom.value)}}</span>
                        </template>
                    </cly-listbox>
                    <div v-if="locations.length < 1" class="geo-chart-empty-state bu-is-flex bu-is-justify-content-center bu-is-flex-direction-column bu-is-align-items-center">
                        <cly-empty-chart></cly-empty-chart>
                    </div>
                </div>
                <div class="geo-chart-left-side-wrapper bg-white" v-else-if="currentViewType === 'cities'" :style="inDetailWrapperStyle">
                    <cly-listbox
                        v-if="locations.length > 0"
                        skin="jumbo"
                        height="auto"
                        :searchable="true"
                        :bordered="false"
                        :options="locations"
                        :value="focusedCity"
                        @input="focusToCity($event)">
                        <template v-slot:option-suffix="option">
                            <span class="bu-pr-2 text-medium color-blue-100">{{formatNumberSafe(option.custom.value)}}</span>
                        </template>
                    </cly-listbox>
                    <div v-if="locations.length < 1" class="geo-chart-empty-state bu-is-flex bu-is-justify-content-center bu-is-flex-direction-column bu-is-align-items-center">
                        <cly-empty-chart></cly-empty-chart>
                    </div>
                </div>
            </div>
            <div class="bu-column cly-vue-worldmap__map-container" :class="{'bu-is-9': showNavigation}" style="height: 100%;">
                <div class="cly-vue-worldmap__detail-switch bu-m-3" v-show="inDetail && showDetailModeSelect">
                    <el-radio-group v-model="detailMode" size="small">
                        <el-radio-button label="regions">Regions</el-radio-button>
                        <el-radio-button label="cities">Cities</el-radio-button>
                    </el-radio-group>
                </div>
                <l-map ref="lmap" v-loading="loading" :min-zoom="minZoom" :max-zoom="maxZoom" :options="mapOptions" :max-bounds="maxBounds" style="height: 100%; width: 100%">
                    <l-tile-layer pane="tilePane" v-if="showTile" :url="tileFeed" :no-wrap="true" :attribution="tileAttribution"></l-tile-layer>

                    <l-geo-json
                        v-if="!inDetail"
                        pane="tilePane"
                        :geojson="geojsonHome"
                        :options="optionsHome"
                        :options-style="styleFunction">
                    </l-geo-json>
                    <l-geo-json
                        v-else
                        pane="tilePane"
                        :geojson="geojsonDetail"
                        :options="optionsDetail"
                        :options-style="styleFunction">
                    </l-geo-json>

                    <template v-for="(item, name) in activeMarkers">
                        <l-circle-marker
                            v-if="nameToLatLng[name]"
                            v-bind="circleMarkerConfig"
                            :radius="getMarkerRadius(item.value)"
                            :lat-lng="nameToLatLng[name]"
                            :fill-color="item.color || '#3388ff'"
                            :key="unique(name)"
                            @click="onMarkerClick(name)">
                            <l-tooltip :options="markerTooltipOptions" v-if="showTooltip">
                                <div class="bu-p-3 bu-is-flex bu-is-flex-direction-column">
                                    <div class="bu-level-left"><img v-if="getMarkerFlag(name)" :src="getMarkerFlag(name)" class="bu-mr-2" style="border-radius: 50%; width:16px; height:auto;"/><span class="text-medium">{{getMarkerTooltipTitle(name)}}</span></div>
                                    <h4>{{formatNumberSafe(item.value)}}</h4>
                                    <div class="bu-pt-1">
                                        <slot name="tooltip-suffix">
                                            <span class="text-medium">{{valueType}}</span>
                                        </slot>
                                    </div>
                                </div>
                            </l-tooltip>
                        </l-circle-marker>
                    </template>
                    <l-control-zoom position="bottomright"></l-control-zoom>
                </l-map>
            </div>
        </div>
    </div>
</template>

<script>
import moment from 'moment';
import countlyVue from '../../countly/vue/core.js';
import { countlyCommon } from '../../countly/countly.common.js';
import countlyGlobal from '../../countly/countly.global.js';
import countlyLocation from '../../countly/countly.location.js';
import { LMap, LCircleMarker, LGeoJson, LTileLayer, LControl, LTooltip, LControlZoom } from 'vue2-leaflet';

export default {
    components: {
        LMap,
        LCircleMarker,
        LGeoJson,
        LTileLayer,
        LControl,
        LTooltip,
        LControlZoom
    },
    mixins: [countlyVue.mixins.commonFormatters],
    props: {
        navigationLoading: {
            type: Boolean,
            default: false,
            required: false
        },
        showNavigation: {
            type: Boolean,
            default: true,
            required: false
        },
        showDetailModeSelect: {
            type: Boolean,
            default: true,
            required: false
        },
        externalCountry: {
            type: String,
            default: null,
            required: false
        },
        externalDetailMode: {
            type: String,
            default: null,
            required: false
        },
        valueType: {
            type: String,
            default: "",
            required: false
        },
        showTile: {
            type: Boolean,
            default: false,
            required: false
        },
        countriesData: {
            type: Object,
            default: function() {
                return {};
            },
            required: false
        },
        regionsData: {
            type: Object,
            default: function() {
                return {};
            },
            required: false
        },
        citiesData: {
            type: Object,
            default: function() {
                return {};
            },
            required: false
        },
        fillColor: {
            type: String,
            default: '#D6D6D6',
            required: false
        },
        borderColor: {
            type: String,
            default: '#FFF',
            required: false
        },
        maxMarkerRadius: {
            type: Number,
            default: 15,
            required: false
        },
        minMarkerRadius: {
            type: Number,
            default: 4,
            required: false
        },
        countriesTitle: {
            type: String,
            default: '',
            required: false
        },
        regionsTitle: {
            type: String,
            default: '',
            required: false
        },
        citiesTitle: {
            type: String,
            default: '',
            required: false
        },
        preventGoingToCountry: {
            type: Boolean,
            default: false,
            required: false
        },
        preventLayerClick: {
            type: Boolean,
            default: false,
            required: false
        },
        options: {
            type: Object,
            default: function() {
                return {};
            }
        },
        minZoom: {
            type: Number,
            default: 1
        },
        maxZoom: {
            type: Number,
            default: null
        },
        showTooltip: {
            type: Boolean,
            default: true
        },
        blockAutoLoading: {
            type: Boolean,
            default: false
        }
    },
    beforeCreate: function() {
        this.geojsonHome = [];
        this.geojsonDetail = [];
    },
    created: function() {
        var self = this;
        this.loadGeojson().then(function(json) {
            self.geojsonHome = json;
            json.features.forEach(function(f) {
                self.boundingBoxes[f.properties.code] = f.bbox;
                self.countriesToLatLng[f.properties.code] = {
                    lat: f.properties.lat,
                    lon: f.properties.lon
                };
            });
            self.handleViewChange();
        });
    },
    beforeDestroy: function() {
        this.geojsonHome = [];
        this.geojsonDetail = [];
    },
    data: function() {
        return {
            loadingGeojson: false,
            loadingCities: false,
            enableTooltip: true,
            maxBounds: null,
            tileFeed: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            tileAttribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
            boundingBoxes: {},
            country: null,
            focusedRegion: null,
            focusedCity: null,
            detailMode: 'regions',
            countriesToLatLng: {},
            regionsToLatLng: {},
            citiesToLatLng: {},
            markerTooltipOptions: {
                sticky: true,
                direction: "auto"
            },
            circleMarkerConfig: {
                pane: "markerPane",
                fillColor: "#017AFF",
                fillOpacity: 0.6,
                color: "transparent",
            },
            defaultMapOptions: {
                attributionControl: false,
                zoom: 1,
                zoomSnap: 0.1,
                zoomDelta: 0.5,
                zoomControl: false,
                scrollWheelZoom: false
            }
        };
    },
    watch: {
        country: function(newVal) {
            this.$emit("countryChanged", newVal);
        },
        detailMode: function(newVal) {
            this.$emit("detailModeChanged", newVal);
        },
        citiesData: function() {
            if (this.detailMode === 'cities') {
                this.indexCities();
            }
        },
        externalCountry: {
            immediate: true,
            handler: function(newVal) {
                if (!newVal) {
                    this.goToMain();
                }
                else {
                    this.goToCountry(newVal);
                }
            }
        },
        externalDetailMode: {
            immediate: true,
            handler: function(newVal) {
                if (newVal === "regions" || newVal === "cities") {
                    this.detailMode = newVal;
                }
            }
        }
    },
    computed: {
        loading: function() {
            return !this.blockAutoLoading && (this.loadingGeojson || this.loadingCities);
        },
        inDetail: function() {
            return this.country !== null;
        },
        optionsHome: function() {
            return {
                onEachFeature: this.onEachFeatureFunction
            };
        },
        optionsDetail: function() {
            return {
                onEachFeature: this.onEachFeatureFunctionDetail
            };
        },
        styleFunction: function() {
            var fillColor = this.fillColor,
                borderColor = this.borderColor;

            return function() {
                return {
                    weight: 1,
                    color: borderColor,
                    opacity: 1,
                    fillColor: fillColor,
                    fillOpacity: 1
                };
            };
        },
        onEachFeatureFunction: function() {
            var self = this;
            return function(feature, layer) {
                if (!self.preventLayerClick) {
                    layer.on('click', function() {
                        self.goToCountry(feature.properties.code);
                    });
                }
            };
        },
        onEachFeatureFunctionDetail: function() {
            return function() {};
        },
        currentViewType: function() {
            if (!this.inDetail) {
                return "main";
            }
            return this.detailMode;
        },
        locations: function() {
            var self = this,
                arr = [];

            switch (this.currentViewType) {
            case "main":
                var countryCodes = Object.keys(this.countriesData);

                arr = countryCodes.map(function(code) {
                    return {
                        label: countlyLocation.getCountryName(code),
                        value: code,
                        icon: countlyGlobal.cdn + "images/flags/" + code.toLowerCase() + ".svg",
                        custom: self.countriesData[code] || {}
                    };
                });
                break;

            case "regions":
                var regionCodes = Object.keys(this.regionsData[this.country] || {});

                arr = regionCodes.map(function(code) {
                    return {
                        label: countlyLocation.getRegionName(code, self.country),
                        value: code,
                        custom: self.regionsData[self.country][code]
                    };
                });
                break;

            case "cities":
                var cityNames = Object.keys(this.citiesData[this.country] || {});

                arr = cityNames.map(function(name) {
                    return {
                        label: name,
                        value: name,
                        custom: self.citiesData[self.country][name]
                    };
                });
                break;
            }
            arr.sort(function(a, b) {
                return b.custom.value - a.custom.value;
            });
            return arr;
        },
        activeMarkers: function() {
            switch (this.currentViewType) {
            case "main":
                return this.countriesData;
            case "regions":
                return this.regionsData[this.country];
            case "cities":
                return this.citiesData[this.country];
            }
        },
        largestMarkerValue: function() {
            if (!this.activeMarkers) {
                return 1;
            }
            var self = this;
            return Object.keys(this.activeMarkers).reduce(function(acc, val) {
                return Math.max(acc, self.activeMarkers[val].value);
            }, 0);
        },
        nameToLatLng: function() {
            switch (this.currentViewType) {
            case "main":
                return this.countriesToLatLng;
            case "regions":
                return this.regionsToLatLng;
            case "cities":
                return this.citiesToLatLng;
            }
        },
        countryName: function() {
            return countlyLocation.getCountryName(this.country);
        },
        countryValue: function() {
            if (!this.countriesData[this.country]) {
                return "-";
            }
            return this.countriesData[this.country].value;
        },
        inDetailWrapperStyle: function() {
            var style = {
                'overflow': 'hidden',
                'height': '100%'
            };

            if (this.inDetail) {
                style.height = 'calc(100% - 185px)';
            }

            return style;
        },
        mapOptions: function() {
            var options = this.options;
            var opt = this.defaultMapOptions;

            for (var key in options) {
                opt[key] = options[key];
            }

            return opt;
        }
    },
    methods: {
        indexCities: function() {
            var self = this;
            if (this.citiesData[this.country]) {
                return self.loadCities(this.country, Object.keys(this.citiesData[this.country])).then(function(json) {
                    self.citiesToLatLng = {};
                    json.forEach(function(f) {
                        self.citiesToLatLng[f.name] = {lat: f.loc.coordinates[1], lon: f.loc.coordinates[0]};
                    });
                });
            }
            else {
                self.citiesToLatLng = {};
            }
            return Promise.resolve();
        },
        boxToLatLng2d: function(boundingBox) {
            var x0 = boundingBox[0],
                y0 = boundingBox[1],
                x1 = boundingBox[2],
                y1 = boundingBox[3];

            return [
                [y0, x0],
                [y1, x1]
            ];
        },
        getMarkerRadius: function(value) {
            if (this.minMarkerRadius >= this.maxMarkerRadius) {
                return this.minMarkerRadius;
            }
            return Math.max(this.minMarkerRadius, (value / this.largestMarkerValue) * this.maxMarkerRadius);
        },
        getMarkerFlag: function(code) {
            if (this.detailMode === "cities") {
                return false;
            }
            else {
                return "images/flags/" + code.toLowerCase() + ".png";
            }
        },
        getMarkerTooltipTitle: function(code) {
            switch (this.currentViewType) {
            case "main":
                return countlyLocation.getCountryName(code);
            case "regions":
                return countlyLocation.getRegionName(code, this.country);
            case "cities":
                return code;
            }
        },
        updateMaxBounds: function() {
            var boundingBox = this.inDetail ? this.boundingBoxes[this.country] : this.geojsonHome.bbox;
            if (boundingBox) {
                this.maxBounds = this.boxToLatLng2d(boundingBox);
                if (this.$refs.lmap && this.$refs.lmap.mapObject) {
                    this.$refs.lmap.mapObject.fitBounds(this.maxBounds, {animate: false, padding: [20, 20]});
                }
            }
        },
        loadGeojson: function(country) {
            var self = this;
            this.loadingGeojson = true;

            var url = 'geodata/world.geojson';

            if (country) {
                url = 'geodata/region/' + country + '.geojson';
            }

            return countlyVue.$.ajax({
                type: "GET",
                url: url,
                dataType: "json",
            }).then(function(json) {
                var componentContext = self;
                if (!componentContext._isBeingDestroyed && !componentContext._isDestroyed) {
                    self.loadingGeojson = false;
                    return Object.freeze(json);
                }
                else {
                    return [];
                }
            });
        },
        loadCities: function(country, cities) {
            var self = this;
            this.loadingCities = true;

            var query = {"country": country};

            if (cities) {
                query.name = {"$in": cities};
            }

            return countlyVue.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "geodata",
                    "loadFor": "cities",
                    "query": JSON.stringify(query),
                    "preventRequestAbort": true
                },
                dataType: "json",
            }).then(function(json) {
                var componentContext = self;
                if (!componentContext._isBeingDestroyed && !componentContext._isDestroyed) {
                    self.loadingCities = false;
                    return Object.freeze(json);
                }
                else {
                    return [];
                }
            });
        },
        goToMain: function() {
            this.geojsonDetail = [];
            this.country = null;
            this.handleViewChange();
        },
        goToCountry: function(country) {
            this.$emit("country-click", country);
            if (this.preventGoingToCountry) {
                return;
            }

            var self = this;

            if (!Object.prototype.hasOwnProperty.call(this.countriesData, country)) {
                return;
            }

            this.loadGeojson(country).then(function(json) {
                self.geojsonDetail = json;
                self.country = country;
                self.regionsToLatLng = {};
                var features = json.features || [];
                features.forEach(function(f) {
                    self.regionsToLatLng[f.properties.iso_3166_2] = {
                        lat: f.properties.lat || 0,
                        lon: f.properties.lon || 0
                    };
                });
                return self.indexCities().then(function() {
                    self.handleViewChange();
                });
            });
        },
        onMarkerClick: function(code) {
            if (!this.inDetail && !this.preventLayerClick) {
                this.goToCountry(code);
            }
        },
        focusToRegion: function() {},
        focusToCity: function() {},
        handleViewChange: function() {
            this.updateMaxBounds();
        },
        unique: function(name) {
            return name + "_" + moment.now();
        },
        countryIcon: function(code) {
            return countlyGlobal.cdn + "images/flags/" + code.toLowerCase() + ".svg";
        }
    }
};
</script>
