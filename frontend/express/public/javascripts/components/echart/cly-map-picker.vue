<template>
    <l-map ref="lmap" :style="{height: height || '450px', width: '100%'}" :zoom="dynamicZoom" :center="centerCoordinates">
        <l-tile-layer pane="tilePane" :url="tileFeed" :no-wrap="true" :attribution="tileAttribution"></l-tile-layer>
        <l-marker v-if="value" :lat-lng="value" :icon="markerIcon"></l-marker>
        <l-circle v-if="value && radius" :lat-lng="value" color="red" :radius="radiusInMeters"></l-circle>
    </l-map>
</template>

<script>
import L from 'leaflet';
import { LMap, LTileLayer, LMarker, LCircle } from 'vue2-leaflet';

export default {
    components: {
        LMap,
        LTileLayer,
        LMarker,
        LCircle
    },
    props: {
        value: {
            type: [Object],
            required: false,
            validator: function(item) {
                return item && item.lng && item.lat;
            },
            default: null
        },
        radius: {
            type: Object,
            required: false,
            validator: function(value) {
                return value && (value.unit === 'km' || value.unit === 'mi') && value.value;
            },
            default: null
        },
        isEnabled: {
            type: Boolean,
            required: false,
            default: false
        },
        height: {
            type: String,
            required: false,
            default: '450px'
        }
    },
    data: function() {
        return {
            defaultCenterCoordinates: {lat: 48.66194284607008, lng: 8.964843750000002},
            userCenterCoordinates: null,
            tileFeed: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            tileAttribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
            markerIcon: L.icon({
                iconUrl: 'images/leaflet/marker-icon.svg',
                iconSize: [32, 32],
                iconAnchor: [16, 32],
            }),
            MI_TO_KM_RATIO: 1.60934,
            KM_TO_M_RATIO: 1000,
            RadiusUnitEnum: {
                KM: 'km',
                MI: 'mi'
            }
        };
    },
    computed: {
        radiusInMeters: function() {
            if (this.radius && this.radius.unit === this.RadiusUnitEnum.KM) {
                return this.radius.value * this.KM_TO_M_RATIO;
            }
            if (this.radius && this.radius.unit === this.RadiusUnitEnum.MI) {
                return this.radius.value * this.MI_TO_KM_RATIO * this.KM_TO_M_RATIO;
            }
            return 0;
        },
        centerCoordinates: function() {
            if (this.value) {
                return this.value;
            }
            if (this.userCenterCoordinates) {
                return this.userCenterCoordinates;
            }
            return this.defaultCenterCoordinates;
        },
        dynamicZoom: function() {
            if (this.value) {
                return 8;
            }
            if (this.userCenterCoordinates) {
                return 12;
            }
            return 6;
        }
    },
    methods: {
        onLocationClick: function(event) {
            this.$emit('input', event.latlng);
        },
        onLocationFound: function(event) {
            this.userCenterCoordinates = event.latlng;
        },
        locateUserWhenMarkerNotFound: function() {
            if (!this.value) {
                this.$nextTick(function() {
                    this.$refs.lmap.mapObject.locate({setView: true});
                });
            }
        },
        registerEventListenersWhenEnabled: function(listeners) {
            var self = this;
            if (!this.isEnabled) {
                return;
            }
            this.$nextTick(function() {
                listeners.forEach(function(item) {
                    self.$refs.lmap.mapObject.on(item.name, item.handler);
                });
            });
        },
        unregisterEventListenersWhenEnabled: function(listeners) {
            var self = this;
            if (!this.isEnabled) {
                return;
            }
            listeners.forEach(function(item) {
                self.$refs.lmap.mapObject.off(item.name, item.handler);
            });
        },
        invalidateSize: function() {
            window.dispatchEvent(new Event('resize'));
        }
    },
    mounted: function() {
        this.registerEventListenersWhenEnabled([
            {name: 'click', handler: this.onLocationClick},
            {name: 'locationfound', handler: this.onLocationFound}
        ]);
        this.locateUserWhenMarkerNotFound();
    },
    beforeDestroy: function() {
        this.unregisterEventListenersWhenEnabled([
            {name: 'click', handler: this.onLocationClick},
            {name: 'locationfound', handler: this.onLocationFound}
        ]);
    }
};
</script>
