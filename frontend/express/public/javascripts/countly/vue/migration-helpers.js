/* eslint-disable no-unused-vars */

/**
 * Vue 3 Migration Helpers for Plugins
 *
 * This file provides helper functions and mixins to make Vue 2 code
 * work in Vue 3 without changes, or to easily migrate to Vue 3 patterns.
 *
 * Usage in plugins:
 * 1. Use countlyVue.helpers.eventBus instead of this.$root.$on/$off/$emit
 * 2. Use countlyVue.helpers.lifecycleMixin in your components
 * 3. Use countlyVue.helpers.compatMixin for general compatibility
 */
(function(countlyVue) {

    var compat = countlyVue.compat || {};
    var IS_VUE_3 = compat.IS_VUE_3 || false;
    var EventBus = compat.EventBus || { $on: function() {}, $off: function() {}, $emit: function() {} };

    /**
     * Event Bus Wrapper
     * Provides a unified event bus API that works in both Vue 2 and Vue 3
     *
     * @example
     * // Instead of: this.$root.$emit('my-event', data)
     * countlyVue.helpers.eventBus.$emit('my-event', data);
     *
     * // Instead of: this.$root.$on('my-event', handler)
     * countlyVue.helpers.eventBus.$on('my-event', handler);
     *
     * // Instead of: this.$root.$off('my-event', handler)
     * countlyVue.helpers.eventBus.$off('my-event', handler);
     */
    var eventBus = {
        /**
         * Subscribe to an event
         * @param {string} event - Event name
         * @param {Function} handler - Event handler
         */
        $on: function(event, handler) {
            if (IS_VUE_3) {
                EventBus.$on(event, handler);
            }
            else if (typeof countlyVue._vue2Root !== 'undefined') {
                countlyVue._vue2Root.$on(event, handler);
            }
            else {
                // Fallback to our EventBus anyway
                EventBus.$on(event, handler);
            }
        },

        /**
         * Unsubscribe from an event
         * @param {string} event - Event name
         * @param {Function} handler - Event handler (optional)
         */
        $off: function(event, handler) {
            if (IS_VUE_3) {
                EventBus.$off(event, handler);
            }
            else if (typeof countlyVue._vue2Root !== 'undefined') {
                countlyVue._vue2Root.$off(event, handler);
            }
            else {
                EventBus.$off(event, handler);
            }
        },

        /**
         * Emit an event
         * @param {string} event - Event name
         * @param {...*} args - Event arguments
         */
        $emit: function(event) {
            var args = Array.prototype.slice.call(arguments);
            if (IS_VUE_3) {
                EventBus.$emit.apply(EventBus, args);
            }
            else if (typeof countlyVue._vue2Root !== 'undefined') {
                countlyVue._vue2Root.$emit.apply(countlyVue._vue2Root, args);
            }
            else {
                EventBus.$emit.apply(EventBus, args);
            }
        }
    };

    /**
     * Lifecycle Mixin
     * Provides both Vue 2 and Vue 3 lifecycle hooks
     * Components using this mixin will work in both versions
     *
     * @example
     * countlyVue.views.create({
     *     mixins: [countlyVue.helpers.lifecycleMixin],
     *     methods: {
     *         onBeforeDestroy: function() {
     *             // cleanup code
     *         }
     *     }
     * });
     */
    var lifecycleMixin = {
        // Vue 2 lifecycle
        beforeDestroy: function() {
            if (typeof this.onBeforeDestroy === 'function') {
                this.onBeforeDestroy();
            }
        },
        destroyed: function() {
            if (typeof this.onDestroyed === 'function') {
                this.onDestroyed();
            }
        },
        // Vue 3 lifecycle
        beforeUnmount: function() {
            if (typeof this.onBeforeDestroy === 'function') {
                this.onBeforeDestroy();
            }
        },
        unmounted: function() {
            if (typeof this.onDestroyed === 'function') {
                this.onDestroyed();
            }
        }
    };

    /**
     * Compatibility Mixin for Event Bus
     * Use this mixin in components that use $root.$on/$off/$emit
     *
     * @example
     * countlyVue.views.create({
     *     mixins: [countlyVue.helpers.compatMixin],
     *     created: function() {
     *         // Instead of this.$root.$on, use:
     *         this.clyOn('my-event', this.handleEvent);
     *     },
     *     methods: {
     *         handleEvent: function(data) { ... }
     *     }
     * });
     */
    var compatMixin = {
        data: function() {
            return {
                _clyEventHandlers: []
            };
        },
        methods: {
            /**
             * Subscribe to a global event (compatible with Vue 2 and 3)
             * @param {string} event - Event name
             * @param {Function} handler - Event handler
             */
            clyOn: function(event, handler) {
                eventBus.$on(event, handler);
                this._clyEventHandlers.push({ event: event, handler: handler });
            },

            /**
             * Unsubscribe from a global event
             * @param {string} event - Event name
             * @param {Function} handler - Event handler
             */
            clyOff: function(event, handler) {
                eventBus.$off(event, handler);
                // Remove from tracked handlers
                this._clyEventHandlers = this._clyEventHandlers.filter(function(h) {
                    return !(h.event === event && h.handler === handler);
                });
            },

            /**
             * Emit a global event
             * @param {string} event - Event name
             * @param {...*} args - Event arguments
             */
            clyEmit: function() {
                eventBus.$emit.apply(eventBus, arguments);
            }
        },
        beforeDestroy: function() {
            // Vue 2: Clean up all registered handlers
            this._cleanupEventHandlers();
        },
        beforeUnmount: function() {
            // Vue 3: Clean up all registered handlers
            this._cleanupEventHandlers();
        },
        created: function() {
            var self = this;
            this._cleanupEventHandlers = function() {
                if (self._clyEventHandlers) {
                    self._clyEventHandlers.forEach(function(h) {
                        eventBus.$off(h.event, h.handler);
                    });
                    self._clyEventHandlers = [];
                }
            };
        }
    };

    /**
     * Auto-cleanup mixin for $root events
     * Automatically cleans up event listeners when component is destroyed
     */
    var autoCleanupMixin = {
        data: function() {
            return {
                _registeredEvents: []
            };
        },
        methods: {
            /**
             * Register a root event that will be auto-cleaned on destroy
             * @param {string} event - Event name
             * @param {Function} handler - Event handler
             */
            $onRoot: function(event, handler) {
                eventBus.$on(event, handler);
                this._registeredEvents.push({ event: event, handler: handler });
            },
            /**
             * Emit to root (works in both Vue 2 and 3)
             */
            $emitRoot: function() {
                eventBus.$emit.apply(eventBus, arguments);
            }
        },
        beforeDestroy: function() {
            this._cleanupRootEvents();
        },
        beforeUnmount: function() {
            this._cleanupRootEvents();
        },
        created: function() {
            var self = this;
            this._cleanupRootEvents = function() {
                if (self._registeredEvents) {
                    self._registeredEvents.forEach(function(item) {
                        eventBus.$off(item.event, item.handler);
                    });
                    self._registeredEvents = [];
                }
            };
        }
    };

    /**
     * Convert beforeDestroy to work in both Vue 2 and Vue 3
     * @param {Object} component - Component definition
     * @returns {Object} Updated component with both lifecycle hooks
     */
    function addLifecycleCompat(component) {
        if (!component) {
            return component;
        }

        var result = Object.assign({}, component);

        // Copy beforeDestroy to beforeUnmount if not defined
        if (result.beforeDestroy && !result.beforeUnmount) {
            result.beforeUnmount = result.beforeDestroy;
        }
        if (result.destroyed && !result.unmounted) {
            result.unmounted = result.destroyed;
        }

        return result;
    }

    /**
     * Wrap a component to add Vue 3 compatibility
     * @param {Object} component - Vue component definition
     * @returns {Object} Wrapped component
     */
    function wrapComponent(component) {
        var wrapped = addLifecycleCompat(component);

        // Add compat mixin if component uses $root events
        if (component.created || component.mounted) {
            wrapped.mixins = (wrapped.mixins || []).concat([autoCleanupMixin]);
        }

        return wrapped;
    }

    /**
     * Parent registration mixin
     * Use this in parent components to allow children to register themselves
     * This replaces the removed $children property in Vue 3
     * 
     * @example
     * // In parent component
     * mixins: [countlyVue.helpers.parentMixin],
     * mounted: function() {
     *     // Access registered children
     *     var myChildren = this._registeredChildren.filter(c => c.role === 'default');
     * }
     * 
     * // In child component
     * mixins: [countlyVue.helpers.childMixin],
     * data: function() {
     *     return {
     *         isContent: true,
     *         role: 'default'
     *     };
     * }
     */
    var parentMixin = {
        data: function() {
            return {
                _registeredChildren: []
            };
        },
        methods: {
            _registerChild: function(child) {
                if (this._registeredChildren.indexOf(child) === -1) {
                    this._registeredChildren.push(child);
                }
            },
            _unregisterChild: function(child) {
                var index = this._registeredChildren.indexOf(child);
                if (index > -1) {
                    this._registeredChildren.splice(index, 1);
                }
            }
        },
        provide: function() {
            return {
                _parentComponent: this
            };
        }
    };

    /**
     * Child registration mixin
     * Use this in child components that need to register with their parent
     * The parent must use parentMixin
     */
    var childMixin = {
        inject: {
            _parentComponent: {
                default: null
            }
        },
        mounted: function() {
            if (this._parentComponent && this._parentComponent._registerChild) {
                this._parentComponent._registerChild(this);
            }
        },
        beforeDestroy: function() {
            if (this._parentComponent && this._parentComponent._unregisterChild) {
                this._parentComponent._unregisterChild(this);
            }
        },
        beforeUnmount: function() {
            if (this._parentComponent && this._parentComponent._unregisterChild) {
                this._parentComponent._unregisterChild(this);
            }
        }
    };

    // Export helpers
    countlyVue.helpers = countlyVue.helpers || {};
    countlyVue.helpers.eventBus = eventBus;
    countlyVue.helpers.lifecycleMixin = lifecycleMixin;
    countlyVue.helpers.compatMixin = compatMixin;
    countlyVue.helpers.autoCleanupMixin = autoCleanupMixin;
    countlyVue.helpers.addLifecycleCompat = addLifecycleCompat;
    countlyVue.helpers.wrapComponent = wrapComponent;
    countlyVue.helpers.parentMixin = parentMixin;
    countlyVue.helpers.childMixin = childMixin;
    countlyVue.helpers.IS_VUE_3 = IS_VUE_3;

}(window.countlyVue = window.countlyVue || {}));
