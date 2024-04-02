/*global countlyVue, Vue */

(function() {
    Vue.component("cly-crashes-dashboard-tile", countlyVue.views.create({
        props: {
            showDonut: {type: Boolean, default: false},
            donutPercentage: {type: Number, default: 50},
            donutColor: {type: String, default: "#ff6120"},
            isVertical: {type: Boolean, default: false},
            columnWidth: {type: [Number, String], default: 4},
            tooltip: {type: String},
            testId: {type: String, default: "cly-crashes-dashboard-tile-default-test-id"}
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
        template: countlyVue.T("/crashes/templates/dashboard-tile.html")
    }));
})();