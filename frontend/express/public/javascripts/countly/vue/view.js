/* global countlyCommon, countlyEvent, $, Vue, app, T */

/**
 * Vue 3 Compatible View Base Class
 * Replaces Backbone.View while maintaining the same interface
 * 
 * This file provides backward compatibility for code using countlyView.extend()
 * while internally using Vue 3 components.
 */
(function(countlyVue) {

    var initializeOnce = null;

    /**
     * Initialize events once
     * @returns {Promise} Promise that resolves when initialization is complete
     */
    function getInitializeOnce() {
        if (!initializeOnce) {
            initializeOnce = $.when(
                typeof countlyEvent !== 'undefined' && countlyEvent.initialize
                    ? countlyEvent.initialize()
                    : Promise.resolve()
            ).then(function() {});
        }
        return initializeOnce;
    }

    /**
     * CountlyView - Vue 3 compatible view class
     * Maintains the same interface as the original Backbone-based countlyView
     * 
     * @example
     * window.MyView = countlyView.extend({
     *     beforeRender: function() {
     *         return $.when(this.loadData());
     *     },
     *     renderCommon: function(isRefresh) {
     *         $(this.el).html(this.template(this.templateData));
     *     },
     *     refresh: function() {
     *         // Called every 10 seconds
     *     }
     * });
     */
    var CountlyViewClass = {
        /**
         * Create a new view class by extending the base
         * @param {Object} protoProps - Instance properties
         * @param {Object} staticProps - Static properties
         * @returns {Function} Constructor function
         */
        extend: function(protoProps, staticProps) {
            var parent = this;

            // Create child constructor
            var child = function(options) {
                this._configure(options || {});
                this.initialize.apply(this, arguments);
            };

            // Inherit static properties
            for (var key in parent) {
                if (Object.prototype.hasOwnProperty.call(parent, key)) {
                    child[key] = parent[key];
                }
            }
            if (staticProps) {
                for (var sKey in staticProps) {
                    if (Object.prototype.hasOwnProperty.call(staticProps, sKey)) {
                        child[sKey] = staticProps[sKey];
                    }
                }
            }

            // Set up prototype chain
            var Surrogate = function() {
                this.constructor = child;
            };
            Surrogate.prototype = parent.prototype;
            child.prototype = new Surrogate();

            // Copy instance properties
            if (protoProps) {
                for (var pKey in protoProps) {
                    if (Object.prototype.hasOwnProperty.call(protoProps, pKey)) {
                        child.prototype[pKey] = protoProps[pKey];
                    }
                }
            }

            // Store parent reference
            child.__super__ = parent.prototype;

            return child;
        }
    };

    /**
     * Base prototype for all views
     */
    CountlyViewClass.prototype = {
        /**
         * Whether view has finished loading
         * @type {boolean}
         */
        isLoaded: false,

        /**
         * Template function (Handlebars, etc.)
         * @type {Function|null}
         */
        template: null,

        /**
         * Data to pass to template
         * @type {Object}
         */
        templateData: {},

        /**
         * Container element
         * @type {jQuery|HTMLElement}
         */
        el: null,

        /**
         * Route parameters
         * @type {Object}
         */
        params: {},

        /**
         * Internal request tracking
         * @private
         */
        _myRequests: {},

        /**
         * Vue instance (if using Vue rendering)
         * @type {Vue|null}
         */
        _vueInstance: null,

        /**
         * Configure view with options
         * @param {Object} options - View configuration options
         * @private
         */
        _configure: function(options) {
            this.el = options.el || $('#content');
            this.params = options.params || {};
            this._myRequests = {};
        },

        /**
         * Initialize view - override in subclass
         */
        initialize: function() {
            // Override in subclass
        },

        /**
         * Remove pending requests when view is destroyed
         * @private
         */
        _removeMyRequests: function() {
            for (var url in this._myRequests) {
                for (var data in this._myRequests[url]) {
                    if (parseInt(this._myRequests[url][data].readyState, 10) !== 4) {
                        this._myRequests[url][data].abort_reason = "app_remove_reqs";
                        this._myRequests[url][data].abort();
                    }
                }
            }
            this._myRequests = {};
        },

        /**
         * Called when date is changed
         */
        dateChanged: function() {
            this.refresh();
        },

        /**
         * Called when app is changed
         * @param {Function} callback - Callback after switch
         */
        appChanged: function(callback) {
            if (typeof countlyEvent !== 'undefined') {
                countlyEvent.reset();
                $.when(countlyEvent.initialize()).always(function() {
                    if (callback) {
                        callback();
                    }
                });
            }
            else if (callback) {
                callback();
            }
        },

        /**
         * Called before render - load data here
         * @returns {boolean|Promise} True or promise to indicate ready to render
         */
        beforeRender: function() {
            return true;
        },

        /**
         * Called after render completes
         */
        afterRender: function() {
            // Override in subclass
        },

        /**
         * Main render method
         * @returns {Object} this
         */
        render: function() {
            var self = this;

            if (countlyCommon.ACTIVE_APP_ID) {
                $.when(this.beforeRender(), getInitializeOnce())
                    .fail(function(xhr, textStatus, errorThrown) {
                        self._handleRenderError(xhr, textStatus, errorThrown);
                    })
                    .always(function() {
                        if (app.activeView === self) {
                            self.isLoaded = true;
                            self.renderCommon();
                            self.afterRender();
                            app.pageScript();
                        }
                    });
            }
            else {
                if (app.activeView === this) {
                    this.isLoaded = true;
                    this.renderCommon();
                    this.afterRender();
                    app.pageScript();
                }
            }

            return this;
        },

        /**
         * Handle render errors
         * @param {XMLHttpRequest} xhr - XHR object
         * @param {string} textStatus - Status text
         * @param {Error} errorThrown - Error object
         * @private
         */
        _handleRenderError: function(xhr, textStatus, errorThrown) {
            if (xhr && xhr.status === 0) {
                console.error("Check Your Network Connection"); // eslint-disable-line
            }
            else if (xhr && xhr.status === 404) {
                console.error("Requested URL not found: " + xhr.my_set_url); // eslint-disable-line
            }
            else if (xhr && xhr.status === 500) {
                console.error("Internal Server Error: " + xhr.my_set_url); // eslint-disable-line
            }
            else if (errorThrown) {
                console.error("Unknown Error: ", textStatus, errorThrown); // eslint-disable-line
            }
        },

        /**
         * Render common content - override in subclass
         * @param {boolean} isRefresh - Whether this is a refresh call
         */
        // eslint-disable-next-line no-unused-vars
        renderCommon: function(isRefresh) {
            // Override in subclass
        },

        /**
         * Refresh view data
         * @returns {boolean} Success indicator
         */
        refresh: function() {
            return true;
        },

        /**
         * Called when user becomes active after idle
         */
        restart: function() {
            this.refresh();
        },

        /**
         * Clean up view - override for custom cleanup
         */
        destroy: function() {
            if (this._vueInstance) {
                this._vueInstance.$destroy();
                this._vueInstance = null;
            }
        },

        /**
         * Handle errors during view operations
         * @param {Object} error - Error object
         */
        onError: function(error) {
            if (countlyCommon.DEBUG) {
                console.error("View error:", error); // eslint-disable-line
            }
        }
    };

    /**
     * Create a Vue 3 component from a countlyView definition
     * @param {Object} viewDefinition - View definition object
     * @returns {Object} Vue component definition
     */
    function createVueComponent(viewDefinition) {
        return {
            name: viewDefinition.name || 'CountlyView',

            data: function() {
                return {
                    isLoaded: false,
                    templateData: viewDefinition.templateData || {}
                };
            },

            computed: {
                routeParams: function() {
                    return this.$route ? this.$route.params : {};
                }
            },

            created: function() {
                // Map params
                if (viewDefinition.initialize) {
                    viewDefinition.initialize.call(this);
                }
            },

            beforeMount: function() {
                var self = this;

                // Handle beforeRender
                var beforeResult = viewDefinition.beforeRender
                    ? viewDefinition.beforeRender.call(this)
                    : true;

                if (beforeResult && beforeResult.then) {
                    beforeResult.then(function() {
                        self.isLoaded = true;
                    });
                }
                else {
                    this.isLoaded = true;
                }
            },

            mounted: function() {
                if (viewDefinition.renderCommon) {
                    viewDefinition.renderCommon.call(this, false);
                }
                if (viewDefinition.afterRender) {
                    viewDefinition.afterRender.call(this);
                }
            },

            beforeUnmount: function() {
                if (viewDefinition.destroy) {
                    viewDefinition.destroy.call(this);
                }
            },

            methods: {
                refresh: viewDefinition.refresh || function() {
                    return true;
                },
                dateChanged: viewDefinition.dateChanged || function() {
                    this.refresh();
                },
                renderCommon: viewDefinition.renderCommon || function() {}
            }
        };
    }

    /**
     * Bridge for using new Vue components in old Backbone patterns
     * @param {Object} options - Options containing Vue component
     * @returns {Object} Backbone-compatible view instance
     */
    function createBackboneCompatibleView(options) {
        var ViewClass = CountlyViewClass.extend({
            component: options.component,
            templates: options.templates || [],
            vuex: options.vuex || [],

            initialize: function() {
                this.isLoaded = false;
                this._vueInstance = null;
            },

            beforeRender: function() {
                // Load templates if needed
                if (this.templates && this.templates.length > 0) {
                    var templatePromises = this.templates.map(function(t) {
                        return new Promise(function(resolve) {
                            if (typeof T !== 'undefined') {
                                T.get(t, function(src) {
                                    resolve(src);
                                });
                            }
                            else {
                                resolve('');
                            }
                        });
                    });
                    return Promise.all(templatePromises);
                }
                return Promise.resolve();
            },

            renderCommon: function() {
                var self = this;
                var el = $(this.el);

                // Create mount point
                el.html('<div class="vue-wrapper"></div><div id="vue-templates"></div>');

                // Create Vue app
                if (typeof Vue !== 'undefined' && Vue.createApp) {
                    // Vue 3
                    var vueApp = Vue.createApp({
                        components: {
                            MainView: this.component
                        },
                        template: '<MainView></MainView>',
                        beforeCreate: function() {
                            this.$route = { params: self.params };
                        }
                    });

                    // Register Vuex store if available
                    if (countlyVue.vuex && countlyVue.vuex.getGlobalStore) {
                        vueApp.use(countlyVue.vuex.getGlobalStore());
                    }

                    this._vueInstance = vueApp.mount(el.find('.vue-wrapper').get(0));
                }
                else if (typeof Vue !== 'undefined') {
                    // Vue 2 fallback
                    this._vueInstance = new Vue({
                        el: el.find('.vue-wrapper').get(0),
                        store: countlyVue.vuex ? countlyVue.vuex.getGlobalStore() : undefined,
                        components: {
                            MainView: this.component
                        },
                        template: '<MainView></MainView>',
                        beforeCreate: function() {
                            this.$route = { params: self.params };
                        }
                    });
                }
            },

            refresh: function() {
                if (this._vueInstance) {
                    // Use EventBus for Vue 3, $root for Vue 2
                    if (countlyVue.compat && countlyVue.compat.IS_VUE_3) {
                        countlyVue.compat.EventBus.$emit('cly-refresh', { reason: 'periodical' });
                    }
                    else if (this._vueInstance.$root) {
                        this._vueInstance.$root.$emit('cly-refresh', { reason: 'periodical' });
                    }
                }
            },

            destroy: function() {
                if (this._vueInstance) {
                    if (this._vueInstance.$destroy) {
                        // Vue 2
                        this._vueInstance.$destroy();
                    }
                    else if (this._vueInstance.unmount) {
                        // Vue 3
                        this._vueInstance.unmount();
                    }
                    this._vueInstance = null;
                }
            }
        });

        return new ViewClass();
    }

    // Export
    countlyVue.views = countlyVue.views || {};
    countlyVue.views.CountlyViewBase = CountlyViewClass;
    countlyVue.views.createVueComponent = createVueComponent;
    countlyVue.views.createBackboneCompatible = createBackboneCompatibleView;

    // Only set window.countlyView if not already defined (preserve Backbone version during migration)
    // This allows gradual migration - once Backbone is removed, this will be the primary countlyView
    if (typeof window.countlyView === 'undefined') {
        window.countlyView = CountlyViewClass;
    }

    // Also expose as countlyVue.View for explicit usage
    countlyVue.View = CountlyViewClass;

}(window.countlyVue = window.countlyVue || {}));
