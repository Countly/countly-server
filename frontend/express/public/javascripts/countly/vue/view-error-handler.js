import { getGlobalStore } from './data/store.js';

/**
 * Handles errors from AJAX calls by delegating to the active view's onError handler
 * This function provides a clean ES module interface instead of using window.app.activeView directly
 *
 * @param {Object} error - The error object (typically a jqXHR object from jQuery ajax)
 */
export function handleViewError(error) {
    const store = getGlobalStore();
    const activeView = store.state.countlyApp.activeView;

    if (activeView && typeof activeView.onError === 'function') {
        activeView.onError(error);
    }
}
