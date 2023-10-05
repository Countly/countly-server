/* global countlyCommon, jQuery */

// frontend client for fetching data from cms.count.ly

(function(countlyCMS, $) {

    countlyCMS.fetchEntry = function(entryID, populate, query) {
        var data = { _id: entryID };
        if (populate) {
            data.populate = populate;
        }
        if (query) {
            data.query = JSON.stringify(query);
        }
        return new Promise(function(resolve, reject) {
            $.ajax({
                url: countlyCommon.API_PARTS.data.r + "/cms/entries",
                data: data,
                success: function(response) {
                    resolve(response);
                },
                error: function(xhr) {
                    reject(xhr.responseJSON);
                },
            });
        });
    };

    countlyCMS.clearCache = function(entryID) {
        return new Promise(function(resolve, reject) {
            $.ajax({
                url: countlyCommon.API_PARTS.data.r + "/cms/clear",
                data: { _id: entryID },
                success: function(response) {
                    resolve(response);
                },
                error: function(xhr) {
                    reject(xhr.responseJSON);
                },
            });
        });
    };

}(window.countlyCMS = window.countlyCMS || {}, jQuery));
