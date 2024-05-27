/*global Vue*/
(function(countlyVue) {
    var countlyBaseComponent = countlyVue.components.BaseComponent;

    Vue.component("cly-progress-donut", countlyBaseComponent.extend({
        props: {
            percentage: {default: 42},
            color: {type: [String, Function, Array], default: '#00C3CA'},
            mode: {
                type: String,
                default: 'simple',
                validator: function(val) {
                    return val === 'simple' || val === 'advanced-tile';
                }
            },
            label: {type: String, required: false, default: ''}
        },
        computed: {
            topClasses: function() {
                if (this.mode === 'advanced-tile') {
                    return 'bu-p-5 bu-is-flex';
                }
                return '';
            }
        },
        template: '<div :class="topClasses">\
                    <el-progress :color="color" :percentage="percentage" type="circle" :width="56" stroke-linecap="butt" :stroke-width="9" :show-text="false"></el-progress>\
                    <div v-if="mode === \'advanced-tile\'" class="bu-pl-5 bu-is-flex bu-is-flex-direction-column bu-is-justify-content-space-between">\
                        <span class="text-medium"><slot>{{label}}</slot></span>\
                        <h2>{{percentage}} %</h2>\
                    </div>\
                </div>'
    }));

    Vue.component("cly-progress-bar", countlyBaseComponent.extend({
        data: function() {
            return {
                barWidthUnit: "%",
                defaultRemainingBarStackColor: "#ececec"
            };
        },
        props: {
            entities: {
                required: false,
                // vck: Validator throws false errors when entities are not ready, so disabling it
                // validator: function(value) {
                //     return Array.isArray(value) && value.every(function(entityItem) {
                //         return typeof entityItem.percentage === 'number' && typeof entityItem.color === 'string';
                //     });
                // }
            },
            height: {type: Number, required: false},
            percentage: {required: false}, // vck: type constraint removed due to a similar reason explained above
            color: {type: String, required: false},
            backgroundColor: {type: String, required: false},
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
            },
            remainingBarStackColor: function() {
                return this.backgroundColor || this.defaultRemainingBarStackColor;
            }
        },
        methods: {
            getBarStacksWhenEntitiesNotFound: function() {
                var totalBarPercentage = this.percentage;
                if (this.isBarEmpty(totalBarPercentage)) {
                    return [{percentage: 0, color: this.remainingBarStackColor, tooltip: this.tooltip}];
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
                    return [{percentage: 0, color: this.remainingBarStackColor}];
                }
                else if (this.isBarFull(totalBarPercentage)) {
                    return this.entities;
                }
                else {
                    return this.entities.concat(this.getRemainingBarStack(totalBarPercentage));
                }
            },
            getRemainingBarStack: function(totalBarPercentage) {
                return {percentage: this.getRemainingPercentage(totalBarPercentage), color: this.remainingBarStackColor};
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
                        <template v-for="(item, index) in barStacks">\
                                <div :key="index" v-if="item.tooltipMode !== \'popover\'" v-tooltip="getBarStackTooltip(item)" class="cly-progress-bar-stack-container" v-bind:style="getBarStackStyleWidth(item)">\
                                    <el-progress v-bind:class="getBarStackClasses(index)" :show-text="false" :stroke-width="height" :percentage="100" :color="item.color"> </el-progress>\
                                </div>\
                                <div v-else :key="index" class="cly-progress-bar-stack-container" v-bind:style="getBarStackStyleWidth(item)">\
                                    <cly-popover size="auto-chart">\
                                        <el-progress v-bind:class="getBarStackClasses(index)" :show-text="false" :stroke-width="height" :percentage="100" :color="item.color"> </el-progress>\
                                        <template v-slot:content><slot :name="\'popover-\' + item.id"></slot></template>\
                                    </cly-popover>\
                                </div>\
                        </template>\
                    </div>'
    }));
}(window.countlyVue = window.countlyVue || {}));