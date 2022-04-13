/*global countlyCommon,$,Promise */
(function(countlyApi) {
    /**
     * 
     * @param {string} url of server request endpoint
     * @param {Object} options object of server request
     * @returns {Promise} response that resolves to server response data transfer object. Otherwise, throws error.
     */
    function request(url, options) {
        var requestOptions = {};
        if (!url) {
            throw new Error("Request Url not found.");
        }
        requestOptions.type = options.type ? options.type : "GET";
        if (options.data) {
            requestOptions.data = options.data;
        }
        requestOptions.contentType = options.contentType ? options.contentType : "application/json";
        return new Promise(function(resolve, reject) {
            requestOptions.success = resolve;
            requestOptions.error = reject;
            requestOptions.url = url;
            $.ajax(requestOptions, {disableAutoCatch: options.disableAutoCatch || true});
        });
    }

    countlyApi.cohorts = {
        findAll: function(method, outputFormat) {
            return request(countlyCommon.API_PARTS.data.r, {
                data: {
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    method: method,
                    outputFormat: outputFormat
                }
            });
        },
    };

    countlyApi.events = {
        findAll: function() {
            return request(countlyCommon.API_PARTS.data.r, {
                data: {
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    method: "get_events",
                }
            });
        }
    };

    countlyApi.geo = {
        findAll: function() {
            return new Promise(function(resolve, reject) {
                request(window.countlyCommon.API_URL + '/o?method=get_locations', {
                    data: {
                        app_id: countlyCommon.ACTIVE_APP_ID,
                    },
                }).then(function(response) {
                    if (response.error) {
                        reject(new Error(response.error));
                        return;
                    }
                    resolve(response);
                }).catch(function(error) {
                    reject(error);
                });
            });
        },
        save: function(dto) {
            dto.app = countlyCommon.ACTIVE_APP_ID;
            return new Promise(function(resolve, reject) {
                request(window.countlyCommon.API_URL + '/i/geolocations/create', {
                    data: {
                        app_id: countlyCommon.ACTIVE_APP_ID,
                        args: JSON.stringify(dto)
                    },
                }).then(function(response) {
                    if (response.error) {
                        reject(new Error(response.error));
                        return;
                    }
                    resolve(response);
                }).catch(function(error) {
                    reject(error);
                });
            });
        },
        delete: function(id) {
            return new Promise(function(resolve, reject) {
                request(window.countlyCommon.API_URL + '/i/geolocations/delete', {
                    data: {
                        app_id: countlyCommon.ACTIVE_APP_ID,
                        gid: id
                    },
                }).then(function(response) {
                    if (response.error) {
                        reject(new Error(response.error));
                        return;
                    }
                    resolve(response);
                }).catch(function(error) {
                    reject(error);
                });
            });
        },
    };

    countlyApi.plugins = {
        updateAppConfig: function(config, appId) {
            return request(countlyCommon.API_PARTS.apps.w + '/update/plugins?app_id=' + appId, {
                type: "POST",
                data: JSON.stringify({
                    args: JSON.stringify(config),
                    app_id: appId
                }),
            });
        },
    };

    countlyApi.pushNotification = {
        dashboard: function(echo) {
            var data = {
                app_id: countlyCommon.ACTIVE_APP_ID
            };
            if (echo) {
                data.echo = echo;
            }
            return request(window.countlyCommon.API_URL + '/o/push/dashboard', {data: data});
        },
        findById: function(id) {
            var data = {
                _id: id,
                app_id: countlyCommon.ACTIVE_APP_ID
            };
            return request(window.countlyCommon.API_URL + "/o/push/message/GET", {data: data});
        },
        findAll: function(data) {
            data.app_id = countlyCommon.ACTIVE_APP_ID;
            return request(countlyCommon.API_PARTS.data.r + "/push/message/all", {data: data});
        },
        delete: function(data) {
            data.app_id = countlyCommon.ACTIVE_APP_ID;
            return request(window.countlyCommon.API_URL + '/i/push/message/remove', {
                data: data
            });
        },
        update: function(dto) {
            return new Promise(function(resolve, reject) {
                request(window.countlyCommon.API_URL + '/i/push/message/update?app_id=' + countlyCommon.ACTIVE_APP_ID, {
                    type: "POST",
                    data: JSON.stringify(dto)
                }).then(function(response) {
                    if (response.error) {
                        reject(new Error(response.error));
                        return;
                    }
                    resolve();
                }).catch(function(error) {
                    reject(error);
                });
            });
        },
        save: function(dto) {
            return new Promise(function(resolve, reject) {
                request(window.countlyCommon.API_URL + '/i/push/message/create?app_id=' + countlyCommon.ACTIVE_APP_ID, {
                    type: "POST",
                    data: JSON.stringify(dto)
                }).then(function(response) {
                    if (response.error) {
                        reject(new Error(response.error));
                        return;
                    }
                    resolve();
                }).catch(function(error) {
                    reject(error);
                });
            });
        },
        sendToTestUsers: function(dto) {
            return request(window.countlyCommon.API_URL + '/i/push/message/test?app_id=' + countlyCommon.ACTIVE_APP_ID, {
                type: "POST",
                data: JSON.stringify(dto)
            });
        },
        estimate: function(data) {
            return request(window.countlyCommon.API_URL + '/o/push/message/estimate?app_id=' + countlyCommon.ACTIVE_APP_ID, {
                type: "POST",
                data: JSON.stringify(data)
            });
        },
        getMime: function(url) {
            var data = {
                url: url,
                app_id: countlyCommon.ACTIVE_APP_ID
            };
            return request(window.countlyCommon.API_URL + '/o/push/mime', {
                data: data
            });
        },
        toggle: function(id, isActive) {
            return request(window.countlyCommon.API_URL + '/i/push/message/toggle', {
                data: {
                    _id: id,
                    active: isActive,
                    app_id: countlyCommon.ACTIVE_APP_ID
                },
            });
        },
    };

    countlyApi.pushNotificationApprover = {
        approve: function(id) {
            return request(window.countlyCommon.API_URL + '/i/push/approve', {
                data: {
                    _id: id,
                    approve: true,
                    app_id: countlyCommon.ACTIVE_APP_ID
                },
            });
        },
        reject: function(id) {
            return request(window.countlyCommon.API_URL + '/i/push/approve', {
                data: {
                    _id: id,
                    approve: false,
                    app_id: countlyCommon.ACTIVE_APP_ID
                },
            });
        }
    };

    countlyApi.userProfiles = {
        search: function(query, appId) {
            var data = {
                query: JSON.stringify(query)
            };
            return request(countlyCommon.API_PARTS.data.r + "?app_id=" + appId + "&method=user_details", {
                type: "POST",
                data: JSON.stringify(data)
            });
        },
    };


})(window.countlyApi = window.countlyApi || {});