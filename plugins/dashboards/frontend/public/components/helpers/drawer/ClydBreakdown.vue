<template>
<cly-form-field
    name="breakdowns"
    rules="required"
    :label="i18nM('dashboards.breakdown')">
    <el-select
        :is-full-width="true"
        style="width: 100%;"
        v-bind="$attrs"
        v-on="allListeners"
        :collapse-tags="false"
        v-model="selectedBreakdown"
        :placeholder="i18nM('placeholder.dashboards.select-breakdown')">
        <el-option
            v-for="breakdown in breakdowns"
            :key="breakdown.value"
            :label="breakdown.label"
            :value="breakdown.value">
        </el-option>
    </el-select>
</cly-form-field>
</template>

<script>
import { mixins, i18nMixin } from '../../../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import countlyGlobal from '../../../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import countlyDashboards from '../../../store/index.js';
import ClyFormField from '../../../../../../../frontend/express/public/javascripts/components/form/cly-form-field.vue';

export default {
    mixins: [i18nMixin, mixins.customDashboards.apps],
    components: {
        ClyFormField
    },
    props: {
        appId: {
            type: String,
            default: ""
        },
        type: {
            type: String,
            validator: function(value) {
                return (["session", "events", "user-analytics", "technology", "geo"].indexOf(value) > -1) ? true : false;
            },
            required: true
        },
        value: {
            type: Array,
            required: true,
            default: function() {
                return [];
            }
        },
        event: {
            type: String,
            default: ""
        }
    },
    data: function() {
        return {
            store: null
        };
    },
    computed: {
        breakdowns: function() {
            var breakdowns = [];
            var event = this.event;
            var appId = this.appId;

            switch (this.type) {
            case "session":
                var app = this.__allApps[appId];
                if (app && app.type) {

                    breakdowns.push(
                        { label: "Countries", value: "countries"},
                        { label: "Devices", value: "devices"},
                        { label: "App Versions", value: "versions"},
                        { label: "Platforms", value: "platforms"}
                    );

                    switch (app.type) {
                    case "web":

                        breakdowns.push({ label: "Resolutions", value: "resolutions"});

                        if (typeof window.countlyDensity !== "undefined") {
                            breakdowns.push({ label: "Densities", value: "density"});
                        }

                        if (typeof window.countlyBrowser !== "undefined") {
                            breakdowns.push({ label: "Browsers", value: "browser"});
                        }

                        if (typeof window.countlyLanguage !== "undefined") {
                            breakdowns.push({ label: "Languages", value: "langs"});
                        }

                        if (typeof window.countlySources !== "undefined") {
                            breakdowns.push({ label: "Sources", value: "sources"});
                        }

                        break;
                    case "mobile":

                        breakdowns.push({ label: "Carriers", value: "carriers"});
                        breakdowns.push({ label: "Resolutions", value: "resolutions"});

                        if (typeof window.countlyDensity !== "undefined") {
                            breakdowns.push({ label: "Densities", value: "density"});
                        }

                        if (typeof window.countlyLanguage !== "undefined") {
                            breakdowns.push({ label: "Languages", value: "langs"});
                        }

                        if (typeof window.countlySources !== "undefined") {
                            breakdowns.push({ label: "Sources", value: "sources"});
                        }

                        break;
                    case "desktop":

                        breakdowns.push({ label: "Resolutions", value: "resolutions"});

                        if (typeof window.countlyDensity !== "undefined") {
                            breakdowns.push({ label: "Densities", value: "density"});
                        }

                        if (typeof window.countlyLanguage !== "undefined") {
                            breakdowns.push({ label: "Languages", value: "langs"});
                        }

                        break;
                    }
                }

                break;
            case "events":
                if (event && event.length) {
                    var eventKey = event.split(countlyDashboards.factory.events.separator)[1];
                    appId = event.split(countlyDashboards.factory.events.separator)[0];

                    var allSegments = this.$store.getters["countlyDashboards/allSegments"]([appId]);

                    var eventSegments = allSegments[eventKey] || [];

                    if (eventSegments && eventSegments.length) {
                        for (var i = 0; i < eventSegments.length; i++) {
                            if (eventSegments[i]) {
                                breakdowns.push({
                                    value: eventSegments[i],
                                    name: eventSegments[i]
                                });
                            }
                        }
                    }
                }

                break;
            case "user-analytics":
                breakdowns.push({ label: this.i18n("user-analytics.overview-title"), value: "overview"});

                if (window.countlyAuth.validateRead("active_users") && countlyGlobal.plugins && countlyGlobal.plugins.indexOf("active_users") > -1) {
                    breakdowns.push({ label: this.i18n("active_users.title"), value: "active"});
                }
                if (window.countlyAuth.validateRead("concurrent_users") && countlyGlobal.plugins && countlyGlobal.plugins.indexOf("concurrent_users") > -1) {
                    breakdowns.push({ label: this.i18n("concurrent-users.title"), value: "online"});
                }

                break;
            case "geo":
                breakdowns.push(
                    { label: this.i18n("languages.title"), value: "langs"},
                    { label: this.i18n("countries.title"), value: "countries"}
                );
                break;
            case "technology":
                breakdowns.push(
                    { label: this.i18n("platforms.title"), value: "platforms"},
                    { label: this.i18n("device_type.devices"), value: "devices"},
                    { label: this.i18n("device_type.table.device_type"), value: "device_type"},
                    { label: this.i18n("resolutions.table.resolution"), value: "resolutions"},
                    { label: this.i18n("app-versions.title"), value: "app_versions"}
                );

                if (countlyGlobal.plugins && countlyGlobal.plugins.indexOf("density") > -1) {
                    breakdowns.push({ label: this.i18n("density.title"), value: "density"});
                }

                var app1 = this.__allApps[appId];
                if (app1 && app1.type) {
                    if (app1.type === "web") {
                        if (countlyGlobal.plugins && countlyGlobal.plugins.indexOf("browser") > -1) {
                            breakdowns.push({ label: this.i18n("browser.title"), value: "browser"});
                        }
                    }
                    else {
                        breakdowns.push({ label: this.i18n("carriers.title"), value: "carriers"});
                    }
                }
                break;
            }
            return breakdowns;
        },
        selectedBreakdown: {
            get: function() {
                return this.value && this.value[0] || "";
            },
            set: function(item) {
                var i = [item];
                this.$emit("input", i);
            }
        },
        allListeners: function() {
            return Object.assign({},
                this.$listeners,
                {
                    input: function() {}
                }
            );
        }
    },
    watch: {
        event: {
            immediate: true,
            handler: function(newVal, oldVal) {
                var event = newVal;

                if (this.type !== "events") {
                    return;
                }

                if (this.$store && event && event.length) {
                    var appId = event.split(countlyDashboards.factory.events.separator)[0];

                    this.$store.dispatch("countlyDashboards/getEvents", {appIds: [appId]});
                }
                if (oldVal) {
                    this.$emit("input", []);
                }
            }
        }
    }
};
</script>
