(function(countlyCrashes, $, undefined) {

    //Private Properties
    var _crashData = {},
        _groupData = {},
        _reportData = {},
        _crashTimeline = {},
        _list = {},
        _activeAppKey = 0,
        _initialized = false,
        _period = {},
        _periodObj = {},
        _metrics = {},
        _groups = {},
        _lastId = null,
        _usable_metrics = {
            metrics: {},
            custom: {}
        };

    countlyCrashes.loadList = function(id) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r,
            data: {
                "api_key": countlyGlobal.member.api_key,
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

    if (countlyGlobal.member && countlyGlobal.member.api_key && countlyCommon.ACTIVE_APP_ID != 0) {
        countlyCrashes.loadList(countlyCommon.ACTIVE_APP_ID);
    }

    //Public Methods
    countlyCrashes.initialize = function(id, isRefresh) {
        _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
        _initialized = true;
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
                    "api_key": countlyGlobal.member.api_key,
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "crashes",
                    "period": _period,
                    "group": id,
                    "display_loader": !isRefresh
                },
                dataType: "jsonp",
                success: function(json) {
                    _groupData = json;
                    if (_groupData.data && _groupData.data.length) {
                        for (var i = 0; i < _groupData.data.length; i++) {
                            _reportData[_groupData.data[i]._id] = _groupData.data[i];
                        }
                    }
                    _groupData.name = countlyCommon.decode(_groupData.name);
                    _groupData.error = countlyCommon.decode(_groupData.error);
                    _list[_groupData._id] = _groupData.name;
                    _groupData.dp = {};
                    for (var i in _metrics) {
                        if (_groupData[i]) {
                            _usable_metrics.metrics[i] = _metrics[i];
                            _groupData.dp[i] = countlyCrashes.processMetric(_groupData[i], i, _metrics[i]);
                        }
                    }
                    if (_groupData.custom) {
                        for (var i in _groupData.custom) {
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
            return $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "api_key": countlyGlobal.member.api_key,
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "period": _period,
                    "method": "crashes",
                    "graph": 1,
                    "display_loader": !isRefresh
                },
                dataType: "jsonp",
                success: function(json) {
                    _crashData = json;
                    _crashTimeline = json.data;
                    setMeta();
                    if (_crashData.crashes.latest_version == "") {
                        _crashData.crashes.latest_version = "None";
                    }
                    if (_crashData.crashes.error == "") {
                        _crashData.crashes.error = "None";
                    }
                    if (_crashData.crashes.os == "") {
                        _crashData.crashes.os = "None";
                    }
                    if (_crashData.crashes.highest_app == "") {
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
            "api_key": countlyGlobal.member.api_key,
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
                app_id: countlyCommon.ACTIVE_APP_ID,
                api_key: countlyGlobal.member.api_key
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
                    callback(json[id].replace(/:/g, '.'));
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
                app_id: countlyCommon.ACTIVE_APP_ID,
                api_key: countlyGlobal.member.api_key
            },
            dataType: "jsonp",
            success: function(json) {
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
                args: JSON.stringify(data),
                api_key: countlyGlobal.member.api_key
            },
            dataType: "json",
            success: function(json) {
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

    countlyCrashes.editComment = function(id, data, callback) {
        data = data || {};
        data.app_id = countlyCommon.ACTIVE_APP_ID;
        data.crash_id = id;
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + '/crashes/edit_comment',
            data: {
                args: JSON.stringify(data),
                api_key: countlyGlobal.member.api_key
            },
            dataType: "json",
            success: function(json) {
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
                args: JSON.stringify(data),
                api_key: countlyGlobal.member.api_key
            },
            dataType: "json",
            success: function(json) {
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

    countlyCrashes.refresh = function(id) {
        _period = countlyCommon.getPeriodForAjax();
        if (id) {
            return $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "api_key": countlyGlobal.member.api_key,
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "crashes",
                    "period": _period,
                    "group": id,
                    "display_loader": false
                },
                dataType: "jsonp",
                success: function(json) {
                    _groupData = json;
                    if (_groupData.data && _groupData.data.length) {
                        for (var i = 0; i < _groupData.data.length; i++) {
                            _reportData[_groupData.data[i]._id] = _groupData.data[i];
                        }
                    }
                    _list[_groupData._id] = _groupData.name;
                    _groupData.dp = {};
                    for (var i in _metrics) {
                        if (_groupData[i]) {
                            _usable_metrics.metrics[i] = _metrics[i];
                            _groupData.dp[i] = countlyCrashes.processMetric(_groupData[i], i, _metrics[i]);
                        }
                    }
                    if (_groupData.custom) {
                        for (var i in _groupData.custom) {
                            _groupData.dp[i] = countlyCrashes.processMetric(_groupData.custom[i], i, i);
                            _usable_metrics.custom[i] = i.charAt(0).toUpperCase() + i.slice(1);
                        }
                    }
                }
            });
        }
        else {
            return $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "api_key": countlyGlobal.member.api_key,
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "period": _period,
                    "method": "crashes",
                    "graph": 1,
                    "display_loader": false
                },
                dataType: "jsonp",
                success: function(json) {
                    _crashData = json;
                    if (_crashData.crashes.latest_version == "") {
                        _crashData.crashes.latest_version = "None";
                    }
                    if (_crashData.crashes.error == "") {
                        _crashData.crashes.error = "None";
                    }
                    if (_crashData.crashes.os == "") {
                        _crashData.crashes.os = "None";
                    }
                    if (_crashData.crashes.highest_app == "") {
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
                var l = vals[i].key.replace(/:/g, '.');
                if (metric == "device" && countlyDeviceList && countlyDeviceList[l]) {
                    l = countlyDeviceList[l];
                }
                ret.ticks.push([i, l]);
            }
            ret.dp[0].data.push([vals.length, null]);
        }
        return ret;
    };

    countlyCrashes.getChartData = function(metric, name, fields) {

        if (metric == "cr-session") {
            //get crashes graph
            var chartData = [];
            var dataProps = [];


            if (fields && fields["crashes-total"] == true) {
                chartData.push({ data: [], label: jQuery.i18n.map["crashes.total_overall"], color: '#52A3EF' });
                dataProps.push({ name: "cr" });
            }

            if (fields && fields["crashes-fatal"] == true) {
                chartData.push({ data: [], label: jQuery.i18n.map["crashes.fatal"], color: '#FF8700' });
                dataProps.push({ name: "crf" });
            }

            if (fields && fields["crashes-nonfatal"] == true) {
                chartData.push({ data: [], label: jQuery.i18n.map["crashes.nonfatal"], color: '#0EC1B9' });
                dataProps.push({ name: "crnf" });
            }

            var Crashes = countlyCommon.extractChartData(_crashTimeline, countlyCrashes.clearObject, chartData, dataProps);
            var chartData = [
                    { data: [], label: jQuery.i18n.map["common.table.total-sessions"], color: '#DDDDDD', mode: "ghost" },
                    { data: [], label: jQuery.i18n.map["common.table.total-sessions"], color: '#333933' }
                ],
                dataProps = [
                    {
                        name: "pt",
                        func: function(dataObj) {
                            return dataObj.t;
                        },
                        period: "previous"
                    },
                    { name: "t" }
                ];

            var sessionData = countlyCommon.extractChartData(countlySession.getDb(), countlySession.clearObject, chartData, dataProps);
            for (var z = 0; z < Crashes.chartDP.length; z = z + 1) {
                for (var p = 0; p < sessionData.chartDP[0].data.length; p++) {
                    if (sessionData.chartDP[1].data[p][1] != 0) {
                        Crashes.chartDP[z].data[p][1] = Crashes.chartDP[z].data[p][1] / sessionData.chartDP[1].data[p][1];
                    }
                }
            }
            return Crashes;

        }
        else {
            var chartData = [
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
            for (var i in _groupData.custom) {
                _groupData.dp[i] = countlyCrashes.processMetric(_groupData.custom[i], i, i);
                _usable_metrics.custom[i] = i.charAt(0).toUpperCase() + i.slice(1);
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

        for (var i in _crashData.crashes.os) {
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

        for (var i = 0; i < maxItems; i++) {
            total += data[i][1];
        }

        for (var i = 0; i < maxItems; i++) {
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
        var data = countlyCommon.getDashboardData(_crashTimeline, ["cr", "crnf", "crf", "cru", "crru"], ["cru"], null, countlyCrashes.clearObject);
        var sessions = countlyCommon.getDashboardData(countlySession.getDb(), ["t", "n", "u", "d", "e", "p", "m"], ["u", "p", "m"], {u: "users"}, countlySession.clearObject);

        data.crt = {total: 0, "trend-total": "u", "prev-total": 0, trend: "u", change: 'NA', "total-fatal": 0, "prev-total-fatal": 0, "trend-fatal": "u", "total-nonfatal": 0, "prev-total-nonfatal": 0, "trend-nonfatal": "u"};


        if (sessions.t.total != 0) {
            data.crt.total = data.cr.total / sessions.t.total;
            data.crt["total-fatal"] = data.crf.total / sessions.t.total;
            data.crt["total-nonfatal"] = data.crnf.total / sessions.t.total;
        }
        if (sessions.t["prev-total"] != 0) {
            data.crt["prev-total"] = data.cr["prev-total"] / sessions.t["prev-total"];
            data.crt["prev-total-fatal"] = data.crf["prev-total"] / sessions.t["prev-total"];
            data.crt["prev-total-nonfatal"] = data.crnf["prev-total"] / sessions.t["prev-total"];
        }

        if (data.crt["total-fatal"] < data.crt["prev-total-fatal"]) {
            data.crt["trend-fatal"] = "d";
        }
        if (data.crt["total-fatal"] < data.crt["prev-total-fatal"]) {
            data.crt["trend-nonfatal"] = "d";
        }
        if (data.crt.total < data.crt["prev-total"]) {
            data.crt["trend-total"] = "d";
        }

        if (data.crt.total != 0 && data.crt["prev-total"] != 0) {
            data.crt.change = 100 - Math.round(data.crt["prev-total"] * 100 / data.crt.total);
            if (data.crt.change < 0) {
                data.crt.trend = "d";
            }
            data.crt.change = data.crt.change + "%";
        }
        else {
            if (data.crt.total != 0) {
                data.crt.change = "∞";
            }
            else if (data.crt["prev-total"] != 0) {
                data.crt.trend = "d";
                data.crt.change = "-∞";
            }
        }

        data.crt.total = parseFloat(data.crt.total.toFixed(2));
        data.crt["total-fatal"] = parseFloat(data.crt["total-fatal"].toFixed(2));
        data.crt["total-nonfatal"] = parseFloat(data.crt["total-nonfatal"].toFixed(2));
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
            if (!obj.crnf) {
                obj.crnf = 0;
            }
            if (!obj.crf) {
                obj.crf = 0;
            }
            if (!obj.crru) {
                obj.crru = 0;
            }
        }
        else {
            obj = {"cr": 0, "cru": 0, "crnf": 0, "crf": 0, "crru": 0};
        }

        return obj;
    };

    function setMeta() {
        if (_crashTimeline.meta) {
            for (var i in _crashTimeline.meta) {
                _metas[i] = (_crashTimeline.meta[i]) ? _crashTimeline.meta[i] : [];
            }
        }
    }

    function extendMeta() {
        if (_crashTimeline.meta) {
            for (var i in _crashTimeline.meta) {
                _metas[i] = countlyCommon.union(_metas[i], _crashTimeline.meta[i]);
            }
        }
    }

}(window.countlyCrashes = window.countlyCrashes || {}, jQuery));