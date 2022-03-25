/* global  */

(function(countlyVue) {

    /**
     * Simple implementation for abortable delayed actions.
     * Primarily used for table undo events.
     *
     * @param {Function} actionFn Delayed action
     * @param {Function} abortFn Callback will be called on abort
     * @param {Number} timeout Delay amount in ms
     */
    function DelayedAction(actionFn, abortFn, timeout) {
        this.timeout = setTimeout(actionFn, timeout || 2000);
        this.abortFn = abortFn;
    }

    DelayedAction.prototype.abort = function() {
        clearTimeout(this.timeout);
        this.abortFn();
    };

    var _helpers = {
        DelayedAction: DelayedAction
    };

    countlyVue.helpers = _helpers;

}(window.countlyVue = window.countlyVue || {}));
