/* global Vue, ELEMENT, VeeValidate, inViewportMixin, VueCompositionAPI, VueECharts */

(function(countlyVue) {

    window.VTooltip.VTooltip.options.defaultClass = 'cly-vue-tooltip';
    window.VTooltip.VTooltip.options.defaultBoundariesElement = 'window';
    window.VTooltip.VTooltip.options.popover.defaultTrigger = 'hover';
    window.VTooltip.VTooltip.options.popover.defaultOffset = 14;
    window.VTooltip.VTooltip.options.popover.defaultBoundariesElement = 'window';
    window.VTooltip.VTooltip.options.popover.defaultClass = 'cly-vue-popover';
    window.VTooltip.VTooltip.options.popover.defaultInnerClass = 'cly-vue-popover__content';

    Vue.directive("click-outside", ELEMENT.utils.Clickoutside);

    Vue.use(VeeValidate);
    Vue.use(VueCompositionAPI);
    Vue.component('echarts', VueECharts);

    Vue.component('validation-provider', VeeValidate.ValidationProvider);
    Vue.component('validation-observer', VeeValidate.ValidationObserver);

    VeeValidate.extend('arrmin', {
        validate: function(value, args) {
            return value.length >= args.length;
        },
        params: ['length']
    });

    VeeValidate.extend('arrmax', {
        validate: function(value, args) {
            return value.length <= args.length;
        },
        params: ['length']
    });

    countlyVue.mixins.inViewport = inViewportMixin;

}(window.countlyVue = window.countlyVue || {}));
