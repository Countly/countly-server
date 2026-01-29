/**
 * Drawer component mixins
 * TO-DO: will be turn into composables in future refactorings
 */

import { BaseComponentMixin, MultiStepFormMixin } from '../form/mixins.js';


export const ModalMixin = {
    methods: {
        setModalState: function(state) {
            if (window.countlyVue && window.countlyVue.ModalManager) {
                window.countlyVue.ModalManager.setState(this.componentId, state);
            }
        }
    },
    beforeDestroy: function() {
        if (window.countlyVue && window.countlyVue.ModalManager) {
            window.countlyVue.ModalManager.setState(this.componentId, false);
        }
    }
};

/**
    * hasDrawersMethodsMixin - Mixin that provides drawer state management methods
    * @returns {object} Vue mixin object
 */
export const hasDrawersMethodsMixin = function() {
    return {
        methods: {
            openDrawer: function(name, initialEditedObject) {
                // Delete the hover key as its set by the data table on hovering a row
                // and we don't want to pass it to the drawer.
                delete initialEditedObject.hover;
                if (this.drawers[name].isOpened) {
                    return;
                }
                this.loadDrawer(name, initialEditedObject);
                this.drawers[name].isOpened = true;
            },
            loadDrawer: function(name, initialEditedObject) {
                // Delete the hover key as its set by the data table on hovering a row
                // and we don't want to pass it to the drawer.
                if (initialEditedObject && initialEditedObject.hover !== undefined) {
                    delete initialEditedObject.hover;
                }
                this.drawers[name].initialEditedObject = initialEditedObject || {};
            },
            closeDrawer: function(name) {
                this.drawers[name].isOpened = false;
            },
            hasOpenDrawer: function() {
                for (var drawer in this.drawers) {
                    if (this.drawers[drawer].isOpened) {
                        return true;
                    }
                }
                return false;
            }
        }
    };
};

/**
 * hasDrawersMixin - Mixin that provides drawer state management
 * @param {string|string[]} names - Name or array of names of the drawers to manage
 * @returns {object} Vue mixin object
 */
export const hasDrawersMixin = function(names) {
    if (!Array.isArray(names)) {
        names = [names];
    }

    var result = {
        data: function() {
            return {
                drawers: names.reduce(function(acc, val) {
                    acc[val] = {
                        name: val,
                        isOpened: false,
                        initialEditedObject: {},
                    };

                    acc[val].closeFn = function() {
                        acc[val].isOpened = false;
                    };

                    return acc;
                }, {})
            };
        },
    };
    Object.assign(result, hasDrawersMethodsMixin());
    return result;
};

export { BaseComponentMixin, MultiStepFormMixin };
