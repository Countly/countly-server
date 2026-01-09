/* global countlyCommon, countlyGlobal, VueRouter, store */

/**
 * Vue 3 Router - Replaces Backbone.Router functionality
 * Maintains backward compatibility with existing app.route() calls
 *
 * Migration from Backbone.js to Vue.js 3 Router
 */
(function(countlyVue) {

    // Store for registered routes during initialization
    var _pendingRoutes = [];
    var _routerInstance = null;
    var _isInitialized = false;

    /**
     * URL History Manager - Replaces Backbone.history
     * Provides same interface for URL fragment management
     */
    var CountlyHistory = {
        fragment: '',
        appIds: [],
        urlChecks: [],

        /**
         * Get current URL fragment without leading hash
         * @returns {string} Current URL fragment
         */
        getFragment: function() {
            var hash = window.location.hash || '';
            // Remove leading # and app ID prefix if present
            var fragment = hash.replace(/^#\/?/, '');
            if (fragment.indexOf(countlyCommon.ACTIVE_APP_ID + '/') === 0) {
                fragment = fragment.replace(countlyCommon.ACTIVE_APP_ID + '/', '');
            }
            // Ensure it starts with /
            if (fragment && fragment[0] !== '/') {
                fragment = '/' + fragment;
            }
            return fragment || '/';
        },

        /**
         * Get raw fragment including app ID
         * @returns {string} Raw URL fragment
         */
        _getFragment: function() {
            var hash = window.location.hash || '';
            return hash.replace(/^#\/?/, '');
        },

        /**
         * Check if all URL check callbacks pass
         * @returns {boolean} True if all checks pass
         */
        checkOthers: function() {
            for (var i = 0; i < this.urlChecks.length; i++) {
                if (!this.urlChecks[i]()) {
                    return false;
                }
            }
            return true;
        },

        /**
         * Navigate to URL without adding to history
         * @param {string} hash - URL to navigate to
         */
        noHistory: function(hash) {
            if (history && history.replaceState) {
                history.replaceState(undefined, undefined, encodeURI(hash));
            }
            else {
                location.replace(hash);
            }
        },

        /**
         * Check URL and handle app switching
         */
        checkUrl: function() {
            var self = this;
            store.set("countly_fragment_name", this._getFragment());

            var rawFragment = this._getFragment();
            var app_id = rawFragment.split("/")[0] || "";

            // Handle APP_NAMESPACE mode
            if (countlyCommon.APP_NAMESPACE !== false &&
                countlyCommon.ACTIVE_APP_ID !== 0 &&
                countlyCommon.ACTIVE_APP_ID !== app_id &&
                this.appIds.indexOf(app_id) === -1) {
                this.noHistory("#/" + countlyCommon.ACTIVE_APP_ID + "/" + rawFragment);
                app_id = countlyCommon.ACTIVE_APP_ID;
            }

            // Handle app switching
            if (countlyCommon.ACTIVE_APP_ID !== 0 &&
                countlyCommon.ACTIVE_APP_ID !== app_id &&
                this.appIds.indexOf(app_id) !== -1) {

                if (window.app && window.app.switchApp) {
                    window.app.switchApp(app_id, function() {
                        if (self.checkOthers()) {
                            self._triggerRoute();
                        }
                    });
                }
            }
            else {
                if (this.checkOthers()) {
                    this._triggerRoute();
                }
            }
        },

        /**
         * Trigger route change in Vue Router
         */
        _triggerRoute: function() {
            var fragment = this.getFragment();
            this.fragment = fragment;

            if (_routerInstance) {
                var currentPath = _routerInstance.currentRoute.value
                    ? _routerInstance.currentRoute.value.path
                    : '/';

                if (currentPath !== fragment) {
                    _routerInstance.push(fragment).catch(function() {
                        // Navigation cancelled or duplicate, ignore
                    });
                }
            }
        },

        /**
         * Start listening to URL changes
         */
        start: function() {
            var self = this;

            // Initialize app IDs
            for (var id in countlyGlobal.apps) {
                this.appIds.push(id);
            }

            // Listen for hash changes
            window.addEventListener('hashchange', function() {
                self.checkUrl();
            });

            // Initial check
            this.checkUrl();
        }
    };

    /**
     * Route Definition Parser
     * Converts Backbone-style route patterns to Vue Router patterns
     * @param {string} pattern - Backbone route pattern
     * @returns {string} Vue Router pattern
     */
    function parseBackboneRoute(pattern) {
        // Remove leading hash if present
        var route = pattern.replace(/^#/, '');

        // Convert Backbone :param to Vue Router :param
        // Backbone uses :param and *splat, Vue uses :param and :param+
        route = route.replace(/\*(\w+)/g, ':$1+'); // *splat -> :splat+

        return route;
    }

    /**
     * Create a Vue component wrapper for Backbone-style views
     * @param {Object} viewInstance - The view instance (countlyView or Vue component)
     * @param {Object} options - Route options
     * @returns {Object} Vue component
     */
    // eslint-disable-next-line no-unused-vars, require-jsdoc
    function createRouteComponent(viewInstance, options) {
        options = options || {};

        return {
            name: options.name || 'RouteComponent',
            template: '<div ref="container" class="vue-route-container"></div>',
            data: function() {
                return {
                    viewInstance: null,
                    isRendered: false
                };
            },
            computed: {
                routeParams: function() {
                    return this.$route.params;
                }
            },
            watch: {
                '$route.params': {
                    handler: function(newParams) {
                        if (this.viewInstance && this.viewInstance.params) {
                            this.viewInstance.params = newParams;
                            if (this.viewInstance.refresh) {
                                this.viewInstance.refresh();
                            }
                        }
                    },
                    deep: true
                }
            },
            mounted: function() {
                this.initView();
            },
            beforeUnmount: function() {
                this.destroyView();
            },
            methods: {
                initView: function() {
                    // Get fresh view instance
                    if (typeof viewInstance === 'function') {
                        this.viewInstance = viewInstance();
                    }
                    else {
                        this.viewInstance = viewInstance;
                    }

                    // Set route params
                    if (this.viewInstance) {
                        this.viewInstance.params = this.$route.params;
                        this.viewInstance.el = this.$refs.container;

                        // Render using BackboneWrapper pattern if it's a Vue wrapper
                        if (this.viewInstance.render) {
                            this.viewInstance.render();
                            this.isRendered = true;
                        }
                    }
                },
                destroyView: function() {
                    if (this.viewInstance && this.viewInstance.destroy) {
                        this.viewInstance.destroy();
                    }
                    this.viewInstance = null;
                    this.isRendered = false;
                }
            }
        };
    }

    /**
     * CountlyRouter - Vue Router wrapper with Backbone compatibility
     */
    var CountlyRouter = {
        routes: [],
        namedRoutes: {},

        /**
         * Register a route (backward compatible with app.route())
         * @param {string} pattern - URL pattern
         * @param {string} name - Route name
         * @param {Function} callback - Route callback
         */
        route: function(pattern, name, callback) {
            var routeConfig = {
                pattern: pattern,
                name: name,
                callback: callback,
                vuePath: parseBackboneRoute(pattern)
            };

            if (_isInitialized) {
                this._addRoute(routeConfig);
            }
            else {
                _pendingRoutes.push(routeConfig);
            }
        },

        /**
         * Add route to Vue Router
         * @param {Object} config - Route configuration
         */
        _addRoute: function(config) {
            var self = this;

            this.routes.push(config);
            this.namedRoutes[config.name] = config;

            if (_routerInstance) {
                _routerInstance.addRoute({
                    path: config.vuePath,
                    name: config.name,
                    component: {
                        template: '<div class="backbone-route-view"></div>',
                        beforeRouteEnter: function(to, from, next) {
                            next(function() {
                                self._executeCallback(config, to.params);
                            });
                        },
                        beforeRouteUpdate: function(to, from, next) {
                            self._executeCallback(config, to.params);
                            next();
                        }
                    }
                });
            }
        },

        /**
         * Execute route callback
         * @param {Object} config - Route configuration
         * @param {Object} params - Route parameters
         */
        _executeCallback: function(config, params) {
            if (config.callback && window.app) {
                // Extract params in order
                var args = [];
                var paramNames = config.vuePath.match(/:(\w+)\+?/g) || [];

                paramNames.forEach(function(p) {
                    var name = p.replace(/[:+]/g, '');
                    args.push(params[name]);
                });

                config.callback.apply(window.app, args);
            }
        },

        /**
         * Initialize the router
         * @returns {Object} Vue Router instance
         */
        init: function() {
            var self = this;

            // Create base routes
            var vueRoutes = [
                {
                    path: '/',
                    name: 'dashboard',
                    component: { template: '<div></div>' }
                },
                {
                    path: '/:pathMatch(.*)*',
                    name: 'catchAll',
                    component: { template: '<div></div>' }
                }
            ];

            // Create Vue Router instance
            _routerInstance = VueRouter.createRouter({
                history: VueRouter.createWebHashHistory(),
                routes: vueRoutes
            });

            // Process pending routes
            _pendingRoutes.forEach(function(config) {
                self._addRoute(config);
            });
            _pendingRoutes = [];

            _isInitialized = true;

            // Handle route changes
            _routerInstance.beforeEach(function(to, from, next) {
                // Update history fragment
                CountlyHistory.fragment = to.path;
                next();
            });

            return _routerInstance;
        },

        /**
         * Navigate programmatically
         * @param {string} path - Path to navigate to
         * @param {boolean} trigger - Whether to trigger route handler
         */
        navigate: function(path, trigger) {
            // Ensure path has proper format
            if (path[0] === '#') {
                path = path.substring(1);
            }
            if (path[0] !== '/') {
                path = '/' + path;
            }

            if (_routerInstance) {
                if (trigger) {
                    _routerInstance.push(path);
                }
                else {
                    _routerInstance.replace(path);
                }
            }
            else {
                // Fallback to hash change
                if (trigger) {
                    window.location.hash = path;
                }
                else {
                    CountlyHistory.noHistory('#' + path);
                }
            }
        },

        /**
         * Get router instance
         * @returns {Object} Vue Router instance
         */
        getRouter: function() {
            return _routerInstance;
        }
    };

    // Export to countlyVue
    countlyVue.router = CountlyRouter;
    countlyVue.history = CountlyHistory;

    // Only create Backbone.history compatibility layer if Backbone is not already defined
    // This allows the real Backbone to work during the migration period
    if (typeof window.Backbone === 'undefined') {
        window.Backbone = {};
        window.Backbone.history = CountlyHistory;
        window.Backbone.History = function() {
            return CountlyHistory;
        };
    }
    else {
        // Backbone exists - extend its history with our additional methods if needed
        // but don't override it
        if (window.Backbone.history) {
            // Store reference to our history for future Vue 3 only usage
            countlyVue._vueHistory = CountlyHistory;
        }
    }

}(window.countlyVue = window.countlyVue || {}));
