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

    /**
     * Builds the hidden form an export downloads through. Names and values are set as DOM
     * properties, never written into markup, so each field reaches the server exactly as
     * given, whatever characters it holds.
     *
     * @param {Document} doc Document to create the form in
     * @param {String} url Form action
     * @param {Object} fields Field names and values; each value is posted as String(value)
     * @returns {HTMLFormElement} the form, not yet attached to the document
     */
    function buildExportForm(doc, url, fields) {
        var form = doc.createElement("form");
        form.method = "POST";
        form.action = url;
        form.style.display = "none";
        Object.keys(fields || {}).forEach(function(name) {
            var input = doc.createElement("input");
            input.type = "hidden";
            input.name = name;
            input.value = String(fields[name]);
            form.appendChild(input);
        });
        return form;
    }

    /**
     * Downloads an export through a hidden form POST. A form POST cannot send the
     * countly-token header the dashboard's ajax calls use, so the form authenticates with the
     * session token as a field rather than the member's api_key.
     *
     * @param {String} url Form action
     * @param {Object} fields Field names and values to post
     */
    function submitExportForm(url, fields) {
        fields = Object.assign({}, fields);
        if (window.countlyGlobal && window.countlyGlobal.auth_token) {
            delete fields.api_key;
            fields.auth_token = window.countlyGlobal.auth_token;
        }
        var form = buildExportForm(document, url, fields);
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    }

    var _helpers = {
        DelayedAction: DelayedAction,
        buildExportForm: buildExportForm,
        submitExportForm: submitExportForm
    };

    countlyVue.helpers = _helpers;

}(window.countlyVue = window.countlyVue || {}));
