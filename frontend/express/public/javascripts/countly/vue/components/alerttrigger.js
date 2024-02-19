/* global Vue, ELEMENT, moment, countlyCommon, _, CV */
(function(countlyVue) {
    var _mixins = countlyVue.mixins;
    Vue.component("cly-alert-trigger", countlyVue.components.create({
        mixins: [
            _mixins.i18n
        ],
        props: {
            metric: {
                type: Object,
                default: () => ({
                    metricPreText: "Send alert if",
                    metricPostText: "is",
                    metrics: []
                })
            },
            variables: {
                type: Array,
                default: () => ([])
            },
            timeOptions: {
                type: Array,
                default: () => ([])
            }
        },
        data: function() {
            return {
                selectedMetric: null,
                selectedVariable: null,
                alertValue: null,
                selectedTime: null,
                metricPreText: this.metric.metricPreText,
                metricPostText: this.metric.metricPostText,
                showVariable: true,
                valueType: 'percentage',
                showValue: true,
                showTime: true,
                timeOptions: null
            };
        },
        computed: {
            variableText: function() {
                const selectedVariable = this.variables.find(variable => variable.value === this.selectedVariable);
                return selectedVariable ? selectedVariable.text : '';
            }
        },
        watch: {
            selectedMetric: function(newMetric) {
                const selectedMetricItem = this.metric.metrics.find(metricItem => metricItem.value === newMetric);
                this.metricPreText = selectedMetricItem.metricPreText || this.metric.metricPreText;
                this.metricPostText = selectedMetricItem.metricPostText || this.metric.metricPostText;
                this.showVariable = selectedMetricItem.showVariable !== undefined ? selectedMetricItem.showVariable : true;
                this.$emit('selectedMetricChanged', newMetric);
            },
            selectedVariable: function(newVariable) {
                const selectedVariableItem = this.variables.find(variableItem => variableItem.value === newVariable);
                this.valueType = selectedVariableItem.valueType || 'percentage';
                this.showValue = selectedVariableItem.showValue !== undefined ? selectedVariableItem.showValue : true;
                this.showTime = selectedVariableItem.showTime !== undefined ? selectedVariableItem.showTime : true;
            }
        },
        template: CV.T('/javascripts/countly/vue/templates/alerttrigger.html'),
    }));


});