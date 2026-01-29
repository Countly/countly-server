/**
 * Modal Manager - Singleton Vue instance that manages modal overlay states
 * This creates a single overlay for all modals and tracks their open/close state
 */

import Vue from 'vue';
import jQuery from 'jquery';

let _ModalManager = null;

/**
 * initModalManager - Initializes the Modal Manager singleton instance
 * @returns  {Vue} Modal Manager Vue instance
 */
export function initModalManager() {
    if (_ModalManager) {
        return _ModalManager;
    }

    _ModalManager = new Vue({
        el: "#vue-modal-manager",
        template: '<div><div :class="{\'is-active\': nClients>0}" id="vue-common-overlay"></div></div>',
        data: function() {
            return {
                clients: {}
            };
        },
        computed: {
            nClients: function() {
                return Object.keys(this.clients).length;
            }
        },
        watch: {
            nClients: function(newVal) {
                if (newVal > 0) {
                    jQuery("body").addClass("has-active-modal");
                }
                else {
                    jQuery("body").removeClass("has-active-modal");
                }
            }
        },
        methods: {
            setState: function(clientId, state) {
                if (state) {
                    Vue.set(this.clients, clientId, true);
                }
                else {
                    Vue.delete(this.clients, clientId);
                }
            }
        }
    });

    return _ModalManager;
}

/** getModalManager - Returns the Modal Manager singleton instance
 * @returns  {Vue} Modal Manager Vue instance
 */
export function getModalManager() {
    return _ModalManager;
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initModalManager, { once: true });
    }
    else if (document.getElementById('vue-modal-manager')) {
        initModalManager();
    }
}

export default {
    init: initModalManager,
    get: getModalManager
};
