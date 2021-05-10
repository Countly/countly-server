/* global Vue */

(function(countlyVue) {

    var countlyBaseComponent = countlyVue.components.BaseComponent,
        _mixins = countlyVue.mixins;

    var BaseContentMixin = countlyBaseComponent.extend(
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

    Vue.component("cly-header", countlyBaseComponent.extend({
        props: {
            title: String
        },
        template: '<div class="cly-vue-header white-bg">\
                    <div class="bu-level bu-is-mobile">\
                        <div class="bu-level-left">\
                            <div class="bu-level-item">\
                                <slot name="header-top"></slot>\
                            </div>\
                        </div>\
                    </div>\
                    <div class="bu-level bu-is-mobile">\
                        <div class="bu-level-left">\
                            <div class="bu-level-item">\
                                <slot name="header-left">\
                                    <h2>{{title}}</h2>\
                                </slot>\
                            </div>\
                        </div>\
                        <slot></slot>\
                        <div class="bu-level-right">\
                            <slot name="header-right">\
                            </slot>\
                        </div>\
                    </div>\
                    <div class="bu-level bu-is-mobile">\
                        <div class="bu-level-left">\
                            <div class="bu-level-item">\
                                <slot name="header-bottom"></slot>\
                            </div>\
                        </div>\
                    </div>\
                </div>'
    }));

    //Every view has a single cly-main component which encapsulates all other components/dom elements
    //This component is a single column full width component
    //A main component can have multiple sections
    Vue.component("cly-main", countlyBaseComponent.extend({
        template: '<div class="cly-vue-main bu-columns bu-is-gapless">\
                        <div class="bu-column bu-is-full">\
                            <slot></slot>\
                        </div>\
                    </div>'
    }));

    //Each cly-section should mark a different component within the cly-main component
    Vue.component("cly-section", countlyBaseComponent.extend({
        props: {
            title: String,
            autoGap: {
                type: Boolean,
                default: false
            }
        },
        template: '<div class="cly-vue-section bu-columns bu-is-multiline" :class="{\' bu-is-gapless\': !autoGap}">\
                        <div class="bu-column bu-is-full">\
                            <div class="bu-level">\
                                <div class="bu-level-left">\
                                    <slot name="header">\
                                        <div class="bu-level-item">\
                                            <h4>{{title}}</h4>\
                                        </div>\
                                    </slot>\
                                </div>\
                            </div>\
                        </div>\
                        <div class="bu-column bu-is-full cly-vue-section__content white-bg">\
                            <slot></slot>\
                        </div>\
                    </div>'
    }));

    countlyVue.mixins.BaseContent = BaseContentMixin;

}(window.countlyVue = window.countlyVue || {}));
