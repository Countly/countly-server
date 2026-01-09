/* global Vue, Vuex, countlyCommon */

/**
 * Vue Version Compatibility Layer
 * 
 * Provides unified APIs that work with both Vue 2 and Vue 3.
 * This file should be loaded after Vue but before vue/core.js
 */
(function(countlyVue) {

    /**
     * Detect Vue major version
     * @returns {number} 2 or 3
     */
    function detectVueVersion() {
        if (typeof Vue === 'undefined') {
            return 2; // Default assumption
        }

        if (Vue.version) {
            return parseInt(Vue.version.split('.')[0], 10);
        }

        // Vue 3 has createApp, Vue 2 doesn't
        if (typeof Vue.createApp === 'function') {
            return 3;
        }

        return 2;
    }

    var VUE_VERSION = detectVueVersion();
    var IS_VUE_3 = VUE_VERSION >= 3;

    /**
     * Event Bus for Vue 3 (replaces $root.$on/$emit/$off)
     * In Vue 2, we can use root instance. In Vue 3, we need a separate event bus.
     */
    var EventBus = (function() {
        var events = {};

        return {
            $on: function(event, callback) {
                if (!events[event]) {
                    events[event] = [];
                }
                events[event].push(callback);
            },
            $off: function(event, callback) {
                if (!events[event]) {
                    return;
                }
                if (callback) {
                    var idx = events[event].indexOf(callback);
                    if (idx > -1) {
                        events[event].splice(idx, 1);
                    }
                }
                else {
                    events[event] = [];
                }
            },
            $emit: function(event) {
                if (!events[event]) {
                    return;
                }
                var args = Array.prototype.slice.call(arguments, 1);
                events[event].forEach(function(callback) {
                    callback.apply(null, args);
                });
            },
            _events: events
        };
    })();

    /**
     * Create a Vue application/instance (works with both Vue 2 and Vue 3)
     * @param {Object} options - Vue options
     * @param {HTMLElement} el - Mount element (optional for Vue 3)
     * @returns {Object} Vue instance or app
     */
    function createVueInstance(options, el) {
        if (IS_VUE_3) {
            // Vue 3: use createApp
            var app = Vue.createApp(options);

            // Install Vuex store if provided
            if (options.store) {
                app.use(options.store);
            }

            // Mount if element provided
            if (el) {
                return app.mount(el);
            }

            return app;
        }
        else {
            // Vue 2: use new Vue()
            if (el) {
                options.el = el;
            }
            return new Vue(options);
        }
    }

    /**
     * Destroy a Vue instance (works with both Vue 2 and Vue 3)
     * @param {Object} instance - Vue instance
     */
    function destroyVueInstance(instance) {
        if (!instance) {
            return;
        }

        if (IS_VUE_3) {
            // Vue 3: unmount the app
            if (instance.unmount) {
                instance.unmount();
            }
            else if (instance.$.appContext && instance.$.appContext.app) {
                instance.$.appContext.app.unmount();
            }
        }
        else {
            // Vue 2: $destroy
            if (instance.$destroy) {
                instance.$destroy();
            }
            if (instance.$off) {
                instance.$off();
            }
        }
    }

    /**
     * Extend a component (works with both Vue 2 and Vue 3)
     * @param {Object} baseComponent - Base component options
     * @param {Object} extendWith - Extension options
     * @returns {Object} Extended component
     */
    function extendComponent(baseComponent, extendWith) {
        if (IS_VUE_3) {
            // Vue 3: merge objects manually
            var result = Object.assign({}, baseComponent);

            if (extendWith) {
                // Merge mixins
                if (extendWith.mixins) {
                    result.mixins = (result.mixins || []).concat(extendWith.mixins);
                }

                // Merge computed
                if (extendWith.computed) {
                    result.computed = Object.assign({}, result.computed, extendWith.computed);
                }

                // Merge methods
                if (extendWith.methods) {
                    result.methods = Object.assign({}, result.methods, extendWith.methods);
                }

                // Merge data
                if (extendWith.data) {
                    var baseData = result.data;
                    var extendData = extendWith.data;
                    result.data = function() {
                        var base = typeof baseData === 'function' ? baseData.call(this) : (baseData || {});
                        var ext = typeof extendData === 'function' ? extendData.call(this) : (extendData || {});
                        return Object.assign({}, base, ext);
                    };
                }

                // Copy other properties
                Object.keys(extendWith).forEach(function(key) {
                    if (['mixins', 'computed', 'methods', 'data'].indexOf(key) === -1) {
                        result[key] = extendWith[key];
                    }
                });
            }

            return result;
        }
        else {
            // Vue 2: use Vue.extend
            var base = typeof baseComponent === 'function' ? baseComponent : Vue.extend(baseComponent);
            return base.extend(extendWith || {});
        }
    }

    /**
     * Create a Vuex store (works with both Vuex 3 and Vuex 4)
     * @param {Object} options - Store options
     * @returns {Object} Vuex store
     */
    function createStore(options) {
        if (IS_VUE_3 && Vuex.createStore) {
            // Vuex 4
            return Vuex.createStore(options);
        }
        else {
            // Vuex 3
            return new Vuex.Store(options);
        }
    }

    /**
     * Get lifecycle hook names based on Vue version
     * Vue 3 renamed some hooks
     */
    var lifecycleHooks = {
        beforeDestroy: IS_VUE_3 ? 'beforeUnmount' : 'beforeDestroy',
        destroyed: IS_VUE_3 ? 'unmounted' : 'destroyed'
    };

    /**
     * Auto-refresh mixin that works with both Vue 2 and Vue 3
     * Uses EventBus for Vue 3, $root for Vue 2
     */
    var autoRefreshMixin = (function() {
        var mixin = {
            mounted: function() {
                if (this.refresh || this.dateChanged) {
                    if (IS_VUE_3) {
                        EventBus.$on("cly-refresh", this._clyRefreshHandler);
                    }
                    else {
                        this.$root.$on("cly-refresh", this._clyRefreshHandler);
                    }
                }
            },
            created: function() {
                var self = this;
                this._clyRefreshHandler = function(payload) {
                    var isForced = payload && payload.reason === "dateChange";
                    if (isForced && self.dateChanged) {
                        self.dateChanged();
                    }
                    else if (self.refresh) {
                        self.refresh(isForced);
                    }
                };
            },
            methods: {}
        };

        // Add cleanup based on Vue version
        if (IS_VUE_3) {
            mixin.beforeUnmount = function() {
                if (this.refresh || this.dateChanged) {
                    EventBus.$off("cly-refresh", this._clyRefreshHandler);
                }
            };
        }
        else {
            mixin.beforeDestroy = function() {
                if (this.refresh || this.dateChanged) {
                    this.$root.$off("cly-refresh", this._clyRefreshHandler);
                }
            };
        }

        return mixin;
    })();

    /**
     * Emit a global event (works with both Vue 2 and Vue 3)
     * @param {Object} vm - Vue instance (used for $root in Vue 2)
     * @param {string} event - Event name
     * @param {*} payload - Event payload
     */
    function emitGlobalEvent(vm, event, payload) {
        if (IS_VUE_3) {
            EventBus.$emit(event, payload);
        }
        else if (vm && vm.$root) {
            vm.$root.$emit(event, payload);
        }
    }

    /**
     * Subscribe to a global event (works with both Vue 2 and Vue 3)
     * @param {Object} vm - Vue instance
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    function onGlobalEvent(vm, event, handler) {
        if (IS_VUE_3) {
            EventBus.$on(event, handler);
        }
        else if (vm && vm.$root) {
            vm.$root.$on(event, handler);
        }
    }

    /**
     * Unsubscribe from a global event (works with both Vue 2 and Vue 3)
     * @param {Object} vm - Vue instance
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    function offGlobalEvent(vm, event, handler) {
        if (IS_VUE_3) {
            EventBus.$off(event, handler);
        }
        else if (vm && vm.$root) {
            vm.$root.$off(event, handler);
        }
    }

    /**
     * Get listeners for component (Vue 2/3 compatible)
     * In Vue 3, listeners are merged into $attrs
     * @param {Object} vm - Vue instance
     * @returns {Object} Listeners object
     */
    function getListeners(vm) {
        if (IS_VUE_3) {
            // In Vue 3, extract event handlers from $attrs
            var listeners = {};
            if (vm.$attrs) {
                Object.keys(vm.$attrs).forEach(function(key) {
                    if (key.indexOf('on') === 0 && typeof vm.$attrs[key] === 'function') {
                        // Convert onEventName to eventName
                        var eventName = key.charAt(2).toLowerCase() + key.slice(3);
                        listeners[eventName] = vm.$attrs[key];
                    }
                });
            }
            return listeners;
        }
        else {
            return vm.$listeners || {};
        }
    }

    /**
     * Mixin to provide $listeners in Vue 3
     * Use this mixin in components that need to access $listeners
     */
    var listenersMixin = {
        computed: {
            $_listeners: function() {
                return getListeners(this);
            }
        }
    };

    /**
     * Global mixin to provide $listeners compatibility in Vue 3
     * This adds a computed $listeners property that extracts event handlers from $attrs
     */
    var listenersCompatMixin = {
        computed: {
            $listeners: function() {
                // In Vue 3, extract event handlers from $attrs
                var listeners = {};
                var attrs = this.$attrs || {};
                Object.keys(attrs).forEach(function(key) {
                    if (key.indexOf('on') === 0 && typeof attrs[key] === 'function') {
                        // Convert onEventName to eventName for v-on compatibility
                        var eventName = key.charAt(2).toLowerCase() + key.slice(3);
                        listeners[eventName] = attrs[key];
                    }
                });
                return listeners;
            }
        }
    };

    /**
     * Vue.set compatibility function
     * In Vue 3, reactivity is handled automatically, so we just do direct assignment.
     * In Vue 2, we use Vue.set for adding reactive properties.
     * @param {Object|Array} target - Target object or array
     * @param {string|number} key - Property key or array index
     * @param {*} value - Value to set
     * @returns {*} The value that was set
     */
    function set(target, key, value) {
        if (IS_VUE_3) {
            // Vue 3: Direct assignment works due to Proxy-based reactivity
            target[key] = value;
            return value;
        }
        else {
            // Vue 2: Use Vue.set for reactivity
            return Vue.set(target, key, value);
        }
    }

    /**
     * Vue.delete compatibility function
     * In Vue 3, reactivity is handled automatically, so we just use delete.
     * In Vue 2, we use Vue.delete for reactive deletion.
     * @param {Object|Array} target - Target object or array
     * @param {string|number} key - Property key or array index
     */
    function del(target, key) {
        if (IS_VUE_3) {
            // Vue 3: Direct delete works due to Proxy-based reactivity
            if (Array.isArray(target)) {
                target.splice(key, 1);
            }
            else {
                delete target[key];
            }
        }
        else {
            // Vue 2: Use Vue.delete for reactivity
            Vue.delete(target, key);
        }
    }

    /**
     * Global mixin to provide $scopedSlots compatibility in Vue 3
     * In Vue 3, $scopedSlots is removed and merged into $slots
     * This mixin provides a computed $scopedSlots that maps to $slots
     */
    var scopedSlotsCompatMixin = {
        computed: {
            $scopedSlots: function() {
                // In Vue 3, $slots contains both scoped and regular slots
                return this.$slots;
            }
        }
    };

    /**
     * Register a component globally (works with both Vue 2 and Vue 3)
     * In Vue 3, components are queued for app registration
     * @param {string} name - Component name
     * @param {Object} component - Component definition
     */
    function registerComponent(name, component) {
        if (IS_VUE_3) {
            // Vue 3: Queue for later registration on app
            countlyVue._pendingComponents = countlyVue._pendingComponents || {};
            countlyVue._pendingComponents[name] = component;
        }
        else {
            // Vue 2: Register immediately on global Vue
            Vue.component(name, component);
        }
    }

    /**
     * Register a directive globally (works with both Vue 2 and Vue 3)
     * In Vue 3, directives are queued for app registration
     * @param {string} name - Directive name
     * @param {Object} directive - Directive definition
     */
    function registerDirective(name, directive) {
        if (IS_VUE_3) {
            // Vue 3: Queue for later registration on app
            countlyVue._pendingDirectives = countlyVue._pendingDirectives || {};
            countlyVue._pendingDirectives[name] = directive;
        }
        else {
            // Vue 2: Register immediately on global Vue
            Vue.directive(name, directive);
        }
    }

    /**
     * Register a plugin globally (works with both Vue 2 and Vue 3)
     * In Vue 3, plugins are queued for app registration with app.use()
     * @param {Object} plugin - Plugin to register
     * @param {Object} options - Optional plugin options
     */
    function registerPlugin(plugin, options) {
        if (IS_VUE_3) {
            // Vue 3: Queue for later registration on app
            countlyVue._pendingPlugins = countlyVue._pendingPlugins || [];
            countlyVue._pendingPlugins.push({ plugin: plugin, options: options });
        }
        else {
            // Vue 2: Register immediately on global Vue
            if (options) {
                Vue.use(plugin, options);
            }
            else {
                Vue.use(plugin);
            }
        }
    }

    // Export compatibility utilities
    countlyVue.compat = {
        VUE_VERSION: VUE_VERSION,
        IS_VUE_3: IS_VUE_3,
        EventBus: EventBus,
        createVueInstance: createVueInstance,
        destroyVueInstance: destroyVueInstance,
        extendComponent: extendComponent,
        createStore: createStore,
        lifecycleHooks: lifecycleHooks,
        autoRefreshMixin: autoRefreshMixin,
        emitGlobalEvent: emitGlobalEvent,
        onGlobalEvent: onGlobalEvent,
        offGlobalEvent: offGlobalEvent,
        getListeners: getListeners,
        listenersMixin: listenersMixin,
        listenersCompatMixin: listenersCompatMixin,
        scopedSlotsCompatMixin: scopedSlotsCompatMixin,
        registerComponent: registerComponent,
        registerDirective: registerDirective,
        registerPlugin: registerPlugin,
        set: set,
        del: del
    };

    // Expose convenience methods at countlyVue level
    countlyVue.registerComponent = registerComponent;
    countlyVue.registerDirective = registerDirective;
    countlyVue.registerPlugin = registerPlugin;

    // Also expose set/del at the countlyVue level for easy access (replaces Vue.set/Vue.delete)
    countlyVue.set = set;
    countlyVue.del = del;

    // Also expose EventBus at the countlyVue level for easy access
    countlyVue.EventBus = EventBus;

    // Log version info in debug mode
    if (typeof countlyCommon !== 'undefined' && countlyCommon.DEBUG) {
        console.log('[countlyVue.compat] Vue version:', VUE_VERSION, IS_VUE_3 ? '(Vue 3 mode)' : '(Vue 2 mode)'); // eslint-disable-line
    }

}(window.countlyVue = window.countlyVue || {}));
