/* global Vue, Backbone */

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
        props: {
            value: String,
            tabs: {
                type: Array,
                default: []
            },
        },
        computed: {
            currentTab: function() {
                var self = this;
                var tab = this.tabs.filter(function(t) {
                    return t.name === self.value;
                });

                if (tab.length) {
                    return tab[0].component;
                }

                return;
            }
        },
        methods: {
            setTab: function(name) {
                this.$emit("input", name);
            }
        },
        mounted: function() {
            if (!this.value && this.tabs.length) {
                this.$emit("input", this.tabs[0].name);
            }
        },
        template: '<div class="cly-vue-tabs">\
                    <button\
                    v-for="tab in tabs"\
                    v-bind:key="tab.name"\
                    v-bind:class="[{ active: value === tab.name }]"\
                    v-on:click="setTab(tab.name)"\
                    >\
                        {{ tab.title }}\
                    </button>\
                    <component v-bind:is="currentTab" class="tab"></component>\
                </div>'
    }));

}(window.countlyVue = window.countlyVue || {}));
