/*global countlyVue, Vue */

(function() {
    Vue.component("cly-crashes-dashboard-tile", countlyVue.views.BaseView.extend({
        props: {
            isVertical: {type: Boolean, default: false},
            columnWidth: {type: [Number, String], default: 4},
            tooltip: {type: String}
        },
        computed: {
            classes: function() {
                return this.$props.isVertical ? ["crashes-tile--vertical"] : ["crashes-tile--horizontal", "bu-is-" + this.$props.columnWidth];
            },
            hasDescription: function() {
                return !!this.$slots.description;
            },
            hasTooltip: function() {
                return !!this.$props.tooltip;
            }
        },
        template: '<div class="bu-column bu-columns crashes-tile" :class="classes">\
                           <slot>\
                           <div class="crashes-tile__content">\
                               <div class="text-medium color-cool-gray-100 bu-mb-1"><slot name="title"></slot> <cly-tooltip-icon v-if="hasTooltip" :tooltip="tooltip" icon="ion ion-help-circled"></cly-tooltip-icon></div>\
                               <div class="bu-columns bu-is-gapless bu-is-mobile">\
                                   <div class="crashes-tile__value-container bu-column bu-is-6">\
                                       <h2 class="color-cool-gray-100"><slot name="value"></slot></h2>\
                                   </div>\
                                   <div class="crashes-tile__description-container bu-column bu-is-6" v-if="hasDescription">\
                                       <div class="text-medium color-cool-gray-100">\
                                           <slot name="description"></slot>\
                                       </div>\
                                   </div>\
                               </div>\
                           </div>\
                           </slot>\
                       </div>\
                   </div>'
    }));
})();
