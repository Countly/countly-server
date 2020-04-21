/*globals countlyCommon,countlyDeviceList,countlyGlobal,jQuery,CountlyHelpers,app,_metas */
(function(countlyCrashes, $) {

    //Private Properties
    var _crashData = {},
        _groupData = {},
        _reportData = {},
        _crashTimeline = {},
        _list = {},
        _period = {},
        _metrics = {},
        _groups = {},
        _lastId = null,
        _usable_metrics = {
            metrics: {},
            custom: {}
        },
        _activeFilter = {
            "platform": null,
            "version": null,
            "fatality": "fatal"
        };

    countlyCrashes.getActiveFilter = function() {
        return _activeFilter;
    };

    countlyCrashes.setActiveFilter = function(filter) {
        _activeFilter = filter;
    };

    countlyCrashes.resetActiveFilter = function() {
        _activeFilter = {
            "platform": null,
            "version": null,
            "fatality": "fatal"
        };
    };

    countlyCrashes.getVersionName = function(version) {
        if (!version) {
            return false;
        }
        return (version + "").replace(/:/g, ".");
    };

    var extendRequestWithFilter = function(requestParams) {
        if (_activeFilter) {
            if (_activeFilter.version) {
                requestParams.app_version = _activeFilter.version;
            }
            if (_activeFilter.platform) {
                requestParams.os = _activeFilter.platform;
            }
            if (_activeFilter.fatality) {
                requestParams.nonfatal = _activeFilter.fatality === 'nonfatal';
            }
        }
    };

    countlyCrashes.loadList = function(id) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r,
            data: {
                "app_id": id,
                "method": "crashes",
                "list": 1,
                "preventRequestAbort": true
            },
            dataType: "json",
            success: function(json) {
                for (var i = 0; i < json.length; i++) {
                    _list[json[i]._id] = json[i].name;
                }
            }
        });
    };

    if (countlyGlobal.member && countlyGlobal.member.api_key && countlyCommon.ACTIVE_APP_ID !== 0) {
        countlyCrashes.loadList(countlyCommon.ACTIVE_APP_ID);
    }

    //Public Methods
    countlyCrashes.initialize = function(id, isRefresh) {
        _metrics = {
            "os_name": jQuery.i18n.map["crashes.os"],
            "browser": jQuery.i18n.map["crashes.browser"],
            "view": jQuery.i18n.map["crashes.view"],
            "app_version": jQuery.i18n.map["crashes.app_version"],
            "os_version": jQuery.i18n.map["crashes.os_version"],
            "manufacture": jQuery.i18n.map["crashes.manufacture"],
            "device": jQuery.i18n.map["crashes.device"],
            "resolution": jQuery.i18n.map["crashes.resolution"],
            "orientation": jQuery.i18n.map["crashes.orientation"],
            "cpu": jQuery.i18n.map["crashes.cpu"],
            "opengl": jQuery.i18n.map["crashes.opengl"]
        };
        _groups = {
            "metrics": jQuery.i18n.map["crashes.group-metrics"],
            "custom": jQuery.i18n.map["crashes.group-custom"]
        };

        _period = countlyCommon.getPeriodForAjax();
        if (id) {
            _lastId = id;
            return $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "crashes",
                    "period": _period,
                    "group": id,
                    "display_loader": !isRefresh
                },
                dataType: "json",
                success: function(json) {
                    _groupData = json;
                    var i;
                    if (_groupData.data && _groupData.data.length) {
                        for (i = 0; i < _groupData.data.length; i++) {
                            _reportData[_groupData.data[i]._id] = _groupData.data[i];
                        }
                    }
                    _groupData.name = countlyCommon.decode(_groupData.name);
                    _groupData.error = countlyCommon.decode(_groupData.error);
                    _list[_groupData._id] = _groupData.name;
                    _groupData.dp = {};
                    for (i in _metrics) {
                        if (_groupData[i]) {
                            _usable_metrics.metrics[i] = _metrics[i];
                            _groupData.dp[i] = countlyCrashes.processMetric(_groupData[i], i, _metrics[i]);
                        }
                    }
                    if (_groupData.custom) {
                        for (i in _groupData.custom) {
                            _groupData.dp[i] = countlyCrashes.processMetric(_groupData.custom[i], i, i);
                            _usable_metrics.custom[i] = i.charAt(0).toUpperCase() + i.slice(1);
                        }
                    }
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    if (errorThrown && errorThrown === "Bad Request") {
                        CountlyHelpers.alert(jQuery.i18n.map["crashes.not-found"], "red");
                        app.navigate("/crashes", true);
                    }
                }
            });
        }
        else {
            var requestParams = {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "period": _period,
                "method": "crashes",
                "graph": 1,
                "display_loader": !isRefresh
            };

            extendRequestWithFilter(requestParams);

            return $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: requestParams,
                dataType: "json",
                success: function(json) {
                    _crashData = json;
                    _crashTimeline = json.data;
                    setMeta();
                    if (_crashData.crashes.latest_version === "") {
                        _crashData.crashes.latest_version = "None";
                    }
                    if (_crashData.crashes.error === "") {
                        _crashData.crashes.error = "None";
                    }
                    if (_crashData.crashes.os === "") {
                        _crashData.crashes.os = "None";
                    }
                    if (_crashData.crashes.highest_app === "") {
                        _crashData.crashes.highest_app = "None";
                    }
                }
            });
        }
    };

    countlyCrashes.getCrashName = function(id) {
        if (_list[id]) {
            return _list[id];
        }
        return id;
    };

    countlyCrashes.getRequestData = function() {
        return {
            "app_id": countlyCommon.ACTIVE_APP_ID,
            "method": "crashes",
            "group": _lastId,
            "userlist": true
        };
    };

    countlyCrashes.getId = function() {
        return _lastId;
    };

    countlyCrashes.common = function(id, path, callback) {
        var data = {};
        if (typeof id === "string") {
            data.crash_id = id;
        }
        else {
            data.crashes = id;
        }
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + '/crashes/' + path,
            data: {
                args: JSON.stringify(data),
                app_id: countlyCommon.ACTIVE_APP_ID
            },
            dataType: "json",
            success: function(json) {
                if (callback) {
                    callback(json);
                }
            },
            error: function() {
                if (callback) {
                    callback(false);
                }
            }
        });
    };

    countlyCrashes.markResolve = function(id, callback) {
        countlyCrashes.common(id, "resolve", function(json) {
            if (json) {
                if (typeof id === "string") {
                    callback((json[id] + "").replace(/:/g, '.'));
                }
                else {
                    callback(json);
                }
            }
            else {
                callback();
            }
        });
    };

    countlyCrashes.markUnresolve = function(id, callback) {
        countlyCrashes.common(id, "unresolve", callback);
    };

    countlyCrashes.markSeen = function(id, callback) {
        countlyCrashes.common(id, "view", callback);
    };

    countlyCrashes.share = function(id, callback) {
        countlyCrashes.common(id, "share", callback);
    };

    countlyCrashes.unshare = function(id, callback) {
        countlyCrashes.common(id, "unshare", callback);
    };

    countlyCrashes.hide = function(id, callback) {
        countlyCrashes.common(id, "hide", callback);
    };

    countlyCrashes.show = function(id, callback) {
        countlyCrashes.common(id, "show", callback);
    };

    countlyCrashes.resolving = function(id, callback) {
        countlyCrashes.common(id, "resolving", callback);
    };

    countlyCrashes.del = function(id, callback) {
        countlyCrashes.common(id, "delete", callback);
    };

    countlyCrashes.modifyShare = function(id, data, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + '/crashes/modify_share',
            data: {
                args: JSON.stringify({
                    crash_id: id,
                    data: data
                }),
                app_id: countlyCommon.ACTIVE_APP_ID
            },
            dataType: "json",
            success: function() {
                if (callback) {
                    callback(true);
                }
            },
            error: function() {
                if (callback) {
                    callback(false);
                }
            }
        });
    };

    countlyCrashes.addComment = function(id, data, callback) {
        data = data || {};
        data.app_id = countlyCommon.ACTIVE_APP_ID;
        data.crash_id = id;
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + '/crashes/add_comment',
            data: {
                args: JSON.stringify(data)
            },
            dataType: "json",
            success: function() {
                if (callback) {
                    callback(true);
                }
                app.recordEvent({
                    "key": "crash-comment",
                    "count": 1,
                    "segmentation": {}
                });
            },
            error: function() {
                if (callback) {
                    callback(false);
                }
            }
        });
    };

    countlyCrashes.editComment = function(id, data, callback) {
        data = data || {};
        data.app_id = countlyCommon.ACTIVE_APP_ID;
        data.crash_id = id;
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + '/crashes/edit_comment',
            data: {
                args: JSON.stringify(data)
            },
            dataType: "json",
            success: function() {
                if (callback) {
                    callback(true);
                }
            },
            error: function() {
                if (callback) {
                    callback(false);
                }
            }
        });
    };

    countlyCrashes.deleteComment = function(id, data, callback) {
        data = data || {};
        data.app_id = countlyCommon.ACTIVE_APP_ID;
        data.crash_id = id;
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + '/crashes/delete_comment',
            data: {
                args: JSON.stringify(data)
            },
            dataType: "json",
            success: function() {
                if (callback) {
                    callback(true);
                }
            },
            error: function() {
                if (callback) {
                    callback(false);
                }
            }
        });
    };

    countlyCrashes.reload = function() {
        var requestParams = {
            "app_id": countlyCommon.ACTIVE_APP_ID,
            "period": _period,
            "method": "crashes",
            "graph": 1,
            "display_loader": false
        };

        extendRequestWithFilter(requestParams);

        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r,
            data: requestParams,
            dataType: "json",
            success: function(json) {
                _crashData = json;
                _crashTimeline = json.data;
                if (_crashData.crashes.latest_version === "") {
                    _crashData.crashes.latest_version = "None";
                }
                if (_crashData.crashes.error === "") {
                    _crashData.crashes.error = "None";
                }
                if (_crashData.crashes.os === "") {
                    _crashData.crashes.os = "None";
                }
                if (_crashData.crashes.highest_app === "") {
                    _crashData.crashes.highest_app = "None";
                }
            }
        });
    };

    countlyCrashes.refresh = function(id) {
        _period = countlyCommon.getPeriodForAjax();
        if (id) {

            return $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "crashes",
                    "period": _period,
                    "group": id,
                    "display_loader": false
                },
                dataType: "json",
                success: function(json) {
                    _groupData = json;
                    var i;
                    if (_groupData.data && _groupData.data.length) {
                        for (i = 0; i < _groupData.data.length; i++) {
                            _reportData[_groupData.data[i]._id] = _groupData.data[i];
                        }
                    }
                    _list[_groupData._id] = _groupData.name;
                    _groupData.dp = {};
                    for (i in _metrics) {
                        if (_groupData[i]) {
                            _usable_metrics.metrics[i] = _metrics[i];
                            _groupData.dp[i] = countlyCrashes.processMetric(_groupData[i], i, _metrics[i]);
                        }
                    }
                    if (_groupData.custom) {
                        for (i in _groupData.custom) {
                            _groupData.dp[i] = countlyCrashes.processMetric(_groupData.custom[i], i, i);
                            _usable_metrics.custom[i] = i.charAt(0).toUpperCase() + i.slice(1);
                        }
                    }
                }
            });
        }
        else {
            var requestParams = {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "period": _period,
                "method": "crashes",
                "action": "refresh",
                "graph": 1,
                "display_loader": false
            };

            extendRequestWithFilter(requestParams);

            return $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: requestParams,
                dataType: "json",
                success: function(json) {
                    _crashData = json;
                    if (_crashData.crashes.latest_version === "") {
                        _crashData.crashes.latest_version = "None";
                    }
                    if (_crashData.crashes.error === "") {
                        _crashData.crashes.error = "None";
                    }
                    if (_crashData.crashes.os === "") {
                        _crashData.crashes.os = "None";
                    }
                    if (_crashData.crashes.highest_app === "") {
                        _crashData.crashes.highest_app = "None";
                    }
                    countlyCommon.extendDbObj(_crashTimeline, json.data);
                }
            });
        }
    };

    countlyCrashes.reset = function() {
        _crashData = {};
        _groupData = {};
        _reportData = {};
        _crashTimeline = {};
        _metrics = {};
        _groups = {};
        _usable_metrics = {
            metrics: {},
            custom: {}
        };
        countlyCrashes.resetActiveFilter();
    };

    countlyCrashes.processMetric = function(data, metric, label) {

        var ret = {dp: [{data: [[-1, null]], "label": label}], ticks: [[-1, ""]]};
        if (data) {
            var vals = [];
            for (var key in data) {
                vals.push({key: key, val: data[key]});
            }
            vals.sort(function(a, b) {
                return b.val - a.val;
            });
            for (var i = 0; i < vals.length; i++) {
                ret.dp[0].data.push([i, vals[i].val]);
                var l = (vals[i].key + "").replace(/:/g, '.');
                if (metric === "device" && countlyDeviceList && countlyDeviceList[l]) {
                    l = countlyDeviceList[l];
                }
                ret.ticks.push([i, l]);
            }
            ret.dp[0].data.push([vals.length, null]);
        }
        return ret;
    };

    countlyCrashes.getChartData = function(metric, name) {
        var chartData = [];
        var dataProps = [];

        if (metric === "cr-session") {
            //get crashes graph
            if (name === "crtf" || _activeFilter.fatality === "fatal") {
                chartData.push({ data: [], label: jQuery.i18n.map["crashes.total-per-session"], color: '#DDDDDD', mode: "ghost" });
                chartData.push({ data: [], label: jQuery.i18n.map["crashes.total-per-session"], color: countlyCommon.GRAPH_COLORS[1] });
                dataProps.push({
                    name: "pcrtf",
                    func: function(dataObj) {
                        if (dataObj.cr_s !== 0) {
                            return Math.round(Math.min(dataObj.crf / dataObj.cr_s, 1) * 100) / 100;
                        }
                        return 0;
                    },
                    period: "previous"
                });
                dataProps.push({
                    name: "crtf",
                    func: function(dataObj) {
                        if (dataObj.cr_s !== 0) {
                            return Math.round(Math.min(dataObj.crf / dataObj.cr_s, 1) * 100) / 100;
                        }
                        return 0;
                    }
                });
            }
            else if (name === "crtnf" || _activeFilter.fatality === "nonfatal") {
                chartData.push({ data: [], label: jQuery.i18n.map["crashes.total-per-session"], color: '#DDDDDD', mode: "ghost" });
                chartData.push({ data: [], label: jQuery.i18n.map["crashes.total-per-session"], color: countlyCommon.GRAPH_COLORS[1] });
                dataProps.push({
                    name: "pcrtnf",
                    func: function(dataObj) {
                        if (dataObj.cr_s !== 0) {
                            return Math.round(Math.min(dataObj.crnf / dataObj.cr_s, 1) * 100) / 100;
                        }
                        return 0;
                    },
                    period: "previous"
                });
                dataProps.push({
                    name: "crtnf",
                    func: function(dataObj) {
                        if (dataObj.cr_s !== 0) {
                            return Math.round(Math.min(dataObj.crnf / dataObj.cr_s, 1) * 100) / 100;
                        }
                        return 0;
                    }
                });
            }

            return countlyCommon.extractChartData(_crashTimeline, countlyCrashes.clearObject, chartData, dataProps);

        }
        else if (metric === "crses") {
            //get crashes graph
            if (name === "crfses" || _activeFilter.fatality === "fatal") {
                chartData.push({ data: [], label: jQuery.i18n.map["crashes.free-sessions"], color: '#DDDDDD', mode: "ghost" });
                chartData.push({ data: [], label: jQuery.i18n.map["crashes.free-sessions"], color: countlyCommon.GRAPH_COLORS[0] });
                dataProps.push({
                    name: "pcrfses",
                    func: function(dataObj) {
                        if (dataObj.cr_s !== 0) {
                            return Math.round(Math.min(dataObj.crfses / dataObj.cr_s, 1) * 10000) / 100;
                        }
                        else {
                            return 100;
                        }
                    },
                    period: "previous"
                });
                dataProps.push({
                    name: "crfses",
                    func: function(dataObj) {
                        if (dataObj.cr_s !== 0) {
                            return Math.round(Math.min(dataObj.crfses / dataObj.cr_s, 1) * 10000) / 100;
                        }
                        else {
                            return 100;
                        }
                    },
                });
            }
            else if (name === "crnfses" || _activeFilter.fatality === "nonfatal") {
                chartData.push({ data: [], label: jQuery.i18n.map["crashes.free-sessions"], color: '#DDDDDD', mode: "ghost" });
                chartData.push({ data: [], label: jQuery.i18n.map["crashes.free-sessions"], color: countlyCommon.GRAPH_COLORS[0] });
                dataProps.push({
                    name: "pcrnfses",
                    func: function(dataObj) {
                        if (dataObj.cr_s !== 0) {
                            return Math.round(Math.min(dataObj.crnfses / dataObj.cr_s, 1) * 10000) / 100;
                        }
                        else {
                            return 100;
                        }
                    },
                    period: "previous"
                });
                dataProps.push({
                    name: "crnfses",
                    func: function(dataObj) {
                        if (dataObj.cr_s !== 0) {
                            return Math.round(Math.min(dataObj.crnfses / dataObj.cr_s, 1) * 10000) / 100;
                        }
                        else {
                            return 100;
                        }
                    }
                });
            }

            return countlyCommon.extractChartData(_crashTimeline, countlyCrashes.clearObject, chartData, dataProps);
        }
        else if (metric === "crau") {
            //get crashes graph
            if (name === "crauf" || _activeFilter.fatality === "fatal") {
                chartData.push({ data: [], label: jQuery.i18n.map["crashes.free-users"], color: '#DDDDDD', mode: "ghost" });
                chartData.push({ data: [], label: jQuery.i18n.map["crashes.free-users"], color: countlyCommon.GRAPH_COLORS[0] });
                dataProps.push({
                    name: "pcrauf",
                    func: function(dataObj) {
                        if (dataObj.cr_u !== 0) {
                            return Math.round(Math.min(dataObj.crauf / dataObj.cr_u, 1) * 10000) / 100;
                        }
                        else {
                            return 100;
                        }
                    },
                    period: "previous"
                });
                dataProps.push({
                    name: "crauf",
                    func: function(dataObj) {
                        if (dataObj.cr_u !== 0) {
                            return Math.round(Math.min(dataObj.crauf / dataObj.cr_u, 1) * 10000) / 100;
                        }
                        else {
                            return 100;
                        }
                    }
                });
            }
            else if (name === "craunf" || _activeFilter.fatality === "nonfatal") {
                chartData.push({ data: [], label: jQuery.i18n.map["crashes.free-users"], color: '#DDDDDD', mode: "ghost" });
                chartData.push({ data: [], label: jQuery.i18n.map["crashes.free-users"], color: countlyCommon.GRAPH_COLORS[0] });
                dataProps.push({
                    name: "pcraunf",
                    func: function(dataObj) {
                        if (dataObj.cr_u !== 0) {
                            return Math.round(Math.min(dataObj.craunf / dataObj.cr_u, 1) * 10000) / 100;
                        }
                        else {
                            return 100;
                        }
                    },
                    period: "previous"
                });
                dataProps.push({
                    name: "craunf",
                    func: function(dataObj) {
                        if (dataObj.cr_u !== 0) {
                            return Math.round(Math.min(dataObj.craunf / dataObj.cr_u, 1) * 10000) / 100;
                        }
                        else {
                            return 100;
                        }
                    }
                });
            }

            return countlyCommon.extractChartData(_crashTimeline, countlyCrashes.clearObject, chartData, dataProps);
        }
        else if (metric === "cr") {
            //get crashes graph
            if (_activeFilter.fatality === "fatal") {
                chartData.push({ data: [], label: jQuery.i18n.map["crashes.total"], color: '#DDDDDD', mode: "ghost" });
                chartData.push({ data: [], label: jQuery.i18n.map["crashes.total"], color: countlyCommon.GRAPH_COLORS[1] });
                dataProps.push({
                    name: "pcrf",
                    func: function(dataObj) {
                        return dataObj.crf;
                    },
                    period: "previous"
                });
                dataProps.push({ name: "crf" });
            }
            else if (_activeFilter.fatality === "nonfatal") {
                chartData.push({ data: [], label: jQuery.i18n.map["crashes.total"], color: '#DDDDDD', mode: "ghost" });
                chartData.push({ data: [], label: jQuery.i18n.map["crashes.total"], color: countlyCommon.GRAPH_COLORS[1] });
                dataProps.push({
                    name: "pcrnf",
                    func: function(dataObj) {
                        return dataObj.crnf;
                    },
                    period: "previous"
                });
                dataProps.push({ name: "crnf" });
            }

            return countlyCommon.extractChartData(_crashTimeline, countlyCrashes.clearObject, chartData, dataProps);
        }
        else if (metric === "cru") {
            //get crashes graph
            if (_activeFilter.fatality === "fatal") {
                chartData.push({ data: [], label: jQuery.i18n.map["crashes.unique"], color: '#DDDDDD', mode: "ghost" });
                chartData.push({ data: [], label: jQuery.i18n.map["crashes.unique"], color: countlyCommon.GRAPH_COLORS[1] });
                dataProps.push({
                    name: "pcruf",
                    func: function(dataObj) {
                        return dataObj.cruf;
                    },
                    period: "previous"
                });
                dataProps.push({ name: "cruf" });
            }
            else if (_activeFilter.fatality === "nonfatal") {
                chartData.push({ data: [], label: jQuery.i18n.map["crashes.unique"], color: '#DDDDDD', mode: "ghost" });
                chartData.push({ data: [], label: jQuery.i18n.map["crashes.unique"], color: countlyCommon.GRAPH_COLORS[1] });
                dataProps.push({
                    name: "pcrunf",
                    func: function(dataObj) {
                        return dataObj.crunf;
                    },
                    period: "previous"
                });
                dataProps.push({ name: "crunf" });
            }

            return countlyCommon.extractChartData(_crashTimeline, countlyCrashes.clearObject, chartData, dataProps);
        }
        else {
            chartData = [
                { data: [], label: name, color: '#DDDDDD', mode: "ghost" },
                { data: [], label: name, color: '#333933' }
            ],
            dataProps = [
                {
                    name: "p" + metric,
                    func: function(dataObj) {
                        return dataObj[metric];
                    },
                    period: "previous"
                },
                { name: metric }
            ];
            return countlyCommon.extractChartData(_crashTimeline, countlyCrashes.clearObject, chartData, dataProps);
        }
    };

    countlyCrashes.getMetrics = function() {
        var ob = {};
        for (var i in _usable_metrics) {
            ob[_groups[i]] = _usable_metrics[i];
        }
        return ob;
    };

    countlyCrashes.getData = function() {
        return _crashData;
    };

    countlyCrashes.getGroupData = function() {
        var i = 0, thread, stack;
        if (_groupData && _groupData.threads) {
            for (i = 0; i < _groupData.threads.length; i++) {
                thread = _groupData.threads[i];
                stack = thread.error.split("\n");
                thread.short_error = [];
                if (stack.length > 4) {
                    thread.short_error = stack.slice(0, 3).join("\n") + "\n...";
                    thread.expand = true;
                }
                else {
                    thread.short_error = thread.error;
                    thread.expand = false;
                }
            }
        }
        if (_groupData && _groupData.lrid && _groupData.data && _groupData.data.length) {
            for (i = 0; i < _groupData.data.length; i++) {
                if (_groupData.data[i]._id + "" === _groupData.lrid) {
                    _groupData.olderror = _groupData.data[i].olderror || _groupData.error;
                    _groupData.oldthreads = _groupData.data[i].oldthreads || _groupData.threads;
                    break;
                }
            }
        }
        if (_groupData && _groupData.oldthreads) {
            for (i = 0; i < _groupData.oldthreads.length; i++) {
                thread = _groupData.oldthreads[i];
                stack = thread.error.split("\n");
                thread.short_error = [];
                if (stack.length > 4) {
                    thread.short_error = stack.slice(0, 3).join("\n") + "\n...";
                    thread.expand = true;
                }
                else {
                    thread.short_error = thread.error;
                    thread.expand = false;
                }
            }
        }
        return _groupData;
    };

    countlyCrashes.setGroupData = function(data) {
        _metrics = {
            "os_name": jQuery.i18n.map["crashes.os"],
            "browser": jQuery.i18n.map["crashes.browser"],
            "view": jQuery.i18n.map["crashes.view"],
            "app_version": jQuery.i18n.map["crashes.app_version"],
            "os_version": jQuery.i18n.map["crashes.os_version"],
            "manufacture": jQuery.i18n.map["crashes.manufacture"],
            "device": jQuery.i18n.map["crashes.device"],
            "resolution": jQuery.i18n.map["crashes.resolution"],
            "orientation": jQuery.i18n.map["crashes.orientation"],
            "cpu": jQuery.i18n.map["crashes.cpu"],
            "opengl": jQuery.i18n.map["crashes.opengl"]
        };
        _groups = {
            "metrics": jQuery.i18n.map["crashes.group-metrics"],
            "custom": jQuery.i18n.map["crashes.group-custom"]
        };
        _groupData = data;
        _groupData.dp = {};
        for (var i in _metrics) {
            if (_groupData[i]) {
                _usable_metrics.metrics[i] = _metrics[i];
                _groupData.dp[i] = countlyCrashes.processMetric(_groupData[i], i, _metrics[i]);
            }
        }
        if (_groupData.custom) {
            for (var k in _groupData.custom) {
                _groupData.dp[k] = countlyCrashes.processMetric(_groupData.custom[k], k, k);
                _usable_metrics.custom[k] = k.charAt(0).toUpperCase() + k.slice(1);
            }
        }
    };

    countlyCrashes.getReportData = function(id) {
        return _reportData[id];
    };

    countlyCrashes.getErrorName = function() {
        var error = _crashData.crashes.error.split(":")[0];
        return error;
    };

    countlyCrashes.getAffectedUsers = function() {
        if (_crashData.users.total > 0) {
            var ret = [];
            var affected = (_crashData.users.affected / _crashData.users.total) * 100;
            var fatal = (_crashData.users.fatal / _crashData.users.total) * 100;
            var nonfatal = ((_crashData.users.affected - _crashData.users.fatal) / _crashData.users.total) * 100;
            var name1 = Math.round(fatal) + "% " + jQuery.i18n.map["crashes.fatal"];
            if (fatal > 0) {
                ret.push({"name": name1, "percent": fatal});
            }
            var name2 = Math.round(nonfatal) + "% " + jQuery.i18n.map["crashes.nonfatal"];
            if (nonfatal > 0) {
                ret.push({"name": name2, "percent": nonfatal});
            }
            var name3 = Math.round(100 - affected) + "% " + jQuery.i18n.map["crashes.notaffected"];
            if (100 - affected > 0) {
                ret.push({"name": name3, "percent": 100 - affected});
            }
            return ret;
        }
        return [];
    };

    countlyCrashes.getFatalBars = function() {
        if (_crashData.crashes.total > 0) {
            var ret = [];
            var total = _crashData.crashes.fatal + _crashData.crashes.nonfatal;
            var fatal = (_crashData.crashes.fatal / total) * 100;
            var nonfatal = (_crashData.crashes.nonfatal / total) * 100;
            var name1 = Math.round(fatal) + "% " + jQuery.i18n.map["crashes.fatal"];
            if (fatal > 0) {
                ret.push({"name": name1, "percent": fatal});
            }
            var name2 = Math.round(nonfatal) + "% " + jQuery.i18n.map["crashes.nonfatal"];
            if (nonfatal > 0) {
                ret.push({"name": name2, "percent": nonfatal});
            }
            return ret;
        }
        return [];
    };

    countlyCrashes.getResolvedBars = function() {
        if (_crashData.crashes.unique > 0) {
            var ret = [];
            var total = Math.max(_crashData.crashes.resolved, 0) + Math.max(_crashData.crashes.unresolved, 0);
            var resolved = (_crashData.crashes.resolved / total) * 100;
            var unresolved = (_crashData.crashes.unresolved / total) * 100;
            var name1 = Math.round(resolved) + "% " + jQuery.i18n.map["crashes.resolved"];
            if (resolved > 0) {
                ret.push({"name": name1, "percent": resolved});
            }
            var name2 = Math.round(unresolved) + "% " + jQuery.i18n.map["crashes.unresolved"];
            if (unresolved > 0) {
                ret.push({"name": name2, "percent": unresolved});
            }
            return ret;
        }
        return [];
    };

    countlyCrashes.getPlatformBars = function() {
        var res = [];
        var data = [];
        var total = 0;
        var i;

        for (i in _crashData.crashes.os) {
            if (_crashData.crashes.os[i] > 0) {
                data.push([i, _crashData.crashes.os[i]]);
            }
        }

        data.sort(function(a, b) {
            return b[1] - a[1];
        });

        var maxItems = 3;
        if (data.length < maxItems) {
            maxItems = data.length;
        }

        for (i = 0; i < maxItems; i++) {
            total += data[i][1];
        }

        for (i = 0; i < maxItems; i++) {
            res.push({"name": Math.round((data[i][1] / total) * 100) + "% " + data[i][0], "percent": (data[i][1] / total) * 100});
        }

        return res;
    };

    countlyCrashes.getBoolBars = function(name) {
        if (_groupData[name]) {
            _groupData[name].yes = _groupData[name].yes || 0;
            _groupData[name].no = _groupData[name].no || 0;
            var total = _groupData[name].yes + _groupData[name].no;
            var yes = (_groupData[name].yes / total) * 100;
            var no = (_groupData[name].no / total) * 100;
            var ret = [];
            if (yes > 0) {
                ret.push({"name": yes.toFixed(2) + "%", "percent": yes});
                ret.push({"name": no.toFixed(2) + "%", "percent": no});
            }
            else {
                ret.push({"name": yes.toFixed(2) + "%", "percent": no, "background": "#86CBDD"});
            }
            return ret;
        }
        return [];
    };

    countlyCrashes.getDashboardData = function() {
        var data = countlyCommon.getDashboardData(_crashTimeline, ["cr", "crnf", "crf", "cru", "cruf", "crunf", "crru", "crau", "crauf", "craunf", "crses", "crfses", "crnfses", "cr_s", "cr_u"], ["cru", "crau", "cruf", "crunf", "crauf", "craunf", "cr_u"], null, countlyCrashes.clearObject);

        data.crtf = {total: 0, "trend-total": "u", "prev-total": 0, trend: "u", change: 'NA', "total-fatal": 0, "prev-total-fatal": 0, "trend-fatal": "u", "total-nonfatal": 0, "prev-total-nonfatal": 0, "trend-nonfatal": "u"};
        data.crtnf = {total: 0, "trend-total": "u", "prev-total": 0, trend: "u", change: 'NA', "total-fatal": 0, "prev-total-fatal": 0, "trend-fatal": "u", "total-nonfatal": 0, "prev-total-nonfatal": 0, "trend-nonfatal": "u"};

        //calculare crash free users and sessions
        generateDashboardMetric(data, "crtf", "cr-session");
        generateDashboardMetric(data, "crtnf", "cr-session");
        generateDashboardMetric(data, "crauf", "crau");
        generateDashboardMetric(data, "craunf", "crau");
        generateDashboardMetric(data, "crfses", "crses");
        generateDashboardMetric(data, "crnfses", "crses");

        return {usage: data};
    };

    countlyCrashes.clearObject = function(obj) {
        if (obj) {
            if (!obj.cr) {
                obj.cr = 0;
            }
            if (!obj.cru) {
                obj.cru = 0;
            }
            if (!obj.cruf) {
                obj.cruf = 0;
            }
            if (!obj.crunf) {
                obj.crunf = 0;
            }
            if (!obj.crnf) {
                obj.crnf = 0;
            }
            if (!obj.crf) {
                obj.crf = 0;
            }
            if (!obj.crru) {
                obj.crru = 0;
            }
            if (!obj.crau) {
                obj.crau = 0;
            }
            if (!obj.crauf) {
                obj.crauf = 0;
            }
            if (!obj.craunf) {
                obj.craunf = 0;
            }
            if (!obj.crses) {
                obj.crses = 0;
            }
            if (!obj.crfses) {
                obj.crfses = 0;
            }
            if (!obj.crnfses) {
                obj.crnfses = 0;
            }
            if (!obj.cr_s) {
                obj.cr_s = 0;
            }
            if (!obj.cr_u) {
                obj.cr_u = 0;
            }
        }
        else {
            obj = {"cr": 0, "cru": 0, "cruf": 0, "crunf": 0, "crnf": 0, "crf": 0, "crru": 0, "crau": 0, "crauf": 0, "craunf": 0, "crses": 0, "crfses": 0, "crnfses": 0, "cr_s": 0, "cr_u": 0};
        }

        return obj;
    };

    /**
     *  Generate percentage data for dashboard
     *  @param {Object} data - aggregated crash data
     *  @param {string} crash - crash metric
     *  @param {string} name - crash metric name
     */
    function generateDashboardMetric(data, crash, name) {
        var chart = countlyCrashes.getChartData(name, crash);
        data[crash].total = 0;
        data[crash]["prev-total"] = 0;
        for (var i = 0; i < chart.chartData.length; i++) {
            data[crash].total += chart.chartData[i][crash];
            data[crash]["prev-total"] += chart.chartData[i]["p" + crash];
        }
        data[crash].total = data[crash].total / chart.chartData.length;
        data[crash]["prev-total"] = data[crash]["prev-total"] / chart.chartData.length;

        data[crash].trend = "u";
        if (data[crash].total < data[crash]["prev-total"]) {
            data[crash].trend = "d";
        }

        if (data[crash].total !== 0 && data[crash]["prev-total"] !== 0) {
            data[crash].change = (((data[crash].total - data[crash]["prev-total"]) / data[crash]["prev-total"]) * 100).toFixed(1);
            if (data[crash].change < 0) {
                data[crash].trend = "d";
            }
            data[crash].change = data[crash].change + "%";
        }
        else {
            if (data[crash].total !== 0) {
                data[crash].change = "∞";
            }
            else if (data[crash]["prev-total"] !== 0) {
                data[crash].trend = "d";
                data[crash].change = "-∞";
            }
        }

        data[crash].total = data[crash].total.toFixed(2);
        if (name !== "cr-session") {
            data[crash].total += "%";
        }
    }

    /**
     * Set Meta
     */
    function setMeta() {
        if (_crashTimeline.meta) {
            for (var i in _crashTimeline.meta) {
                _metas[i] = (_crashTimeline.meta[i]) ? _crashTimeline.meta[i] : [];
            }
        }
    }

}(window.countlyCrashes = window.countlyCrashes || {}, jQuery));