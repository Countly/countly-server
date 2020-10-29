/* global Vue */

(function(countlyVue) {

    window.VTooltip.VTooltip.options.defaultClass = 'cly-vue-tooltip';
    window.VTooltip.VTooltip.options.defaultBoundariesElement = 'window';

    var countlyBaseComponent = countlyVue.components.countlyBaseComponent,
        _mixins = countlyVue.mixins;

    Vue.directive('click-outside', {
        bind: function(el, binding, vnode) {
            el.clickOutsideEvent = function(event) {
                if (!(el === event.target || el.contains(event.target))) {
                    vnode.context[binding.expression](event);
                }
            };
            document.body.addEventListener('click', el.clickOutsideEvent);
        },
        unbind: function(el) {
            document.body.removeEventListener('click', el.clickOutsideEvent);
        }
    });

    Vue.component("cly-menubox", countlyBaseComponent.extend({
        template: '<div class="cly-vue-menubox menubox-default-skin" v-click-outside="close">\n' +
                        '<div class="menu-toggler" :class="{active: isOpened}" @click="toggle">\n' +
                            '<div class="text-container">\n' +
                                '<div class="text">{{label}}</div>\n' +
                            '</div>\n' +
                            '<div class="arrows-wrapper">\n' +
                                '<div class="down ion-chevron-down"></div>\n' +
                                '<div class="up ion-chevron-up"></div>\n' +
                            '</div>\n' +
                        '</div>\n' +
                        '<div class="menu-body" v-show="isOpened">\n' +
                            '<slot></slot>\n' +
                        '</div>\n' +
                    '</div>',
        props: {
            label: { type: String, default: '' },
            isOpened: { type: Boolean, default: false }
        },
        methods: {
            toggle: function() {
                this.setStatus(!this.isOpened);
            },
            close: function() {
                this.setStatus(false);
            },
            setStatus: function(targetState) {
                this.$emit('status-changed', targetState);
            }
        }
    }));

    Vue.component("cly-button-menu", countlyBaseComponent.extend({
        template: '<div class="cly-vue-button-menu" :class="[skinClass]" v-click-outside="close">\n' +
                        '<div class="toggler" @click.stop="toggle"></div>\n' +
                        '<div class="menu-body" :class="{active: opened}">\n' +
                            '<a @click="fireEvent(item.event)" class="item" v-for="(item, i) in items" :key="i">\n' +
                                '<i :class="item.icon"></i>\n' +
                                '<span>{{item.label}}</span>\n' +
                            '</a>\n' +
                        '</div>\n' +
                    '</div>',
        props: {
            items: {
                type: Array,
                default: function() {
                    return [];
                }
            },
            skin: { default: "default", type: String}
        },
        computed: {
            skinClass: function() {
                if (["default", "single"].indexOf(this.skin) > -1) {
                    return "button-menu-" + this.skin + "-skin";
                }
                return "button-menu-default-skin";
            },
        },
        data: function() {
            return {
                opened: false
            };
        },
        methods: {
            toggle: function() {
                this.opened = !this.opened;
            },
            close: function() {
                this.opened = false;
            },
            fireEvent: function(eventKey) {
                this.$emit(eventKey);
                this.close();
            }
        }
    }));
    Vue.component("cly-tabs", countlyBaseComponent.extend(
        // @vue/component
        {
            mixins: [
                _mixins.i18n
            ],
            props: {
                value: { default: null, type: String },
                skin: { default: "main", type: String}
            },
            data: function() {
                return {
                    tabs: []
                };
            },
            computed: {
                skinClass: function() {
                    if (["main", "graphs"].indexOf(this.skin) > -1) {
                        return "tabs-" + this.skin + "-skin";
                    }
                    return "tabs-main-skin";
                },
                numberOfTabsClass: function() {
                    return "tabs-" + this.tabs.length;
                },
                activeContentId: function() {
                    return this.value;
                }
            },
            mounted: function() {
                this.tabs = this.$children;
                if (!this.value) {
                    this.$emit("input", this.tabs[0].tId);
                }
            },
            methods: {
                setTab: function(tId) {
                    this.$emit("input", tId);
                }
            },
            template: '<div class="cly-vue-tabs" v-bind:class="[skinClass]">\n' +
                            '<ul class="cly-vue-tabs-list" v-bind:class="[numberOfTabsClass]">\n' +
                                '<li @click="setTab(tab.tId)" v-for="(tab, i) in tabs" :key="i" :class="{\'is-active\': tab.isActive}">\n' +
                                    '<a v-html="tab.tName"></a>\n' +
                                '</li>\n' +
                            '</ul>\n' +
                            '<div class="cly-vue-tabs-container">\n' +
                                '<slot/>\n' +
                            '</div>\n' +
                        '</div>'
        }
    ));

    Vue.component("cly-content", countlyBaseComponent.extend(
        // @vue/component
        {
            inheritAttrs: false,
            mixins: [
                _mixins.i18n
            ],
            props: {
                name: { type: String, default: null},
                id: { type: String, default: null },
                alwaysMounted: { type: Boolean, default: true },
                alwaysActive: { type: Boolean, default: false },
                role: { type: String, default: "default" }
            },
            data: function() {
                return {
                    isContent: true
                };
            },
            computed: {
                isActive: function() {
                    return this.alwaysActive || (this.role === "default" && this.$parent.activeContentId === this.id);
                },
                tName: function() {
                    return this.name;
                },
                tId: function() {
                    return this.id;
                },
                elementId: function() {
                    return this.componentId + "-" + this.id;
                }
            },
            template: '<div class="cly-vue-content" :id="elementId" v-if="isActive || alwaysMounted">\n' +
                            '<div v-show="isActive"><slot/></div>\n' +
                        '</div>'
        }
    ));

    Vue.component("cly-panel", countlyBaseComponent.extend(
        // @vue/component
        {
            props: {
                title: { type: String, required: false },
                dateSelector: { type: Boolean, required: false, default: true },
                hasLeftBottom: { type: Boolean, required: false, default: false },
                onlyHead: { type: Boolean, required: false, default: false }
            },
            template: '<div class="cly-vue-panel widget">\n' +
                            '<div class="widget-header">\n' +
                                '<div class="left">\n' +
                                    '<div style="margin-left: 3px;">\n' +
                                        '<slot name="left-top">\n' +
                                            '<div class="title" :class="{small: hasLeftBottom}">{{title}}</div>\n' +
                                        '</slot>\n' +
                                        '<div v-if="hasLeftBottom">\n' +
                                            '<slot name="left-bottom"></slot>\n' +
                                        '</div>\n' +
                                    '</div>\n' +
                                '</div>\n' +
                                '<div class="right">\n' +
                                    '<slot name="right-top">\n' +
                                        '<cly-global-date-selector-w v-once v-if="dateSelector"></cly-global-date-selector-w>\n' +
                                    '</slot>\n' +
                                '</div>\n' +
                            '</div>\n' +
                            '<div class="widget-content help-zone-vb" :class="{\'no-border\': onlyHead}">\n' +
                                '<slot/>\n' +
                            '</div>\n' +
                        '</div>',
        }
    ));


}(window.countlyVue = window.countlyVue || {}));
