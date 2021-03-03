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

    Vue.component("cly-header", countlyBaseComponent.extend({
        props: {
            title: String
        },
        template: '<div class="bu-level bu-is-mobile header header--white-bg">\
                        <div class="bu-level-left">\
                            <div class="bu-level-item">\
                                <h2>{{title}}</h2>\
                            </div>\
                        </div>\
                    </div>'
    }));

    Vue.component("cly-main", countlyBaseComponent.extend({
        template: '<div style="padding:24px"><slot></slot></div>'
    }));

    Vue.component("cly-section", countlyBaseComponent.extend({
        props: {
            title: String
        },
        template: '<div style="padding:12px 0"><h4>{{title}}</h4><div style="background-color:white; border-top:1px solid #ECECEC; border-bottom:2px solid #ECECEC"><slot></slot></div></div>'
    }));

}(window.countlyVue = window.countlyVue || {}));
