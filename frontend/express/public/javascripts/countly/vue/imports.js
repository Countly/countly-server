/* global Vue, ELEMENT, VeeValidate, inViewportMixin, VueCompositionAPI, VueECharts, VueClipboard */

(function(countlyVue) {

    var compat = countlyVue.compat || {};
    var IS_VUE_3 = compat.IS_VUE_3 || false;

    window.VTooltip.VTooltip.options.defaultClass = 'cly-vue-tooltip';
    window.VTooltip.VTooltip.options.defaultBoundariesElement = 'body';
    window.VTooltip.VTooltip.options.popover.defaultTrigger = 'hover';
    window.VTooltip.VTooltip.options.popover.defaultOffset = 14;
    window.VTooltip.VTooltip.options.popover.defaultBoundariesElement = 'window';
    window.VTooltip.VTooltip.options.popover.defaultClass = 'cly-vue-popover';
    window.VTooltip.VTooltip.options.popover.defaultInnerClass = 'cly-vue-popover__content';
    window.VTooltip.VTooltip.options.defaultHtml = false;

    if (IS_VUE_3) {
        // Vue 3: Store plugins and components for app registration
        // These will be registered when the app is created
        countlyVue._pendingPlugins = countlyVue._pendingPlugins || [];
        countlyVue._pendingComponents = countlyVue._pendingComponents || {};
        countlyVue._pendingDirectives = countlyVue._pendingDirectives || {};

        // Queue plugins for later registration
        if (typeof VueClipboard !== 'undefined') {
            countlyVue._pendingPlugins.push(VueClipboard);
        }
        if (typeof VeeValidate !== 'undefined') {
            countlyVue._pendingPlugins.push(VeeValidate);
        }

        // Queue components
        if (typeof VueECharts !== 'undefined') {
            countlyVue._pendingComponents.echarts = VueECharts;
        }
        if (typeof VeeValidate !== 'undefined') {
            countlyVue._pendingComponents['validation-provider'] = VeeValidate.ValidationProvider;
            countlyVue._pendingComponents['validation-observer'] = VeeValidate.ValidationObserver;
        }

        // Queue directives
        if (typeof ELEMENT !== 'undefined' && ELEMENT.utils && ELEMENT.utils.Clickoutside) {
            countlyVue._pendingDirectives['click-outside'] = ELEMENT.utils.Clickoutside;
        }
    }
    else {
        // Vue 2: Register immediately
        Vue.directive("click-outside", ELEMENT.utils.Clickoutside);
        Vue.use(VueClipboard);
        Vue.use(VeeValidate);
        Vue.use(VueCompositionAPI);
        Vue.component('echarts', VueECharts);

        Vue.component('validation-provider', VeeValidate.ValidationProvider);
        Vue.component('validation-observer', VeeValidate.ValidationObserver);
    }

    // VeeValidate extensions work in both versions
    if (typeof VeeValidate !== 'undefined' && VeeValidate.extend) {
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
    }

    countlyVue.mixins.inViewport = inViewportMixin;

}(window.countlyVue = window.countlyVue || {}));
