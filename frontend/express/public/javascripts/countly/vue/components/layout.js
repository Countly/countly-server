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
        template: '<div class="header header--white">\
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
        template: '<div class="bu-columns bu-is-gapless main">\
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
                            <slot name="header">\
                                <h4>{{title}}</h4>\
                            </slot>\
                        </div>\
                        <div class="bu-column bu-is-full cly-vue-section__content">\
                            <slot></slot>\
                        </div>\
                    </div>'
    }));

    countlyVue.mixins.BaseContent = BaseContentMixin;

}(window.countlyVue = window.countlyVue || {}));
