/* global Vue */

(function(countlyVue) {

    var countlyBaseComponent = countlyVue.components.BaseComponent;

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
                            <slot name="header-left">\
                                <div class="bu-level-item">\
                                    <h2>{{title}}</h2>\
                                </div>\
                            </slot>\
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
        template: '<div class="cly-vue-main bu-columns bu-is-gapless bu-is-centered">\
                        <div class="bu-column bu-is-full" style="max-width: 1920px">\
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

}(window.countlyVue = window.countlyVue || {}));
