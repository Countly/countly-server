/*global
    CountlyHelpers,
    countlyGlobal,
    countlyCommon,
    jQuery,
    countlySources,
    $,
 */
(function() {
    var stores;
    if (countlyGlobal.plugins && countlyGlobal.plugins.indexOf('sources') !== -1) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/sources",
            data: {"preventGlobalAbort": true},
            dataType: "json",
            success: function(json) {
                stores = json;
            }
        });
    }

    /**
	 * get source readable name
	 * @param {string} code source code
     * @param {string} data not use yet
     * @param {boolean} separate include sperator or not, default to false
	 * @return {string} - source name
	 */
    function getSourceName(code, data, separate) {
        code = countlyCommon.decode(code + "");
        if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "mobile") {
            //ignore incorrect Android values, which are numbers
            if (!isNaN(parseFloat(code)) && isFinite(code)) {
                return jQuery.i18n.map["common.unknown"];
            }
            if (separate) {
                return code;
            }
            if (stores && stores[code]) {
                return stores[code];
            }
            else {
                for (var i in stores) {
                    if (code.indexOf(i) === 0) {
                        return stores[i];
                    }
                }
                return code;
            }
        }
        else {
            if (code.indexOf("://") === -1 && code.indexOf(".") === -1) {
                if (separate) {
                    return code;
                }
                return jQuery.i18n.map["sources.direct"];
            }
            else if (separate) {
                return code;
            }
            code = code.replace("://www.", "://");
            /*eslint-disable */
            var matches = code.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
            var subDomains = code.split('.');
            /*eslint-enable */
            var domain = matches && matches[1] || subDomains.length >= 4 ? subDomains.slice(-3).join('.') : code;
            return domain.split("/")[0];
        }
    }

    window.countlySources = window.countlySources || {};
    window.countlySources.getSourceName = getSourceName;
    countlySources.initializeKeywords = function(isRefresh) {
        var self = this;
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/keywords",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "period": countlyCommon.getPeriodForAjax(),
                "display_loader": !isRefresh
            },
            success: function(json) {
                self._keywords = json;
            }
        });
    };
    countlySources.getKeywords = function() {
        var data = JSON.parse(JSON.stringify(this._keywords));
        for (var i = 0; i < this._keywords.length; i++) {
            data[i]._id = countlyCommon.decode(data[i]._id.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '').toLowerCase());
        }
        return countlyCommon.mergeMetricsByName(data, "_id");
    };


    countlySources.getCodesFromName = function(value) {
        var codes = [];
        var lowerCase = value.toLowerCase();
        if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "mobile") {
            if (stores) {
                for (var p in stores) {
                    if (stores[p].toLowerCase().startsWith(lowerCase)) {
                        codes.push(p);
                    }
                }
            }
        }
        else {
            codes.push(value);
        }
        return codes;
    };


    CountlyHelpers.createMetricModel(window.countlySources, {name: "sources", estOverrideMetric: "sources"}, jQuery, getSourceName);
}());