/**
 * Example: Migrating a Plugin View from Backbone to Vue 3
 * 
 * This file demonstrates the recommended patterns for migrating existing
 * plugin views from Backbone.js to Vue.js 3 while maintaining backward
 * compatibility.
 */

/* global countlyVue, CV, app, countlyCommon */

// =============================================================================
// BEFORE: Original Backbone-based view (using BackboneWrapper)
// =============================================================================

/*
var OriginalPluginView = countlyVue.views.create({
    template: CV.T('/plugins/my-plugin/templates/main.html'),
    data: function() {
        return {
            isLoading: true,
            tableData: []
        };
    },
    mounted: function() {
        this.loadData();
    },
    methods: {
        loadData: function() {
            var self = this;
            this.isLoading = true;
            $.ajax({
                url: countlyCommon.API_PARTS.data.r + '/my-plugin/data',
                method: 'GET',
                success: function(response) {
                    self.tableData = response.data;
                    self.isLoading = false;
                }
            });
        },
        refresh: function() {
            this.loadData();
        }
    }
});

// Register with BackboneWrapper (OLD way)
var originalView = new countlyVue.views.BackboneWrapper({
    component: OriginalPluginView,
    templates: ['/plugins/my-plugin/templates/main.html']
});

app.route('/my-plugin', 'my-plugin', function() {
    this.renderWhenReady(originalView);
});
*/


// =============================================================================
// AFTER: Migrated Vue 3 view with backward compatibility
// =============================================================================

/**
 * Step 1: Create the Vue 3 component
 * - Uses Composition API for better TypeScript support and code organization
 * - Maintains the same template and visual appearance
 */
var MigratedPluginView = countlyVue.views.create({
    name: 'MigratedPluginView',
    template: CV.T('/plugins/my-plugin/templates/main.html'),

    // Data function remains the same
    data: function() {
        return {
            isLoading: true,
            tableData: [],
            error: null
        };
    },

    // Computed properties remain the same
    computed: {
        hasData: function() {
            return this.tableData.length > 0;
        }
    },

    // Vue 3 uses 'mounted' (same as Vue 2)
    mounted: function() {
        this.loadData();

        // Listen for refresh events from parent
        if (this.$root) {
            this.$root.$on('cly-refresh', this.handleRefresh);
        }
    },

    // Vue 3 lifecycle: beforeUnmount replaces beforeDestroy
    beforeUnmount: function() {
        if (this.$root) {
            this.$root.$off('cly-refresh', this.handleRefresh);
        }
    },

    methods: {
        /**
         * Load data from API
         */
        loadData: function() {
            var self = this;
            this.isLoading = true;
            this.error = null;

            // Use countlyVue.$.ajax for consistent error handling
            countlyVue.$.ajax({
                url: countlyCommon.API_PARTS.data.r + '/my-plugin/data',
                method: 'GET'
            }).then(function(response) {
                self.tableData = response.data || [];
                self.isLoading = false;
            }).catch(function(err) {
                self.error = err.message || 'Failed to load data';
                self.isLoading = false;
            });
        },

        /**
         * Handle refresh event
         * @param {Object} payload - Refresh event payload
         */
        handleRefresh: function(payload) {
            if (payload && payload.reason === 'dateChange') {
                // Full reload on date change
                this.loadData();
            }
            else {
                // Periodic refresh - could do incremental update
                this.loadData();
            }
        },

        /**
         * Refresh method - called by parent view
         */
        refresh: function() {
            this.loadData();
        },

        /**
         * Date changed handler
         */
        dateChanged: function() {
            this.loadData();
        }
    }
});


/**
 * Step 2: Create the route handler
 * Option A: Using BackboneWrapper (backward compatible)
 */
var migratedViewA = new countlyVue.views.BackboneWrapper({
    component: MigratedPluginView,
    templates: ['/plugins/my-plugin/templates/main.html']
});

// Register route (same as before)
app.route('/my-plugin', 'my-plugin', function() {
    this.renderWhenReady(migratedViewA);
});


/**
 * Step 2: Create the route handler  
 * Option B: Using pure Vue 3 routing (for new code)
 * 
 * This option uses the new Vue 3 router system directly.
 * It's recommended for new plugins but requires the Vue 3 router to be loaded.
 */
/*
if (countlyVue.router) {
    // Register directly with Vue Router
    countlyVue.router.route('/my-plugin-v3', 'my-plugin-v3', function() {
        // The route callback can return a component to render
        return MigratedPluginView;
    });
}
*/


// =============================================================================
// MIGRATION CHECKLIST
// =============================================================================

/**
 * Checklist for migrating a plugin view:
 * 
 * 1. [ ] Update lifecycle hooks:
 *    - beforeDestroy → beforeUnmount
 *    - destroyed → unmounted
 * 
 * 2. [ ] Update event handling:
 *    - Use countlyVue.app.eventBus instead of this.$root.$emit
 *    - Or use provide/inject for component communication
 * 
 * 3. [ ] Update v-model usage:
 *    - v-model:value → v-model (for custom components)
 *    - .sync modifier → v-model:propName
 * 
 * 4. [ ] Remove filters:
 *    - Convert to methods or computed properties
 *    - {{ value | filter }} → {{ filterMethod(value) }}
 * 
 * 5. [ ] Update $listeners and $attrs:
 *    - $listeners is removed in Vue 3
 *    - Use v-bind="$attrs" which now includes listeners
 * 
 * 6. [ ] Update functional components:
 *    - Functional components use different syntax in Vue 3
 * 
 * 7. [ ] Test with UI tests:
 *    - Ensure all data-test-id selectors still work
 *    - Visual appearance should be unchanged
 */


// =============================================================================
// ADVANCED: Using Composition API (Vue 3 only)
// =============================================================================

/**
 * For new development or major refactors, consider using Composition API.
 * This provides better TypeScript support and code organization.
 */
/*
var CompositionAPIView = Vue.defineComponent({
    name: 'CompositionAPIView',
    template: '<div>...</div>',
    
    setup: function(props, context) {
        // Reactive state
        var isLoading = Vue.ref(true);
        var tableData = Vue.ref([]);
        var error = Vue.ref(null);
        
        // Computed properties
        var hasData = Vue.computed(function() {
            return tableData.value.length > 0;
        });
        
        // Methods
        function loadData() {
            isLoading.value = true;
            error.value = null;
            
            countlyVue.$.ajax({
                url: countlyCommon.API_PARTS.data.r + '/my-plugin/data',
                method: 'GET'
            }).then(function(response) {
                tableData.value = response.data || [];
                isLoading.value = false;
            }).catch(function(err) {
                error.value = err.message;
                isLoading.value = false;
            });
        }
        
        // Lifecycle
        Vue.onMounted(function() {
            loadData();
        });
        
        // Expose to template
        return {
            isLoading: isLoading,
            tableData: tableData,
            error: error,
            hasData: hasData,
            loadData: loadData
        };
    }
});
*/
