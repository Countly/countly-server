/* global countlyCommon, countlyGlobal, jQuery */

// frontend client for fetching data from cms.count.ly

var CMS_TKN = "17fa74a2b4b1524e57e8790250f89f44f364fe567f13f4dbef02ef583e70dcdb700f87a6122212bb01ca6a14a8d4b85dc314296f71681988993c013ed2f6305b57b251af723830ea2aa180fc689af1052dd74bc3f4b9b35e5674d4214a8c79695face42057424f0494631679922a3bdaeb780b522bb025dfaea8d7d56a857dba";
var CMS_BASE_URL = "https://cms.count.ly/";

(function(countlyCMS, $) {

    var transformCMSResponse = function(response, params) {
        var result = [];

        response.forEach(function(item) {
            result.push(Object.assign({_id: params.entryID + '_' + item.id, lu: Date.now()}, item.attributes));
        });

        return result;
    };

    countlyCMS.requestFromCMS = function(params) {
        var pageSize = 100;
        var url = new URL('/api/' + params.entryID, CMS_BASE_URL);
        var results = [];

        var doRequest = function(pageNumber) {
            url.searchParams.append('pagination[page]', pageNumber);
            url.searchParams.append('pagination[pageSize]', pageSize);

            if (params.populate) {
                url.searchParams.append('populate', '*');
            }

            return new Promise(function(resolve, reject) {
                $.ajax({
                    url: url.href,
                    headers: {
                        'Authorization': 'Bearer ' + CMS_TKN,
                    },
                    success: function(response) {
                        resolve(response);
                    },
                    error: function(xhr) {
                        reject(xhr.responseJSON);
                    },
                });
            });
        };

        var requestPage = function(pageNumber) {
            return doRequest(pageNumber).then(function(response) {
                var data = response.data;
                var meta = response.meta;

                if (data && data.length > 0 || data.id) {
                    results = results.concat(data);
                }

                if (meta && meta.pagination && meta.pagination.page < meta.pagination.pageCount) {
                    // Fetch next page
                    return requestPage(meta.pagination.page + 1);
                }
                else {
                    // All pages fetched or no pagination metadata, resolve
                    return Promise.resolve(results);
                }
            });
        };

        return requestPage(1);
    };

    countlyCMS.saveEntries = function(entryID, entries) {
        var formData = new FormData();
        formData.append('app_id', countlyCommon.ACTIVE_APP_ID);
        formData.append('api_key', countlyGlobal.member.api_key);
        formData.append('_id', entryID);
        formData.append('entries', JSON.stringify(entries));

        return new Promise(function(resolve, reject) {
            $.ajax({
                url: countlyCommon.API_PARTS.data.w + "/cms/save_entries",
                method: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function(response) {
                    resolve(response);
                },
                error: function(xhr) {
                    reject(xhr.responseJSON);
                },
            });
        });
    };

    countlyCMS.newFetchEntry = function(entryID, options) {
        var params = {};
        params.entryID = entryID;

        if (options.populate) {
            params.populate = options.populate;
        }
        if (options.query) {
            params.query = JSON.stringify(options.query);
        }

        return new Promise(function(resolve, reject) {
            countlyCMS.requestFromCMS(params)
                .then(function(resp) {
                    resolve({data: transformCMSResponse(resp, params)});
                })
                .catch(function(err) {
                    reject(err);
                });
        });
    };

    countlyCMS.fetchEntry = function(entryID, options) {
        var data = { _id: entryID };
        if (options) {
            if (options.populate) {
                data.populate = options.populate;
            }
            if (options.query) {
                data.query = JSON.stringify(options.query);
            }
            if (options.refresh) {
                data.refresh = options.refresh;
            }
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
