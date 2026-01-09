/* global Vue, countlyCommon, countlyGlobal, ElementPlus, jQuery, $ */

/**
 * Vue 3 Application Bootstrap
 * Initializes the Vue 3 application and manages the transition from Backbone
 * 
 * This file should be loaded after all Vue components are registered
 * and before Backbone.history.start()
 */
(function(countlyVue) {
    'use strict';

    var _vueApp = null;
    var _isVue3 = false;

    /**
     * Check if Vue 3 is available
     * @returns {boolean} True if Vue 3 is available
     */
    function detectVueVersion() {
        if (typeof Vue !== 'undefined') {
            _isVue3 = typeof Vue.createApp === 'function';
        }
        return _isVue3;
    }

    /**
     * Global Event Bus for Vue 3
     * Replaces Vue 2's instance-based $emit/$on
     */
    var EventBus = {
        _events: {},

        $on: function(event, callback) {
            if (!this._events[event]) {
                this._events[event] = [];
            }
            this._events[event].push(callback);
        },

        $off: function(event, callback) {
            if (!this._events[event]) {
                return;
            }

            if (!callback) {
                delete this._events[event];
            }
            else {
                var idx = this._events[event].indexOf(callback);
                if (idx > -1) {
                    this._events[event].splice(idx, 1);
                }
            }
        },

        $emit: function(event) {
            var args = Array.prototype.slice.call(arguments, 1);
            if (this._events[event]) {
                this._events[event].forEach(function(callback) {
                    callback.apply(null, args);
                });
            }
        }
    };

    /**
     * Vue 3 Plugin for Countly-specific functionality
     */
    var CountlyPlugin = {
        install: function(app) {
            // Add global properties
            app.config.globalProperties.$countly = {
                ACTIVE_APP_ID: countlyCommon.ACTIVE_APP_ID,
                apps: countlyGlobal.apps,
                member: countlyGlobal.member
            };

            // Add event bus
            app.config.globalProperties.$eventBus = EventBus;

            // Add i18n method
            app.config.globalProperties.$i18n = function(key) {
                return jQuery.i18n.map[key] || key;
            };

            // Global mixin for $listeners compatibility (Vue 2 -> Vue 3)
            // In Vue 3, $listeners is removed and merged into $attrs
            app.mixin({
                computed: {
                    $listeners: function() {
                        var attrs = this.$attrs || {};
                        var listeners = {};
                        for (var key in attrs) {
                            if (key.indexOf('on') === 0 && key.length > 2 && typeof attrs[key] === 'function') {
                                listeners[key] = attrs[key];
                            }
                        }
                        return listeners;
                    },
                    // In Vue 3, $scopedSlots is removed and merged into $slots
                    $scopedSlots: function() {
                        return this.$slots;
                    }
                }
            });

            // Global error handler
            app.config.errorHandler = function(err, vm, info) {
                console.error('Vue Error:', err, info); // eslint-disable-line
                if (countlyGlobal.tracking && window.Countly) {
                    window.Countly.log_error(err);
                }
            };

            // Global warning handler (development only)
            if (!window.production) {
                app.config.warnHandler = function(msg, vm, trace) {
                    console.warn('Vue Warning:', msg, trace); // eslint-disable-line
                };
            }
        }
    };

    /**
     * Create and configure the main Vue 3 application
     * @returns {Object} Vue application instance
     */
    function createCountlyApp() {
        if (!detectVueVersion()) {
            console.log('Vue 3 not detected, using Vue 2 compatibility mode'); // eslint-disable-line
            return null;
        }

        // Create the app
        _vueApp = Vue.createApp({
            name: 'CountlyApp',

            data: function() {
                return {
                    currentView: null,
                    isLoading: true,
                    error: null
                };
            },

            provide: function() {
                return {
                    eventBus: EventBus,
                    i18n: this.$i18n
                };
            },

            template: '<div id="countly-root">' +
                '<router-view v-slot="{ Component }">' +
                    '<transition name="fade" mode="out-in">' +
                        '<component :is="Component" />' +
                    '</transition>' +
                '</router-view>' +
            '</div>',

            created: function() {
                var self = this;

                // Listen for refresh events
                EventBus.$on('cly-refresh', function(payload) {
                    self.$emit('cly-refresh', payload);
                });

                // Listen for date changes
                EventBus.$on('cly-date-change', function() {
                    self.$emit('cly-date-change');
                });
            },

            mounted: function() {
                this.isLoading = false;
            }
        });

        // Install plugins
        _vueApp.use(CountlyPlugin);

        // Install Element Plus (Vue 3 version of Element UI)
        if (typeof ElementPlus !== 'undefined') {
            _vueApp.use(ElementPlus);
        }

        // Install Vuex store
        if (countlyVue.vuex && countlyVue.vuex.getGlobalStore) {
            var store = countlyVue.vuex.getGlobalStore();
            _vueApp.use(store);
        }

        // Install router if available
        if (countlyVue.router && countlyVue.router.getRouter) {
            var router = countlyVue.router.init();
            if (router) {
                _vueApp.use(router);
            }
        }

        return _vueApp;
    }

    /**
     * Register a global Vue component
     * @param {string} name - Component name
     * @param {Object} component - Component definition
     */
    function registerComponent(name, component) {
        if (_vueApp) {
            _vueApp.component(name, component);
        }
        else if (typeof Vue !== 'undefined' && Vue.component) {
            // Vue 2 fallback
            countlyVue.registerComponent(name, component);
        }
    }

    /**
     * Register a global Vue directive
     * @param {string} name - Directive name
     * @param {Object} directive - Directive definition
     */
    function registerDirective(name, directive) {
        if (_vueApp) {
            _vueApp.directive(name, directive);
        }
        else if (typeof Vue !== 'undefined' && Vue.directive) {
            // Vue 2 fallback
            Vue.directive(name, directive);
        }
    }

    /**
     * Mount the Vue application
     * @param {string|HTMLElement} selector - Mount point selector
     * @returns {Object|null} The mounted Vue app instance or null
     */
    function mount(selector) {
        selector = selector || '#vue-app';

        if (_vueApp && document.querySelector(selector)) {
            return _vueApp.mount(selector);
        }
        return null;
    }

    /**
     * Get the Vue application instance
     * @returns {Object|null} Vue app instance
     */
    function getApp() {
        return _vueApp;
    }

    /**
     * Emit a global event
     * @param {string} event - Event name
     * @param {*} payload - Event payload
     */
    function emit(event, payload) {
        EventBus.$emit(event, payload);
    }

    /**
     * Listen to a global event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     */
    function on(event, callback) {
        EventBus.$on(event, callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event handler to remove
     */
    function off(event, callback) {
        EventBus.$off(event, callback);
    }

    /**
     * Migration helper - wraps Vue 2 component for Vue 3 compatibility
     * @param {Object} component - Vue 2 component
     * @returns {Object} Vue 3 compatible component
     */
    function migrateComponent(component) {
        if (!_isVue3) {
            return component;
        }

        var migrated = Object.assign({}, component);

        // Handle destroyed -> unmounted
        if (migrated.destroyed && !migrated.unmounted) {
            migrated.unmounted = migrated.destroyed;
            delete migrated.destroyed;
        }

        // Handle beforeDestroy -> beforeUnmount
        if (migrated.beforeDestroy && !migrated.beforeUnmount) {
            migrated.beforeUnmount = migrated.beforeDestroy;
            delete migrated.beforeDestroy;
        }

        // Handle filters (deprecated in Vue 3)
        if (migrated.filters) {
            migrated.methods = migrated.methods || {};
            for (var filterName in migrated.filters) {
                if (!migrated.methods[filterName]) {
                    migrated.methods[filterName] = migrated.filters[filterName];
                }
            }
            delete migrated.filters;
        }

        return migrated;
    }

    // Export API
    countlyVue.app = {
        create: createCountlyApp,
        mount: mount,
        getApp: getApp,
        registerComponent: registerComponent,
        registerDirective: registerDirective,
        migrateComponent: migrateComponent,
        isVue3: function() {
            return _isVue3;
        },

        // Event system
        emit: emit,
        on: on,
        off: off,
        eventBus: EventBus
    };

    // Auto-initialize when DOM is ready
    $(document).ready(function() {
        // Check if Vue 3 is available
        detectVueVersion();

        // Create app but don't mount yet
        // Mounting happens after all components are registered
        if (_isVue3) {
            createCountlyApp();
        }
    });

}(window.countlyVue = window.countlyVue || {}));
