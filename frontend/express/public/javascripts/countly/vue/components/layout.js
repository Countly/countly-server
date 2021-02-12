/* global Vue */

(function(countlyVue) {

    var countlyBaseComponent = countlyVue.components.BaseComponent,
        _mixins = countlyVue.mixins;

    var BaseContent = countlyBaseComponent.extend(
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
            }
        }
    );

    var BaseStep = BaseContent.extend({
        data: function() {
            return {
                isValid: true,
                isStep: true
            };
        }
    });

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

    Vue.component("cly-content", BaseContent.extend({
        template: '<div class="cly-vue-content" :id="elementId" v-if="isActive || alwaysMounted">\n' +
                        '<div v-show="isActive"><slot/></div>\n' +
                    '</div>'
    }));

    Vue.component("cly-step", BaseStep.extend({
        methods: {
            setValid: function(valid) {
                this.isValid = valid;
            }
        },
        template: '<div class="cly-vue-content" :id="elementId" v-if="isActive || alwaysMounted">\n' +
                        '<div v-show="isActive"><slot :setValid="setValid"/></div>\n' +
                    '</div>'
    }));

    Vue.component("cly-form-step", BaseStep.extend({
        props: {
            validatorFn: {type: Function},
        },
        mounted: function() {
            var self = this;
            this.$watch(function() {
                return self.$refs.observer.flags.valid;
            },
            function(newVal) {
                self.isValid = newVal;
            });
        },
        methods: {
            reset: function() {
                this.$refs.observer.reset();
            },
            touch: function() {
                this.$refs.observer.validate();
            }
        },
        template: '<div class="cly-vue-content" :id="elementId" v-if="isActive || alwaysMounted">\n' +
                    '<div v-show="isActive">\n' +
                        '<validation-observer ref="observer" v-slot="v">\n' +
                            '<slot/>\n' +
                        '</validation-observer>\n' +
                    '</div>\n' +
                '</div>'
    }));

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
