/* global Vue, Backbone, app, countlyGlobal, CV */

(function(countlyVue) {

    var countlyBaseComponent = countlyVue.components.BaseComponent;

    Vue.component("cly-tabs", countlyBaseComponent.extend({
        props: {
            value: String,
            routePattern: String,
            routeKey: String,
            noHistory: {
                type: Boolean,
                default: true
            }
        },
        computed: {
            currentTab: {
                get: function() {
                    return this.value;
                },
                set: function(val) {
                    if (this.routePattern && this.routeKey) {
                        var target = this.routePattern.replace(":" + this.routeKey, val);
                        if (this.noHistory) {
                            Backbone.history.noHistory(target);
                        }
                        else {
                            window.location.hash = target;
                        }
                    }
                    this.$emit("input", val);
                }
            }
        },
        template: '<div class="cly-vue-tabs">\
                        <el-tabs v-model="currentTab" type="button" v-on="$listeners" v-bind="$attrs">\
                            <template v-slot>\
                                <slot></slot>\
                            </template>\
                        </el-tabs>\
                    </div>'
    }));

    /*
        Vue dynamic components enable users to switch between two or more components without routing,
        and even retain the state of data when switching back to the initial component.
        The central idea is to let users dynamically mount and unmount components in the user
        interface without using routers.
        When designing your user interface, you’ll want some form of flexibility to show or
        hide nested components based on the application state. Dynamic components provide
        that platform in an efficient and simple way.
    */
    Vue.component("cly-dynamic-tabs", countlyBaseComponent.extend({
        data: function() {
            return {
                apps: countlyGlobal.apps
            };
        },
        mixins: [CV.mixins.i18n],
        props: {
            value: String,
            tabs: {
                type: Array,
                default: []
            },
            skin: {
                type: String,
                default: "primary"
            },
            noHistory: {
                type: Boolean,
                default: false
            },
            customIcon: {
                type: Object,
                default: () => {
                    return {
                        implementedTab: '',
                        iconTemplate: ''
                    };
                }
            },
            hideSingleTab: {
                type: Boolean,
                default: true
            }
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
            setTab: function(name) {
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

                var tabObj = this.tabs.find(t => t.name === tab);
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
        },
        template: '<div>\
                        <div v-if="tabs && tabs.length > 1" class="cly-vue-tabs">\
                            <div :class="tabListClasses">\
                                <div\
                                    v-for="tab in tabs"\
                                    v-bind:key="tab.name"\
                                    v-bind:class="[tabClasses, activeClasses(tab.name)]"\
                                    v-on:click="setTab(tab.name)"\
                                    v-if="(!tab.type) || (tab.type === \'mobile\' && !apps[app_id].type) || (apps[app_id].type === tab.type)"\
                                    >\
                                        <slot :name="tab.name" :tab="tab">\
                                            <a v-if=\'tab.route\' :href="tab.route"><span>{{ i18n(tab.title) }}</span></a>\
                                            <span v-else>{{ i18n(tab.title) }}</span>\
                                        </slot>\
                                        <div class="bu-is-inline-block" v-if="tab.name === customIcon.implementedTab" v-html="customIcon.iconTemplate"></div>\
                                </div>\
                            </div>\
                        </div>\
                        <component v-bind:is="currentTab" v-on="$listeners" v-bind="$attrs" class="cly-vue-tab"></component>\
                    </div>'
    }));

}(window.countlyVue = window.countlyVue || {}));
