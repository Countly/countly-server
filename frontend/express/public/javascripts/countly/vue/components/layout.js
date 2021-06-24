/* global Vue, $ */

(function(countlyVue) {

    var countlyBaseComponent = countlyVue.components.BaseComponent;

    Vue.component("cly-header", countlyBaseComponent.extend({
        props: {
            title: String
        },
        computed: {
            slotHeaderTop: function() {
                return !!(this.$scopedSlots["header-top"] || this.$slots["header-top"]);
            },
            slotHeaderBottom: function() {
                return !!(this.$scopedSlots["header-bottom"] || this.$slots["header-bottom"]);
            },
            slotHeaderTabs: function() {
                return !!(this.$scopedSlots["header-tabs"] || this.$slots["header-tabs"]);
            },
            headerClasses: function() {
                return {
                    "cly-vue-header": true,
                    "white-bg": true,
                    "cly-vue-header--no-mb": this.slotHeaderTabs,
                    "cly-vue-header--no-bb": this.slotHeaderTabs
                };
            },
            midLevelClasses: function() {
                return {
                    "bu-level": true,
                    "bu-is-mobile": true,
                    "cly-vue-header__level": true,
                    "cly-vue-header__level--no-pt": !this.slotHeaderTop,
                    "cly-vue-header__level--no-pb": !this.slotHeaderBottom
                };
            }
        },
        template: '<div>\
                    <div :class="[headerClasses]">\
                        <div class="bu-level bu-is-mobile" v-if="slotHeaderTop">\
                            <div class="bu-level-left">\
                                <slot name="header-top"></slot>\
                            </div>\
                        </div>\
                        <div :class="[midLevelClasses]">\
                            <div class="bu-level-left">\
                                <slot name="header-left">\
                                    <div class="bu-level-item">\
                                        <h2>{{title}}</h2>\
                                    </div>\
                                </slot>\
                            </div>\
                            <div class="bu-level-right">\
                                <slot name="header-right"></slot>\
                            </div>\
                        </div>\
                        <div class="bu-level bu-is-mobile" v-if="slotHeaderBottom">\
                            <div class="bu-level-left">\
                                <slot name="header-bottom"></slot>\
                            </div>\
                        </div>\
                    </div>\
                    <slot name="header-tabs"></slot>\
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
        computed: {
            levelClass: function() {
                return {
                    "bu-mb-4": this.$scopedSlots.header || this.$slots.header || (this.title && this.title.length),
                    "bu-level": true
                };
            }
        },
        template: '<div class="cly-vue-section">\
                        <div :class="[levelClass]">\
                            <div class="bu-level-left">\
                                <slot name="header">\
                                    <div class="bu-level-item" v-if="title">\
                                        <h4>{{title}}</h4>\
                                    </div>\
                                </slot>\
                            </div>\
                        </div>\
                        <div class="cly-vue-section__content white-bg">\
                            <slot></slot>\
                        </div>\
                    </div>'
    }));

    var _ModalManager = new Vue({
        el: "#vue-modal-manager",
        template: '<div><div :class="{\'is-active\': nClients>0}" id="vue-common-overlay"></div></div>',
        data: function() {
            return {
                clients: {}
            };
        },
        computed: {
            nClients: function() {
                return Object.keys(this.clients).length;
            }
        },
        watch: {
            nClients: function(newVal) {
                if (newVal > 0) {
                    $("body").addClass("has-active-modal");
                }
                else {
                    $("body").removeClass("has-active-modal");
                }
            }
        },
        methods: {
            setState: function(clientId, state) {
                if (state) {
                    Vue.set(this.clients, clientId, true);
                }
                else {
                    Vue.delete(this.clients, clientId);
                }
            }
        }
    });

    countlyVue.mixins.Modal = {
        methods: {
            setModalState: function(state) {
                _ModalManager.setState(this.componentId, state);
            }
        },
        beforeDestroy: function() {
            _ModalManager.setState(this.componentId, false);
        }
    };

    countlyVue.ModalManager = _ModalManager;


}(window.countlyVue = window.countlyVue || {}));
