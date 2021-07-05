/*global Vue*/
(function(countlyVue) {
    var countlyBaseComponent = countlyVue.components.BaseComponent;

    Vue.component("cly-progress-donut", countlyBaseComponent.extend({
        props: {
            percentage: {type: Number, default: 42},
            color: {type: [String, Function, Array], default: '#00C3CA'}
        },
        template: '<el-progress :color="color" :percentage="percentage" type="circle" :width="56" stroke-linecap="butt" :stroke-width="8" :show-text="false"></el-progress>'
    }));

    Vue.component("cly-progress-bar", countlyBaseComponent.extend({
        data: function() {
            return {
                barWidthUnit: "%",
                defaultRemainingBarStackColor: "darkgrey"
            };
        },
        props: {
            entities: {
                required: false,
                validator: function(value) {
                    return Array.isArray(value) && value.every(function(entityItem) {
                        return typeof entityItem.percentage === 'number' && typeof entityItem.color === 'string';
                    });
                }
            },
            height: {type: Number, required: false},
            percentage: {type: Number, required: false},
            color: {type: String, required: false},
            tooltip: {type: String, required: false, default: null}
        },
        computed: {
            barStacks: function() {
                if (this.hasEntities()) {
                    return this.getBarStacksWhenEntitiesFound();
                }
                else {
                    return this.getBarStacksWhenEntitiesNotFound();
                }
            }
        },
        methods: {
            getBarStacksWhenEntitiesNotFound: function() {
                var totalBarPercentage = this.percentage;
                if (this.isBarEmpty(totalBarPercentage)) {
                    return [{percentage: 0, color: this.defaultRemainingBarStackColor, tooltip: this.tooltip}];
                }
                else if (this.isBarFull(totalBarPercentage)) {
                    return [{percentage: this.percentage, color: this.color, tooltip: this.tooltip}];
                }
                else {
                    return [{percentage: this.percentage, color: this.color, tooltip: this.tooltip}, this.getRemainingBarStack(totalBarPercentage)];
                }
            },
            getBarStacksWhenEntitiesFound: function() {
                var totalBarPercentage = this.getEntitiesTotalPercentage();
                if (this.isBarEmpty(totalBarPercentage)) {
                    return [{percentage: 0, color: this.defaultRemainingBarStackColor}];
                }
                else if (this.isBarFull(totalBarPercentage)) {
                    return this.entities;
                }
                else {
                    return this.entities.concat(this.getRemainingBarStack(totalBarPercentage));
                }
            },
            getRemainingBarStack: function(totalBarPercentage) {
                return {percentage: this.getRemainingPercentage(totalBarPercentage), color: this.defaultRemainingBarStackColor};
            },
            getRemainingPercentage: function(total) {
                return 100 - total;
            },
            getEntitiesTotalPercentage: function() {
                return this.entities.reduce(function(totalPercentage, currentBarPercentage) {
                    totalPercentage += currentBarPercentage.percentage;
                    return totalPercentage;
                }, 0);
            },
            hasEntities: function() {
                return Boolean(this.entities) && Array.isArray(this.entities);
            },
            isBarFull: function(total) {
                return total === 100;
            },
            isBarEmpty: function(total) {
                return total === 0;
            },
            hasSingleBarStack: function() {
                return this.barStacks.length === 1;
            },
            isLastBarStack: function(index) {
                return this.barStacks.length - 1 === index;
            },
            isFirstBarStack: function(index) {
                return index === 0;
            },
            isMiddleBarStack: function(index) {
                return index > 0 && index < this.barStacks.length - 1;
            },
            getBarStackClasses: function(index) {
                var classes = [];
                if (!this.hasSingleBarStack()) {
                    classes.push("progress-bar-stack");
                    if (this.isFirstBarStack(index)) {
                        classes.push("first-progress-bar-stack");
                    }
                    if (this.isLastBarStack(index)) {
                        classes.push("last-progress-bar-stack");
                    }
                    if (this.isMiddleBarStack(index)) {
                        classes.push("middle-progress-bar-stack");
                    }
                    return classes;
                }
                return classes;
            },
            getBarStackStyleWidth: function(item) {
                if (item.percentage === 0 && this.hasSingleBarStack()) {
                    return {
                        width: 100 + this.barWidthUnit
                    };
                }
                return {
                    width: item.percentage + this.barWidthUnit,
                };
            },
            getBarStackTooltip: function(item) {
                if (item.tooltip) {
                    return {
                        content: '<span style="color: ' + item.color + ' ">' + item.tooltip + '</span> (' + item.percentage + '%)'
                    };
                }
                return null;
            }
        },
        template: '<div class="cly-progress-bar-container">\
                        <div v-for="(item, index) in barStacks" class="cly-progress-bar-stack-container" v-bind:style="getBarStackStyleWidth(item)" v-tooltip="getBarStackTooltip(item)">\
                            <el-progress v-bind:class="getBarStackClasses(index)" :show-text="false" :stroke-width="height" :percentage="100" :color="item.color"> </el-progress>\
                        </div>\
                    </div>'
    }));
}(window.countlyVue = window.countlyVue || {}));