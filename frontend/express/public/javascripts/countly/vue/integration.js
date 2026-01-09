/* global Vue, Backbone, $, countlyCommon */

/**
 * Vue 3 Migration Integration Module
 * 
 * This module orchestrates the transition from Backbone.js to Vue 3.
 * It should be loaded after all other Vue migration files.
 * 
 * Load order:
 * 1. Core dependencies (jQuery, Vue, Vuex, etc.)
 * 2. countly.view.js (original Backbone-based view)
 * 3. countly.template.js (AppRouter)
 * 4. vue/core.js (countlyVue base)
 * 5. vue/container.js
 * 6. vue/view.js (Vue 3 compatible view)
 * 7. vue/router.js (Vue 3 router)
 * 8. vue/app.js (Vue 3 app bootstrap)
 * 9. This file (integration.js) - ties everything together
 */
(function(countlyVue) {

    var _migrationStarted = false;
    var _migrationComplete = false;
    var _vueVersion = null;

    /**
     * Detect Vue version
     * @returns {number} Major version number (2 or 3)
     */
    function detectVueVersion() {
        if (_vueVersion) {
            return _vueVersion;
        }

        if (typeof Vue !== 'undefined') {
            if (Vue.version) {
                _vueVersion = parseInt(Vue.version.split('.')[0], 10);
            }
            else if (Vue.createApp) {
                _vueVersion = 3;
            }
            else {
                _vueVersion = 2;
            }
        }
        else {
            _vueVersion = 2; // Default assumption
        }

        return _vueVersion;
    }

    /**
     * Check if running in Vue 3 mode
     * @returns {boolean} True if running Vue 3
     */
    function isVue3() {
        return detectVueVersion() >= 3;
    }

    /**
     * Migration status and progress tracking
     */
    var MigrationStatus = {
        BACKBONE_ONLY: 'backbone-only',
        HYBRID: 'hybrid',
        VUE3_ONLY: 'vue3-only'
    };

    /**
     * Get current migration status
     * @returns {string} Current status
     */
    function getMigrationStatus() {
        // Check if Backbone is still being used
        var hasBackbone = typeof Backbone !== 'undefined' &&
                          Backbone.Router &&
                          typeof Backbone.Router.extend === 'function';

        // Check if Vue 3 router is initialized
        var hasVue3Router = countlyVue.router &&
                            countlyVue.router.getRouter &&
                            countlyVue.router.getRouter() !== null;

        if (hasVue3Router && !hasBackbone) {
            return MigrationStatus.VUE3_ONLY;
        }
        else if (hasVue3Router && hasBackbone) {
            return MigrationStatus.HYBRID;
        }
        else {
            return MigrationStatus.BACKBONE_ONLY;
        }
    }

    /**
     * Upgrade a Backbone-style plugin to work with Vue 3
     * @param {Object} plugin - Plugin definition
     * @returns {Object} Upgraded plugin
     */
    function upgradePlugin(plugin) {
        if (!plugin) {
            return plugin;
        }

        // Check if plugin uses old patterns
        if (plugin.views) {
            Object.keys(plugin.views).forEach(function(viewName) {
                var view = plugin.views[viewName];

                // If it's a countlyView extension, wrap it
                if (view && view.extend && !view._vue3Upgraded) {
                    plugin.views[viewName] = wrapBackboneView(view);
                    plugin.views[viewName]._vue3Upgraded = true;
                }
            });
        }

        return plugin;
    }

    /**
     * Wrap a Backbone view to work with Vue 3 router
     * @param {Function} ViewClass - Backbone view constructor
     * @returns {Object} Vue 3 compatible wrapper
     */
    function wrapBackboneView(ViewClass) {
        return {
            _originalView: ViewClass,
            _vue3Upgraded: true,

            /**
             * Create instance and render
             * @param {Object} options - Options
             * @returns {Object} View instance
             */
            createAndRender: function(options) {
                var instance = new ViewClass(options);

                // Use original render method
                if (window.app && window.app.activeView) {
                    window.app.activeView = instance;
                }

                instance.render();
                return instance;
            }
        };
    }

    /**
     * Initialize the Vue 3 migration
     * Called when the app is ready to switch to Vue 3 routing
     */
    function initializeMigration() {
        if (_migrationStarted) {
            return;
        }

        _migrationStarted = true;

        // Log migration status
        var status = getMigrationStatus();
        if (countlyCommon.DEBUG) {
            console.log('[Vue3 Migration] Status:', status); // eslint-disable-line
            console.log('[Vue3 Migration] Vue version:', detectVueVersion()); // eslint-disable-line
        }

        // If we're in hybrid mode, set up bridges
        if (status === MigrationStatus.HYBRID) {
            setupHybridBridges();
        }
    }

    /**
     * Set up bridges for hybrid Backbone + Vue 3 operation
     */
    function setupHybridBridges() {
        // Bridge: Forward Backbone.history changes to Vue router
        if (Backbone && Backbone.history && countlyVue.router) {
            var originalNavigate = Backbone.history.navigate;

            Backbone.history.navigate = function(fragment, options) {
                // Call original
                if (originalNavigate) {
                    originalNavigate.apply(this, arguments);
                }

                // Also update Vue router if initialized
                if (countlyVue.router.getRouter()) {
                    var trigger = options === true || (options && options.trigger);
                    countlyVue.router.navigate(fragment, trigger);
                }
            };
        }

        // Bridge: Forward app.route calls to Vue router
        if (window.app && window.app.route) {
            var originalRoute = window.app.route;

            window.app.route = function(pattern, name, callback) {
                // Register with original Backbone router
                originalRoute.apply(this, arguments);

                // Also register with Vue router
                if (countlyVue.router) {
                    countlyVue.router.route(pattern, name, callback);
                }
            };
        }
    }

    /**
     * Complete the migration - disable Backbone
     * Only call this when all plugins have been updated
     */
    function completeMigration() {
        if (_migrationComplete) {
            return;
        }

        _migrationComplete = true;

        // Replace global references
        if (countlyVue.View) {
            window.countlyView = countlyVue.View;
        }

        if (countlyVue.history) {
            window.Backbone = window.Backbone || {};
            window.Backbone.history = countlyVue.history;
        }

        if (countlyCommon.DEBUG) {
            console.log('[Vue3 Migration] Migration complete!'); // eslint-disable-line
        }
    }

    /**
     * Get migration statistics
     * @returns {Object} Statistics about the migration
     */
    function getMigrationStats() {
        return {
            status: getMigrationStatus(),
            vueVersion: detectVueVersion(),
            isVue3: isVue3(),
            migrationStarted: _migrationStarted,
            migrationComplete: _migrationComplete,
            registeredRoutes: countlyVue.router ? countlyVue.router.routes.length : 0
        };
    }

    // Export migration utilities
    countlyVue.migration = {
        detectVueVersion: detectVueVersion,
        isVue3: isVue3,
        MigrationStatus: MigrationStatus,
        getMigrationStatus: getMigrationStatus,
        upgradePlugin: upgradePlugin,
        wrapBackboneView: wrapBackboneView,
        initialize: initializeMigration,
        complete: completeMigration,
        getStats: getMigrationStats
    };

    // Auto-initialize when document is ready
    $(function() {
        initializeMigration();
    });

}(window.countlyVue = window.countlyVue || {}));
