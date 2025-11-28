/*global $, countlyCommon*/
(function(countlyMutationStatus) {
    countlyMutationStatus.fetchData = function() {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + '/system/observability',
            dataType: "json",
            data: {
                "preventRequestAbort": true
            }
        }).then(function(res) {
            return res;
        });
    };
}(window.countlyMutationStatus = window.countlyMutationStatus || {}));
