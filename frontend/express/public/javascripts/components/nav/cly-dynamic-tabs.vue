<template>
    <div>
        <div v-if="!hideSingleTab || (tabs && tabs.length > 1)" class="cly-vue-tabs">
            <div :class="tabListClasses" :style="customStyle">
                <div
                    v-for="tab in tabs"
                    v-tooltip="tab.tooltip ? tab.tooltip : undefined"
                    :style="{cursor: tab.disabled ? 'not-allowed' : 'pointer', opacity: tab.disabled ? 0.5 : 1}"
                    v-bind:key="tab.name"
                    v-bind:class="[tabClasses, activeClasses(tab.name)]"
                    v-on:click="setTab(tab.name, tab.disabled)"
                    v-if="(!tab.type) || (tab.type === 'mobile' && !apps[app_id].type) || (apps[app_id].type === tab.type)"
                >
                    <template v-if="$scopedSlots[tab.name]">
                        <slot :name="tab.name" :tab="tab"></slot>
                    </template>
                    <template v-else>
                        <a
                            v-if="tab.route"
                            :href="tab.route"
                            :data-test-id="'tab-' + (tab.dataTestId ? tab.dataTestId : tab.title.toLowerCase().replaceAll(' ', '-')) + '-link'"
                        >
                            <span :data-test-id="'tab-' + (tab.dataTestId ? tab.dataTestId : tab.title.toLowerCase().replaceAll(' ', '-')) + '-title'">
                                {{ $i18n(tab.title) }}
                            </span>
                        </a>
                        <span
                            v-else
                            :data-test-id="'tab-' + (tab.dataTestId ? tab.dataTestId : tab.title.toLowerCase().replaceAll(' ', '-')) + '-title'"
                        >
                            {{ $i18n(tab.title) }}
                        </span>
                    </template>
                    <div
                        class="bu-is-inline-block"
                        v-if="tab.name === customIcon.implementedTab"
                        v-html="customIcon.iconTemplate"
                    ></div>
                </div>
            </div>
        </div>
        <component
            v-bind:is="currentTab"
            v-on="$listeners"
            v-bind="currentProps"
            class="cly-vue-tab"
        ></component>
    </div>
</template>

<script>
import Backbone from '../../utils/backbone-min.js';
import countlyGlobal from '../../countly/countly.global.js';

const { app } = window; // TO-DO: remove this dependency on global variable 'app' when app is modularized.

export default {
    props: {
        value: String,
        tabs: {
            type: Array,
            default: function() {
                return [];
            }
        },
        skin: {
            type: String,
            default: "primary"
        },
        noHistory: {
            type: Boolean,
            default: false
        },
        hideSingleTab: {
            type: Boolean,
            default: true
        },
        customIcon: {
            type: Object,
            default: function() {
                return {
                    implementedTab: '',
                    iconTemplate: ''
                };
            }
        },
        customStyle: {
            type: String,
            default: ''
        }
    },
    data: function() {
        return {
            apps: countlyGlobal.apps
        };
    },
    computed: {
        app_id: function() {
            var selectedAppId = this.$store.getters["countlyCommon/getActiveApp"] && this.$store.getters["countlyCommon/getActiveApp"]._id;
            return selectedAppId;
        },
        currentTab: function() {
            var self = this;
            var tab = this.tabs.filter(function(t) {
                return t.name === self.value;
            });

            if (tab.length) {
                return tab[0].component;
            }
            else if (this.tabs.length) {
                this.$emit("input", this.tabs[0].name);
                if (this.tabs[0].route) {
                    Backbone.history.noHistory(this.tabs[0].route);
                }
                return this.tabs[0].component;
            }

            return;
        },
        currentProps: function() {
            var self = this;
            var tab = this.tabs.filter(function(t) {
                return t.name === self.value;
            });
            if (tab.length) {
                return Object.assign(tab[0].props || {}, this.$attrs || {});
            }
            else if (this.tabs.length) {
                return Object.assign(this.tabs[0].props || {}, this.$attrs || {});
            }
            return;
        },
        tabClasses: function() {
            return {
                'cly-vue-tabs__tab': true,
                'cly-vue-tabs__tab--default': true,
                'cly-vue-tabs__tab--primary': this.skin === "primary",
                'cly-vue-tabs__tab--secondary': this.skin === "secondary"
            };
        },
        tabListClasses: function() {
            return {
                'white-bg': this.skin === "primary",
                'cly-vue-tabs__primary-tab-list': this.skin === "primary",
                'cly-vue-tabs__secondary-tab-list': this.skin === "secondary"
            };
        }
    },
    methods: {
        setTab: function(name, isDisabled) {
            if (isDisabled) {
                return;
            }
            var tab = this.tabs.filter(function(t) {
                return t.name === name;
            });

            if (tab.length && tab[0].route) {
                if (this.noHistory) {
                    Backbone.history.noHistory(tab[0].route);
                }
                else {
                    app.navigate(tab[0].route, true);
                }
            }

            this.$emit("input", name);
        },
        activeClasses: function(tab) {
            if (this.value === tab) {
                if (this.skin === "primary") {
                    return {
                        'cly-vue-tabs__tab--primary-active': true
                    };
                }

                if (this.skin === "secondary") {
                    return {
                        'cly-vue-tabs__tab--secondary-active': true
                    };
                }
            }

            var tabObj = this.tabs.find(function(t) {
                return t.name === tab;
            });
            if (tabObj && tabObj.name === this.customIcon.implementedTab) {
                return {
                    'custom-icon': true
                };
            }
        }
    },
    mounted: function() {
        if (!this.value && this.tabs.length) {
            this.$emit("input", this.tabs[0].name);
        }
    }
};
</script>
