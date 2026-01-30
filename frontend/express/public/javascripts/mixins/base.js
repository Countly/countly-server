/**
 * Base component mixins
 * Shared across all Vue components
 */

import Vue from 'vue';

// Global counter for unique component IDs
// Used for modal management, form field access, etc.
let _uniqueComponentId = 0;

/**
 * Get next unique component ID
 * @returns {string} Unique component ID
 */
export function getNextComponentId() {
    const id = _uniqueComponentId.toString();
    _uniqueComponentId += 1;
    return id;
}

/**
 * BaseComponentMixin - Provides unique component ID and optional component helper
 */
export const BaseComponentMixin = {
    beforeCreate: function() {
        this.ucid = getNextComponentId();
    },
    computed: {
        componentId: function() {
            return "cly-cmp-" + this.ucid;
        }
    },
    methods: {
        optionalComponent: function(componentName) {
            if (Vue.options.components[componentName]) {
                return componentName;
            }
            return null;
        }
    }
};
