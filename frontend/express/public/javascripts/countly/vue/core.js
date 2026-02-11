import jQuery from 'jquery';
import '../../utils/jquery.i18n.properties.js';
import Vue from 'vue';
import { logout, notify, T } from '../countly.helpers';
import { TemplateLoader } from '../countly.template.loader.js';
import countlyView from '../countly.view';
import countlyGlobal from '../countly.global';
import { BufferedObjectMixin, MultiStepFormMixin } from '../../components/form/mixins.js'; // TO-DO: remove this dependency when drawer form is modularized.
import { ModalMixin, hasDrawersMixin, hasDrawersMethodsMixin } from '../../components/drawer/mixins.js'; // TO-DO: remove this dependency when drawer form is modularized in plugins
import { hasFormDialogsMixin } from '../../components/dialog/mixins.js'; // TO-DO: remove this dependency when dialog form is modularized in plugins
import {
    validateCreate,
    validateRead,
    validateUpdate,
    validateDelete,
    validateGlobalAdmin
} from '../countly.auth';
import * as countlyVuex from './data/vuex.js';
import {
    getGlobalStore,
    registerGlobally,
    unregister,
    initAppSwitchCallback,
    getActiveAppId,
    incrementAndGetComponentId,
} from './data/store.js';
import { handleViewError } from './view-error-handler.js';

// Import utilities directly from utility modules
import {
    formatTimeAgoText,
    formatTimeAgo,
} from '../countly.common.formatters.js';
import {
    formatNumber,
    formatNumberSafe,
    getShortNumber,
    unescapeHtml,
} from '../countly.common.utils.js';

// Import config constants directly
import { GRAPH_COLORS, DEBUG } from '../countly.config.js';

// Import popup components
import {
    ClyGenericPopups,
    ClyQuickstartPopover
} from '../../components/popups/index.js';

import { ExternalZoomMixin, AnnotationCommandMixin } from '../../components/echart/mixins.js';

// @vue/component
export const autoRefreshMixin = {
    mounted: function() {
        if (this.refresh || this.dateChanged) {
            this.$root.$on("cly-refresh", this.refreshHandler);
        }
    },
    methods: {
        refreshHandler: function(payload) {
            var isForced = payload && payload.reason === "dateChange";
            if (isForced && this.dateChanged) {
                // branch to dateChange implementation if any
                this.dateChanged();
            }
            else if (this.refresh) {
                this.refresh(isForced);
            }
        }
    },
    beforeDestroy: function() {
        if (this.refresh || this.dateChanged) {
            this.$root.$off("cly-refresh", this.refreshHandler);
        }
    }
};

/**
 * i18n - internationalization function that works with multiple arguments
 * @returns {string} - Translated string or key if translation not found
 */
export function i18n() {
    var activeAppId = getActiveAppId();
    var appType = (countlyGlobal.apps[activeAppId] && countlyGlobal.apps[activeAppId].type) || "mobile";
    let args = arguments || [];
    if (args.length === 1) { //single arg. use map
        return i18nM(args[0]);
    }
    else if (!appType || appType === "mobile") {
        return jQuery.i18n.prop.apply(null, args);
    }
    else {
        var key = args[0];
        if (!jQuery.i18n.map[appType + "." + key]) {
            // Key miss
            return jQuery.i18n.prop.apply(null, args);
        }
        // Key hit
        var argsCopy = Array.prototype.slice.call(args);
        argsCopy[0] = appType + "." + key;
        return jQuery.i18n.prop.apply(null, argsCopy);
    }
}

/**
 * i18nM - internationalization function that works with keys only
 * @param {string} key - i18n key
 * @returns {string} - Translated string or key if translation not found
 */
export function i18nM(key) {
    var activeAppId = getActiveAppId();
    var appType = (countlyGlobal.apps[activeAppId] && countlyGlobal.apps[activeAppId].type) || "mobile";
    if (!appType || appType === "mobile") {
        return jQuery.i18n.map[key] || key;
    }
    else {
        return jQuery.i18n.map[appType + "." + key] || jQuery.i18n.map[key] || key;
    }
}

/**
 * ajax - Wrapper around jQuery.ajax to handle common error cases
 * @param {object} request - jQuery ajax request object
 * @param {object} options - Additional options
 * @param {boolean} options.disableAutoCatch - If true, automatic error handling is disabled
 * @returns {Promise} - Promise that resolves or rejects based on ajax call
 */
export function ajax(request, options) {
    options = options || {};
    var ajaxP = new Promise(function(resolve, reject) {
        jQuery.ajax(request).done(resolve).fail(reject);
    });
    if (!options.disableAutoCatch) {
        return ajaxP.catch(function(jqXHR) {
            if (jqXHR.responseJSON && jqXHR.responseJSON.result === 'Token not valid') {
                logout();
            }
            if (jqXHR.abort_reason === "duplicate" || (jqXHR.statusText !== "abort" && jqXHR.statusText !== "canceled")) {
                handleViewError(jqXHR);
            }
        });
    }
    return ajaxP;
}

/**
* This function returns an authentication mixin object for a given feature or array of features.
* @param {string|array} featureName - The name of the feature(s) to create the authentication mixin for
* @returns {object} - Returns an object containing computed properties for authentication.
*/
export const authMixin = function(featureName) {
    if (!Array.isArray(featureName)) {
        featureName = [featureName];
    }
    var checkAuthArray = function(func) {
        for (var i = 0; i < featureName.length; i++) {
            if (func(featureName[i])) {
                return true;
            }
        }
        return false;
    };
    return {
        // uses computed mainly to prevent mutations of these values
        // using helper function checkAuthArray to act as a 'or' returns true if atleast one feature is validated else false
        computed: {
            canUserCreate: function() {
                return checkAuthArray(validateCreate);
            },
            canUserRead: function() {
                return checkAuthArray(validateRead);
            },
            canUserUpdate: function() {
                return checkAuthArray(validateUpdate);
            },
            canUserDelete: function() {
                return checkAuthArray(validateDelete);
            },
            isUserGlobalAdmin: function() {
                return validateGlobalAdmin();
            }
        }
    };
};

// @vue/component
export const i18nMixin = { methods: { i18n, i18nM } };

// @vue/component
export const commonFormattersMixin = {
    methods: {
        parseTimeAgo: formatTimeAgoText,
        formatTimeAgo: formatTimeAgo,
        formatNumber: formatNumber,
        formatNumberSafe: formatNumberSafe,
        getShortNumber: getShortNumber,
        unescapeHtml: unescapeHtml
    }
};

// @vue/component
export const refreshOnParentActiveMixin = {
    watch: {
        isParentActive: function(newState) {
            if (newState) {
                this.refresh();
            }
        }
    },
    methods: {
        refresh: function() {}
    }
};

export const optionalComponent = function(componentId) {
    if (componentId in Vue.options.components) {
        return componentId;
    }
    return null;
};

export const basicComponentUtilsMixin = {
    methods: {
        optionalComponent: optionalComponent
    }
};

export const DashboardsAppsMixin = {
    computed: {
        __allApps: function() {
            return this.$store.getters["countlyDashboards/allApps"];
        }
    },
    methods: {
        __getAppName: function(appId) {
            if (this.__allApps && this.__allApps[appId] && this.__allApps[appId].name) {
                return this.__allApps[appId].name;
            }
            else {
                return "Deleted";
            }
        },
        __getAppLogo: function(appId) {
            if (this.__allApps && this.__allApps[appId] && this.__allApps[appId].image) {
                return this.__allApps[appId].image;
            }
            else {
                return 'appimages/' + appId + '.png';
            }
        }
    }
};

export const DashboardsWidgetMixin = {
    methods: {
        calculateTableDataFromWidget: function(widgetData) {
            widgetData = widgetData || {};
            var dd = widgetData.dashData || {};
            dd = dd.data || {};

            var keys1 = Object.keys(dd);
            if (keys1.length > 0) {
                dd = dd[keys1[0]];
            }
            var tableData = [];
            for (var k = 0; k < dd.rows.length; k++) {
                var ob = {};
                for (var z = 0; z < dd.cols.length; z++) {
                    ob[dd.cols[z]] = dd.rows[k][z];
                }
                tableData.push(ob);
            }
            return tableData;
        },
        calculateTableColsFromWidget: function(widgetData, namingMap) {
            widgetData = widgetData || {};
            widgetData.metrics = widgetData.metrics || [];

            var dd = widgetData.dashData || {};
            dd = dd.data || {};

            var keys1 = Object.keys(dd);
            if (keys1.length > 0) {
                dd = dd[keys1[0]];
            }
            var fields = [];
            for (var k = 0; k < dd.cols.length; k++) {
                if (k > 0) {
                    if (widgetData.metrics.indexOf(dd.cols[k]) > -1) {
                        fields.push({"prop": dd.cols[k], "title": namingMap[dd.cols[k]], "type": "number"});
                    }
                }
                else {
                    fields.push({"prop": dd.cols[k], "title": namingMap[dd.cols[k]] || "name"}); //first one in "name"
                }
            }
            return fields;
        },
        calculateStackedBarOptionsFromWidget: function(widgetData, map) {
            widgetData = widgetData || {};
            widgetData.dashData = widgetData.dashData || {};
            widgetData.dashData.data = widgetData.dashData.data || {};
            widgetData.metrics = widgetData.metrics || [];

            var labels = [];
            var series = [];
            for (var app in widgetData.dashData.data) {
                if (widgetData.dashData.data[app].graph) {
                    for (var k = 0; k < widgetData.dashData.data[app].graph.length; k++) {
                        labels.push(widgetData.dashData.data[app].graph[k].name);
                        series.push(widgetData.dashData.data[app].graph[k].value);
                    }
                }
                else {
                    for (var kz = 0; kz < widgetData.dashData.data[app].length; kz++) {
                        labels.push(widgetData.dashData.data[app][kz].name);
                        series.push(widgetData.dashData.data[app][kz].value);
                    }
                }
            }
            var metricName = widgetData.metrics[0];
            if (map && map[widgetData.metrics[0]]) {
                metricName = map[widgetData.metrics[0]];
            }
            if (widgetData.bar_color && widgetData.bar_color > 0) {
                return {xAxis: {data: labels}, series: [{"name": metricName, color: GRAPH_COLORS[this.data.bar_color - 1], "data": series, stack: "A"}]};
            }
            else {
                return {xAxis: {data: labels}, series: [{"name": metricName, "data": series, stack: "A"}]};
            }
        },
        calculateStackedBarTimeSeriesOptionsFromWidget: function(widgetData) {
            widgetData = widgetData || {};
            widgetData.dashData = widgetData.dashData || {};
            widgetData.dashData.data = widgetData.dashData.data || {};
            widgetData.metrics = widgetData.metrics || [];

            for (var app in widgetData.dashData.data) {
                return widgetData.dashData.data[app];
            }
        },
        calculatePieGraphFromWidget: function(widgetData, namingMap) {
            widgetData = widgetData || {};
            widgetData.metrics = widgetData.metrics || [];
            var dd = widgetData.dashData || {};
            dd = dd.data || {};

            if (widgetData.apps && widgetData.apps[0]) {
                dd = dd[widgetData.apps[0]] || {};
            }
            var metric = widgetData.metrics[0];
            var total = 0;
            if (dd.total && dd.total[metric]) {
                total = dd.total[metric];
            }
            return {
                series: [
                    {
                        name: namingMap[metric],
                        data: dd.graph,
                        label: {
                            formatter: "{a|" + namingMap[metric] + "}\n" + (getShortNumber(total) || 0),
                            fontWeight: 500,
                            fontSize: 16,
                            fontFamily: "Inter",
                            lineHeight: 24,
                            rich: {
                                a: {
                                    fontWeight: "normal",
                                    fontSize: 14,
                                    lineHeight: 16
                                }
                            }
                        }
                    }
                ]
            };
        },
        calculateNumberFromWidget: function(widgetData) {
            widgetData = widgetData || {};
            widgetData.dashData = widgetData.dashData || {};
            var value;
            widgetData.dashData.data = widgetData.dashData.data || {};
            for (var app in widgetData.dashData.data) {
                value = widgetData.dashData.data[app];
            }
            return value;
        }
    }
};

export const DashboardsGlobalMixin = {
    props: {
        data: {
            type: Object,
            default: function() {
                return {};
            }
        },
        isAllowed: {
            type: Boolean,
            default: true
        },
        loading: {
            type: Boolean,
            default: true
        }
    }
};

export const mixins = {
    'autoRefresh': autoRefreshMixin,
    'refreshOnParentActive': refreshOnParentActiveMixin,
    'i18n': i18nMixin,
    'commonFormatters': commonFormattersMixin,
    'auth': authMixin,
    'basicComponentUtils': basicComponentUtilsMixin,
    'customDashboards': {
        apps: DashboardsAppsMixin,
        widget: DashboardsWidgetMixin,
        global: DashboardsGlobalMixin
    },
    'BufferedObject': BufferedObjectMixin, // TO-DO: remove this dependency when drawer form is modularized.
    'MultiStepForm': MultiStepFormMixin, // TO-DO: remove this dependency when drawer form is modularized.
    'Modal': ModalMixin, // TO-DO: remove this dependency when drawer form is modularized.
    'hasDrawers': hasDrawersMixin, // TO-DO: remove this dependency when drawer form is modularized.
    'hasDrawersMethods': hasDrawersMethodsMixin, // TO-DO: remove this dependency when drawer form is modularized.
    'hasFormDialogs': hasFormDialogsMixin, // TO-DO: remove this dependency when dialog form is modularized in plugins.
    'zoom': ExternalZoomMixin, // TODO: remove this dependency when echart components are modularized in plugins.
    'graphNotesCommand': AnnotationCommandMixin, // TODO: remove this dependency when echart components are modularized in plugins.
};

// Initialize app switch callback when DOM is ready
jQuery(document).ready(function() {
    initAppSwitchCallback();
});

// Re-export store functions for backward compatibility
export { getGlobalStore, registerGlobally, unregister };

export const vuex = {
    getGlobalStore: getGlobalStore,
    registerGlobally: registerGlobally,
    unregister: unregister,
    ...countlyVuex
};

export const BackboneRouteAdapter = function() {};

Vue.prototype.$route = new BackboneRouteAdapter();
Vue.prototype.$i18n = i18n;

// TemplateLoader is now imported from '../countly.template.loader.js'
export { TemplateLoader };

// TODO: CHECK IF WE NEED VUEX LOADER ANYMORE - we might be able to directly register modules in the view and remove this abstraction layer
export const VuexLoader = function(vuexModules) {
    this.vuex = vuexModules;
    this.loadedModules = [];
};

VuexLoader.prototype.load = function() {
    var self = this;
    this.vuex.forEach(function(item) {
        if (item.clyModel && typeof item.clyModel.getVuexModule === "function") {
            var module = item.clyModel.getVuexModule();
            vuex.registerGlobally(module);
            self.loadedModules.push(module);
        }
    });
};

VuexLoader.prototype.destroy = function() {
    var self = this;
    this.loadedModules.forEach(function(mid, index) {
        if (mid.destroy !== false) {
            vuex.unregister(mid.name);
            self.loadedModules.splice(index, 1);
        }
    });
};

// Re-export popup components for backward compatibility
export { ClyGenericPopups as GenericPopupsView };
export { ClyQuickstartPopover as QuickstartPopoverView };

export const countlyVueWrapperView = countlyView.extend({
    constructor: function(opts) {
        this.component = opts.component;
        this.defaultArgs = opts.defaultArgs;
        this.vuex = opts.vuex;
        this.templates = opts.templates;
        this.templateLoader = new TemplateLoader(this.templates);
        this.vuexLoader = new VuexLoader(this.vuex);
    },
    beforeRender: function() {
        return this.templateLoader.load();
    },
    renderCommon: function(isRefresh) {
        if (!isRefresh) {
            jQuery(this.el).html("<div><div class='vue-wrapper'></div><div id='vue-templates'></div></div>");
            jQuery("body").addClass("cly-vue-theme-clydef");
            this.templateLoader.mount();
        }
    },
    refresh: function() {
        var self = this;
        if (self.vm) {
            self.vm.$root.$emit("cly-refresh", {reason: "periodical"}); // for 10 sec interval
        }
    },
    onError: function(message) {
        if (this.vm) {
            this.vm.$root.$emit("cly-error", {message: message});
        }
    },
    afterRender: function() {
        var el = jQuery(this.el).find('.vue-wrapper').get(0),
            self = this;

        if (self.vuex) {
            self.vuexLoader.load();
        }
        self.vm = new Vue({
            el: el,
            store: getGlobalStore(),
            components: {
                MainView: self.component,
                GenericPopups: ClyGenericPopups,
                QuickstartPopover: ClyQuickstartPopover
            },
            template: '<div>\
                            <MainView></MainView>\
                            <GenericPopups></GenericPopups>\
                            <QuickstartPopover></QuickstartPopover>\
                        </div>',
            beforeCreate: function() {
                this.$route.params = self.params;
            },
            methods: {
                handleClyError: function(payload) {
                    if (DEBUG) {
                        notify({
                            title: i18n("common.error"),
                            message: payload.message,
                            type: "error"
                        });
                    }
                },
                handleClyRefresh: function() {
                    this.$root.$emit("cly-refresh", {reason: "dateChange"});
                }
            },
            created: function() {
                this.$on("cly-date-change", this.handleClyRefresh);
                this.$on("cly-error", this.handleClyError);
            }
        });
    },
    destroy: function() {
        var self = this;
        this.templateLoader.destroy();
        if (self.vm) {
            jQuery("body").removeClass("cly-vue-theme-clydef");
            self.vm.$destroy();
            self.vm.$off();
            jQuery(self.vm.$el).remove();
            self.vm = null;
        }
        this.vuexLoader.destroy();
    }
});

export const countlyBaseComponent = Vue.extend({
    mixins: [
        basicComponentUtilsMixin
    ],
    computed: {
        componentId: function() {
            return "cly-cmp-" + this.ucid;
        }
    },
    beforeCreate: function() {
        this.ucid = incrementAndGetComponentId().toString();
    }
});

export const countlyBaseView = countlyBaseComponent.extend(
    // @vue/component
    {
        mixins: [
            mixins.autoRefresh,
            mixins.i18n,
            mixins.commonFormatters
        ],
        props: {
            name: { type: String, default: null},
            id: { type: String, default: null }
        },
        computed: {
            isParentActive: function() {
                return this.$parent.isActive !== false;
            },
            vName: function() {
                return this.name;
            },
            vId: function() {
                return this.id;
            }
        }
    }
);

export const BaseContentMixin = countlyBaseComponent.extend(
    // @vue/component
    {
        inheritAttrs: false,
        mixins: [
            mixins.i18n
        ],
        props: {
            name: { type: String, default: null},
            id: { type: String, default: null },
            alwaysMounted: { type: Boolean, default: true },
            alwaysActive: { type: Boolean, default: false },
            role: { type: String, default: "default" }
        },
        data: function() {
            return {
                isContent: true
            };
        },
        computed: {
            isActive: function() {
                return this.alwaysActive || (this.role === "default" && this.$parent.activeContentId === this.id);
            },
            tName: function() {
                return this.name;
            },
            tId: function() {
                return this.id;
            },
            elementId: function() {
                return this.componentId + "-" + this.id;
            }
        }
    }
);

// Add BaseContent to mixins
mixins.BaseContent = BaseContentMixin;

export const templateUtil = {
    stage: function(fileName) {
        return {
            fileName: fileName
        };
    },
    load: function(fileName) {
        return new Promise(function(resolve) {
            T.get(fileName, function(src) {
                resolve(src);
            });
            /*
                // eslint-disable-next-line no-console
                console.log("Async component template load error:", err);
                resolve(opts.component);
            */
        });
    }
};

export const asyncCreate = function(base) {
    return function(opts, baseOverride) {
        var finalBase = baseOverride || base;
        if (typeof opts.template === "string") {
            return finalBase.extend(opts);
        }
        return function() {
            return templateUtil.load(opts.template.fileName).then(function(template) {
                opts.template = template;
                return finalBase.extend(opts);
            });
        };
    };
};

export const components = {
    BaseComponent: countlyBaseComponent,
    create: asyncCreate(countlyBaseComponent)
};

export const views = {
    BackboneWrapper: countlyVueWrapperView,
    BaseView: countlyBaseView,
    create: asyncCreate(countlyBaseView)
};

// Default export for backwards compatibility
const countlyVue = {
    i18n,
    i18nM,
    mixins,
    views,
    components,
    vuex,
    T: templateUtil.stage,
    optionalComponent,
    $: { ajax },
};

export default countlyVue;