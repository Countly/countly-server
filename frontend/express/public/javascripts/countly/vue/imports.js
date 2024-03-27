/* global Vue, ELEMENT, VeeValidate, inViewportMixin, VueCompositionAPI, VueECharts, VueClipboard */

(function(countlyVue) {

    window.VTooltip.VTooltip.options.defaultClass = 'cly-vue-tooltip';
    window.VTooltip.VTooltip.options.defaultBoundariesElement = 'body';
    window.VTooltip.VTooltip.options.popover.defaultTrigger = 'hover';
    window.VTooltip.VTooltip.options.popover.defaultOffset = 14;
    window.VTooltip.VTooltip.options.popover.defaultBoundariesElement = 'window';
    window.VTooltip.VTooltip.options.popover.defaultClass = 'cly-vue-popover';
    window.VTooltip.VTooltip.options.popover.defaultInnerClass = 'cly-vue-popover__content';
    window.VTooltip.VTooltip.options.defaultHtml = false;

    Vue.directive("click-outside", ELEMENT.utils.Clickoutside);
    Vue.use(VueClipboard);
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

    VeeValidate.extend('json', {
        validate: function(value) {
            try {
                JSON.parse(value);
                return true;
            }
            catch (error) {
                return false;
            }
        }
    });

    countlyVue.mixins.inViewport = inViewportMixin;

}(window.countlyVue = window.countlyVue || {}));
