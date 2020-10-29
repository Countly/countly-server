/* global countlyGlobal */

(function(countlyVue) {

    /**
     * Simple implementation for abortable delayed actions.
     * Primarily used for table undo events.
     *
     * @param {String} message Action description
     * @param {Function} actionFn Delayed action
     * @param {Function} abortFn Callback will be called on abort
     * @param {Number} timeout Delay amount in ms
     */
    function DelayedAction(message, actionFn, abortFn, timeout) {
        this.message = message;
        this.timeout = setTimeout(actionFn, timeout || 2000);
        this.abortFn = abortFn;
    }

    DelayedAction.prototype.abort = function() {
        clearTimeout(this.timeout);
        this.abortFn();
    };

    var DataTable = {
        toLegacyRequest: function(requestParams, cols) {
            var convertedParams = {};
            convertedParams.iDisplayStart = (requestParams.page - 1) * requestParams.perPage;
            convertedParams.iDisplayLength = requestParams.perPage;
            if (cols && requestParams.sort && requestParams.sort.length > 0) {
                var sorter = requestParams.sort[0];
                var sortFieldIndex = cols.indexOf(sorter.field);
                if (sortFieldIndex > -1) {
                    convertedParams.iSortCol_0 = sortFieldIndex;
                    convertedParams.sSortDir_0 = sorter.type;
                }
            }
            if (requestParams.searchQuery) {
                convertedParams.sSearch = requestParams.searchQuery;
            }
            return convertedParams;
        },
        toStandardResponse: function(response, requestOptions) {
            response = response || {};
            requestOptions = requestOptions || {};
            var fields = {
                rows: response.aaData || [],
                totalRows: response.iTotalDisplayRecords || 0,
                notFilteredTotalRows: response.iTotalRecords || 0
            };
            if (Object.prototype.hasOwnProperty.call(response, "sEcho")) {
                fields.echo = parseInt(response.sEcho);
            }
            if (Object.prototype.hasOwnProperty.call(requestOptions, "url")) {
                var pairs = [];
                for (var dataKey in requestOptions.data) {
                    if (dataKey === "iDisplayStart" || dataKey === "iDisplayLength") {
                        continue;
                    }
                    pairs.push(dataKey + "=" + requestOptions.data[dataKey]);
                }
                pairs.push("api_key=" + countlyGlobal.member.api_key);

                fields.exportSettings = {
                    resourcePath: requestOptions.url + "?" + pairs.join("&"),
                    resourceProp: "aaData"
                };
            }
            return fields;
        }
    };

    var _helpers = {
        DelayedAction: DelayedAction,
        DataTable: DataTable
    };

    countlyVue.helpers = _helpers;

}(window.countlyVue = window.countlyVue || {}));
