/*global store, Handlebars, CountlyHelpers, countlyGlobal, _, Gauge, d3, moment, countlyTotalUsers, jQuery, filterXSS, Uint32Array*/
(function(window, $) {
    /**
     * Object with common functions to be used for multiple purposes
     * @name countlyCommon
     * @global
     * @namespace countlyCommon
     */
    var CommonConstructor = function() {
        // Private Properties
        var countlyCommon = this;
        var _period = (store.get("countly_date")) ? store.get("countly_date") : countlyCommon.DEFAULT_PERIOD || "30days";
        var _persistentSettings;
        var htmlEncodeOptions = {
            "whiteList": {"a": ["href", "class", "target"], "ul": [], "li": [], "b": [], "br": [], "strong": [], "p": [], "span": ["class"], "div": ["class"]},
            onTagAttr: function(tag, name, value/* isWhiteAttr*/) {
                if (tag === "a") {
                    var re = new RegExp(/{[0-9]*}/);
                    var tested = re.test(value);
                    if (name === "target") {
                        if (!(value === "_blank" || value === "_self" || value === "_top" || value === "_parent" || tested)) {
                            return 'target="_blank"'; //set _blank if incorrect value
                        }
                        else {
                            return 'target="' + value + '"';
                        }
                    }
                    if (name === "href") {
                        if (!(value.substr(0, 1) === "#" || value.substr(0, 1) === "/" || value.substr(0, 4) === "http" || tested)) {
                            return 'href="#"'; //set # if incorrect value
                        }
                        else {
                            return 'href="' + value + '"';
                        }
                    }
                }
            }
        };

        /**
        * Get Browser language
        * @memberof countlyCommon
        * @returns {string} browser locale in iso format en-US
        * @example
        * //outputs en-US
        * countlyCommon.browserLang()
        */
        countlyCommon.browserLang = function() {
            var lang = navigator.language || navigator.userLanguage;
            if (lang) {
                lang = lang.toLowerCase();
                lang.length > 3 && (lang = lang.substring(0, 3) + lang.substring(3).toUpperCase());
            }
            return lang;
        };

        // Public Properties
        /**
         * Set user persistent settings to store local storage
         * @memberof countlyCommon
         * @param {object} data - Object param for set new data
        */
        countlyCommon.setPersistentSettings = function(data) {
            if (!_persistentSettings) {
                _persistentSettings = localStorage.getItem("persistentSettings") ? JSON.parse(localStorage.getItem("persistentSettings")) : {};
            }

            for (var i in data) {
                _persistentSettings[i] = data[i];
            }

            localStorage.setItem("persistentSettings", JSON.stringify(_persistentSettings));
        };

        /**
         * Get user persistent settings
         * @memberof countlyCommon
         * @returns {object} settings
         */
        countlyCommon.getPersistentSettings = function() {
            if (!_persistentSettings) {
                _persistentSettings = localStorage.getItem("persistentSettings") ? JSON.parse(localStorage.getItem("persistentSettings")) : {};
            }

            return _persistentSettings;
        };
        /**
        * App Key of currently selected app or 0 when not initialized
        * @memberof countlyCommon
        * @type {string|number}
        */
        countlyCommon.ACTIVE_APP_KEY = 0;
        /**
        * App ID of currently selected app or 0 when not initialized
        * @memberof countlyCommon
        * @type {string|number}
        */
        countlyCommon.ACTIVE_APP_ID = 0;
        /**
        * Current user's selected language in form en-EN, by default will use browser's language
        * @memberof countlyCommon
        * @type {string}
        */
        countlyCommon.BROWSER_LANG = countlyCommon.browserLang() || "en-US";
        /**
        * Current user's browser language in short form as "en", by default will use browser's language
        * @memberof countlyCommon
        * @type {string}
        */
        countlyCommon.BROWSER_LANG_SHORT = countlyCommon.BROWSER_LANG.split("-")[0];

        if (store.get("countly_active_app")) {
            if (countlyGlobal.apps[store.get("countly_active_app")]) {
                countlyCommon.ACTIVE_APP_KEY = countlyGlobal.apps[store.get("countly_active_app")].key;
                countlyCommon.ACTIVE_APP_ID = store.get("countly_active_app");
            }
        }

        if (countlyGlobal.member.lang) {
            var lang = countlyGlobal.member.lang;
            store.set("countly_lang", lang);
            countlyCommon.BROWSER_LANG_SHORT = lang;
            countlyCommon.BROWSER_LANG = lang;
        }
        else if (store.get("countly_lang")) {
            var lang1 = store.get("countly_lang");
            countlyCommon.BROWSER_LANG_SHORT = lang1;
            countlyCommon.BROWSER_LANG = lang1;
        }

        // Public Methods
        /**
        * Change currently selected period
        * @memberof countlyCommon
        * @param {string|array} period - new period, supported values are (month, 60days, 30days, 7days, yesterday, hour or [startMiliseconds, endMiliseconds] as [1417730400000,1420149600000])
        * @param {int} timeStamp - timeStamp for the period based
        * @param {boolean} noSet - if false  - updates countly_date
        */
        countlyCommon.setPeriod = function(period, timeStamp, noSet) {
            _period = period;
            if (timeStamp) {
                countlyCommon.periodObj = countlyCommon.calcSpecificPeriodObj(period, timeStamp);
            }
            else {
                countlyCommon.periodObj = calculatePeriodObject(period);
            }

            if (window.countlyCommon === this && window.app && window.app.recordEvent) {
                window.app.recordEvent({
                    "key": "period-change",
                    "count": 1,
                    "segmentation": {is_custom: Array.isArray(period)}
                });
            }

            if (noSet) {
                /*
                    Dont update vuex or local storage if noSet is true
                */
                return;
            }

            if (window.countlyCommon === this && window.countlyVue && window.countlyVue.vuex) {
                var currentStore = window.countlyVue.vuex.getGlobalStore();
                if (currentStore) {
                    currentStore.dispatch("countlyCommon/updatePeriod", {period: period, label: countlyCommon.getDateRangeForCalendar()});
                }
            }

            store.set("countly_date", period);
        };

        /**
        * Get currently selected period
        * @memberof countlyCommon
        * @returns {string|array} supported values are (month, 60days, 30days, 7days, yesterday, hour or [startMiliseconds, endMiliseconds] as [1417730400000,1420149600000])
        */
        countlyCommon.getPeriod = function() {
            return _period;
        };


        countlyCommon.getPeriodForAjax = function() {
            return CountlyHelpers.getPeriodUrlQueryParameter(_period);
        };

        /**
        * Change currently selected app by app ID
        * @memberof countlyCommon
        * @param {string} appId - new app ID from @{countlyGlobal.apps} object
        */
        countlyCommon.setActiveApp = function(appId) {
            countlyCommon.ACTIVE_APP_KEY = countlyGlobal.apps[appId].key;
            countlyCommon.ACTIVE_APP_ID = appId;
            store.set("countly_active_app", appId);
            $.ajax({
                type: "POST",
                url: countlyGlobal.path + "/user/settings/active-app",
                data: {
                    "username": countlyGlobal.member.username,
                    "appId": appId,
                    _csrf: countlyGlobal.csrf_token
                },
                success: function() { }
            });
        };

        /**
         * Adds notification toast to the list.
         * @param {*} payload notification toast
         *  payload.color: color of the notification toast
         *  payload.text: text of the notification toast
         */
        countlyCommon.dispatchNotificationToast = function(payload) {
            if (window.countlyVue && window.countlyVue.vuex) {
                var currentStore = window.countlyVue.vuex.getGlobalStore();
                if (currentStore) {
                    currentStore.dispatch('countlyCommon/onAddNotificationToast', payload);
                }
            }
        };

        /**
         * Generates unique id string using unsigned integer array.
         * @returns {string} unique id
         */
        countlyCommon.generateId = function() {
            var crypto = window.crypto || window.msCrypto;
            var uint32 = crypto.getRandomValues(new Uint32Array(1))[0];
            return uint32.toString(16);
        };

        /**
         * 
         * @param {name} name drawer name
         * @returns {object}  drawer data used by hasDrawers() mixin
         */
        countlyCommon.getExternalDrawerData = function(name) {
            var result = {};
            result[name] = {
                name: name,
                isOpened: false,
                initialEditedObject: {},
            };
            result[name].closeFn = function() {
                result[name].isOpened = false;
            };
            return result;
        };

        /**
        * Encode value to be passed to db as key, encoding $ symbol to &#36; if it is first and all . (dot) symbols to &#46; in the string
        * @memberof countlyCommon
        * @param {string} str - value to encode
        * @returns {string} encoded string
        */
        countlyCommon.encode = function(str) {
            return str.replace(/^\$/g, "&#36;").replace(/\./g, '&#46;');
        };

        /**
        * Decode value from db, decoding first &#36; to $ and all &#46; to . (dots). Decodes also url encoded values as &amp;#36;.
        * @memberof countlyCommon
        * @param {string} str - value to decode
        * @returns {string} decoded string
        */
        countlyCommon.decode = function(str) {
            return str.replace(/^&#36;/g, "$").replace(/&#46;/g, '.');
        };

        /**
        * Decode escaped HTML from db
        * @memberof countlyCommon
        * @param {string} html - value to decode
        * @returns {string} decoded string
        */
        countlyCommon.decodeHtml = function(html) {
            return (html + "").replace(/&amp;/g, '&');
        };


        /**
        * Encode html
        * @memberof countlyCommon
        * @param {string} html - value to encode
        * @returns {string} encode string
        */
        countlyCommon.encodeHtml = function(html) {
            var div = document.createElement('div');
            div.innerText = html;
            return div.innerHTML;
        };

        /**
        * Encode some tags, leaving those set in whitelist as they are.
        * @memberof countlyCommon
        * @param {string} html - value to encode
        * @param {object} options for encoding. Optional. If not passed, using default in common.
        * @returns {string} encode string
        */
        countlyCommon.encodeSomeHtml = function(html, options) {
            if (options) {
                return filterXSS(html, options);
            }
            else {
                return filterXSS(html, htmlEncodeOptions);
            }
        };


        /**
        * Calculates the percent change between previous and current values.
        * @memberof countlyCommon
        * @param {number} previous - data for previous period
        * @param {number} current - data for current period
        * @returns {object} in the following format {"percent": "20%", "trend": "u"}
        * @example
        *   //outputs {"percent":"100%","trend":"u"}
        *   countlyCommon.getPercentChange(100, 200);
        */
        countlyCommon.getPercentChange = function(previous, current) {
            var pChange = 0,
                trend = "";

            previous = parseFloat(previous);
            current = parseFloat(current);

            if (previous === 0) {
                pChange = "NA";
                trend = "u"; //upward
            }
            else if (current === 0) {
                pChange = "∞";
                trend = "d"; //downward
            }
            else {
                var change = (((current - previous) / previous) * 100).toFixed(1);
                pChange = countlyCommon.getShortNumber(change) + "%";

                if (change < 0) {
                    trend = "d";
                }
                else {
                    trend = "u";
                }
            }

            return { "percent": pChange, "trend": trend };
        };

        /**
        * Fetches nested property values from an obj.
        * @memberof countlyCommon
        * @param {object} obj - standard countly metric object
        * @param {string} my_passed_path - dot separate path to fetch from object
        * @param {object} def - stub object to return if nothing is found on provided path
        * @returns {object} fetched object from provided path
        * @example <caption>Path found</caption>
        * //outputs {"u":20,"t":20,"n":5}
        * countlyCommon.getDescendantProp({"2017":{"1":{"2":{"u":20,"t":20,"n":5}}}}, "2017.1.2", {"u":0,"t":0,"n":0});
        * @example <caption>Path not found</caption>
        * //outputs {"u":0,"t":0,"n":0}
        * countlyCommon.getDescendantProp({"2016":{"1":{"2":{"u":20,"t":20,"n":5}}}}, "2017.1.2", {"u":0,"t":0,"n":0});
        */
        countlyCommon.getDescendantProp = function(obj, my_passed_path, def) {
            for (var i = 0, my_path = (my_passed_path + "").split('.'), len = my_path.length; i < len; i++) {
                if (!obj || typeof obj !== 'object') {
                    return def;
                }
                obj = obj[my_path[i]];
            }

            if (obj === undefined) {
                return def;
            }
            return obj;
        };

        /**
         *  Checks if current graph type matches the one being drawn
         *  @memberof countlyCommon
         *  @param {string} type - graph type
         *  @param {object} settings - graph settings
         *  @returns {boolean} Return true if type is the same
         */
        countlyCommon.checkGraphType = function(type, settings) {
            var eType = "line";
            if (settings && settings.series && settings.series.bars && settings.series.bars.show === true) {
                if (settings.series.stack === true) {
                    eType = "bar";
                }
                else {
                    eType = "seperate-bar";
                }
            }
            else if (settings && settings.series && settings.series.pie && settings.series.pie.show === true) {
                eType = "pie";
            }

            if (type === eType) {
                return true;
            }
            else {
                return false;
            }
        };
        /**
        * Draws a graph with the given dataPoints to container. Used for drawing bar and pie charts.
        * @memberof countlyCommon
        * @param {object} dataPoints - data poitns to draw on graph
        * @param {string|object} container - selector for container or container object itself where to create graph
        * @param {string} graphType - type of the graph, accepted values are bar, line, pie, separate-bar
        * @param {object} inGraphProperties - object with properties to extend and use on graph library directly
        * @returns {boolean} false if container element not found, otherwise true
        * @example <caption>Drawing Pie chart</caption>
        * countlyCommon.drawGraph({"dp":[
        *    {"data":[[0,20]],"label":"Test1","color":"#52A3EF"},
        *    {"data":[[0,30]],"label":"Test2","color":"#FF8700"},
        *    {"data":[[0,50]],"label":"Test3","color":"#0EC1B9"}
        * ]}, "#dashboard-graph", "pie");
        * @example <caption>Drawing bar chart, to comapre values with different color bars</caption>
        * //[-1,null] and [3,null] are used for offsets from left and right
        * countlyCommon.drawGraph({"dp":[
        *    {"data":[[-1,null],[0,20],[1,30],[2,50],[3,null]],"color":"#52A3EF"}, //first bar set
        *    {"data":[[-1,null],[0,50],[1,30],[2,20],[3,null]],"color":"#0EC1B9"} //second bar set
        *],
        *    "ticks":[[-1,""],[0,"Test1"],[1,"Test2"],[2,"Test3"],[3,""]]
        *}, "#dashboard-graph", "separate-bar", {"series":{"stack":null}});
        * @example <caption>Drawing Separate bars chart, to comapre values with different color bars</caption>
        * //[-1,null] and [3,null] are used for offsets from left and right
        * countlyCommon.drawGraph({"dp":[
        *    {"data":[[-1,null],[0,20],[1,null],[2,null],[3,null]],"label":"Test1","color":"#52A3EF"},
        *    {"data":[[-1,null],[0,null],[1,30],[2,null],[3,null]],"label":"Test2","color":"#FF8700"},
        *    {"data":[[-1,null],[0,null],[1,null],[2,50],[3,null]],"label":"Test3","color":"#0EC1B9"}
        *],
        *    "ticks":[[-1,""],[0,"Test1"],[1,"Test2"],[2,"Test3"],[3,""]
        *]}, "#dashboard-graph", "separate-bar");
        */
        countlyCommon.drawGraph = function(dataPoints, container, graphType, inGraphProperties) {
            var p = 0;

            if ($(container).length <= 0) {
                return false;
            }

            if (graphType === "pie") {
                var min_treshold = 0.05; //minimum treshold for graph
                var break_other = 0.3; //try breaking other in smaller if at least given % from all
                var sum = 0;

                var i = 0;
                var useMerging = true;
                for (i = 0; i < dataPoints.dp.length; i++) {
                    sum = sum + dataPoints.dp[i].data[0][1];
                    if (dataPoints.dp[i].moreInfo) {
                        useMerging = false;
                    }
                    else {
                        dataPoints.dp[i].moreInfo = "";
                    }
                }

                if (useMerging) {
                    var dpLength = dataPoints.dp.length;
                    var treshold_value = Math.round(min_treshold * sum);
                    var max_other = Math.round(min_treshold * sum);
                    var under_treshold = [];//array of values under treshold
                    var left_for_other = sum;
                    for (i = 0; i < dataPoints.dp.length; i++) {
                        if (dataPoints.dp[i].data[0][1] >= treshold_value) {
                            left_for_other = left_for_other - dataPoints.dp[i].data[0][1];
                        }
                        else {
                            under_treshold.push(dataPoints.dp[i].data[0][1]);
                        }
                    }
                    var stop_breaking = Math.round(sum * break_other);
                    if (left_for_other >= stop_breaking) { //fix values if other takes more than set % of data
                        under_treshold = under_treshold.sort(function(a, b) {
                            return a - b;
                        });

                        var tresholdMap = [];
                        treshold_value = treshold_value - 1; //to don't group exactly 5% values later in code
                        tresholdMap.push({value: treshold_value, text: 5});
                        var in_this_one = 0;
                        var count_in_this = 0;

                        for (p = under_treshold.length - 1; p >= 0 && under_treshold[p] > 0 && left_for_other >= stop_breaking; p--) {
                            if (under_treshold[p] <= treshold_value) {
                                if (in_this_one + under_treshold[p] <= max_other || count_in_this < 5) {
                                    count_in_this++;
                                    in_this_one += under_treshold[p];
                                    left_for_other -= under_treshold[p];
                                }
                                else {
                                    if (tresholdMap[tresholdMap.length - 1].value === under_treshold[p]) {
                                        in_this_one = 0;
                                        count_in_this = 0;
                                        treshold_value = under_treshold[p] - 1;
                                    }
                                    else {
                                        in_this_one = under_treshold[p];
                                        count_in_this = 1;
                                        treshold_value = under_treshold[p];
                                        left_for_other -= under_treshold[p];
                                    }
                                    tresholdMap.push({value: treshold_value, text: Math.max(0.009, Math.round(treshold_value * 10000 / sum) / 100)});
                                }
                            }
                        }
                        treshold_value = Math.max(treshold_value - 1, 0);
                        tresholdMap.push({value: treshold_value, text: Math.round(treshold_value * 10000 / sum) / 100});
                        var tresholdPointer = 0;

                        while (tresholdPointer < tresholdMap.length - 1) {
                            dataPoints.dp.push({"label": tresholdMap[tresholdPointer + 1].text + "-" + tresholdMap[tresholdPointer].text + "%", "data": [[0, 0]], "moreInfo": []});
                            var tresholdPlace = dataPoints.dp.length - 1;
                            for (i = 0; i < dpLength; i++) {
                                if (dataPoints.dp[i].data[0][1] <= tresholdMap[tresholdPointer].value && dataPoints.dp[i].data[0][1] > tresholdMap[tresholdPointer + 1].value) {
                                    dataPoints.dp[tresholdPlace].moreInfo.push({"label": dataPoints.dp[i].label, "value": Math.round(dataPoints.dp[i].data[0][1] * 10000 / sum) / 100});
                                    dataPoints.dp[tresholdPlace].data[0][1] = dataPoints.dp[tresholdPlace].data[0][1] + dataPoints.dp[i].data[0][1];
                                    dataPoints.dp.splice(i, 1);
                                    dpLength = dataPoints.dp.length;
                                    i--;
                                    tresholdPlace--;
                                }
                            }
                            tresholdPointer = tresholdPointer + 1;
                        }
                    }
                }
            }

            _.defer(function() {
                if ((!dataPoints.dp || !dataPoints.dp.length) || (graphType === "bar" && (!dataPoints.dp[0].data[0] || (typeof dataPoints.dp[0].data[0][1] === 'undefined' && typeof dataPoints.dp[0].data[1][1] === 'undefined') || (dataPoints.dp[0].data[0][1] === null && dataPoints.dp[0].data[1][1] === null)))) {
                    $(container).hide();
                    $(container).siblings(".graph-no-data").show();
                    return true;
                }
                else {
                    $(container).show();
                    $(container).siblings(".graph-no-data").hide();
                }

                var graphProperties = {
                    series: {
                        lines: { show: true, fill: true },
                        points: { show: true }
                    },
                    grid: { hoverable: true, borderColor: "null", color: "#999", borderWidth: 0, minBorderMargin: 10 },
                    xaxis: { minTickSize: 1, tickDecimals: "number", tickLength: 0 },
                    yaxis: { min: 0, minTickSize: 1, tickDecimals: "number", position: "right" },
                    legend: { backgroundOpacity: 0, margin: [20, -19] },
                    colors: countlyCommon.GRAPH_COLORS
                };

                switch (graphType) {
                case "line":
                    graphProperties.series = { lines: { show: true, fill: true }, points: { show: true } };
                    break;
                case "bar":
                    if (dataPoints.ticks.length > 20) {
                        graphProperties.xaxis.rotateTicks = 45;
                    }

                    var barWidth = 0.6;

                    switch (dataPoints.dp.length) {
                    case 2:
                        barWidth = 0.3;
                        break;
                    case 3:
                        barWidth = 0.2;
                        break;
                    }

                    for (i = 0; i < dataPoints.dp.length; i++) {
                        dataPoints.dp[i].bars = {
                            order: i,
                            barWidth: barWidth
                        };
                    }

                    graphProperties.series = { stack: true, bars: { show: true, barWidth: 0.6, tickLength: 0, fill: 1 } };
                    graphProperties.xaxis.ticks = dataPoints.ticks;
                    break;
                case "separate-bar":
                    if (dataPoints.ticks.length > 20) {
                        graphProperties.xaxis.rotateTicks = 45;
                    }
                    graphProperties.series = { bars: { show: true, align: "center", barWidth: 0.6, tickLength: 0, fill: 1 } };
                    graphProperties.xaxis.ticks = dataPoints.ticks;
                    break;
                case "pie":
                    graphProperties.series = {
                        pie: {
                            show: true,
                            lineWidth: 0,
                            radius: 115,
                            innerRadius: 0.45,
                            combine: {
                                color: '#CCC',
                                threshold: 0.05
                            },
                            label: {
                                show: true,
                                radius: 160
                            }
                        }
                    };
                    graphProperties.legend.show = false;
                    break;
                default:
                    break;
                }

                if (inGraphProperties) {
                    $.extend(true, graphProperties, inGraphProperties);
                }

                $.plot($(container), dataPoints.dp, graphProperties);

                if (graphType === "bar" || graphType === "separate-bar") {
                    $(container).unbind("plothover");
                    $(container).bind("plothover", function(event, pos, item) {
                        $("#graph-tooltip").remove();

                        if (item && item.datapoint && item.datapoint[1]) {
                            // For stacked bar chart calculate the diff
                            var yAxisValue = item.datapoint[1].toFixed(1).replace(".0", "") - item.datapoint[2].toFixed(1).replace(".0", "");
                            if (inGraphProperties && inGraphProperties.tooltipType === "duration") {
                                yAxisValue = countlyCommon.formatSecond(yAxisValue);
                            }

                            showTooltip({
                                x: pos.pageX,
                                y: item.pageY,
                                contents: yAxisValue || 0
                            });
                        }
                    });
                }
                else if (graphType === 'pie') {
                    $(container).unbind("plothover");
                    $(container).bind("plothover", function(event, pos, item) {
                        $("#graph-tooltip").remove();
                        if (item && item.series && item.series.moreInfo) {
                            var tooltipcontent;
                            if (Array.isArray(item.series.moreInfo)) {
                                tooltipcontent = "<table class='pie_tooltip_table'>";
                                if (item.series.moreInfo.length <= 5) {
                                    for (p = 0; p < item.series.moreInfo.length; p++) {
                                        tooltipcontent = tooltipcontent + "<tr><td>" + item.series.moreInfo[p].label + ":</td><td>" + item.series.moreInfo[p].value + "%</td>";
                                    }
                                }
                                else {
                                    for (p = 0; p < 5; p = p + 1) {
                                        tooltipcontent += "<tr><td>" + item.series.moreInfo[p].label + " :</td><td>" + item.series.moreInfo[p].value + "%</td></tr>";
                                    }
                                    tooltipcontent += "<tr><td colspan='2' style='text-align:center;'>...</td></tr><tr><td style='text-align:center;' colspan=2>(and " + (item.series.moreInfo.length - 5) + " other)</td></tr>";
                                }
                                tooltipcontent += "</table>";
                            }
                            else {
                                tooltipcontent = item.series.moreInfo;
                            }
                            showTooltip({
                                x: pos.pageX,
                                y: pos.pageY,
                                contents: tooltipcontent
                            });
                        }
                    });
                }
                else {
                    $(container).unbind("plothover");
                }
            }, dataPoints, container, graphType, inGraphProperties);

            return true;
        };

        /**
        * Draws a time line graph with the given dataPoints to container.
        * @memberof countlyCommon
        * @param {object} dataPoints - data points to draw on graph
        * @param {string|object} container - selector for container or container object itself where to create graph
        * @param {string=} bucket - time bucket to display on graph. See {@link countlyCommon.getTickObj}
        * @param {string=} overrideBucket - time bucket to display on graph. See {@link countlyCommon.getTickObj}
        * @param {boolean=} small - if graph won't be full width graph
        * @param {array=} appIdsForNotes - display notes from provided apps ids on graph, will not show notes when empty 
        * @param {object=} options - extra graph options, see flot documentation
        * @example
        * countlyCommon.drawTimeGraph([{
        *    "data":[[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,12],[8,9],[9,10],[10,5],[11,8],[12,7],[13,9],[14,4],[15,6]],
        *    "label":"Total Sessions",
        *    "color":"#DDDDDD",
        *    "mode":"ghost"
        *},{
        *    "data":[[1,74],[2,69],[3,60],[4,17],[5,6],[6,3],[7,13],[8,25],[9,62],[10,34],[11,34],[12,33],[13,34],[14,30],[15,1]],
        *    "label":"Total Sessions",
        *    "color":"#333933"
        *}], "#dashboard-graph");
        */
        countlyCommon.drawTimeGraph = function(dataPoints, container, bucket, overrideBucket, small, appIdsForNotes, options) {
            _.defer(function() {
                if (!dataPoints || !dataPoints.length) {
                    $(container).hide();
                    $(container).siblings(".graph-no-data").show();
                    return true;
                }
                else {
                    $(container).show();
                    $(container).siblings(".graph-no-data").hide();
                }

                var i = 0;
                var j = 0;
                // Some data points start with [1, XXX] (should be [0, XXX]) and brakes the new tick logic
                // Below loops converts the old structures to the new one
                if (dataPoints[0].data[0][0] === 1) {
                    for (i = 0; i < dataPoints.length; i++) {
                        for (j = 0; j < dataPoints[i].data.length; j++) {
                            dataPoints[i].data[j][0] -= 1;
                        }
                    }
                }
                var minValue = dataPoints[0].data[0][1];
                var maxValue = dataPoints[0].data[0][1];
                for (i = 0; i < dataPoints.length; i++) {
                    for (j = 0; j < dataPoints[i].data.length; j++) {
                        dataPoints[i].data[j][1] = Math.round(dataPoints[i].data[j][1] * 1000) / 1000; // 3 decimal places max
                        if (dataPoints[i].data[j][1] < minValue) {
                            minValue = dataPoints[i].data[j][1];
                        }
                        if (dataPoints[i].data[j][1] > maxValue) {
                            maxValue = dataPoints[i].data[j][1];
                        }
                    }
                }

                var myTickDecimals = 0;
                var myMinTickSize = 1;
                if (maxValue < 1 && maxValue > 0) {
                    myTickDecimals = maxValue.toString().length - 2;
                    myMinTickSize = 0.001;
                }

                var graphProperties = {
                    series: {
                        lines: {
                            stack: false,
                            show: false,
                            fill: true,
                            lineWidth: 2.5,
                            fillColor: {
                                colors: [
                                    { opacity: 0 },
                                    { opacity: 0 }
                                ]
                            },
                            shadowSize: 0
                        },
                        splines: {
                            show: true,
                            lineWidth: 2.5
                        },
                        points: { show: true, radius: 0, shadowSize: 0, lineWidth: 2 },
                        shadowSize: 0
                    },
                    crosshair: { mode: "x", color: "rgba(78,78,78,0.4)" },
                    grid: { hoverable: true, borderColor: "null", color: "#666", borderWidth: 0, minBorderMargin: 10, labelMargin: 10 },
                    xaxis: { tickDecimals: "number", tickSize: 0, tickLength: 0 },
                    yaxis: { min: 0, minTickSize: 1, tickDecimals: "number", ticks: 3, position: "right"},
                    legend: { show: false, margin: [-25, -44], noColumns: 3, backgroundOpacity: 0 },
                    colors: countlyCommon.GRAPH_COLORS,
                };
                //overriding values
                graphProperties.yaxis.minTickSize = myMinTickSize;
                graphProperties.yaxis.tickDecimals = myTickDecimals;
                if (myMinTickSize < 1) {
                    graphProperties.yaxis.tickFormatter = function(number) {
                        return (Math.round(number * 1000) / 1000).toString();
                    };
                }
                graphProperties.series.points.show = (dataPoints[0].data.length <= 90);

                if (overrideBucket) {
                    graphProperties.series.points.radius = 4;
                }

                var graphTicks = [],
                    tickObj = {};

                if (_period === "month" && !bucket) {
                    tickObj = countlyCommon.getTickObj("monthly");
                    if (tickObj.labelCn === 1) {
                        for (var kk = 0; kk < dataPoints.length; kk++) {
                            dataPoints[kk].data = dataPoints[kk].data.slice(0, 1);
                        }
                        graphProperties.series.points.radius = 4;
                        overrideBucket = true;//to get the dots added
                    }
                    else if (tickObj.labelCn === 2) {
                        for (var kkk = 0; kkk < dataPoints.length; kkk++) {
                            dataPoints[kkk].data = dataPoints[kkk].data.slice(0, 2);
                        }
                    }
                }
                else {
                    tickObj = countlyCommon.getTickObj(bucket, overrideBucket);
                }
                if (small) {
                    for (i = 0; i < tickObj.ticks.length; i = i + 2) {
                        tickObj.ticks[i][1] = "";
                    }
                    graphProperties.xaxis.font = {
                        size: 11,
                        color: "#a2a2a2"
                    };
                }

                graphProperties.xaxis.max = tickObj.max;
                graphProperties.xaxis.min = tickObj.min;
                graphProperties.xaxis.ticks = tickObj.ticks;

                graphTicks = tickObj.tickTexts;
                //set dashed line for not finished yet

                if (countlyCommon.periodObj.periodContainsToday === true) {
                    var settings = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID];
                    var tzDate = new Date(new Date().toLocaleString('en-US', { timeZone: settings.timezone }));
                    for (var z = 0; z < dataPoints.length; z++) {
                        if (dataPoints[z].mode !== "ghost" && dataPoints[z].mode !== "previous") {
                            var bDate = new Date();
                            if (_period === "hour") {
                                if (bDate.getDate() === tzDate.getDate()) {
                                    dataPoints[z].dashAfter = tzDate.getHours() - 1;
                                }
                                else if (bDate.getDate() > tzDate.getDate()) {
                                    dataPoints[z].dashed = true; //all dashed because app lives still in yesterday
                                }
                                //for last - none dashed - because app lives in tomorrow(so don't do anything for this case)
                            }
                            else if (_period === "day") { //days in this month
                                var c = countlyCommon.periodObj.currentPeriodArr.length;
                                dataPoints[z].dashAfter = c - 2;
                            }
                            else if (_period === "month" && bDate.getMonth() <= 2 && (!bucket || bucket === "monthly")) {
                                dataPoints[z].dashed = true;
                            }
                            else {
                                if (bucket === "hourly") {
                                    dataPoints[z].dashAfter = graphTicks.length - (24 - tzDate.getHours() + 1);
                                }
                                else {
                                    dataPoints[z].dashAfter = graphTicks.length - 2;
                                }
                            }

                            if (typeof dataPoints[z].dashAfter !== 'undefined' && dataPoints[z].dashAfter <= 0) {
                                delete dataPoints[z].dashAfter;
                                dataPoints[z].dashed = true; //dash whole line
                            }
                        }
                    }
                }

                var graphObj = $(container).data("plot"),
                    keyEventCounter = "A",
                    keyEvents = [];
                    //keyEventsIndex = 0;


                if (!(options && _.isObject(options) && $(container).parents("#dashboard-data").length > 0)) {
                    countlyCommon.deepObjectExtend(graphProperties, {
                        series: {lines: {show: true}, splines: {show: false}},
                        zoom: {active: true},
                        pan: {interactive: true, active: true, mode: "smartLock", frameRate: 120},
                        xaxis: {zoomRange: false, panRange: false},
                        yaxis: {showZeroTick: true, ticks: 5}
                    });
                }

                if (options && _.isObject(options)) {
                    countlyCommon.deepObjectExtend(graphProperties, options);
                }

                if (graphObj && countlyCommon.checkGraphType("line", graphObj.getOptions()) && graphObj.getOptions().series && graphObj.getOptions().grid.show && graphObj.getOptions().series.splines && graphObj.getOptions().yaxis.minTickSize === graphProperties.yaxis.minTickSize) {
                    graphObj = $(container).data("plot");
                    if (overrideBucket) {
                        graphObj.getOptions().series.points.radius = 4;
                    }
                    else {
                        graphObj.getOptions().series.points.radius = 0;
                    }

                    graphObj.getOptions().xaxes[0].max = tickObj.max;
                    graphObj.getOptions().xaxes[0].min = tickObj.min;
                    graphObj.getOptions().xaxes[0].ticks = tickObj.ticks;

                    graphObj.setData(dataPoints);
                    graphObj.setupGrid();
                    graphObj.draw();

                }
                else {
                    graphObj = $.plot($(container), dataPoints, graphProperties);
                }

                /** function calculates min and max
                * @param {number} index - index
                * @param {object} el - element
                * @returns {boolean} true(if not set), else return nothing
                */
                var findMinMax = function(index, el) {
                    // data point is null, this workaround is used to start drawing graph with a certain padding
                    if (!el[1] && parseInt(el[1]) !== 0) {
                        return true;
                    }

                    el[1] = parseFloat(el[1]);

                    if (el[1] >= tmpMax) {
                        tmpMax = el[1];
                        tmpMaxIndex = el[0];
                    }

                    if (el[1] <= tmpMin) {
                        tmpMin = el[1];
                        tmpMinIndex = el[0];
                    }
                };
                var k = 0;
                for (k = 0; k < graphObj.getData().length; k++) {

                    var tmpMax = 0,
                        tmpMaxIndex = 0,
                        tmpMin = 999999999999,
                        tmpMinIndex = 0,
                        label = (graphObj.getData()[k].label + "").toLowerCase();

                    if (graphObj.getData()[k].mode === "ghost") {
                        //keyEventsIndex += graphObj.getData()[k].data.length;
                        continue;
                    }

                    $.each(graphObj.getData()[k].data, findMinMax);

                    if (tmpMax === tmpMin) {
                        continue;
                    }

                    keyEvents[k] = [];

                    keyEvents[k][keyEvents[k].length] = {
                        data: [tmpMinIndex, tmpMin],
                        code: keyEventCounter,
                        color: graphObj.getData()[k].color,
                        event: "min",
                        desc: jQuery.i18n.prop('common.graph-min', tmpMin, label, graphTicks[tmpMinIndex])
                    };

                    keyEventCounter = String.fromCharCode(keyEventCounter.charCodeAt() + 1);

                    keyEvents[k][keyEvents[k].length] = {
                        data: [tmpMaxIndex, tmpMax],
                        code: keyEventCounter,
                        color: graphObj.getData()[k].color,
                        event: "max",
                        desc: jQuery.i18n.prop('common.graph-max', tmpMax, label, graphTicks[tmpMaxIndex])
                    };

                    keyEventCounter = String.fromCharCode(keyEventCounter.charCodeAt() + 1);
                }

                var drawLabels = function() {
                    var graphWidth = graphObj.width(),
                        graphHeight = graphObj.height();

                    $(container).find(".graph-key-event-label").remove();
                    $(container).find(".graph-note-label").remove();

                    for (k = 0; k < keyEvents.length; k++) {
                        var bgColor = graphObj.getData()[k].color;

                        if (!keyEvents[k]) {
                            continue;
                        }

                        for (var l = 0; l < keyEvents[k].length; l++) {
                            var o = graphObj.pointOffset({ x: keyEvents[k][l].data[0], y: keyEvents[k][l].data[1] });

                            if (o.top <= 40) {
                                o.top = 40;
                            }
                            else if (o.top >= (graphHeight + 30)) {
                                o.top = graphHeight + 30;
                            }

                            if (o.left <= 15) {
                                o.left = 15;
                            }
                            else if (o.left >= (graphWidth - 15)) {
                                o.left = (graphWidth - 15);
                            }

                            var keyEventLabel = $('<div class="graph-key-event-label">').text(keyEvents[k][l].code);

                            keyEventLabel.attr({
                                "title": keyEvents[k][l].desc,
                                "data-points": "[" + keyEvents[k][l].data + "]"
                            }).css({
                                "position": 'absolute',
                                "left": o.left,
                                "top": o.top - 33,
                                "display": 'none',
                                "background-color": bgColor
                            }).appendTo(graphObj.getPlaceholder()).show();

                            $(".tipsy").remove();
                            keyEventLabel.tipsy({ gravity: $.fn.tipsy.autoWE, offset: 3, html: true });
                        }
                    }

                    // Add note labels to the graph
                    if (appIdsForNotes && !(countlyGlobal && countlyGlobal.ssr) && !(bucket === "hourly" && dataPoints[0].data.length > 24) && bucket !== "weekly") {
                        var noteDateIds = countlyCommon.getNoteDateIds(bucket),
                            frontData = graphObj.getData()[graphObj.getData().length - 1],
                            startIndex = (!frontData.data[1] && frontData.data[1] !== 0) ? 1 : 0;
                        for (k = 0, l = startIndex; k < frontData.data.length; k++, l++) {
                            if (frontData.data[l]) {
                                var graphPoint = graphObj.pointOffset({ x: frontData.data[l][0], y: frontData.data[l][1] });
                                var notes = countlyCommon.getNotesForDateId(noteDateIds[k], appIdsForNotes);
                                var colors = ["#79a3e9", "#70bbb8", "#e2bc33", "#a786cd", "#dd6b67", "#ece176"];

                                if (notes.length) {
                                    var labelColor = colors[notes[0].color - 1];
                                    var titleDom = '';
                                    if (notes.length === 1) {
                                        var noteTime = moment(notes[0].ts).format("D MMM, HH:mm");
                                        var noteId = notes[0].app_id;
                                        var app = countlyGlobal.apps[noteId] || {};
                                        titleDom = "<div> <div class='note-header'><div class='note-title'>" + noteTime + "</div><div class='note-app' style='display:flex;line-height: 15px;'> <div class='icon' style='display:inline-block; border-radius:2px; width:15px; height:15px; margin-right: 5px; background: url(appimages/" + noteId + ".png) center center / cover no-repeat;'></div><span>" + app.name + "</span></div></div>" +
                                        "<div class='note-content'>" + notes[0].note + "</div>" +
                                        "<div class='note-footer'> <span class='note-owner'>" + (notes[0].owner_name) + "</span> | <span class='note-type'>" + (jQuery.i18n.map["notes.note-" + notes[0].noteType] || notes[0].noteType) + "</span> </div>" +
                                            "</div>";
                                    }
                                    else {
                                        var noteDateFormat = "D MMM, YYYY";
                                        if (countlyCommon.getPeriod() === "month") {
                                            noteDateFormat = "MMM YYYY";
                                        }
                                        noteTime = moment(notes[0].ts).format(noteDateFormat);
                                        titleDom = "<div><div class='note-header'><div class='note-title'>" + noteTime + "</div></div>" +
                                            "<div class='note-content'><span  onclick='countlyCommon.getNotesPopup(" + noteDateIds[k] + "," + JSON.stringify(appIdsForNotes) + ")'  class='notes-view-link'>View Notes (" + notes.length + ")</span></div>" +
                                            "</div>";
                                    }
                                    var graphNoteLabel = $('<div class="graph-note-label graph-text-note" style="background-color:' + labelColor + ';"><div class="fa fa-align-left" ></div></div>');
                                    graphNoteLabel.attr({
                                        "title": titleDom,
                                        "data-points": "[" + frontData.data[l] + "]"
                                    }).css({
                                        "position": 'absolute',
                                        "left": graphPoint.left,
                                        "top": graphPoint.top - 53,
                                        "display": 'none',
                                        "border-color": frontData.color
                                    }).appendTo(graphObj.getPlaceholder()).show();

                                    $(".tipsy").remove();
                                    graphNoteLabel.tipsy({cssClass: 'tipsy-for-note', gravity: $.fn.tipsy.autoWE, offset: 3, html: true, trigger: 'hover', hoverable: true });
                                }
                            }
                        }
                    }
                };

                drawLabels();

                $(container).on("mouseout", function() {
                    graphObj.unlockCrosshair();
                    graphObj.clearCrosshair();
                    graphObj.unhighlight();
                    $("#graph-tooltip").fadeOut(200, function() {
                        $(this).remove();
                    });
                });
                /** dShows tooltip
                    * @param {number} dataIndex - index
                    * @param {object} position - position
                    * @param {boolean} onPoint -  if point found
                    */
                function showCrosshairTooltip(dataIndex, position, onPoint) {

                    //increase dataIndex if ticks are padded
                    var tickIndex = dataIndex;
                    if ((tickObj.ticks && tickObj.ticks[0] && tickObj.ticks[0][0] < 0) && (tickObj.tickTexts && tickObj.tickTexts[0] === "")) {
                        tickIndex++;
                    }
                    var tooltip = $("#graph-tooltip");
                    var crossHairPos = graphObj.p2c(position);
                    var minpoz = Math.max(200, tooltip.width());
                    var tooltipLeft = (crossHairPos.left < minpoz) ? crossHairPos.left + 20 : crossHairPos.left - tooltip.width() - 20;
                    tooltip.css({ left: tooltipLeft });

                    if (onPoint) {
                        var dataSet = graphObj.getData(),
                            tooltipHTML = "<div class='title'>" + tickObj.tickTexts[tickIndex] + "</div>";

                        dataSet = _.sortBy(dataSet, function(obj) {
                            return obj.data[dataIndex][1];
                        });

                        for (var m = dataSet.length - 1; m >= 0; --m) {
                            var series = dataSet[m],
                                formattedValue = series.data[dataIndex][1];

                            var addMe = "";
                            // Change label to previous period if there is a ghost graph
                            if (series.mode === "ghost") {
                                series.label = jQuery.i18n.map["common.previous-period"];
                            }
                            var opacity = "1.0";
                            //add lines over color block for dashed 
                            if (series.dashed && series.previous) {
                                addMe = '<svg style="width: 12px; height: 12px; position:absolute; top:0; left:0;"><line stroke-dasharray="2, 2"  x1="0" y1="100%" x2="100%" y2="0" style="stroke:rgb(255,255,255);stroke-width:30"/></svg>';
                            }
                            if (series.alpha) {
                                opacity = series.alpha + "";
                            }
                            if (formattedValue) {
                                formattedValue = parseFloat(formattedValue).toFixed(2).replace(/[.,]00$/, "");
                            }
                            if (series.data[dataIndex][2]) {
                                formattedValue = series.data[dataIndex][2]; // to show customized string value tips
                            }

                            tooltipHTML += "<div class='inner'>";
                            tooltipHTML += "<div class='color' style='position:relative; background-color: " + series.color + "; opacity:" + opacity + ";'>" + addMe + "</div>";
                            tooltipHTML += "<div class='series'>" + series.label + "</div>";
                            tooltipHTML += "<div class='value'>" + formattedValue + "</div>";
                            tooltipHTML += "</div>";
                        }

                        if (tooltip.length) {
                            tooltip.html(tooltipHTML);
                        }
                        else {
                            tooltip = $("<div id='graph-tooltip' class='white' style='top:-15px;'>" + tooltipHTML + "</div>");

                            $(container).prepend(tooltip);
                        }

                        if (tooltip.is(":visible")) {
                            tooltip.css({
                                "transition": "left .15s"
                            });
                        }
                        else {
                            tooltip.fadeIn();
                        }
                    }
                }

                $(container).unbind("plothover");

                $(container).bind("plothover", function(event, pos) {
                    graphObj.unlockCrosshair();
                    graphObj.unhighlight();

                    var dataset = graphObj.getData(),
                        pointFound = false;

                    for (i = 0; i < dataset.length; ++i) {
                        var series = dataset[i];

                        // Find the nearest points, x-wise
                        for (j = 0; j < series.data.length; ++j) {
                            var currX = series.data[j][0],
                                currCrossX = pos.x.toFixed(2);

                            if ((currX - 0.10) < currCrossX && (currX + 0.10) > currCrossX) {

                                graphObj.lockCrosshair({
                                    x: series.data[j][0],
                                    y: series.data[j][1]
                                });

                                graphObj.highlight(series, j);
                                pointFound = true;
                                break;
                            }
                        }
                    }

                    showCrosshairTooltip(j, pos, pointFound);
                });


                if (!(options && _.isObject(options) && $(container).parents("#dashboard-data").length > 0)) {
                    var zoomTarget = $(container),
                        zoomContainer = $(container).parent();

                    zoomContainer.find(".zoom").remove();
                    zoomContainer.prepend("<div class=\"zoom\"><div class=\"zoom-button zoom-out\"></div><div class=\"zoom-button zoom-reset\"></div><div class=\"zoom-button zoom-in\"></div></div>");
                    zoomTarget.addClass("pannable");
                    zoomContainer.data("zoom", zoomContainer.data("zoom") || 1);

                    zoomContainer.find(".zoom-in").tooltipster({
                        theme: "tooltipster-borderless",
                        content: $.i18n.map["common.zoom-in"]
                    });

                    zoomContainer.find(".zoom-out").tooltipster({
                        theme: "tooltipster-borderless",
                        content: $.i18n.map["common.zoom-out"]
                    });

                    zoomContainer.find(".zoom-reset").tooltipster({
                        theme: "tooltipster-borderless",
                        content: {},
                        functionFormat: function() {
                            return $.i18n.prop("common.zoom-reset", Math.round(zoomContainer.data("zoom") * 100));
                        }
                    });

                    zoomContainer.find(".zoom-out").off("click").on("click", function() {
                        var plot = zoomTarget.data("plot");
                        plot.zoomOut({
                            amount: 1.5,
                            center: {left: plot.width() / 2, top: plot.height()}
                        });

                        zoomContainer.data("zoom", zoomContainer.data("zoom") / 1.5);
                    });

                    zoomContainer.find(".zoom-reset").off("click").on("click", function() {
                        var plot = zoomTarget.data("plot");

                        plot.zoomOut({
                            amount: zoomContainer.data("zoom"),
                            center: {left: plot.width() / 2, top: plot.height()}
                        });

                        zoomContainer.data("zoom", 1);

                        var yaxis = plot.getAxes().yaxis;
                        var panOffset = yaxis.p2c(0) - plot.height() + 2;
                        if (Math.abs(panOffset) > 2) {
                            plot.pan({top: panOffset});
                        }
                    });

                    zoomContainer.find(".zoom-in").off("click").on("click", function() {
                        var plot = zoomTarget.data("plot");
                        plot.zoom({
                            amount: 1.5,
                            center: {left: plot.width() / 2, top: plot.height()}
                        });
                        zoomContainer.data("zoom", zoomContainer.data("zoom") * 1.5);
                    });

                    zoomTarget.off("plotzoom").on("plotzoom", function() {
                        drawLabels();
                    });

                    zoomTarget.off("plotpan").on("plotpan", function() {
                        drawLabels();
                    });
                }
            }, dataPoints, container, bucket);
        };

        /**
        * Draws a gauge with provided value on procided container.
        * @memberof countlyCommon
        * @param {string|object} targetEl - selector for container or container object itself where to create graph
        * @param {number} value - value to display on gauge
        * @param {number} maxValue - maximal value of the gauge
        * @param {string} gaugeColor - color of the gauge in hexadecimal string as #ffffff
        * @param {string|object} textField - selector for container or container object itself where to output textual value
        */
        countlyCommon.drawGauge = function(targetEl, value, maxValue, gaugeColor, textField) {
            var opts = {
                lines: 12,
                angle: 0.15,
                lineWidth: 0.44,
                pointer: {
                    length: 0.7,
                    strokeWidth: 0.05,
                    color: '#000000'
                },
                colorStart: gaugeColor,
                colorStop: gaugeColor,
                strokeColor: '#E0E0E0',
                generateGradient: true
            };

            var gauge = new Gauge($(targetEl)[0]).setOptions(opts);

            if (textField) {
                gauge.setTextField($(textField)[0]);
            }

            gauge.maxValue = maxValue;
            gauge.set(1);
            gauge.set(value);
        };

        /**
        * Draws horizibtally stacked bars like in platforms and density analytic sections.
        * @memberof countlyCommon
        * @param {array} data - data to draw in form of [{"data":[[0,85]],"label":"Test1"},{"data":[[0,79]],"label":"Test2"},{"data":[[0,78]],"label":"Test3"}]
        * @param {object|string} intoElement - selector for container or container object itself where to create graph
        * @param {number} colorIndex - index of color from {@link countlyCommon.GRAPH_COLORS}
        */
        countlyCommon.drawHorizontalStackedBars = function(data, intoElement, colorIndex) {
            var processedData = [],
                tmpProcessedData = [],
                totalCount = 0,
                maxToDisplay = 10,
                barHeight = 30;
            var i = 0;
            for (i = 0; i < data.length; i++) {
                tmpProcessedData.push({
                    label: data[i].label,
                    count: data[i].data[0][1],
                    index: i
                });

                totalCount += data[i].data[0][1];
            }

            var totalPerc = 0,
                proCount = 0;

            for (i = 0; i < tmpProcessedData.length; i++) {
                if (i >= maxToDisplay) {
                    processedData.push({
                        label: "Other",
                        count: totalCount - proCount,
                        perc: countlyCommon.round((100 - totalPerc), 2) + "%",
                        index: i
                    });

                    break;
                }

                var perc = countlyCommon.round((tmpProcessedData[i].count / totalCount) * 100, 2);
                tmpProcessedData[i].perc = perc + "%";
                totalPerc += perc;
                proCount += tmpProcessedData[i].count;

                processedData.push(tmpProcessedData[i]);
            }

            if (processedData.length > 0) {
                var percentSoFar = 0;

                var chart = d3.select(intoElement)
                    .attr("width", "100%")
                    .attr("height", barHeight);

                var bar = chart.selectAll("g")
                    .data(processedData)
                    .enter().append("g");

                bar.append("rect")
                    .attr("width", function(d) {
                        return ((d.count / totalCount) * 100) + "%";
                    })
                    .attr("x", function(d) {
                        var myPercent = percentSoFar;
                        percentSoFar = percentSoFar + (100 * (d.count / totalCount));

                        return myPercent + "%";
                    })
                    .attr("height", barHeight)
                    .attr("fill", function(d) {
                        if (colorIndex || colorIndex === 0) {
                            return countlyCommon.GRAPH_COLORS[colorIndex];
                        }
                        else {
                            return countlyCommon.GRAPH_COLORS[d.index];
                        }
                    })
                    .attr("stroke", "#FFF")
                    .attr("stroke-width", 2);

                if (colorIndex || colorIndex === 0) {
                    bar.attr("opacity", function(d) {
                        return 1 - (0.05 * d.index);
                    });
                }

                percentSoFar = 0;

                bar.append("foreignObject")
                    .attr("width", function(d) {
                        return ((d.count / totalCount) * 100) + "%";
                    })
                    .attr("height", barHeight)
                    .attr("x", function(d) {
                        var myPercent = percentSoFar;
                        percentSoFar = percentSoFar + (100 * (d.count / totalCount));

                        return myPercent + "%";
                    })
                    .append("xhtml:div")
                    .attr("class", "hsb-tip")
                    .html(function(d) {
                        return "<div>" + d.perc + "</div>";
                    });

                percentSoFar = 0;

                bar.append("text")
                    .attr("x", function(d) {
                        var myPercent = percentSoFar;
                        percentSoFar = percentSoFar + (100 * (d.count / totalCount));

                        return myPercent + 0.5 + "%";
                    })
                    .attr("dy", "1.35em")
                    .text(function(d) {
                        return d.label;
                    });
            }
            else {
                var chart1 = d3.select(intoElement)
                    .attr("width", "100%")
                    .attr("height", barHeight);

                var bar1 = chart1.selectAll("g")
                    .data([{ text: jQuery.i18n.map["common.bar.no-data"] }])
                    .enter().append("g");

                bar1.append("rect")
                    .attr("width", "100%")
                    .attr("height", barHeight)
                    .attr("fill", "#FBFBFB")
                    .attr("stroke", "#FFF")
                    .attr("stroke-width", 2);

                bar1.append("foreignObject")
                    .attr("width", "100%")
                    .attr("height", barHeight)
                    .append("xhtml:div")
                    .attr("class", "no-data")
                    .html(function(d) {
                        return d.text;
                    });
            }
        };

        /**
        * Extract range data from standard countly metric data model
        * @memberof countlyCommon
        * @param {object} db - countly standard metric data object
        * @param {string} propertyName - name of the property to extract
        * @param {object} rangeArray - array of all metrics/segments to extract (usually what is contained in meta)
        * @param {function} explainRange - function to convert range/bucket index to meaningful label
        * @param {array} myorder - arrays of preferred order for give keys. Optional. If not passed - sorted by values
        * @returns {array} array containing extracted ranged data as [{"f":"First session","t":352,"percent":"88.4"},{"f":"2 days","t":46,"percent":"11.6"}]
        * @example <caption>Extracting session frequency from users collection</caption>
        *    //outputs [{"f":"First session","t":352,"percent":"88.4"},{"f":"2 days","t":46,"percent":"11.6"}]
        *    countlyCommon.extractRangeData(_userDb, "f", _frequencies, countlySession.explainFrequencyRange);
        */
        countlyCommon.extractRangeData = function(db, propertyName, rangeArray, explainRange, myorder) {
            countlyCommon.periodObj = getPeriodObj();

            var dataArr = [],
                dataArrCounter = 0,
                rangeTotal,
                total = 0;
            var tmp_x = 0;
            if (!rangeArray) {
                return dataArr;
            }

            for (var j = 0; j < rangeArray.length; j++) {

                rangeTotal = 0;

                if (!countlyCommon.periodObj.isSpecialPeriod) {
                    tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.activePeriod + "." + propertyName);

                    if (tmp_x && tmp_x[rangeArray[j]]) {
                        rangeTotal += tmp_x[rangeArray[j]];
                    }

                    if (rangeTotal !== 0) {
                        dataArr[dataArrCounter] = {};
                        dataArr[dataArrCounter][propertyName] = (explainRange) ? explainRange(rangeArray[j]) : rangeArray[j];
                        dataArr[dataArrCounter].t = rangeTotal;

                        total += rangeTotal;
                        dataArrCounter++;
                    }
                }
                else {
                    var tmpRangeTotal = 0;
                    var i = 0;
                    for (i = 0; i < (countlyCommon.periodObj.uniquePeriodArr.length); i++) {
                        tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodArr[i] + "." + propertyName);

                        if (tmp_x && tmp_x[rangeArray[j]]) {
                            rangeTotal += tmp_x[rangeArray[j]];
                        }
                    }

                    for (i = 0; i < (countlyCommon.periodObj.uniquePeriodCheckArr.length); i++) {
                        tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodCheckArr[i] + "." + propertyName);

                        if (tmp_x && tmp_x[rangeArray[j]]) {
                            tmpRangeTotal += tmp_x[rangeArray[j]];
                        }
                    }

                    if (rangeTotal > tmpRangeTotal) {
                        rangeTotal = tmpRangeTotal;
                    }

                    if (rangeTotal !== 0) {
                        dataArr[dataArrCounter] = {};
                        dataArr[dataArrCounter][propertyName] = (explainRange) ? explainRange(rangeArray[j]) : rangeArray[j];
                        dataArr[dataArrCounter].t = rangeTotal;

                        total += rangeTotal;
                        dataArrCounter++;
                    }
                }
            }

            for (var z = 0; z < dataArr.length; z++) {
                dataArr[z].percent = ((dataArr[z].t / total) * 100).toFixed(1);
            }

            if (myorder && Array.isArray(myorder)) {
                dataArr.sort(function(a, b) {
                    return (myorder.indexOf(a[propertyName]) - myorder.indexOf(b[propertyName]));
                });
            }
            else {
                dataArr.sort(function(a, b) {
                    return -(a.t - b.t);
                });
            }
            return dataArr;
        };

        /**
        * Extract single level data without metrics/segments, like total user data from users collection
        * @memberof countlyCommon
        * @param {object} db - countly standard metric data object
        * @param {function} clearFunction - function to prefill all expected properties as u, t, n, etc with 0, so you would not have null in the result which won't work when drawing graphs
        * @param {object} chartData - prefill chart data with labels, colors, etc
        * @param {object} dataProperties - describing which properties and how to extract
        * @param {string}  metric  - metric to select
        * @returns {object} object to use in timeline graph with {"chartDP":chartData, "chartData":_.compact(tableData), "keyEvents":keyEvents}
        * @example <caption>Extracting total users data from users collection</caption>
        * countlyCommon.extractChartData(_sessionDb, countlySession.clearObject, [
        *      { data:[], label:"Total Users" }
        *  ], [
        *      {
        *          name:"t",
        *          func:function (dataObj) {
        *              return dataObj["u"]
        *          }
        *      }
        *  ]);
        *  @example <caption>Returned data</caption>
        * {"chartDP":[
        *    {
        *        "data":[[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0],[12,0],[13,0],[14,0],[15,12]],
        *        "label":"Total Sessions",
        *        "color":"#DDDDDD",
        *        "mode":"ghost"
        *    },
        *    {
        *        "data":[[0,6],[1,14],[2,11],[3,18],[4,10],[5,32],[6,53],[7,55],[8,71],[9,82],[10,74],[11,69],[12,60],[13,17],[14,6],[15,3]],
        *        "label":"Total Sessions",
        *        "color":"#333933"
        *    }
        *  ],
        *  "chartData":[
        *    {"date":"22 Dec, 2016","pt":0,"t":6},
        *    {"date":"23 Dec, 2016","pt":0,"t":14},
        *    {"date":"24 Dec, 2016","pt":0,"t":11},
        *    {"date":"25 Dec, 2016","pt":0,"t":18},
        *    {"date":"26 Dec, 2016","pt":0,"t":10},
        *    {"date":"27 Dec, 2016","pt":0,"t":32},
        *    {"date":"28 Dec, 2016","pt":0,"t":53},
        *    {"date":"29 Dec, 2016","pt":0,"t":55},
        *    {"date":"30 Dec, 2016","pt":0,"t":71},
        *    {"date":"31 Dec, 2016","pt":0,"t":82},
        *    {"date":"1 Jan, 2017","pt":0,"t":74},
        *    {"date":"2 Jan, 2017","pt":0,"t":69},
        *    {"date":"3 Jan, 2017","pt":0,"t":60},
        *    {"date":"4 Jan, 2017","pt":0,"t":17},
        *    {"date":"5 Jan, 2017","pt":0,"t":6},
        *    {"date":"6 Jan, 2017","pt":12,"t":3}
        *  ],
        *  "keyEvents":[{"min":0,"max":12},{"min":0,"max":82}]
        * }
        */
        countlyCommon.extractChartData = function(db, clearFunction, chartData, dataProperties, metric) {
            if (metric) {
                metric = "." + metric;
            }
            else {
                metric = "";
            }
            countlyCommon.periodObj = getPeriodObj();

            var periodMin = countlyCommon.periodObj.periodMin,
                periodMax = (countlyCommon.periodObj.periodMax + 1),
                dataObj = {},
                formattedDate = "",
                tableData = [],
                propertyNames = _.pluck(dataProperties, "name"),
                propertyFunctions = _.pluck(dataProperties, "func"),
                currOrPrevious = _.pluck(dataProperties, "period"),
                activeDate,
                activeDateArr;

            for (var j = 0; j < propertyNames.length; j++) {
                if (currOrPrevious[j] === "previous") {
                    if (countlyCommon.periodObj.isSpecialPeriod) {
                        periodMin = 0;
                        periodMax = countlyCommon.periodObj.previousPeriodArr.length;
                        activeDateArr = countlyCommon.periodObj.previousPeriodArr;
                    }
                    else {
                        activeDate = countlyCommon.periodObj.previousPeriod;
                    }
                }
                else {
                    if (countlyCommon.periodObj.isSpecialPeriod) {
                        periodMin = 0;
                        periodMax = countlyCommon.periodObj.currentPeriodArr.length;
                        activeDateArr = countlyCommon.periodObj.currentPeriodArr;
                    }
                    else {
                        activeDate = countlyCommon.periodObj.activePeriod;
                    }
                }
                for (var i = periodMin, counter = 0; i < periodMax; i++, counter++) {

                    if (!countlyCommon.periodObj.isSpecialPeriod) {

                        if (countlyCommon.periodObj.periodMin === 0) {
                            formattedDate = moment((activeDate + " " + i + ":00:00").replace(/\./g, "/"), "YYYY/MM/DD HH:mm:ss");
                        }
                        else if (("" + activeDate).indexOf(".") === -1) {
                            formattedDate = moment((activeDate + "/" + i + "/1").replace(/\./g, "/"), "YYYY/MM/DD");
                        }
                        else {
                            formattedDate = moment((activeDate + "/" + i).replace(/\./g, "/"), "YYYY/MM/DD");
                        }

                        dataObj = countlyCommon.getDescendantProp(db, activeDate + "." + i + metric);
                    }
                    else {
                        formattedDate = moment((activeDateArr[i]).replace(/\./g, "/"), "YYYY/MM/DD");
                        dataObj = countlyCommon.getDescendantProp(db, activeDateArr[i] + metric);
                    }

                    dataObj = clearFunction(dataObj);

                    if (!tableData[counter]) {
                        tableData[counter] = {};
                    }

                    tableData[counter].date = countlyCommon.formatDate(formattedDate, countlyCommon.periodObj.dateString);
                    var propertyValue = "";
                    if (propertyFunctions[j]) {
                        propertyValue = propertyFunctions[j](dataObj);
                    }
                    else {
                        propertyValue = dataObj[propertyNames[j]];
                    }

                    chartData[j].data[chartData[j].data.length] = [counter, propertyValue];
                    tableData[counter][propertyNames[j]] = propertyValue;
                }
            }

            var keyEvents = [];

            for (var k = 0; k < chartData.length; k++) {
                var flatChartData = _.flatten(chartData[k].data);
                var chartVals = _.reject(flatChartData, function(context, value) {
                    return value % 2 === 0;
                });
                keyEvents[k] = {};
                keyEvents[k].min = _.min(chartVals);
                keyEvents[k].max = _.max(chartVals);
            }

            return { "chartDP": chartData, "chartData": _.compact(tableData), "keyEvents": keyEvents };
        };

        /**
        * Extract two level data with metrics/segments, like total user data from carriers collection
        * @memberof countlyCommon
        * @param {object} db - countly standard metric data object
        * @param {object} rangeArray - array of all metrics/segments to extract (usually what is contained in meta)
        * @param {function} clearFunction - function to prefill all expected properties as u, t, n, etc with 0, so you would not have null in the result which won't work when drawing graphs
        * @param {object} dataProperties - describing which properties and how to extract
        * @param {object=} estOverrideMetric - data from total users api request to correct unique user values
        * @returns {object} object to use in bar and pie charts with {"chartData":_.compact(tableData)}
        * @example <caption>Extracting carriers data from carriers collection</caption>
        * var chartData = countlyCommon.extractTwoLevelData(_carrierDb, ["At&t", "Verizon"], countlyCarrier.clearObject, [
        *      {
        *          name:"carrier",
        *          func:function (rangeArr, dataObj) {
        *              return rangeArr;
        *          }
        *      },
        *      { "name":"t" },
        *      { "name":"u" },
        *      { "name":"n" }
        * ]);
        * @example <caption>Return data</caption>
        * {"chartData":['
        *    {"carrier":"At&t","t":71,"u":62,"n":36},
        *    {"carrier":"Verizon","t":66,"u":60,"n":30}
        * ]}
        */
        countlyCommon.extractTwoLevelData = function(db, rangeArray, clearFunction, dataProperties, estOverrideMetric) {

            countlyCommon.periodObj = getPeriodObj();

            if (!rangeArray) {
                return { "chartData": tableData };
            }
            var periodMin = 0,
                periodMax = 0,
                dataObj = {},
                tableData = [],
                propertyNames = _.pluck(dataProperties, "name"),
                propertyFunctions = _.pluck(dataProperties, "func"),
                propertyValue = 0;

            if (!countlyCommon.periodObj.isSpecialPeriod) {
                periodMin = countlyCommon.periodObj.periodMin;
                periodMax = (countlyCommon.periodObj.periodMax + 1);
            }
            else {
                periodMin = 0;
                periodMax = countlyCommon.periodObj.currentPeriodArr.length;
            }

            var tableCounter = 0;
            var j = 0;
            var k = 0;
            var i = 0;

            if (!countlyCommon.periodObj.isSpecialPeriod) {
                for (j = 0; j < rangeArray.length; j++) {
                    dataObj = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.activePeriod + "." + rangeArray[j]);

                    if (!dataObj) {
                        continue;
                    }
                    var tmpPropertyObj1 = {};
                    dataObj = clearFunction(dataObj);

                    var propertySum = 0;
                    for (k = 0; k < propertyNames.length; k++) {

                        if (propertyFunctions[k]) {
                            propertyValue = propertyFunctions[k](rangeArray[j], dataObj);
                        }
                        else {
                            propertyValue = dataObj[propertyNames[k]];
                        }

                        if (typeof propertyValue !== 'string') {
                            propertySum += propertyValue;
                        }

                        tmpPropertyObj1[propertyNames[k]] = propertyValue;
                    }

                    if (propertySum > 0) {
                        tableData[tableCounter] = {};
                        tableData[tableCounter] = tmpPropertyObj1;
                        tableCounter++;
                    }
                }
            }
            else {
                var calculatedObj = (estOverrideMetric) ? countlyTotalUsers.get(estOverrideMetric) : {};

                for (j = 0; j < rangeArray.length; j++) {

                    var tmp_x = {};
                    var tmpPropertyObj = {};
                    for (i = periodMin; i < periodMax; i++) {
                        dataObj = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.currentPeriodArr[i] + "." + rangeArray[j]);

                        if (!dataObj) {
                            continue;
                        }

                        dataObj = clearFunction(dataObj);

                        for (k = 0; k < propertyNames.length; k++) {

                            if (propertyNames[k] === "u") {
                                propertyValue = 0;
                            }
                            else if (propertyFunctions[k]) {
                                propertyValue = propertyFunctions[k](rangeArray[j], dataObj);
                            }
                            else {
                                propertyValue = dataObj[propertyNames[k]];
                            }

                            if (!tmpPropertyObj[propertyNames[k]]) {
                                tmpPropertyObj[propertyNames[k]] = 0;
                            }

                            if (typeof propertyValue === 'string') {
                                tmpPropertyObj[propertyNames[k]] = propertyValue;
                            }
                            else {
                                tmpPropertyObj[propertyNames[k]] += propertyValue;
                            }
                        }
                    }

                    if (propertyNames.indexOf("u") !== -1 && Object.keys(tmpPropertyObj).length) {
                        if (countlyTotalUsers.isUsable() && estOverrideMetric && typeof calculatedObj[rangeArray[j]] !== "undefined") {

                            tmpPropertyObj.u = calculatedObj[rangeArray[j]];

                        }
                        else {
                            var tmpUniqVal = 0,
                                tmpUniqValCheck = 0,
                                tmpCheckVal = 0,
                                l = 0;

                            for (l = 0; l < (countlyCommon.periodObj.uniquePeriodArr.length); l++) {
                                tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodArr[l] + "." + rangeArray[j]);
                                if (!tmp_x) {
                                    continue;
                                }
                                tmp_x = clearFunction(tmp_x);
                                propertyValue = tmp_x.u;

                                if (typeof propertyValue === 'string') {
                                    tmpPropertyObj.u = propertyValue;
                                }
                                else {
                                    tmpUniqVal += propertyValue;
                                    tmpPropertyObj.u += propertyValue;
                                }
                            }

                            for (l = 0; l < (countlyCommon.periodObj.uniquePeriodCheckArr.length); l++) {
                                tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodCheckArr[l] + "." + rangeArray[j]);
                                if (!tmp_x) {
                                    continue;
                                }
                                tmp_x = clearFunction(tmp_x);
                                tmpCheckVal = tmp_x.u;

                                if (typeof tmpCheckVal !== 'string') {
                                    tmpUniqValCheck += tmpCheckVal;
                                }
                            }

                            if (tmpUniqVal > tmpUniqValCheck) {
                                tmpPropertyObj.u = tmpUniqValCheck;
                            }

                        }
                        // Total users can't be less than new users
                        if (tmpPropertyObj.u < tmpPropertyObj.n) {
                            if (countlyTotalUsers.isUsable() && estOverrideMetric && typeof calculatedObj[rangeArray[j]] !== "undefined") {
                                tmpPropertyObj.n = calculatedObj[rangeArray[j]];
                            }
                            else {
                                tmpPropertyObj.u = tmpPropertyObj.n;
                            }
                        }

                        // Total users can't be more than total sessions
                        if (tmpPropertyObj.u > tmpPropertyObj.t) {
                            tmpPropertyObj.u = tmpPropertyObj.t;
                        }
                    }

                    tableData[tableCounter] = {};
                    tableData[tableCounter] = tmpPropertyObj;
                    tableCounter++;
                }
            }

            for (i = 0; i < tableData.length; i++) {
                if (_.isEmpty(tableData[i])) {
                    tableData[i] = null;
                }
            }

            tableData = _.compact(tableData);

            if (propertyNames.indexOf("u") !== -1) {
                countlyCommon.sortByProperty(tableData, "u");
            }
            else if (propertyNames.indexOf("t") !== -1) {
                countlyCommon.sortByProperty(tableData, "t");
            }
            else if (propertyNames.indexOf("c") !== -1) {
                countlyCommon.sortByProperty(tableData, "c");
            }

            return { "chartData": tableData };
        };

        countlyCommon.sortByProperty = function(tableData, prop) {
            tableData.sort(function(a, b) {
                a = (a && a[prop]) ? a[prop] : 0;
                b = (b && b[prop]) ? b[prop] : 0;
                return b - a;
            });
        };

        /**
        * Merge metric data in chartData returned by @{link countlyCommon.extractChartData} or @{link countlyCommon.extractTwoLevelData }, just in case if after data transformation of countly standard metric data model, resulting chartData contains duplicated values, as for example converting null, undefined and unknown values to unknown
        * @memberof countlyCommon
        * @param {object} chartData - chartData returned by @{link countlyCommon.extractChartData} or @{link countlyCommon.extractTwoLevelData }
        * @param {string} metric - metric name to merge
        * @returns {object} chartData object with same metrics summed up
        * @example <caption>Sample input</caption>
        *    {"chartData":[
        *        {"metric":"Test","t":71,"u":62,"n":36},
        *        {"metric":"Test1","t":66,"u":60,"n":30},
        *        {"metric":"Test","t":2,"u":3,"n":4}
        *    ]}
        * @example <caption>Sample output</caption>
        *    {"chartData":[
        *        {"metric":"Test","t":73,"u":65,"n":40},
        *        {"metric":"Test1","t":66,"u":60,"n":30}
        *    ]}
        */
        countlyCommon.mergeMetricsByName = function(chartData, metric) {
            var uniqueNames = {},
                data;
            for (var i = 0; i < chartData.length; i++) {
                data = chartData[i];
                var newName = (data[metric] + "").trim();
                if (newName === "") {
                    newName = jQuery.i18n.map["common.unknown"];
                }
                data[metric] = newName;
                if (newName && !uniqueNames[newName]) {
                    uniqueNames[newName] = data;
                }
                else {
                    for (var key in data) {
                        if (typeof data[key] === "string") {
                            uniqueNames[newName][key] = data[key];
                        }
                        else if (typeof data[key] === "number") {
                            if (!uniqueNames[newName][key]) {
                                uniqueNames[newName][key] = 0;
                            }
                            uniqueNames[newName][key] += data[key];
                        }
                    }
                }
            }

            return _.values(uniqueNames);
        };

        /**
        * Extracts top three items (from rangeArray) that have the biggest total session counts from the db object.
        * @memberof countlyCommon
        * @param {object} db - countly standard metric data object
        * @param {object} rangeArray - array of all metrics/segments to extract (usually what is contained in meta)
        * @param {function} clearFunction - function to prefill all expected properties as u, t, n, etc with 0, so you would not have null in the result which won't work when drawing graphs
        * @param {function} fetchFunction - function to fetch property, default used is function (rangeArr, dataObj) {return rangeArr;}
        * @param {String} metric - name of the metric to use ordering and returning
        * @param {string} estOverrideMetric - name of the total users estimation override, by default will use default _estOverrideMetric provided on initialization
        * @param {function} fixBarSegmentData - function to make any adjustments to the extracted data based on segment
        * @returns {array} array with top 3 values
        * @example <caption>Return data</caption>
        * [
        *    {"name":"iOS","percent":35},
        *    {"name":"Android","percent":33},
        *    {"name":"Windows Phone","percent":32}
        * ]
        */
        countlyCommon.extractBarDataWPercentageOfTotal = function(db, rangeArray, clearFunction, fetchFunction, metric, estOverrideMetric, fixBarSegmentData) {
            fetchFunction = fetchFunction || function(rangeArr) {
                return rangeArr;
            };

            var rangeData = countlyCommon.extractTwoLevelData(db, rangeArray, clearFunction, [
                {
                    name: "range",
                    func: fetchFunction
                },
                { "name": metric }
            ], estOverrideMetric);

            return countlyCommon.calculateBarDataWPercentageOfTotal(rangeData, metric, fixBarSegmentData);
        };

        /**
        * Extracts top three items (from rangeArray) that have the biggest total session counts from the db object.
        * @memberof countlyCommon
        * @param {object} db - countly standard metric data object
        * @param {object} rangeArray - array of all metrics/segments to extract (usually what is contained in meta)
        * @param {function} clearFunction - function to prefill all expected properties as u, t, n, etc with 0, so you would not have null in the result which won't work when drawing graphs
        * @param {function} fetchFunction - function to fetch property, default used is function (rangeArr, dataObj) {return rangeArr;}
        * @returns {array} array with top 3 values
        * @example <caption>Return data</caption>
        * [
        *    {"name":"iOS","percent":35},
        *    {"name":"Android","percent":33},
        *    {"name":"Windows Phone","percent":32}
        * ]
        */
        countlyCommon.extractBarData = function(db, rangeArray, clearFunction, fetchFunction) {
            fetchFunction = fetchFunction || function(rangeArr) {
                return rangeArr;
            };

            var rangeData = countlyCommon.extractTwoLevelData(db, rangeArray, clearFunction, [
                {
                    name: "range",
                    func: fetchFunction
                },
                { "name": "t" }
            ]);
            return countlyCommon.calculateBarData(rangeData);
        };

        /**
        * Extracts top three items (from rangeArray) that have the biggest total session counts from the chartData with their percentage of total
        * @memberof countlyCommon
        * @param {object} rangeData - chartData retrieved from {@link countlyCommon.extractTwoLevelData} as {"chartData":[{"carrier":"At&t","t":71,"u":62,"n":36},{"carrier":"Verizon","t":66,"u":60,"n":30}]}
        * @param {String} metric - name of the metric to use ordering and returning
        * @param {Function} fixBarSegmentData - Function to fix bar data segment data
        * @returns {array} array with top 3 values
        * @example <caption>Return data</caption>
        * [
        *    {"name":"iOS","percent":44},
        *    {"name":"Android","percent":22},
        *    {"name":"Windows Phone","percent":14}
        * ]
        */
        countlyCommon.calculateBarDataWPercentageOfTotal = function(rangeData, metric, fixBarSegmentData) {
            rangeData.chartData = countlyCommon.mergeMetricsByName(rangeData.chartData, "range");

            if (fixBarSegmentData) {
                rangeData = fixBarSegmentData(rangeData);
            }

            rangeData.chartData = _.sortBy(rangeData.chartData, function(obj) {
                return -obj[metric];
            });

            var rangeNames = _.pluck(rangeData.chartData, 'range'),
                rangeTotal = _.pluck(rangeData.chartData, metric),
                barData = [],
                maxItems = 3,
                totalSum = 0;

            rangeTotal.forEach(function(r) {
                totalSum += r;
            });

            rangeTotal.sort(function(a, b) {
                if (a < b) {
                    return 1;
                }
                if (b < a) {
                    return -1;
                }
                return 0;
            });

            var totalPercent = 0;

            for (var i = rangeNames.length - 1; i >= 0; i--) {
                var percent = countlyCommon.round((rangeTotal[i] / totalSum) * 100, 1);
                totalPercent += percent;
                barData[i] = { "name": rangeNames[i], "percent": percent };
            }

            var deltaFixEl = 0;
            if (totalPercent < 100) {
                //Add the missing delta to the first value
                deltaFixEl = 0;
            }
            else if (totalPercent > 100) {
                //Subtract the extra delta from the last value
                deltaFixEl = barData.length - 1;
            }

            barData[deltaFixEl].percent += 100 - totalPercent;
            barData[deltaFixEl].percent = countlyCommon.round(barData[deltaFixEl].percent, 1);

            if (rangeNames.length < maxItems) {
                maxItems = rangeNames.length;
            }

            return barData.slice(0, maxItems);
        };


        /**
        * Extracts top three items (from rangeArray) that have the biggest total session counts from the chartData.
        * @memberof countlyCommon
        * @param {object} rangeData - chartData retrieved from {@link countlyCommon.extractTwoLevelData} as {"chartData":[{"carrier":"At&t","t":71,"u":62,"n":36},{"carrier":"Verizon","t":66,"u":60,"n":30}]}
        * @returns {array} array with top 3 values
        * @example <caption>Return data</caption>
        * [
        *    {"name":"iOS","percent":35},
        *    {"name":"Android","percent":33},
        *    {"name":"Windows Phone","percent":32}
        * ]
        */
        countlyCommon.calculateBarData = function(rangeData) {
            rangeData.chartData = countlyCommon.mergeMetricsByName(rangeData.chartData, "range");
            rangeData.chartData = _.sortBy(rangeData.chartData, function(obj) {
                return -obj.t;
            });

            var rangeNames = _.pluck(rangeData.chartData, 'range'),
                rangeTotal = _.pluck(rangeData.chartData, 't'),
                barData = [],
                sum = 0,
                maxItems = 3,
                totalPercent = 0;

            rangeTotal.sort(function(a, b) {
                if (a < b) {
                    return 1;
                }
                if (b < a) {
                    return -1;
                }
                return 0;
            });

            if (rangeNames.length < maxItems) {
                maxItems = rangeNames.length;
            }
            var i = 0;
            for (i = 0; i < maxItems; i++) {
                sum += rangeTotal[i];
            }

            for (i = maxItems - 1; i >= 0; i--) {
                var percent = Math.floor((rangeTotal[i] / sum) * 100);
                totalPercent += percent;

                if (i === 0) {
                    percent += 100 - totalPercent;
                }

                barData[i] = { "name": rangeNames[i], "percent": percent };
            }

            return barData;
        };

        countlyCommon.extractUserChartData = function(db, label, sec) {
            var ret = { "data": [], "label": label };
            countlyCommon.periodObj = getPeriodObj();
            var periodMin, periodMax, dateob;
            if (countlyCommon.periodObj.isSpecialPeriod) {
                periodMin = 0;
                periodMax = (countlyCommon.periodObj.daysInPeriod);
                var dateob1 = countlyCommon.processPeriod(countlyCommon.periodObj.currentPeriodArr[0].toString());
                var dateob2 = countlyCommon.processPeriod(countlyCommon.periodObj.currentPeriodArr[countlyCommon.periodObj.currentPeriodArr.length - 1].toString());
                dateob = { timestart: dateob1.timestart, timeend: dateob2.timeend, range: "d" };
            }
            else {
                periodMin = countlyCommon.periodObj.periodMin;
                periodMax = countlyCommon.periodObj.periodMax + 1;
                dateob = countlyCommon.processPeriod(countlyCommon.periodObj.activePeriod.toString());
            }
            var res = [],
                ts;
            //get all timestamps in that period
            var i = 0;
            for (i = 0, l = db.length; i < l; i++) {
                ts = db[i];
                if (sec) {
                    ts.ts = ts.ts * 1000;
                }
                if (ts.ts > dateob.timestart && ts.ts <= dateob.timeend) {
                    res.push(ts);
                }
            }
            var lastStart,
                lastEnd = dateob.timestart,
                total,
                data = ret.data;
            for (i = periodMin; i < periodMax; i++) {
                total = 0;
                lastStart = lastEnd;
                lastEnd = moment(lastStart).add(moment.duration(1, dateob.range)).valueOf();
                for (var j = 0, l = res.length; j < l; j++) {
                    ts = res[j];
                    if (ts.ts > lastStart && ts.ts <= lastEnd) {
                        if (ts.c) {
                            total += ts.c;
                        }
                        else {
                            total++;
                        }
                    }
                }
                data.push([i, total]);
            }
            return ret;
        };

        countlyCommon.processPeriod = function(period) {
            var date = period.split(".");
            var range,
                timestart,
                timeend;
            if (date.length === 1) {
                range = "M";
                timestart = moment(period, "YYYY").valueOf();
                timeend = moment(period, "YYYY").add(moment.duration(1, "y")).valueOf();
            }
            else if (date.length === 2) {
                range = "d";
                timestart = moment(period, "YYYY.MM").valueOf();
                timeend = moment(period, "YYYY.MM").add(moment.duration(1, "M")).valueOf();
            }
            else if (date.length === 3) {
                range = "h";
                timestart = moment(period, "YYYY.MM.DD").valueOf();
                timeend = moment(period, "YYYY.MM.DD").add(moment.duration(1, "d")).valueOf();
            }
            return { timestart: timestart, timeend: timeend, range: range };
        };

        /**
        * Shortens the given number by adding K (thousand) or M (million) postfix. K is added only if the number is bigger than 10000, etc.
        * @memberof countlyCommon
        * @param {number} number - number to shorten
        * @returns {string} shorter representation of number
        * @example
        * //outputs 10K
        * countlyCommon.getShortNumber(10000);
        */
        countlyCommon.getShortNumber = function(number) {

            var tmpNumber = "";

            if (number >= 1000000000 || number <= -1000000000) {
                tmpNumber = ((number / 1000000000).toFixed(1).replace(".0", "")) + "B";
            }
            else if (number >= 1000000 || number <= -1000000) {
                tmpNumber = ((number / 1000000).toFixed(1).replace(".0", "")) + "M";
            }
            else if (number >= 10000 || number <= -10000) {
                tmpNumber = ((number / 1000).toFixed(1).replace(".0", "")) + "K";
            }
            else if (number >= 0.1 || number <= -0.1) {
                number += "";
                tmpNumber = number.replace(".0", "");
            }
            else {
                tmpNumber = number + "";
            }

            return tmpNumber;
        };

        /**
        * Getting the date range shown on the dashboard like 1 Aug - 30 Aug, using {@link countlyCommon.periodObj) dateString property which holds the date format.
        * @memberof countlyCommon
        * @returns {string} string with  formatted date range as 1 Aug - 30 Aug
        */
        countlyCommon.getDateRange = function() {

            countlyCommon.periodObj = getPeriodObj();
            var formattedDateStart = "";
            var formattedDateEnd = "";
            if (!countlyCommon.periodObj.isSpecialPeriod) {
                if (countlyCommon.periodObj.dateString === "HH:mm") {
                    formattedDateStart = moment(countlyCommon.periodObj.activePeriod + " " + countlyCommon.periodObj.periodMin + ":00", "YYYY.M.D HH:mm");
                    formattedDateEnd = moment(countlyCommon.periodObj.activePeriod + " " + countlyCommon.periodObj.periodMax + ":00", "YYYY.M.D HH:mm");

                    var nowMin = moment().format("mm");
                    formattedDateEnd.add(nowMin, "minutes");

                }
                else if (countlyCommon.periodObj.dateString === "D MMM, HH:mm") {
                    formattedDateStart = moment(countlyCommon.periodObj.activePeriod, "YYYY.M.D");
                    formattedDateEnd = moment(countlyCommon.periodObj.activePeriod, "YYYY.M.D").add(23, "hours").add(59, "minutes");
                }
                else {
                    formattedDateStart = moment(countlyCommon.periodObj.activePeriod + "." + countlyCommon.periodObj.periodMin, "YYYY.M.D");
                    formattedDateEnd = moment(countlyCommon.periodObj.activePeriod + "." + countlyCommon.periodObj.periodMax, "YYYY.M.D");
                }
            }
            else {
                formattedDateStart = moment(countlyCommon.periodObj.currentPeriodArr[0], "YYYY.M.D");
                formattedDateEnd = moment(countlyCommon.periodObj.currentPeriodArr[(countlyCommon.periodObj.currentPeriodArr.length - 1)], "YYYY.M.D");
            }

            var fromStr = countlyCommon.formatDate(formattedDateStart, countlyCommon.periodObj.dateString),
                toStr = countlyCommon.formatDate(formattedDateEnd, countlyCommon.periodObj.dateString);

            if (fromStr === toStr) {
                return fromStr;
            }
            else {
                return fromStr + " - " + toStr;
            }
        };

        countlyCommon.getDateRangeForCalendar = function() {
            countlyCommon.periodObj = getPeriodObj();
            var formattedDateStart = "";
            var formattedDateEnd = "";
            if (!countlyCommon.periodObj.isSpecialPeriod) {
                if (countlyCommon.periodObj.dateString === "HH:mm") {
                    formattedDateStart = countlyCommon.formatDate(moment(countlyCommon.periodObj.activePeriod + " " + countlyCommon.periodObj.periodMin + ":00", "YYYY.M.D HH:mm"), "D MMM, YYYY HH:mm");
                    formattedDateEnd = moment(countlyCommon.periodObj.activePeriod + " " + countlyCommon.periodObj.periodMax + ":00", "YYYY.M.D HH:mm");
                    formattedDateEnd = formattedDateEnd.add(59, "minutes");
                    formattedDateEnd = countlyCommon.formatDate(formattedDateEnd, "D MMM, YYYY HH:mm");

                }
                else if (countlyCommon.periodObj.dateString === "D MMM, HH:mm") {
                    formattedDateStart = countlyCommon.formatDate(moment(countlyCommon.periodObj.activePeriod, "YYYY.M.D"), "D MMM, YYYY HH:mm");
                    formattedDateEnd = countlyCommon.formatDate(moment(countlyCommon.periodObj.activePeriod, "YYYY.M.D").add(23, "hours").add(59, "minutes"), "D MMM, YYYY HH:mm");
                }
                else if (countlyCommon.periodObj.dateString === "MMM") { //this year
                    formattedDateStart = countlyCommon.formatDate(moment(countlyCommon.periodObj.activePeriod + "." + countlyCommon.periodObj.periodMin + ".1", "YYYY.M.D"), "D MMM, YYYY");
                    formattedDateEnd = countlyCommon.formatDate(moment(countlyCommon.periodObj.activePeriod + "." + countlyCommon.periodObj.periodMax + ".31", "YYYY.M.D"), "D MMM, YYYY");
                }
                else {
                    formattedDateStart = countlyCommon.formatDate(moment(countlyCommon.periodObj.activePeriod + "." + countlyCommon.periodObj.periodMin, "YYYY.M.D"), "D MMM, YYYY");
                    formattedDateEnd = countlyCommon.formatDate(moment(countlyCommon.periodObj.activePeriod + "." + countlyCommon.periodObj.periodMax, "YYYY.M.D"), "D MMM, YYYY");
                }
            }
            else {
                formattedDateStart = countlyCommon.formatDate(moment(countlyCommon.periodObj.currentPeriodArr[0], "YYYY.M.D"), "D MMM, YYYY");
                formattedDateEnd = countlyCommon.formatDate(moment(countlyCommon.periodObj.currentPeriodArr[(countlyCommon.periodObj.currentPeriodArr.length - 1)], "YYYY.M.D"), "D MMM, YYYY");
            }
            return formattedDateStart + " - " + formattedDateEnd;
        };

        /**
        * Merge standard countly metric data object, by mergin updateObj retrieved from action=refresh api requests object into dbObj.
        * Used for merging the received data for today to the existing data while updating the dashboard.
        * @memberof countlyCommon
        * @param {object} dbObj - standard metric data object
        * @param {object} updateObj - standard metric data object retrieved from action=refresh request to last time bucket data only
        */
        countlyCommon.extendDbObj = function(dbObj, updateObj) {
            var now = moment(),
                year = now.year(),
                month = (now.month() + 1),
                day = now.date(),
                weekly = Math.ceil(now.format("DDD") / 7),
                intRegex = /^\d+$/,
                tmpUpdateObj = {},
                tmpOldObj = {};

            if (updateObj[year] && updateObj[year][month] && updateObj[year][month][day]) {
                if (!dbObj[year]) {
                    dbObj[year] = {};
                }
                if (!dbObj[year][month]) {
                    dbObj[year][month] = {};
                }
                if (!dbObj[year][month][day]) {
                    dbObj[year][month][day] = {};
                }
                if (!dbObj[year]["w" + weekly]) {
                    dbObj[year]["w" + weekly] = {};
                }

                tmpUpdateObj = updateObj[year][month][day];
                tmpOldObj = dbObj[year][month][day];

                dbObj[year][month][day] = updateObj[year][month][day];
            }

            if (updateObj.meta) {
                if (!dbObj.meta) {
                    dbObj.meta = {};
                }

                dbObj.meta = updateObj.meta;
            }

            for (var level1 in tmpUpdateObj) {
                if (!Object.prototype.hasOwnProperty.call(tmpUpdateObj, level1)) {
                    continue;
                }

                if (intRegex.test(level1)) {
                    continue;
                }

                if (_.isObject(tmpUpdateObj[level1])) {
                    if (!dbObj[year][level1]) {
                        dbObj[year][level1] = {};
                    }

                    if (!dbObj[year][month][level1]) {
                        dbObj[year][month][level1] = {};
                    }

                    if (!dbObj[year]["w" + weekly][level1]) {
                        dbObj[year]["w" + weekly][level1] = {};
                    }
                }
                else {
                    if (dbObj[year][level1]) {
                        if (tmpOldObj[level1]) {
                            dbObj[year][level1] += (tmpUpdateObj[level1] - tmpOldObj[level1]);
                        }
                        else {
                            dbObj[year][level1] += tmpUpdateObj[level1];
                        }
                    }
                    else {
                        dbObj[year][level1] = tmpUpdateObj[level1];
                    }

                    if (dbObj[year][month][level1]) {
                        if (tmpOldObj[level1]) {
                            dbObj[year][month][level1] += (tmpUpdateObj[level1] - tmpOldObj[level1]);
                        }
                        else {
                            dbObj[year][month][level1] += tmpUpdateObj[level1];
                        }
                    }
                    else {
                        dbObj[year][month][level1] = tmpUpdateObj[level1];
                    }

                    if (dbObj[year]["w" + weekly][level1]) {
                        if (tmpOldObj[level1]) {
                            dbObj[year]["w" + weekly][level1] += (tmpUpdateObj[level1] - tmpOldObj[level1]);
                        }
                        else {
                            dbObj[year]["w" + weekly][level1] += tmpUpdateObj[level1];
                        }
                    }
                    else {
                        dbObj[year]["w" + weekly][level1] = tmpUpdateObj[level1];
                    }
                }

                if (tmpUpdateObj[level1]) {
                    for (var level2 in tmpUpdateObj[level1]) {
                        if (!Object.prototype.hasOwnProperty.call(tmpUpdateObj[level1], level2)) {
                            continue;
                        }

                        if (dbObj[year][level1][level2]) {
                            if (tmpOldObj[level1] && tmpOldObj[level1][level2]) {
                                dbObj[year][level1][level2] += (tmpUpdateObj[level1][level2] - tmpOldObj[level1][level2]);
                            }
                            else {
                                dbObj[year][level1][level2] += tmpUpdateObj[level1][level2];
                            }
                        }
                        else {
                            dbObj[year][level1][level2] = tmpUpdateObj[level1][level2];
                        }

                        if (dbObj[year][month][level1][level2]) {
                            if (tmpOldObj[level1] && tmpOldObj[level1][level2]) {
                                dbObj[year][month][level1][level2] += (tmpUpdateObj[level1][level2] - tmpOldObj[level1][level2]);
                            }
                            else {
                                dbObj[year][month][level1][level2] += tmpUpdateObj[level1][level2];
                            }
                        }
                        else {
                            dbObj[year][month][level1][level2] = tmpUpdateObj[level1][level2];
                        }

                        if (dbObj[year]["w" + weekly][level1][level2]) {
                            if (tmpOldObj[level1] && tmpOldObj[level1][level2]) {
                                dbObj[year]["w" + weekly][level1][level2] += (tmpUpdateObj[level1][level2] - tmpOldObj[level1][level2]);
                            }
                            else {
                                dbObj[year]["w" + weekly][level1][level2] += tmpUpdateObj[level1][level2];
                            }
                        }
                        else {
                            dbObj[year]["w" + weekly][level1][level2] = tmpUpdateObj[level1][level2];
                        }
                    }
                }
            }

            // Fix update of total user count

            if (updateObj[year]) {
                if (updateObj[year].u) {
                    if (!dbObj[year]) {
                        dbObj[year] = {};
                    }

                    dbObj[year].u = updateObj[year].u;
                }

                if (updateObj[year][month] && updateObj[year][month].u) {
                    if (!dbObj[year]) {
                        dbObj[year] = {};
                    }

                    if (!dbObj[year][month]) {
                        dbObj[year][month] = {};
                    }

                    dbObj[year][month].u = updateObj[year][month].u;
                }

                if (updateObj[year]["w" + weekly] && updateObj[year]["w" + weekly].u) {
                    if (!dbObj[year]) {
                        dbObj[year] = {};
                    }

                    if (!dbObj[year]["w" + weekly]) {
                        dbObj[year]["w" + weekly] = {};
                    }

                    dbObj[year]["w" + weekly].u = updateObj[year]["w" + weekly].u;
                }
            }
        };

        /**
        * Convert string to first letter uppercase and all other letters - lowercase for each word
        * @memberof countlyCommon
        * @param {string} str - string to convert
        * @returns {string} converted string
        * @example
        * //outputs Hello World
        * countlyCommon.toFirstUpper("hello world");
        */
        countlyCommon.toFirstUpper = function(str) {
            return str.replace(/\w\S*/g, function(txt) {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            });
        };

        /**
        * Safe division between numbers providing 0 as result in cases when dividing by 0
        * @memberof countlyCommon
        * @param {number} val1 - number which to divide
        * @param {number} val2 - number by which to divide
        * @returns {number} result of division
        * @example
        * //outputs 0
        * countlyCommon.divide(100, 0);
        */
        countlyCommon.divide = function(val1, val2) {
            var temp = val1 / val2;

            if (!temp || temp === Number.POSITIVE_INFINITY) {
                temp = 0;
            }

            return temp;
        };

        /**
        * Get Date graph ticks
        * @memberof countlyCommon
        * @param {string} bucket - time bucket, accepted values, hourly, weekly, monthly
        * @param {boolean} overrideBucket - override existing bucket logic and simply use current date for generating ticks
        * @param {boolean} newChart - new chart implementation
        * @returns {object} object containing tick texts and ticks to use on time graphs
        * @example <caption>Example output</caption>
        *{
        *   "min":0,
        *   "max":29,
        *   "tickTexts":["22 Dec, Thursday","23 Dec, Friday","24 Dec, Saturday","25 Dec, Sunday","26 Dec, Monday","27 Dec, Tuesday","28 Dec, Wednesday",
        *        "29 Dec, Thursday","30 Dec, Friday","31 Dec, Saturday","1 Jan, Sunday","2 Jan, Monday","3 Jan, Tuesday","4 Jan, Wednesday","5 Jan, Thursday",
        *       "6 Jan, Friday","7 Jan, Saturday","8 Jan, Sunday","9 Jan, Monday","10 Jan, Tuesday","11 Jan, Wednesday","12 Jan, Thursday","13 Jan, Friday",
        *        "14 Jan, Saturday","15 Jan, Sunday","16 Jan, Monday","17 Jan, Tuesday","18 Jan, Wednesday","19 Jan, Thursday","20 Jan, Friday"],
        *   "ticks":[[1,"23 Dec"],[4,"26 Dec"],[7,"29 Dec"],[10,"1 Jan"],[13,"4 Jan"],[16,"7 Jan"],[19,"10 Jan"],[22,"13 Jan"],[25,"16 Jan"],[28,"19 Jan"]]
        *}
        */
        countlyCommon.getTickObj = function(bucket, overrideBucket, newChart) {
            var days = parseInt(countlyCommon.periodObj.numberOfDays, 10),
                ticks = [],
                tickTexts = [],
                skipReduction = false,
                limitAdjustment = 0;

            if (overrideBucket) {
                var thisDay;
                if (countlyCommon.periodObj.activePeriod) {
                    thisDay = moment(countlyCommon.periodObj.activePeriod, "YYYY.M.D");
                }
                else {
                    thisDay = moment(countlyCommon.periodObj.currentPeriodArr[0], "YYYY.M.D");
                }
                ticks.push([0, countlyCommon.formatDate(thisDay, "D MMM")]);
                tickTexts[0] = countlyCommon.formatDate(thisDay, "D MMM, dddd");
            }
            else if ((days === 1 && _period !== "month" && _period !== "day") || (days === 1 && bucket === "hourly")) {
                //When period is an array or string like Xdays, Xweeks
                for (var z = 0; z < 24; z++) {
                    ticks.push([z, (z + ":00")]);
                    tickTexts.push((z + ":00"));
                }
                skipReduction = true;
            }
            else {
                var start = moment().subtract(days, 'days');
                if (Object.prototype.toString.call(countlyCommon.getPeriod()) === '[object Array]') {
                    start = moment(countlyCommon.periodObj.currentPeriodArr[countlyCommon.periodObj.currentPeriodArr.length - 1], "YYYY.MM.DD").subtract(days, 'days');
                }
                var i = 0;
                if (bucket === "monthly") {
                    var allMonths = [];

                    //so we would not start from previous year
                    start.add(1, 'day');

                    var monthCount = 12;

                    for (i = 0; i < monthCount; i++) {
                        allMonths.push(start.format(countlyCommon.getDateFormat("MMM YYYY")));
                        start.add(1, 'months');
                    }

                    allMonths = _.uniq(allMonths);

                    for (i = 0; i < allMonths.length; i++) {
                        ticks.push([i, allMonths[i]]);
                        tickTexts[i] = allMonths[i];
                    }
                }
                else if (bucket === "weekly") {
                    var allWeeks = [];
                    for (i = 0; i < days; i++) {
                        start.add(1, 'days');
                        if (i === 0 && start.isoWeekday() === 7) {
                            continue;
                        }
                        allWeeks.push(start.isoWeek() + " " + start.isoWeekYear());
                    }

                    allWeeks = _.uniq(allWeeks);

                    for (i = 0; i < allWeeks.length; i++) {
                        var parts = allWeeks[i].split(" ");
                        //iso week falls in the year which has thursday of the week
                        if (parseInt(parts[1]) === moment().isoWeekYear(parseInt(parts[1])).isoWeek(parseInt(parts[0])).isoWeekday(4).year()) {
                            ticks.push([i, "W" + allWeeks[i]]);

                            var weekText = countlyCommon.formatDate(moment().isoWeekYear(parseInt(parts[1])).isoWeek(parseInt(parts[0])).isoWeekday(1), ", D MMM YYYY");
                            tickTexts[i] = "W" + parts[0] + weekText;
                        }
                    }
                }
                else if (bucket === "hourly") {
                    for (i = 0; i < days; i++) {
                        start.add(1, 'days');

                        for (var j = 0; j < 24; j++) {
                            //if (j === 0) {
                            ticks.push([((24 * i) + j), countlyCommon.formatDate(start, "D MMM") + " 0:00"]);
                            //}

                            tickTexts.push(countlyCommon.formatDate(start, "D MMM, ") + j + ":00");
                        }
                    }
                }
                else {
                    if (_period === "day") {
                        start.add(1, 'days');
                        for (i = 0; i < new Date(start.year(), start.month(), 0).getDate(); i++) {
                            ticks.push([i, countlyCommon.formatDate(start, "D MMM")]);
                            tickTexts[i] = countlyCommon.formatDate(start, "D MMM, dddd");
                            start.add(1, 'days');
                        }
                    }
                    else {
                        var startYear = start.year();
                        var endYear = moment().year();
                        for (i = 0; i < days; i++) {
                            start.add(1, 'days');
                            if (startYear < endYear) {
                                ticks.push([i, countlyCommon.formatDate(start, "D MMM YYYY")]);
                                tickTexts[i] = countlyCommon.formatDate(start, "D MMM YYYY, dddd");
                            }
                            else {
                                ticks.push([i, countlyCommon.formatDate(start, "D MMM")]);
                                tickTexts[i] = countlyCommon.formatDate(start, "D MMM, dddd");
                            }
                        }
                    }
                }

                ticks = _.compact(ticks);
                tickTexts = _.compact(tickTexts);
            }

            var labelCn = ticks.length;
            if (!newChart) {
                if (ticks.length <= 2) {
                    limitAdjustment = 0.02;
                    var tmpTicks = [],
                        tmpTickTexts = [];

                    tmpTickTexts[0] = "";
                    tmpTicks[0] = [-0.02, ""];

                    for (var m = 0; m < ticks.length; m++) {
                        tmpTicks[m + 1] = [m, ticks[m][1]];
                        tmpTickTexts[m + 1] = tickTexts[m];
                    }

                    tmpTickTexts.push("");
                    tmpTicks.push([tmpTicks.length - 1 - 0.98, ""]);

                    ticks = tmpTicks;
                    tickTexts = tmpTickTexts;
                }
                else if (!skipReduction && ticks.length > 10) {
                    var reducedTicks = [],
                        step = (Math.floor(ticks.length / 10) < 1) ? 1 : Math.floor(ticks.length / 10),
                        pickStartIndex = (Math.floor(ticks.length / 30) < 1) ? 1 : Math.floor(ticks.length / 30);

                    for (var l = pickStartIndex; l < (ticks.length - 1); l = l + step) {
                        reducedTicks.push(ticks[l]);
                    }

                    ticks = reducedTicks;
                }
                else {
                    ticks[0] = null;

                    // Hourly ticks already contain 23 empty slots at the end
                    if (!(bucket === "hourly" && days !== 1)) {
                        ticks[ticks.length - 1] = null;
                    }
                }
            }

            return {
                min: 0 - limitAdjustment,
                max: (limitAdjustment) ? tickTexts.length - 3 + limitAdjustment : tickTexts.length - 1,
                tickTexts: tickTexts,
                ticks: _.compact(ticks),
                labelCn: labelCn
            };
        };

        /**
        * Joined 2 arrays into one removing all duplicated values
        * @memberof countlyCommon
        * @param {array} x - first array
        * @param {array} y - second array
        * @returns {array} new array with only unique values from x and y
        * @example
        * //outputs [1,2,3]
        * countlyCommon.union([1,2],[2,3]);
        */
        countlyCommon.union = function(x, y) {
            if (!x) {
                return y;
            }
            else if (!y) {
                return x;
            }

            var obj = {};
            var i = 0;
            for (i = x.length - 1; i >= 0; --i) {
                obj[x[i]] = true;
            }

            for (i = y.length - 1; i >= 0; --i) {
                obj[y[i]] = true;
            }

            var res = [];

            for (var k in obj) {
                res.push(k);
            }

            return res;
        };

        /**
        * Recursively merges an object into another
        * @memberof countlyCommon
        * @param {Object} target - object to be merged into
        * @param {Object} source - object to merge into the target
        * @returns {Object} target after the merge
        */
        countlyCommon.deepObjectExtend = function(target, source) {
            Object.keys(source).forEach(function(key) {
                if ((key in target) && _.isObject(target[key])) {
                    countlyCommon.deepObjectExtend(target[key], source[key]);
                }
                else {
                    target[key] = source[key];
                }
            });

            return target;
        };

        /**
        * Formats the number by separating each 3 digits with
        * @memberof countlyCommon
        * @param {number} x - number to format
        * @returns {string} formatted number
        * @example
        * //outputs 1,234,567
        * countlyCommon.formatNumber(1234567);
        */
        countlyCommon.formatNumber = function(x) {
            x = parseFloat(parseFloat(x).toFixed(2));
            var parts = x.toString().split(".");
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            return parts.join(".");
        };


        /**
        * Formats the number by separating each 3 digits with, falls back to
        * a default value in case of NaN
        * @memberof countlyCommon
        * @param {number} x - number to format
        * @param {string} fallback - fallback value for unparsable numbers
        * @returns {string} formatted number or fallback
        * @example
        * //outputs 1,234,567
        * countlyCommon.formatNumberSafe(1234567);
        */
        countlyCommon.formatNumberSafe = function(x, fallback) {
            if (isNaN(parseFloat(x))) {
                return fallback || "N/A";
            }
            return countlyCommon.formatNumber(x);
        };

        /**
        * Pad number with specified character from left to specified length
        * @memberof countlyCommon
        * @param {number} n - number to pad
        * @param {number} width - pad to what length in symboles
        * @param {string} z - character to pad with, default 0
        * @returns {string} padded number
        * @example
        * //outputs 0012
        * countlyCommon.pad(12, 4, "0");
        */
        countlyCommon.pad = function(n, width, z) {
            z = z || '0';
            n = n + '';
            return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
        };

        countlyCommon.getNoteDateIds = function(bucket) {
            var _periodObj = countlyCommon.periodObj,
                dateIds = [],
                dotSplit = [],
                tmpDateStr = "";
            var i = 0;
            var j = 0;
            if (!_periodObj.isSpecialPeriod && !bucket) {
                for (i = _periodObj.periodMin; i < (_periodObj.periodMax + 1); i++) {
                    dotSplit = (_periodObj.activePeriod + "." + i).split(".");
                    tmpDateStr = "";

                    for (j = 0; j < dotSplit.length; j++) {
                        if (dotSplit[j].length === 1) {
                            tmpDateStr += "0" + dotSplit[j];
                        }
                        else {
                            tmpDateStr += dotSplit[j];
                        }
                    }

                    dateIds.push(tmpDateStr);
                }
            }
            else {
                if (!_periodObj.currentPeriodArr && bucket === "daily") {
                    var tmpDate = new Date();
                    _periodObj.currentPeriodArr = [];

                    if (countlyCommon.getPeriod() === "month") {
                        for (i = 0; i < (tmpDate.getMonth() + 1); i++) {
                            var daysInMonth = moment().month(i).daysInMonth();

                            for (j = 0; j < daysInMonth; j++) {
                                _periodObj.currentPeriodArr.push(_periodObj.activePeriod + "." + (i + 1) + "." + (j + 1));

                                // If current day of current month, just break
                                if ((i === tmpDate.getMonth()) && (j === (tmpDate.getDate() - 1))) {
                                    break;
                                }
                            }
                        }
                    }
                    else if (countlyCommon.getPeriod() === "day") {
                        for (i = 0; i < tmpDate.getDate(); i++) {
                            _periodObj.currentPeriodArr.push(_periodObj.activePeriod + "." + (i + 1));
                        }
                    }
                    else {
                        _periodObj.currentPeriodArr.push(_periodObj.activePeriod);
                    }
                }

                for (i = 0; i < (_periodObj.currentPeriodArr.length); i++) {
                    dotSplit = _periodObj.currentPeriodArr[i].split(".");
                    tmpDateStr = "";

                    for (j = 0; j < dotSplit.length; j++) {
                        if (dotSplit[j].length === 1) {
                            tmpDateStr += "0" + dotSplit[j];
                        }
                        else {
                            tmpDateStr += dotSplit[j];
                        }
                    }

                    dateIds.push(tmpDateStr);
                }
            }

            var tmpDateIds = [];
            switch (bucket) {
            case "hourly":
                for (i = 0; i < 25; i++) {
                    tmpDateIds.push(dateIds[0] + ((i < 10) ? "0" + i : i));
                }

                dateIds = tmpDateIds;
                break;
            case "monthly":
                for (i = 0; i < dateIds.length; i++) {
                    countlyCommon.arrayAddUniq(tmpDateIds, moment(dateIds[i], "YYYYMMDD").format("YYYYMM"));
                }

                dateIds = tmpDateIds;
                break;
            }

            return dateIds;
        };

        countlyCommon.getNotesForDateId = function(dateId, appIdsForNotes) {
            var ret = [];
            var notes = [];
            appIdsForNotes && appIdsForNotes.forEach(function(appId) {
                if (countlyGlobal.apps[appId] && countlyGlobal.apps[appId].notes) {
                    notes = notes.concat(countlyGlobal.apps[appId].notes);
                }
            });
            if (notes.length === 0) {
                return ret;
            }
            for (var i = 0; i < notes.length; i++) {
                if (!notes[i].dateId) {
                    notes[i].dateId = moment(notes[i].ts).format("YYYYMMDDHHmm");
                }
                if (notes[i].dateId.indexOf(dateId) === 0) {
                    ret = ret.concat([notes[i]]);
                }
            }
            return ret;
        };

        /**
        * Add item or array to existing array only if values are not already in original array. given array is modified.
        * @memberof countlyCommon
        * @param {array} arr - original array where to add unique elements
        * @param {string|number|array} item - item to add or array to merge
        */
        countlyCommon.arrayAddUniq = function(arr, item) {
            if (!arr) {
                arr = [];
            }

            if (toString.call(item) === "[object Array]") {
                for (var i = 0; i < item.length; i++) {
                    if (arr.indexOf(item[i]) === -1) {
                        arr[arr.length] = item[i];
                    }
                }
            }
            else {
                if (arr.indexOf(item) === -1) {
                    arr[arr.length] = item;
                }
            }
        };

        /**
        * Format timestamp to twitter like time ago format with real date as tooltip and hidden data for exporting
        * @memberof countlyCommon
        * @param {number} timestamp - timestamp in seconds or miliseconds
        * @returns {string} formated time ago
        * @example
        * //outputs <span title="Tue, 17 Jan 2017 13:54:26">3 days ago<a style="display: none;">|Tue, 17 Jan 2017 13:54:26</a></span>
        * countlyCommon.formatTimeAgo(1484654066);
        */
        countlyCommon.formatTimeAgo = function(timestamp) {
            var meta = countlyCommon.formatTimeAgoText(timestamp);
            var elem = $("<span>");
            elem.prop("title", meta.tooltip);
            if (meta.color) {
                elem.css("color", meta.color);
            }
            elem.text(meta.text);
            elem.append("<a style='display: none;'>|" + meta.tooltip + "</a>");
            return elem.prop('outerHTML');
        };

        /**
        * Format timestamp to twitter like time ago format with real date as tooltip and hidden data for exporting
        * @memberof countlyCommon
        * @param {number} timestamp - timestamp in seconds or miliseconds
        * @returns {string} formated time ago
        * @example
        * //outputs ago time without html tags
        * countlyCommon.formatTimeAgo(1484654066);
        */
        countlyCommon.formatTimeAgoText = function(timestamp) {
            if (Math.round(timestamp).toString().length === 10) {
                timestamp *= 1000;
            }
            var target = new Date(timestamp);
            var tooltip = moment(target).format("ddd, D MMM YYYY HH:mm:ss");
            var text = tooltip;
            var color = null;
            var now = new Date();
            var diff = Math.floor((now - target) / 1000);
            if (diff <= -2592000) {
                return tooltip;
            }
            else if (diff < -86400) {
                text = jQuery.i18n.prop("common.in.days", Math.abs(Math.round(diff / 86400)));
            }
            else if (diff < -3600) {
                text = jQuery.i18n.prop("common.in.hours", Math.abs(Math.round(diff / 3600)));
            }
            else if (diff < -60) {
                text = jQuery.i18n.prop("common.in.minutes", Math.abs(Math.round(diff / 60)));
            }
            else if (diff <= -1) {
                color = "#50C354";
                text = (jQuery.i18n.prop("common.in.seconds", Math.abs(diff)));
            }
            else if (diff <= 1) {
                color = "#50C354";
                text = jQuery.i18n.map["common.ago.just-now"];
            }
            else if (diff < 20) {
                color = "#50C354";
                text = jQuery.i18n.prop("common.ago.seconds-ago", diff);
            }
            else if (diff < 40) {
                color = "#50C354";
                text = jQuery.i18n.map["common.ago.half-minute"];
            }
            else if (diff < 60) {
                color = "#50C354";
                text = jQuery.i18n.map["common.ago.less-minute"];
            }
            else if (diff <= 90) {
                text = jQuery.i18n.map["common.ago.one-minute"];
            }
            else if (diff <= 3540) {
                text = jQuery.i18n.prop("common.ago.minutes-ago", Math.round(diff / 60));
            }
            else if (diff <= 5400) {
                text = jQuery.i18n.map["common.ago.one-hour"];
            }
            else if (diff <= 86400) {
                text = jQuery.i18n.prop("common.ago.hours-ago", Math.round(diff / 3600));
            }
            else if (diff <= 129600) {
                text = jQuery.i18n.map["common.ago.one-day"];
            }
            else if (diff < 604800) {
                text = jQuery.i18n.prop("common.ago.days-ago", Math.round(diff / 86400));
            }
            else if (diff <= 777600) {
                text = jQuery.i18n.map["common.ago.one-week"];
            }
            else if (diff <= 2592000) {
                text = jQuery.i18n.prop("common.ago.days-ago", Math.round(diff / 86400));
            }
            else {
                text = tooltip;
            }
            return {
                text: text,
                tooltip: tooltip,
                color: color
            };
        };

        /**
        * Format duration to units of how much time have passed
        * @memberof countlyCommon
        * @param {number} timestamp - amount in seconds passed since some reference point
        * @returns {string} formated time with how much units passed
        * @example
        * //outputs 47 year(s) 28 day(s) 11:54:26
        * countlyCommon.formatTime(1484654066);
        */
        countlyCommon.formatTime = function(timestamp) {
            var str = "";
            var seconds = timestamp % 60;
            str = str + leadingZero(seconds);
            timestamp -= seconds;
            var minutes = timestamp % (60 * 60);
            str = leadingZero(minutes / 60) + ":" + str;
            timestamp -= minutes;
            var hours = timestamp % (60 * 60 * 24);
            str = leadingZero(hours / (60 * 60)) + ":" + str;
            timestamp -= hours;
            if (timestamp > 0) {
                var days = timestamp % (60 * 60 * 24 * 365);
                str = (days / (60 * 60 * 24)) + " day(s) " + str;
                timestamp -= days;
                if (timestamp > 0) {
                    str = (timestamp / (60 * 60 * 24 * 365)) + " year(s) " + str;
                }
            }
            return str;
        };

        /**
        * Format duration into highest unit of how much time have passed. Used in big numbers
        * @memberof countlyCommon
        * @param {number} timespent - amount in seconds passed since some reference point
        * @returns {string} formated time with how much highest units passed
        * @example
        * //outputs 2824.7 yrs
        * countlyCommon.timeString(1484654066);
        */
        countlyCommon.timeString = function(timespent) {
            var timeSpentString = (timespent.toFixed(1)) + " " + jQuery.i18n.map["common.minute.abrv"];

            if (timespent >= 142560) {
                timeSpentString = (timespent / 525600).toFixed(1) + " " + jQuery.i18n.map["common.year.abrv"];
            }
            else if (timespent >= 1440) {
                timeSpentString = (timespent / 1440).toFixed(1) + " " + jQuery.i18n.map["common.day.abrv"];
            }
            else if (timespent >= 60) {
                timeSpentString = (timespent / 60).toFixed(1) + " " + jQuery.i18n.map["common.hour.abrv"];
            }
            return timeSpentString;


            /*var timeSpentString = "";
            if(timespent > 1){
                timeSpentString = Math.floor(timespent) + " " + jQuery.i18n.map["common.minute.abrv"]+" ";
                var left = Math.floor((timespent - Math.floor(timespent))*60);
                if(left > 0)
                    timeSpentString += left + " s";
            }
            else
                timeSpentString += Math.floor((timespent - Math.floor(timespent))*60) + " s";

            if (timespent >= 142560) {
                timeSpentString = Math.floor(timespent / 525600) + " " + jQuery.i18n.map["common.year.abrv"];
                var left = Math.floor((timespent - Math.floor(timespent / 525600)*525600)/1440);
                if(left > 0)
                    timeSpentString += " "+left + " " + jQuery.i18n.map["common.day.abrv"];
            } else if (timespent >= 1440) {
                timeSpentString = Math.floor(timespent / 1440) + " " + jQuery.i18n.map["common.day.abrv"];
                var left = Math.floor((timespent - Math.floor(timespent / 1440)*1440)/60);
                if(left > 0)
                    timeSpentString += " "+left + " " + jQuery.i18n.map["common.hour.abrv"];
            } else if (timespent >= 60) {
                timeSpentString = Math.floor(timespent / 60) + " " + jQuery.i18n.map["common.hour.abrv"];
                var left = Math.floor(timespent - Math.floor(timespent / 60)*60)
                if(left > 0)
                    timeSpentString += " "+left + " " + jQuery.i18n.map["common.minute.abrv"];
            }
            return timeSpentString;*/
        };

        /**
        * Get date from seconds timestamp
        * @memberof countlyCommon
        * @param {number} timestamp - timestamp in seconds or miliseconds
        * @returns {string} formated date
        * @example
        * //outputs 17.01.2017
        * countlyCommon.getDate(1484654066);
        */
        countlyCommon.getDate = function(timestamp) {
            if (Math.round(timestamp).toString().length === 10) {
                timestamp *= 1000;
            }
            var d = new Date(timestamp);
            return moment(d).format("ddd, D MMM YYYY");
            //return leadingZero(d.getDate()) + "." + leadingZero(d.getMonth() + 1) + "." + d.getFullYear();
        };

        /**
        * Get time from seconds timestamp
        * @memberof countlyCommon
        * @param {number} timestamp - timestamp in seconds or miliseconds
        * @returns {string} formated time
        * @example
        * //outputs 13:54
        * countlyCommon.getTime(1484654066);
        */
        countlyCommon.getTime = function(timestamp) {
            if (Math.round(timestamp).toString().length === 10) {
                timestamp *= 1000;
            }
            var d = new Date(timestamp);
            return leadingZero(d.getHours()) + ":" + leadingZero(d.getMinutes());
        };

        /**
        * Round to provided number of digits
        * @memberof countlyCommon
        * @param {number} num - number to round
        * @param {number} digits - amount of digits to round to
        * @returns {number} rounded number
        * @example
        * //outputs 1.235
        * countlyCommon.round(1.2345, 3);
        */
        countlyCommon.round = function(num, digits) {
            digits = Math.pow(10, digits || 0);
            return Math.round(num * digits) / digits;
        };

        /**
        * Get calculated totals for each property, usualy used as main dashboard data timeline data without metric segments
        * @memberof countlyCommon
        * @param {object} data - countly metric model data
        * @param {array} properties - array of all properties to extract
        * @param {array} unique - array of all properties that are unique from properties array. We need to apply estimation to them
        * @param {object} estOverrideMetric - using unique property as key and total_users estimation property as value for all unique metrics that we want to have total user estimation overridden
        * @param {function} clearObject - function to prefill all expected properties as u, t, n, etc with 0, so you would not have null in the result which won't work when drawing graphs
        * @param {string=} segment - segment value for which to fetch metric data
        * @returns {object} dashboard data object
        * @example
        * countlyCommon.getDashboardData(countlySession.getDb(), ["t", "n", "u", "d", "e", "p", "m"], ["u", "p", "m"], {u:"users"}, countlySession.clearObject);
        * //outputs
        * {
        *      "t":{"total":980,"prev-total":332,"change":"195.2%","trend":"u"},
        *      "n":{"total":402,"prev-total":255,"change":"57.6%","trend":"u"},
        *      "u":{"total":423,"prev-total":255,"change":"75.7%","trend":"u","isEstimate":false},
        *      "d":{"total":0,"prev-total":0,"change":"NA","trend":"u"},
        *      "e":{"total":980,"prev-total":332,"change":"195.2%","trend":"u"},
        *      "p":{"total":103,"prev-total":29,"change":"255.2%","trend":"u","isEstimate":true},
        *      "m":{"total":86,"prev-total":0,"change":"NA","trend":"u","isEstimate":true}
        * }
        */
        countlyCommon.getDashboardData = function(data, properties, unique, estOverrideMetric, clearObject, segment) {
            if (segment) {
                segment = "." + segment;
            }
            else {
                segment = "";
            }
            var _periodObj = countlyCommon.periodObj,
                dataArr = {},
                tmp_x,
                tmp_y,
                tmpUniqObj,
                tmpPrevUniqObj,
                current = {},
                previous = {},
                currentCheck = {},
                previousCheck = {},
                change = {},
                isEstimate = false;

            var i = 0;
            var j = 0;

            for (i = 0; i < properties.length; i++) {
                current[properties[i]] = 0;
                previous[properties[i]] = 0;
                currentCheck[properties[i]] = 0;
                previousCheck[properties[i]] = 0;
            }

            if (_periodObj.isSpecialPeriod) {
                isEstimate = true;
                for (j = 0; j < (_periodObj.currentPeriodArr.length); j++) {
                    tmp_x = countlyCommon.getDescendantProp(data, _periodObj.currentPeriodArr[j] + segment);
                    tmp_x = clearObject(tmp_x);
                    for (i = 0; i < properties.length; i++) {
                        if (unique.indexOf(properties[i]) === -1) {
                            current[properties[i]] += tmp_x[properties[i]];
                        }
                    }
                }

                for (j = 0; j < (_periodObj.previousPeriodArr.length); j++) {
                    tmp_y = countlyCommon.getDescendantProp(data, _periodObj.previousPeriodArr[j] + segment);
                    tmp_y = clearObject(tmp_y);
                    for (i = 0; i < properties.length; i++) {
                        if (unique.indexOf(properties[i]) === -1) {
                            previous[properties[i]] += tmp_y[properties[i]];
                        }
                    }
                }

                //deal with unique values separately
                for (j = 0; j < (_periodObj.uniquePeriodArr.length); j++) {
                    tmp_x = countlyCommon.getDescendantProp(data, _periodObj.uniquePeriodArr[j] + segment);
                    tmp_x = clearObject(tmp_x);
                    for (i = 0; i < unique.length; i++) {
                        current[unique[i]] += tmp_x[unique[i]];
                    }
                }

                for (j = 0; j < (_periodObj.previousUniquePeriodArr.length); j++) {
                    tmp_y = countlyCommon.getDescendantProp(data, _periodObj.previousUniquePeriodArr[j] + segment);
                    tmp_y = clearObject(tmp_y);
                    for (i = 0; i < unique.length; i++) {
                        previous[unique[i]] += tmp_y[unique[i]];
                    }
                }

                //recheck unique values with larger buckets
                for (j = 0; j < (_periodObj.uniquePeriodCheckArr.length); j++) {
                    tmpUniqObj = countlyCommon.getDescendantProp(data, _periodObj.uniquePeriodCheckArr[j] + segment);
                    tmpUniqObj = clearObject(tmpUniqObj);
                    for (i = 0; i < unique.length; i++) {
                        currentCheck[unique[i]] += tmpUniqObj[unique[i]];
                    }
                }

                for (j = 0; j < (_periodObj.previousUniquePeriodArr.length); j++) {
                    tmpPrevUniqObj = countlyCommon.getDescendantProp(data, _periodObj.previousUniquePeriodArr[j] + segment);
                    tmpPrevUniqObj = clearObject(tmpPrevUniqObj);
                    for (i = 0; i < unique.length; i++) {
                        previousCheck[unique[i]] += tmpPrevUniqObj[unique[i]];
                    }
                }

                //check if we should overwrite uniques
                for (i = 0; i < unique.length; i++) {
                    if (current[unique[i]] > currentCheck[unique[i]]) {
                        current[unique[i]] = currentCheck[unique[i]];
                    }

                    if (previous[unique[i]] > previousCheck[unique[i]]) {
                        previous[unique[i]] = previousCheck[unique[i]];
                    }
                }

            }
            else {
                tmp_x = countlyCommon.getDescendantProp(data, _periodObj.activePeriod + segment);
                tmp_y = countlyCommon.getDescendantProp(data, _periodObj.previousPeriod + segment);
                tmp_x = clearObject(tmp_x);
                tmp_y = clearObject(tmp_y);

                for (i = 0; i < properties.length; i++) {
                    current[properties[i]] = tmp_x[properties[i]];
                    previous[properties[i]] = tmp_y[properties[i]];
                }
            }

            //check if we can correct data using total users correction
            if (estOverrideMetric && countlyTotalUsers.isUsable()) {
                for (i = 0; i < unique.length; i++) {
                    if (estOverrideMetric[unique[i]] && countlyTotalUsers.get(estOverrideMetric[unique[i]]).users) {
                        current[unique[i]] = countlyTotalUsers.get(estOverrideMetric[unique[i]]).users;
                    }
                    if (estOverrideMetric[unique[i]] && countlyTotalUsers.get(estOverrideMetric[unique[i]], true).users) {
                        previous[unique[i]] = countlyTotalUsers.get(estOverrideMetric[unique[i]], true).users;
                    }
                }
            }

            // Total users can't be less than new users
            if (typeof current.u !== "undefined" && typeof current.n !== "undefined" && current.u < current.n) {
                if (estOverrideMetric && countlyTotalUsers.isUsable() && estOverrideMetric.u && countlyTotalUsers.get(estOverrideMetric.u).users) {
                    current.n = current.u;
                }
                else {
                    current.u = current.n;
                }
            }

            // Total users can't be more than total sessions
            if (typeof current.u !== "undefined" && typeof current.t !== "undefined" && current.u > current.t) {
                current.u = current.t;
            }

            for (i = 0; i < properties.length; i++) {
                change[properties[i]] = countlyCommon.getPercentChange(previous[properties[i]], current[properties[i]]);
                dataArr[properties[i]] = {
                    "total": current[properties[i]],
                    "prev-total": previous[properties[i]],
                    "change": change[properties[i]].percent,
                    "trend": change[properties[i]].trend
                };
                if (unique.indexOf(properties[i]) !== -1) {
                    dataArr[properties[i]].isEstimate = isEstimate;
                }
            }

            //check if we can correct data using total users correction
            if (estOverrideMetric && countlyTotalUsers.isUsable()) {
                for (i = 0; i < unique.length; i++) {
                    if (estOverrideMetric[unique[i]] && countlyTotalUsers.get(estOverrideMetric[unique[i]]).users) {
                        dataArr[unique[i]].isEstimate = false;
                    }
                }
            }

            return dataArr;
        };

        /**
        * Get total data for period's each time bucket as comma separated string to generate sparkle/small bar lines
        * @memberof countlyCommon
        * @param {object} data - countly metric model data
        * @param {object} props - object where key is output property name and value could be string as key from data object or function to create new value based on existing ones
        * @param {function} clearObject - function to prefill all expected properties as u, t, n, etc with 0, so you would not have null in the result which won't work when drawing graphs
        * @returns {object} object with sparkleline data for each property
        * @example
        * var sparkLines = countlyCommon.getSparklineData(countlySession.getDb(), {
        *     "total-sessions": "t",
        *     "new-users": "n",
        *     "total-users": "u",
        *     "total-duration": "d",
        *     "events": "e",
        *     "returning-users": function(tmp_x){return Math.max(tmp_x["u"] - tmp_x["n"], 0);},
        *     "avg-duration-per-session": function(tmp_x){return (tmp_x["t"] == 0) ? 0 : (tmp_x["d"] / tmp_x["t"]);},
        *     "avg-events": function(tmp_x){return (tmp_x["u"] == 0) ? 0 : (tmp_x["e"] / tmp_x["u"]);}
        * }, countlySession.clearObject);
        * //outputs
        * {
        *   "total-sessions":"73,84,80,72,61,18,11,7,17,27,66,39,41,36,39,36,6,11,6,16,22,30,33,34,32,41,29,9,2,2",
        *   "new-users":"24,30,25,20,16,18,11,7,17,18,20,18,17,11,15,15,6,11,6,16,13,14,12,10,7,4,8,9,2,2",
        *   "total-users":"45,54,50,44,37,18,11,7,17,27,36,39,41,36,39,36,6,11,6,16,22,30,33,34,32,29,29,9,2,2",
        *   "total-duration":"0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0",
        *   "events":"73,84,80,72,61,18,11,7,17,27,66,39,41,36,39,36,6,11,6,16,22,30,33,34,32,41,29,9,2,2",
        *   "returning-users":"21,24,25,24,21,0,0,0,0,9,16,21,24,25,24,21,0,0,0,0,9,16,21,24,25,25,21,0,0,0",
        *   "avg-duration-per-session":"0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0",
        *   "avg-events":"1.6222222222222222,1.5555555555555556,1.6,1.6363636363636365,1.6486486486486487,1,1,1,1,1,1.8333333333333333,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1.4137931034482758,1,1,1,1"
        * }
        */
        countlyCommon.getSparklineData = function(data, props, clearObject) {
            var _periodObj = countlyCommon.periodObj;
            var sparkLines = {};
            for (var pp in props) {
                sparkLines[pp] = [];
            }
            var tmp_x = "";
            var i = 0;
            var p = 0;
            if (!_periodObj.isSpecialPeriod) {
                for (i = _periodObj.periodMin; i < (_periodObj.periodMax + 1); i++) {
                    tmp_x = countlyCommon.getDescendantProp(data, _periodObj.activePeriod + "." + i);
                    tmp_x = clearObject(tmp_x);

                    for (p in props) {
                        if (typeof props[p] === "string") {
                            sparkLines[p].push(tmp_x[props[p]]);
                        }
                        else if (typeof props[p] === "function") {
                            sparkLines[p].push(props[p](tmp_x));
                        }
                    }
                }
            }
            else {
                for (i = 0; i < (_periodObj.currentPeriodArr.length); i++) {
                    tmp_x = countlyCommon.getDescendantProp(data, _periodObj.currentPeriodArr[i]);
                    tmp_x = clearObject(tmp_x);

                    for (p in props) {
                        if (typeof props[p] === "string") {
                            sparkLines[p].push(tmp_x[props[p]]);
                        }
                        else if (typeof props[p] === "function") {
                            sparkLines[p].push(props[p](tmp_x));
                        }
                    }
                }
            }

            for (var key in sparkLines) {
                sparkLines[key] = sparkLines[key].join(",");
            }

            return sparkLines;
        };

        /**
        * Format date based on some locale settings
        * @memberof countlyCommon
        * @param {moment} date - moment js object
        * @param {string} format - format string to use
        * @returns {string} date in formatted string
        * @example
        * //outputs Jan 20
        * countlyCommon.formatDate(moment(), "MMM D");
        */
        countlyCommon.formatDate = function(date, format) {
            format = countlyCommon.getDateFormat(format);
            return date.format(format);
        };

        countlyCommon.getDateFormat = function(format) {
            if (countlyCommon.BROWSER_LANG_SHORT.toLowerCase() === "ko") {
                format = format.replace("MMM D", "MMM D[일]").replace("D MMM", "MMM D[일]");
            }
            else if (countlyCommon.BROWSER_LANG_SHORT.toLowerCase() === "ja") {
                format = format
                    .replace("D MMM YYYY", "YYYY年 MMM D")
                    .replace("MMM D, YYYY", "YYYY年 MMM D")
                    .replace("D MMM, YYYY", "YYYY年 MMM D")
                    .replace("MMM YYYY", "YYYY年 MMM")
                    .replace("MMM D", "MMM D[日]")
                    .replace("D MMM", "MMM D[日]");
            }
            else if (countlyCommon.BROWSER_LANG_SHORT.toLowerCase() === "zh") {
                format = format.replace("MMMM", "M").replace("MMM", "M").replace("MM", "M").replace("DD", "D").replace("D M, YYYY", "YYYY M D").replace("D M", "M D").replace("D", "D[日]").replace("M", "M[月]").replace("YYYY", "YYYY[年]");
            }
            return format;
        };

        countlyCommon.showTooltip = function(args) {
            showTooltip(args);
        };

        /**
        * Getter for period object
        * @memberof countlyCommon
        * @returns {object} returns {@link countlyCommon.periodObj}
        */
        countlyCommon.getPeriodObj = function() {
            if (countlyCommon.periodObj._period !== _period) {
                countlyCommon.periodObj = calculatePeriodObject(_period);
            }
            return countlyCommon.periodObj;
        };

        /**
        * Getter for period object by providing period string value
        * @memberof countlyCommon
        * @param {object} period - given period
        * @param {number} currentTimeStamp timestamp
        * @returns {object} returns {@link countlyCommon.periodObj}
        */
        countlyCommon.calcSpecificPeriodObj = function(period, currentTimeStamp) {
            return calculatePeriodObject(period, currentTimeStamp);
        };

        /**
         * Returns array with unique ticks for period
         * @param {moment} startTimestamp - start of period
         * @param {moment} endTimestamp - end of period
         * @returns {array} unique array ticks for period
         **/
        function getTicksBetween(startTimestamp, endTimestamp) {
            var dayIt = startTimestamp.clone(),
                ticks = [];

            while (dayIt < endTimestamp) {
                var daysLeft = Math.ceil(moment.duration(endTimestamp - dayIt).asDays());
                if (daysLeft >= dayIt.daysInMonth() && dayIt.date() === 1) {
                    ticks.push(dayIt.format("YYYY.M"));
                    dayIt.add(1 + dayIt.daysInMonth() - dayIt.date(), "days");
                }
                else if (daysLeft >= (7 - dayIt.day()) && dayIt.day() === 1) {
                    ticks.push(dayIt.format("gggg.[w]w"));
                    dayIt.add(8 - dayIt.day(), "days");
                }
                else {
                    ticks.push(dayIt.format("YYYY.M.D"));
                    dayIt.add(1, "day");
                }
            }

            return ticks;
        }

        /**
         * Returns array with more generalized unique ticks for period
         * @param {moment} startTimestamp - start of period
         * @param {moment} endTimestamp - end of period
         * @returns {array} unique array ticks for period
         **/
        function getTicksCheckBetween(startTimestamp, endTimestamp) {
            var dayIt = startTimestamp.clone(),
                ticks = [];

            while (dayIt < endTimestamp) {
                var daysLeft = Math.ceil(moment.duration(endTimestamp - dayIt).asDays());
                if (daysLeft >= (dayIt.daysInMonth() * 0.5 - dayIt.date())) {
                    ticks.push(dayIt.format("YYYY.M"));
                    dayIt.add(1 + dayIt.daysInMonth() - dayIt.date(), "days");
                }
                else {
                    ticks.push(dayIt.format("gggg.[w]w"));
                    dayIt.add(8 - dayIt.day(), "days");
                }
            }

            return ticks;
        }

        /**
        * Calculate period function
        * @param {object} period - given period
        * @param {number} currentTimestamp timestamp
        * @returns {object} returns {@link countlyCommon.periodObj}
        */
        function calculatePeriodObject(period, currentTimestamp) {
            var startTimestamp, endTimestamp, periodObject, cycleDuration, nDays;

            currentTimestamp = moment(currentTimestamp || undefined);

            periodObject = {
                activePeriod: undefined,
                periodMax: undefined,
                periodMin: undefined,
                previousPeriod: undefined,
                currentPeriodArr: [],
                previousPeriodArr: [],
                isSpecialPeriod: false,
                dateString: undefined,
                daysInPeriod: 0,
                numberOfDays: 0, // new
                uniquePeriodArr: [],
                uniquePeriodCheckArr: [],
                previousUniquePeriodArr: [],
                previousUniquePeriodCheckArr: [],
                periodContainsToday: true,
                _period: period
            };

            endTimestamp = currentTimestamp.clone().endOf("day");

            if (period && period.indexOf(",") !== -1) {
                try {
                    period = JSON.parse(period);
                }
                catch (SyntaxError) {
                    period = "30days";
                }
            }

            if (Array.isArray(period)) {
                if ((period[0] + "").length === 10) {
                    period[0] *= 1000;
                }
                if ((period[1] + "").length === 10) {
                    period[1] *= 1000;
                }
                var fromDate, toDate;

                if (Number.isInteger(period[0]) && Number.isInteger(period[1])) {
                    fromDate = moment(period[0]);
                    toDate = moment(period[1]);
                }
                else {
                    fromDate = moment(period[0], ["DD-MM-YYYY HH:mm:ss", "DD-MM-YYYY"]);
                    toDate = moment(period[1], ["DD-MM-YYYY HH:mm:ss", "DD-MM-YYYY"]);
                }

                startTimestamp = fromDate.clone().startOf("day");
                endTimestamp = toDate.clone().endOf("day");
                // fromDate.tz(_appTimezone);
                // toDate.tz(_appTimezone);

                if (fromDate.valueOf() === toDate.valueOf()) {
                    cycleDuration = moment.duration(1, "day");
                    Object.assign(periodObject, {
                        dateString: "D MMM, HH:mm",
                        periodMax: 23,
                        periodMin: 0,
                        activePeriod: fromDate.format("YYYY.M.D"),
                        previousPeriod: fromDate.clone().subtract(1, "day").format("YYYY.M.D")
                    });
                }
                else if (fromDate.valueOf() > toDate.valueOf()) {
                    //incorrect range - reset to 30 days
                    nDays = 30;

                    startTimestamp = currentTimestamp.clone().startOf("day").subtract(nDays - 1, "days");
                    endTimestamp = currentTimestamp.clone().endOf("day");

                    cycleDuration = moment.duration(nDays, "days");
                    Object.assign(periodObject, {
                        dateString: "D MMM",
                        isSpecialPeriod: true
                    });
                }
                else {
                    cycleDuration = moment.duration(moment.duration(endTimestamp - startTimestamp).asDays(), "days");
                    Object.assign(periodObject, {
                        dateString: "D MMM",
                        isSpecialPeriod: true
                    });
                }
            }
            else if (period === "month") {
                startTimestamp = currentTimestamp.clone().startOf("year");
                cycleDuration = moment.duration(1, "year");
                periodObject.dateString = "MMM";
                Object.assign(periodObject, {
                    dateString: "MMM",
                    periodMax: 12,
                    periodMin: 1,
                    activePeriod: currentTimestamp.year(),
                    previousPeriod: currentTimestamp.year() - 1
                });
            }
            else if (period === "day") {
                startTimestamp = currentTimestamp.clone().startOf("month");
                cycleDuration = moment.duration(1, "month");
                periodObject.dateString = "D MMM";
                Object.assign(periodObject, {
                    dateString: "D MMM",
                    periodMax: currentTimestamp.clone().endOf("month").date(),
                    periodMin: 1,
                    activePeriod: currentTimestamp.format("YYYY.M"),
                    previousPeriod: currentTimestamp.clone().subtract(1, "month").format("YYYY.M")
                });
            }
            else if (period === "hour") {
                startTimestamp = currentTimestamp.clone().startOf("day");
                cycleDuration = moment.duration(1, "day");
                Object.assign(periodObject, {
                    dateString: "HH:mm",
                    periodMax: 23,
                    periodMin: 0,
                    activePeriod: currentTimestamp.format("YYYY.M.D"),
                    previousPeriod: currentTimestamp.clone().subtract(1, "day").format("YYYY.M.D")
                });
            }
            else if (period === "yesterday") {
                var yesterday = currentTimestamp.clone().subtract(1, "day");

                startTimestamp = yesterday.clone().startOf("day");
                endTimestamp = yesterday.clone().endOf("day");
                cycleDuration = moment.duration(1, "day");
                Object.assign(periodObject, {
                    dateString: "D MMM, HH:mm",
                    periodMax: 23,
                    periodMin: 0,
                    activePeriod: yesterday.format("YYYY.M.D"),
                    previousPeriod: yesterday.clone().subtract(1, "day").format("YYYY.M.D")
                });
            }
            else if (/([0-9]+)days/.test(period)) {
                nDays = parseInt(/([0-9]+)days/.exec(period)[1]);
                if (nDays < 1) {
                    nDays = 30; //if there is less than 1 day
                }
                startTimestamp = currentTimestamp.clone().startOf("day").subtract(nDays - 1, "days");
                cycleDuration = moment.duration(nDays, "days");
                Object.assign(periodObject, {
                    dateString: "D MMM",
                    isSpecialPeriod: true
                });
            }
            else if (/([0-9]+)weeks/.test(period)) {
                nDays = parseInt(/([0-9]+)weeks/.exec(period)[1]) * 7;
                if (nDays < 1) {
                    nDays = 30; //if there is less than 1 day
                }
                startTimestamp = currentTimestamp.clone().startOf("day").subtract(nDays - 1, "days");
                cycleDuration = moment.duration(nDays, "days");
                Object.assign(periodObject, {
                    dateString: "D MMM",
                    isSpecialPeriod: true
                });
            }
            else if (/([0-9]+)months/.test(period)) {
                nDays = parseInt(/([0-9]+)months/.exec(period)[1]) * 30;
                if (nDays < 1) {
                    nDays = 30; //if there is less than 1 day
                }
                startTimestamp = currentTimestamp.clone().startOf("day").subtract(nDays - 1, "days");
                cycleDuration = moment.duration(nDays, "days");
                Object.assign(periodObject, {
                    dateString: "D MMM",
                    isSpecialPeriod: true
                });
            }
            //incorrect period, defaulting to 30 days
            else {
                nDays = 30;

                startTimestamp = currentTimestamp.clone().startOf("day").subtract(nDays - 1, "days");
                cycleDuration = moment.duration(nDays, "days");
                Object.assign(periodObject, {
                    dateString: "D MMM",
                    isSpecialPeriod: true
                });
            }

            Object.assign(periodObject, {
                start: startTimestamp.valueOf(),
                end: endTimestamp.valueOf(),
                daysInPeriod: Math.ceil(moment.duration(endTimestamp - startTimestamp).asDays()),
                numberOfDays: Math.ceil(moment.duration(endTimestamp - startTimestamp).asDays()),
                periodContainsToday: (startTimestamp <= currentTimestamp) && (currentTimestamp <= endTimestamp),
            });

            if (startTimestamp.weekYear() !== endTimestamp.weekYear()) {
                Object.assign(periodObject, {
                    dateString: (periodObject.dateString + ", YYYY")
                });
            }

            for (var dayIt = startTimestamp.clone(); dayIt < endTimestamp; dayIt.add(1, "day")) {
                periodObject.currentPeriodArr.push(dayIt.format("YYYY.M.D"));
                periodObject.previousPeriodArr.push(dayIt.clone().subtract(cycleDuration).format("YYYY.M.D"));
            }

            periodObject.uniquePeriodArr = getTicksBetween(startTimestamp, endTimestamp);
            periodObject.uniquePeriodCheckArr = getTicksCheckBetween(startTimestamp, endTimestamp);
            periodObject.previousUniquePeriodArr = getTicksBetween(startTimestamp.clone().subtract(cycleDuration), endTimestamp.clone().subtract(cycleDuration));
            periodObject.previousUniquePeriodCheckArr = getTicksCheckBetween(startTimestamp.clone().subtract(cycleDuration), endTimestamp.clone().subtract(cycleDuration));

            return periodObject;
        }

        var getPeriodObj = countlyCommon.getPeriodObj;

        /** Function to show the tooltip when any data point in the graph is hovered on.
        * @param {object} args - tooltip info
        * @param {number} args.x - x position
        * @param {number} args.y- y position
        * @param {string} args.contents - content for tooltip
        * @param {string} args.title  - title
        * @param {string} args.notes  - notes
        */
        function showTooltip(args) {
            var x = args.x || 0,
                y = args.y || 0,
                contents = args.contents,
                title = args.title,
                notes = args.notes;

            var tooltip = $('<div id="graph-tooltip" class="v2"></div>').append('<span class="graph-tooltip-content">' + contents + '</span>');

            if (title) {
                tooltip.prepend('<span id="graph-tooltip-title">' + title + '</span>');
            }

            if (notes) {
                var noteLines = (notes + "").split("===");

                for (var i = 0; i < noteLines.length; i++) {
                    tooltip.append("<div class='note-line'>&#8211;  " + noteLines[i] + "</div>");
                }
            }

            $("#content").append("<div id='tooltip-calc'>" + $('<div>').append(tooltip.clone()).html() + "</div>");
            var widthVal = $("#graph-tooltip").outerWidth(),
                heightVal = $("#graph-tooltip").outerHeight();
            $("#tooltip-calc").remove();

            var newLeft = (x - (widthVal / 2)),
                xReach = (x + (widthVal / 2));

            if (notes) {
                newLeft += 10.5;
                xReach += 10.5;
            }

            if (xReach > $(window).width()) {
                newLeft = (x - widthVal);
            }
            else if (xReach < 340) {
                newLeft = x;
            }

            tooltip.css({
                top: y - heightVal - 20,
                left: newLeft
            }).appendTo("body").show();
        }

        /** function adds leading zero to value.
        * @param {number} value - given value
        * @returns {string|number} fixed value
        */
        function leadingZero(value) {
            if (value > 9) {
                return value;
            }
            return "0" + value;
        }

        /**
        * Correct timezone offset on the timestamp for current browser's timezone
        * @memberof countlyCommon
        * @param {number} inTS - second or milisecond timestamp
        * @returns {number} corrected timestamp applying user's timezone offset
        */
        countlyCommon.getOffsetCorrectionForTimestamp = function(inTS) {
            var intLength = Math.round(inTS).toString().length,
                timeZoneOffset = new Date((intLength === 13) ? inTS : inTS * 1000).getTimezoneOffset(),
                tzAdjustment = 0;

            if (timeZoneOffset !== 0) {
                if (intLength === 13) {
                    tzAdjustment = timeZoneOffset * 60000;
                }
                else if (intLength === 10) {
                    tzAdjustment = timeZoneOffset * 60;
                }
            }

            return tzAdjustment;
        };

        var __months = [];

        /**
        * Get array of localized short month names from moment js
        * @memberof countlyCommon
        * @param {boolean} reset - used to reset months cache when changing locale
        * @returns {array} array of short localized month names used in moment js MMM formatting
        * @example
        * //outputs ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        * countlyCommon.getMonths();
        */
        countlyCommon.getMonths = function(reset) {
            if (reset) {
                __months = [];
            }

            if (!__months.length) {
                for (var i = 0; i < 12; i++) {
                    __months.push(moment.localeData().monthsShort(moment([0, i]), ""));
                }
            }
            return __months;
        };

        /**
        * Currently selected period
        * @memberof countlyCommon
        * @property {array=} currentPeriodArr - array with ticks for current period (available only for special periods), example ["2016.12.22","2016.12.23","2016.12.24", ...]
        * @property {array=} previousPeriodArr - array with ticks for previous period (available only for special periods), example ["2016.12.22","2016.12.23","2016.12.24", ...]
        * @property {string} dateString - date format to use when outputting date in graphs, example D MMM, YYYY
        * @property {boolean} isSpecialPeriod - true if current period is special period, false if it is not
        * @property {number} daysInPeriod - amount of full days in selected period, example 30
        * @property {number} numberOfDays - number of days selected period consists of, example hour period has 1 day
        * @property {boolean} periodContainsToday - true if period contains today, false if not
        * @property {array} uniquePeriodArr - array with ticks for current period which contains data for unique values, like unique users, example ["2016.12.22","2016.w52","2016.12.30", ...]
        * @property {array} uniquePeriodCheckArr - array with ticks for higher buckets to current period unique value estimation, example ["2016.w51","2016.w52","2016.w53","2017.1",...]
        * @property {array} previousUniquePeriodArr - array with ticks for previous period which contains data for unique values, like unique users, example ["2016.12.22","2016.w52","2016.12.30"]
        * @property {array} previousUniquePeriodCheckArr - array with ticks for higher buckets to previous period unique value estimation, example ["2016.w47","2016.w48","2016.12"]
        * @property {string} activePeriod - period name formatted in dateString
        * @property {string} previousPeriod - previous period name formatted in dateString
        * @property {number} periodMax - max value of current period tick
        * @property {number} periodMin - min value of current period tick
        * @example <caption>Special period object (7days)</caption>
        *    {
        *        "currentPeriodArr":["2017.1.14","2017.1.15","2017.1.16","2017.1.17","2017.1.18","2017.1.19","2017.1.20"],
        *        "previousPeriodArr":["2017.1.7","2017.1.8","2017.1.9","2017.1.10","2017.1.11","2017.1.12","2017.1.13"],
        *        "isSpecialPeriod":true,
        *        "dateString":"D MMM",
        *        "daysInPeriod":7,
        *        "numberOfDays":7,
        *        "uniquePeriodArr":["2017.1.14","2017.w3"],
        *        "uniquePeriodCheckArr":["2017.w2","2017.w3"],
        *        "previousUniquePeriodArr":["2017.1.7","2017.1.8","2017.1.9","2017.1.10","2017.1.11","2017.1.12","2017.1.13"],
        *        "previousUniquePeriodCheckArr":["2017.w1","2017.w2"],
        *        "periodContainsToday":true
        *    }
        * @example <caption>Simple period object (today period - hour)</caption>
        *    {
        *        "activePeriod":"2017.1.20",
        *        "periodMax":23,
        *        "periodMin":0,
        *        "previousPeriod":"2017.1.19",
        *        "isSpecialPeriod":false,
        *        "dateString":"HH:mm",
        *        "daysInPeriod":0,
        *        "numberOfDays":1,
        *        "uniquePeriodArr":[],
        *        "uniquePeriodCheckArr":[],
        *        "previousUniquePeriodArr":[],
        *        "previousUniquePeriodCheckArr":[],
        *        "periodContainsToday":true
        *    }
        */
        countlyCommon.periodObj = calculatePeriodObject();


        /**
        * Parse second to standard time format
        * @memberof countlyCommon
        * @param {number} second  number
        * @returns {string} return format "HH:MM:SS"
        */
        countlyCommon.formatSecond = function(second) {
            var timeLeft = parseInt(second);
            var dict = [
                {k: 'year', v: 31536000},
                {k: 'day', v: 86400},
                {k: 'hour', v: 3600},
                {k: 'minute', v: 60},
                {k: 'second', v: 1}
            ];
            var result = {year: 0, day: 0, hour: 0, minute: 0, second: 0};
            var resultStrings = [];
            for (var i = 0; i < dict.length && resultStrings.length < 3; i++) {
                result[dict[i].k] = Math.floor(timeLeft / dict[i].v);
                timeLeft = timeLeft % dict[i].v;
                if (result[dict[i].k] > 0) {
                    if (result[dict[i].k] === 1) {
                        resultStrings.push(result[dict[i].k] + "" + jQuery.i18n.map["common." + dict[i].k + ".abrv2"]);
                    }
                    else {
                        resultStrings.push(result[dict[i].k] + "" + jQuery.i18n.map["common." + dict[i].k + ".abrv"]);
                    }
                }
            }

            if (resultStrings.length === 0) {
                return "0";
            }
            else {
                return resultStrings.join(" ");
            }
        };

        /**
        * add one more column in chartDP[index].data to show string in dp
        * @memberof countlyCommon
        * @param {array} chartDPs  - chart data points
        * @param {string} labelName  - label name
        * @return {array} chartDPs
        * @example
        * for example:
        *     chartDPs = [
        *          {color:"#88BBC8", label:"duration", data:[[0, 23], [1, 22]}],
        *          {color:"#88BBC8", label:"count", data:[[0, 3], [1, 3]}],
        *     }
        *     lable = 'duration',
        *
        * will return
        *     chartDPs = [
        *          {color:"#88BBC8", label:"duration", data:[[0, 23, "00:00:23"], [1, 22, "00:00:22"]}],
        *          {color:"#88BBC8", label:"count", data:[[0, 3], [1, 3]}],
        *     }
        */
        countlyCommon.formatSecondForDP = function(chartDPs, labelName) {
            for (var k = 0; k < chartDPs.length; k++) {
                if (chartDPs[k].label === labelName) {
                    var dp = chartDPs[k];
                    for (var i = 0; i < dp.data.length; i++) {
                        dp.data[i][2] = countlyCommon.formatSecond(dp.data[i][1]);
                    }
                }
            }
            return chartDPs;
        };

        /**
        * Getter/setter for dot notatons:
        * @memberof countlyCommon
        * @param {object} obj - object to use
        * @param {string} is - path of properties to get
        * @param {varies} value - value to set
        * @returns {varies} value at provided path
        * @example
        * common.dot({a: {b: {c: 'string'}}}, 'a.b.c') === 'string'
        * common.dot({a: {b: {c: 'string'}}}, ['a', 'b', 'c']) === 'string'
        * common.dot({a: {b: {c: 'string'}}}, 'a.b.c', 5) === 5
        * common.dot({a: {b: {c: 'string'}}}, 'a.b.c') === 5
        */
        countlyCommon.dot = function(obj, is, value) {
            if (typeof is === 'string') {
                return countlyCommon.dot(obj, is.split('.'), value);
            }
            else if (is.length === 1 && value !== undefined) {
                obj[is[0]] = value;
                return value;
            }
            else if (is.length === 0) {
                return obj;
            }
            else if (!obj) {
                return obj;
            }
            else {
                if (typeof obj[is[0]] === "undefined" && value !== undefined) {
                    obj[is[0]] = {};
                }
                return countlyCommon.dot(obj[is[0]], is.slice(1), value);
            }
        };

        /**
        * Save division, handling division by 0 and rounding up to 2 decimals
        * @memberof countlyCommon
        * @param {number} dividend - object to use
        * @param {number} divisor - path of properties to get
        * @returns {number} division
        */
        countlyCommon.safeDivision = function(dividend, divisor) {
            var tmpAvgVal;
            tmpAvgVal = dividend / divisor;
            if (!tmpAvgVal || tmpAvgVal === Number.POSITIVE_INFINITY) {
                tmpAvgVal = 0;
            }
            return tmpAvgVal.toFixed(2);
        };

        /**
        * Get timestamp range in format as [startTime, endTime] with period and base time
        * @memberof countlyCommon
        * @param {object} period - period has two format: array or string
        * @param {number} baseTimeStamp - base timestamp to calc the period range
        * @returns {array} period range
        */
        countlyCommon.getPeriodRange = function(period, baseTimeStamp) {
            var periodRange;
            if (period && period.indexOf(",") !== -1) {
                try {
                    period = JSON.parse(period);
                }
                catch (SyntaxError) {
                    period = countlyCommon.DEFAULT_PERIOD;
                }
            }
            if (Object.prototype.toString.call(period) === '[object Array]' && period.length === 2) { //range
                periodRange = [period[0] + countlyCommon.getOffsetCorrectionForTimestamp(period[0]), period[1] + countlyCommon.getOffsetCorrectionForTimestamp(period[1])];
                return periodRange;
            }
            var endTimeStamp = baseTimeStamp;
            var start;
            switch (period) {
            case 'hour':
                start = moment(baseTimeStamp).hour(0).minute(0).second(0);
                break;
            case 'yesterday':
                start = moment(baseTimeStamp).subtract(1, 'day').hour(0).minute(0).second(0);
                endTimeStamp = moment(baseTimeStamp).subtract(1, 'day').hour(23).minute(59).second(59).toDate().getTime();
                break;
            case 'day':
                start = moment(baseTimeStamp).date(1).hour(0).minute(0).second(0);
                break;
            case 'month':
                start = moment(baseTimeStamp).month(0).date(1).hour(0).minute(0).second(0);
                break;
            default:
                if (/([0-9]+)days/.test(period)) {
                    var match = /([0-9]+)days/.exec(period);
                    if (match[1] && (parseInt(match[1]) > 1)) {
                        start = moment(baseTimeStamp).subtract(parseInt(match[1]) - 1, 'day').hour(0).minute(0);
                    }
                }
            }
            periodRange = [start.toDate().getTime(), endTimeStamp];
            return periodRange;
        };

        /*
        fast-levenshtein - Levenshtein algorithm in Javascript
        (MIT License) Copyright (c) 2013 Ramesh Nair
        https://github.com/hiddentao/fast-levenshtein
        */
        var collator;
        try {
            collator = (typeof Intl !== "undefined" && typeof Intl.Collator !== "undefined") ? Intl.Collator("generic", { sensitivity: "base" }) : null;
        }
        catch (err) {
            // console.log("Failed to initialize collator for Levenshtein\n" + err.stack);
        }

        // arrays to re-use
        var prevRow = [],
            str2Char = [];

        /**
        * Based on the algorithm at http://en.wikipedia.org/wiki/Levenshtein_distance.
        * @memberof countlyCommon
        */
        countlyCommon.Levenshtein = {
            /**
            * Calculate levenshtein distance of the two strings.
            *
            * @param {string} str1 String the first string.
            * @param {string} str2 String the second string.
            * @param {object} [options] Additional options.
            * @param {boolean} [options.useCollator] Use `Intl.Collator` for locale-sensitive string comparison.
            * @return {number} Integer the levenshtein distance (0 and above).
            */
            get: function(str1, str2, options) {
                var useCollator = (options && collator && options.useCollator);

                var str1Len = str1.length,
                    str2Len = str2.length;

                // base cases
                if (str1Len === 0) {
                    return str2Len;
                }

                if (str2Len === 0) {
                    return str1Len;
                }

                // two rows
                var curCol, nextCol, i, j, tmp;

                // initialise previous row
                for (i = 0; i < str2Len; ++i) {
                    prevRow[i] = i;
                    str2Char[i] = str2.charCodeAt(i);
                }
                prevRow[str2Len] = str2Len;

                var strCmp;
                if (useCollator) {
                    // calculate current row distance from previous row using collator
                    for (i = 0; i < str1Len; ++i) {
                        nextCol = i + 1;

                        for (j = 0; j < str2Len; ++j) {
                            curCol = nextCol;

                            // substution
                            strCmp = 0 === collator.compare(str1.charAt(i), String.fromCharCode(str2Char[j]));

                            nextCol = prevRow[j] + (strCmp ? 0 : 1);

                            // insertion
                            tmp = curCol + 1;
                            if (nextCol > tmp) {
                                nextCol = tmp;
                            }
                            // deletion
                            tmp = prevRow[j + 1] + 1;
                            if (nextCol > tmp) {
                                nextCol = tmp;
                            }

                            // copy current col value into previous (in preparation for next iteration)
                            prevRow[j] = curCol;
                        }

                        // copy last col value into previous (in preparation for next iteration)
                        prevRow[j] = nextCol;
                    }
                }
                else {
                    // calculate current row distance from previous row without collator
                    for (i = 0; i < str1Len; ++i) {
                        nextCol = i + 1;

                        for (j = 0; j < str2Len; ++j) {
                            curCol = nextCol;

                            // substution
                            strCmp = str1.charCodeAt(i) === str2Char[j];

                            nextCol = prevRow[j] + (strCmp ? 0 : 1);

                            // insertion
                            tmp = curCol + 1;
                            if (nextCol > tmp) {
                                nextCol = tmp;
                            }
                            // deletion
                            tmp = prevRow[j + 1] + 1;
                            if (nextCol > tmp) {
                                nextCol = tmp;
                            }

                            // copy current col value into previous (in preparation for next iteration)
                            prevRow[j] = curCol;
                        }

                        // copy last col value into previous (in preparation for next iteration)
                        prevRow[j] = nextCol;
                    }
                }
                return nextCol;
            }
        };

        countlyCommon.getNotesPopup = function(dateId, appIds) {
            var notes = countlyCommon.getNotesForDateId(dateId, appIds);
            var dialog = $("#cly-popup").clone().removeAttr("id").addClass('graph-notes-popup');
            dialog.removeClass('black');
            var content = dialog.find(".content");
            var notesPopupHTML = Handlebars.compile($("#graph-notes-popup").html());
            notes.forEach(function(n) {
                n.ts_display = moment(n.ts).format("D MMM, YYYY, HH:mm");
                var app = countlyGlobal.apps[n.app_id] || {};
                n.app_name = app.name;
            });
            var noteDateFormat = "D MMM, YYYY";
            if (countlyCommon.getPeriod() === "month") {
                noteDateFormat = "MMM YYYY";
            }
            var notePopupTitleTime = moment(notes[0].ts).format(noteDateFormat);
            content.html(notesPopupHTML({notes: notes, notePopupTitleTime: notePopupTitleTime}));
            CountlyHelpers.revealDialog(dialog);
            $(".close-note-popup-button").off("click").on("click", function() {
                CountlyHelpers.removeDialog(dialog);
            });
            window.app.localize();
        };

        countlyCommon.getGraphNotes = function(appIds, callBack) {
            if (!appIds) {
                appIds = [];
            }
            return window.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "api_key": window.countlyGlobal.member.api_key,
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "category": "session",
                    "notes_apps": JSON.stringify(appIds),
                    "period": countlyCommon.getPeriod(),
                    "method": "notes",
                },
                success: function(json) {
                    var notes = json && json.aaData || [];
                    var noteSortByApp = {};
                    notes.forEach(function(note) {
                        if (!noteSortByApp[note.app_id]) {
                            noteSortByApp[note.app_id] = [];
                        }
                        noteSortByApp[note.app_id].push(note);
                    });
                    appIds.forEach(function(appId) {
                        window.countlyGlobal.apps[appId].notes = noteSortByApp[appId] || [];
                    });
                    callBack && callBack(notes);
                }
            });
        };
        /**
        * Compare two versions
        * @memberof countlyCommon
        * @param {String} a, First version
        * @param {String} b, Second version
        * @returns {Number} returns -1, 0 or 1 by result of comparing
        */
        countlyCommon.compareVersions = function(a, b) {
            var aParts = a.split('.');
            var bParts = b.split('.');

            for (var j = 0; j < aParts.length && j < bParts.length; j++) {
                var aPartNum = parseInt(aParts[j], 10);
                var bPartNum = parseInt(bParts[j], 10);

                var cmp = Math.sign(aPartNum - bPartNum);

                if (cmp !== 0) {
                    return cmp;
                }
            }

            if (aParts.length === bParts.length) {
                return 0;
            }

            var longestArray = aParts;
            if (bParts.length > longestArray.length) {
                longestArray = bParts;
            }

            var continueIndex = Math.min(aParts.length, bParts.length);

            for (var i = continueIndex; i < longestArray.length; i += 1) {
                if (parseInt(longestArray[i], 10) > 0) {
                    return longestArray === bParts ? -1 : +1;
                }
            }

            return 0;
        };

        /**
		* Converts cohort time period to string.
		* @param {Object} obj Inferred time object. Must contain "value", "type" and optionally "level".
		* @returns {Object} String fields
		*/
        countlyCommon.getTimePeriodDescriptions = function(obj) {
            if (obj.type === "all-time") {
                return { name: jQuery.i18n.map['common.all-time'], valueAsString: "0days" };
            }
            if (obj.type === "last-n") {
                var level = obj.level || "days";
                return {
                    name: jQuery.i18n.prop('common.in-last-' + level + (obj.value > 1 ? '-plural' : ''), obj.value),
                    valueAsString: obj.value + level
                };
            }
            if (obj.type === "hour") {
                return {
                    name: jQuery.i18n.map["common.today"],
                    valueAsString: "hour"
                };
            }
            if (obj.type === "yesterday") {
                return {
                    name: jQuery.i18n.map["common.yesterday"],
                    valueAsString: "yesterday"
                };
            }
            if (obj.type === "day") {
                return {
                    name: moment().format("MMMM, YYYY"),
                    valueAsString: "day"
                };
            }
            if (obj.type === "month") {
                return {
                    name: moment().year(),
                    valueAsString: "month"
                };
            }

            var valueAsString = JSON.stringify(obj.value);
            var name = valueAsString;
            var formatDate = function(point, isShort) {
                var format = "MMMM DD, YYYY";
                if (isShort) {
                    format = "MMM DD, YYYY";
                }

                if (point.toString().length === 10) {
                    point *= 1000;
                }

                return countlyCommon.formatDate(moment(point), format);
            };
            if (Array.isArray(obj.value)) {
                name = jQuery.i18n.prop('common.time-period-name.range', formatDate(obj.value[0], true), formatDate(obj.value[1], true));
            }
            else {
                name = jQuery.i18n.prop('common.time-period-name.' + obj.type, formatDate(obj.value[obj.type]));
            }
            return {
                name: name,
                valueAsString: valueAsString
            };
        };

        /**
		* Cohort time period is a string (may still contain an array or an object). The needed
		* meta data, however, is not included within the field. This function infers the meta data
		* and returns as an object. Meta data is not persisted in db, just used in the UI.
		*
		* Example:
		*
		* Input: "[1561928400,1595203200]"
		*
		* // Other input forms:
		* // "0days" (All Time)
		* // "10days", "10weeks", etc. (In the Last)
		* // "[1561928400,1595203200]" (In Between)
		* // "{'on':1561928400}" (On)
		* // "{'since':1561928400}" (Since)
		*
		* Output:
		* {
		*     level: "days" // only effective when the type is "last-n"
		*     longName: "Jul 01, 2019-Jul 20, 2020"
		*     name: "Jul 01, 2019-Jul 20, 2020"
		*     type: "range"
		*     value: [1561928400, 1595203200]
		*     valueAsString: "[1561928400,1595203200]"
		* }
		*
		* @param {string} period Period string
		* @returns {Object} An object containing meta fields
		*/
        countlyCommon.convertToTimePeriodObj = function(period) {
            var inferredLevel = "days",
                inferredType = null,
                inferredValue = null;

            if (typeof period === "string" && (period.indexOf("{") > -1 || period.indexOf("[") > -1)) {
                period = JSON.parse(period);
            }

            if (!period && period === 0) {
                inferredType = "all-time";
                inferredValue = 0;
            }
            else if (Array.isArray(period)) {
                inferredType = "range";
            }
            else if (period === "hour") {
                inferredType = "hour";
                inferredValue = "hour";
            }
            else if (period === "yesterday") {
                inferredType = "yesterday";
                inferredValue = "yesterday";
            }
            else if (period === "day") {
                inferredType = "day";
                inferredValue = "day";
            }
            else if (period === "month") {
                inferredType = "month";
                inferredValue = "month";
            }
            else if (typeof period === "object") {
                if (Object.prototype.hasOwnProperty.call(period, "since")) {
                    inferredType = "since";
                }
                else if (Object.prototype.hasOwnProperty.call(period, "on")) {
                    inferredType = "on";
                }
            }
            else if (period.endsWith("days")) {
                inferredLevel = "days";
                inferredType = "last-n";
            }
            else if (period.endsWith("weeks")) {
                inferredLevel = "weeks";
                inferredType = "last-n";
            }
            else if (period.endsWith("months")) {
                inferredLevel = "months";
                inferredType = "last-n";
            }
            else {
                inferredType = "all-time";
                inferredValue = 0;
            }

            if (inferredValue !== 0 && inferredType === "last-n") {
                inferredValue = parseInt((period.replace(inferredLevel, '')));
            }
            else if (inferredValue !== 0) {
                var stringified = JSON.stringify(period);
                inferredValue = JSON.parse(stringified);
            }

            var obj = {
                value: inferredValue,
                type: inferredType,
                level: inferredLevel
            };

            var descriptions = countlyCommon.getTimePeriodDescriptions(obj);

            obj.valueAsString = descriptions.valueAsString;
            obj.name = obj.longName = descriptions.name;

            return obj;
        };

        /**
		 * Function to change HEX to RGBA
		 * @param  {String} h - hex code
		 * @returns {String} rgba string
		 */
        countlyCommon.hexToRgba = function(h) {
            var r = 0, g = 0, b = 0, a = 1;

            if (h.length === 4) {
                r = "0x" + h[1] + h[1];
                g = "0x" + h[2] + h[2];
                b = "0x" + h[3] + h[3];
            }
            else if (h.length === 7) {
                r = "0x" + h[1] + h[2];
                g = "0x" + h[3] + h[4];
                b = "0x" + h[5] + h[6];
            }

            return "rgba(" + +r + "," + +g + "," + +b + "," + a + ")";
        };

        /**
		 * Unescapes provided string.
         * -- Please use carefully --
         * Mainly for rendering purposes.
		 * @param {String} text - Arbitrary string
         * @param {String} df - Default value
		 * @returns {String} rgba string
		 */
        countlyCommon.unescapeString = function(text, df) {
            if (text === undefined && df === undefined) {
                return undefined;
            }
            return _.unescape(text || df).replace(/&#39;/g, "'");
        };
    };

    window.CommonConstructor = CommonConstructor;
    window.countlyCommon = new CommonConstructor();

}(window, jQuery));