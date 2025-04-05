/* global _, countlyGlobal, countlyCommon, app, countlyDeviceDetails, jQuery, $, countlyVue*/
/*
 Some helper functions to be used throughout all views. Includes custom
 popup, alert and confirm dialogs for the time being.
 */
/**
 * Some helper functions to be used throughout all views. Includes custom popup, alert and confirm dialogs for the time being.
 * @name CountlyHelpers
 * @global
 * @namespace CountlyHelpers
 */
(function(CountlyHelpers) {

    /**
    * This function checks if a Countly plugin is enabled.
    * @param {string|array} name - The name of the plugin(s) to check for. Can be either a string or an array of strings.
    * @returns {boolean} - Returns true when atleast one plugin is enabled, false otherwise.
    */
    CountlyHelpers.isPluginEnabled = function(name) {
        if (countlyGlobal && countlyGlobal.pluginsFull && Array.isArray(countlyGlobal.pluginsFull)) {
            if (!Array.isArray(name)) {
                name = [name];
            }
            var isPluginsFull = false;
            for (var i = 0; i < name.length; i++) {
                if (countlyGlobal.pluginsFull.indexOf(name[i]) > -1) {
                    isPluginsFull = true;
                    break;
                }
            }
            if (isPluginsFull && countlyGlobal.plugins && Array.isArray(countlyGlobal.plugins)) {
                for (var j = 0; j < name.length; j++) {
                    if (countlyGlobal.plugins.indexOf(name[j]) > -1) {
                        return true;
                    }
                }
                return false;
            }
            else {
                return true;
            }
        }
        else {
            return true;
        }

    };

    CountlyHelpers.logout = function(path) {
        if (path) {
            window.location = "logout";
        }
        else {
            window.location.reload();//this will log us out
        }
    };
    /**
    * Legacy method for displaying notifications. User {@link CountlyHelpers.notify} instead
    * @param {string} msg - msg to display
    * @returns {boolean} true - if message is not defined, else returns nothing
    */
    CountlyHelpers.parseAndShowMsg = function(msg) {
        if (!msg || !msg.length) {
            return true;
        }

        if (_.isArray(msg)) {
            msg = msg[0];
        }

        var type = "info",
            message = "",
            msgArr = msg.split("|");

        if (msgArr.length > 1) {
            type = msgArr[0];
            message = msgArr[1];
        }
        else {
            message = msg;
        }

        CountlyHelpers.notify({type: type, message: message});

        delete countlyGlobal.message;
    };

    /**
    * Display dashboard notification using Amaran JS library
    * @param {object} msg - notification message object
    * @param {string=} msg.title - title of the notification
    * @deprecated 
    * @param {string=} msg.message - main notification text
    * @param {string=} msg.info - some additional information to display in notification
    * @deprecated 
    * @param {number=} [msg.delay=10000] - delay time in miliseconds before displaying notification
    * @deprecated 
    * @param {string=} [msg.type=ok] - message type, accepted values ok, error and warning
    * @param {string=} [msg.position=top right] - message position
    * @deprecated 
    * @param {string=} [msg.sticky=false] - should message stick until closed
    * @param {string=} [msg.clearAll=false] - clear all previous notifications upon showing this one
    * @deprecated 
    * @param {string=} [msg.closeOnClick=false] - should notification be automatically closed when clicked on
    * @deprecated 
    * @param {function=} msg.onClick - on click listener
    * @deprecated 
    * @param {boolean=} msg.persistent - flag to determine if notification should be displayed persistently or as a toast
    * @example
    * CountlyHelpers.notify({
    *    message: "Main message text",
    * });
    */
    CountlyHelpers.notify = function(msg) {
        if (typeof msg === "string") {
            msg = {message: msg};
        }
        var payload = {};
        var persistent = msg.persistent;
        payload.text = countlyCommon.encodeHtml(msg.message);
        payload.autoHide = !msg.sticky;
        payload.id = msg.id;
        payload.width = msg.width;
        payload.goTo = msg.goTo;
        var colorToUse;

        if (countlyGlobal.ssr) {
            return;
        }

        switch (msg.type) {
        case "error":
            colorToUse = "light-destructive";
            break;
        case "warning":
            colorToUse = "light-warning";
            break;
        case "yellow":
            colorToUse = "light-warning";
            break;
        case "info":
        case "blue":
            colorToUse = "light-informational";
            break;
        case "purple":
        case "ok":
        case "success":
        default:
            colorToUse = "light-successful";
            break;
        }
        payload.color = colorToUse;

        if (persistent) {
            countlyCommon.dispatchPersistentNotification(payload);
        }
        else {
            countlyCommon.dispatchNotificationToast(payload);
        }
    };

    /**
     * Removes a notification from persistent notification list based on id.
     * @param {string} notificationId notification id
     */
    CountlyHelpers.removePersistentNotification = function(notificationId) {
        countlyCommon.removePersistentNotification(notificationId);
    };

    /**
     * 
     * @param {object} options includes from, title and url properties. from property 
     * indicates the origin of view. url indicates the new url to navigate to and 
     * title is the text that will be dispalyed for the backlink url. 
     */
    CountlyHelpers.goTo = function(options) {
        if (options.isExternalLink) {
            window.open(options.url, '_blank', 'noopener,noreferrer');
        }
        else if (options.download) {
            var a = document.createElement('a');
            a.href = options.url;
            a.download = options.download;
            a.click();
        }
        else {
            app.backlinkUrl = options.from;
            app.backlinkTitle = options.title;
            window.location.hash = options.url;
        }
    };

    /**
     * 
     * @returns {object} includes url and title propertes that are set by goTo() method.
     * url indicate the backlink url and title is the text that will be displayed for the backlink url
     */
    CountlyHelpers.getBacklink = function() {
        var url = app.backlinkUrl;
        var title = app.backlinkTitle;
        app.backlinkUrl = null;
        app.backlinkTitle = null;
        return {url: url, title: title};
    };

    /**
     * @returns {boolean} true when active app type is mobile. Otherwise, false
     */
    CountlyHelpers.isActiveAppMobile = function() {
        return countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === 'mobile';
    },

    /**
    * Display modal alert popup for quick short messages that require immediate user's attention, as error submitting form
    * @param {string} msg - message to display in alert popup
    * @param {string} type - type of alert red for errors and green for success
    * @param {object} moreData - more data to display
    * @param {string} moreData.image - image id
    * @param {string} moreData.title - alert title
    * @example
    * CountlyHelpers.alert("Some error happened", "red");
    */
    CountlyHelpers.alert = function(msg, type, moreData) {
        if (countlyGlobal.ssr) {
            return;
        }

        if (window.countlyVue && window.countlyVue.vuex) {

            var confirmLabel = countlyVue.i18n('common.ok'),
                convertedType = "secondary";

            if (moreData && moreData.button_title) {
                confirmLabel = moreData.button_title;
            }

            if (type === "popStyleGreen") {
                convertedType = "success";
            }
            else if (type === "red") {
                convertedType = "danger";
            }

            var payload = {
                intent: 'message',
                message: (moreData && moreData.title) ? countlyCommon.encodeSomeHtml(msg) : "",
                type: convertedType,
                confirmLabel: confirmLabel,
                title: (moreData && moreData.title) || countlyCommon.encodeSomeHtml(msg),
                image: moreData && moreData.image
            };

            var currentStore = window.countlyVue.vuex.getGlobalStore();
            if (currentStore) {
                currentStore.dispatch('countlyCommon/onAddDialog', payload);
            }
        }
    };

    /**
    * Display modal popup that requires confirmation input from user
    * @param {string} msg - message to display in alert popup
    * @param {string} type - type of alert red for errors and green for success
    * @param {function} callback - to determine result of the input
    * @param {array=} buttonText - [0] element for cancle button text and [1] element for confirm button text
    * @param {object} moreData - more data to display
    * @param {string} moreData.image - image id
    * @param {string} moreData.title - alert title
    * @param {string} testId - test id for ui tests
    * @example
    * CountlyHelpers.confirm("Are you sure?", "red", function (result) {
    *    if (!result) {
    *        //user did not confirm, just exit
    *        return true;
    *    }
    *    //user confirmed, do what you need to do
    * });
    */
    CountlyHelpers.confirm = function(msg, type, callback, buttonText, moreData, testId = 'cly-confirm-test-id') {
        if (countlyGlobal.ssr) {
            return;
        }

        if (window.countlyVue && window.countlyVue.vuex) {

            var cancelLabel = countlyVue.i18n('common.cancel'),
                confirmLabel = countlyVue.i18n('common.continue'),
                convertedType = "danger", // Default type is "danger"
                showClose = moreData && moreData.showClose !== false,
                alignCenter = moreData && moreData.alignCenter !== false;

            if (buttonText && buttonText.length === 2) {
                cancelLabel = buttonText[0];
                confirmLabel = buttonText[1];
            }

            if (type === "popStyleGreen") {
                convertedType = "success";
            }
            // Default type is "danger"
            // else if (type === "red") {
            //     convertedType = "danger";
            // }

            var payload = {
                intent: 'confirm',
                message: countlyCommon.encodeSomeHtml(msg),
                type: convertedType,
                confirmLabel: confirmLabel,
                cancelLabel: cancelLabel,
                title: moreData && moreData.title,
                image: moreData && moreData.image,
                showClose: showClose,
                alignCenter: alignCenter,
                callback: callback,
                testId: testId
            };

            var currentStore = window.countlyVue.vuex.getGlobalStore();
            if (currentStore) {
                currentStore.dispatch('countlyCommon/onAddDialog', payload);
            }
        }
    };

    /**
    * Display modal popup that blocks the screen and cannot be closed
    * @param {string} msg - message to display in popup
    * @param {object} moreData - more data to display
    * @param {string} moreData.title - alert title
    * @example
    * CountlyHelpers.showBlockerDialog("Some message");
    */
    CountlyHelpers.showBlockerDialog = function(msg, moreData) {
        if (countlyGlobal.ssr) {
            return;
        }

        if (window.countlyVue && window.countlyVue.vuex) {
            var payload = {
                intent: "blocker",
                message: msg,
                title: (moreData && moreData.title) || "",
                width: (moreData && moreData.width) || "400px",
            };

            var currentStore = window.countlyVue.vuex.getGlobalStore();
            if (currentStore) {
                currentStore.dispatch('countlyCommon/onAddDialog', payload);
            }
        }
    };

    /**
    * Display modal popup that shows quickstart guide
    * @param {string} content - modal popup content
    * @example
    * CountlyHelpers.showQuickstartDialog();
    */
    CountlyHelpers.showQuickstartPopover = function(content) {
        if (countlyGlobal.ssr) {
            return;
        }

        if (window.countlyVue && window.countlyVue.vuex) {
            var payload = {
                intent: "quickstart",
                message: content,
                width: "314",
            };

            var currentStore = window.countlyVue.vuex.getGlobalStore();
            if (currentStore) {
                currentStore.dispatch('countlyCommon/onAddDialog', payload);
            }
        }
    };

    /**
    * Check the value which passing as parameter
    * isJSON or not
    * return result as boolean
    * @param {object} val - value of form data
    * @returns {boolean} is this a json object?
    * @example
    * CountlyHelpers.isJSON(variable);
    */
    CountlyHelpers.isJSON = function(val) {
        try {
            JSON.parse(val);
            return true;
        }
        catch (notJSONError) {
            return false;
        }
    };

    CountlyHelpers.displayExportStatus = function(error, export_id, task_id) {
        if (error) {
            CountlyHelpers.alert(error, "red");
        }
        else if (export_id) {
            CountlyHelpers.notify({
                type: "ok",
                title: jQuery.i18n.map["common.success"],
                message: jQuery.i18n.map["export.export-finished"],
                info: jQuery.i18n.map["app-users.export-finished-click"],
                sticky: false,
                clearAll: true,
                onClick: function() {
                    var win = window.open(countlyCommon.API_PARTS.data.r + "/export/download/" + task_id + "?auth_token=" + countlyGlobal.auth_token + "&app_id=" + countlyCommon.ACTIVE_APP_ID, '_blank');
                    win.focus();
                }
            });
            self.refresh();
        }
        else if (task_id) {
            CountlyHelpers.notify({type: "ok", title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["export.export-started"], sticky: false, clearAll: false});
            // self.refresh();
        }
        else {
            CountlyHelpers.alert(jQuery.i18n.map["export.export-failed"], "red");
        }
    };

    /**
    * Convert array of app ids to comma separate string of app names
    * @param {array} context - array with app ids
    * @returns {string} list of app names (appname1, appname2)
    * @example
    * //outputs Test1, Test2, Test3
    * CountlyHelpers.appIdsToNames(["586e3216326a8b0a07b8d87f", "586e339a326a8b0a07b8ecb9", "586e3343c32cb30a01558cc3"]);
    */
    CountlyHelpers.appIdsToNames = function(context) {
        var ret = "";

        for (var i = 0; i < context.length; i++) {
            if (!context[i]) {
                continue;
            }
            else if (!countlyGlobal.apps[context[i]]) {
                ret += 'deleted app';
            }
            else {
                ret += countlyGlobal.apps[context[i]].name;
            }

            if (context.length > 1 && i !== context.length - 1) {
                ret += ", ";
            }
        }

        return ret;
    };

    /**
    * Load JS file
    * @param {string} js - path or url to js file
    * @param {callback=} callback - callback when file loaded
    * @example
    * CountlyHelpers.loadJS("/myplugin/javascripts/custom.js");
    */
    CountlyHelpers.loadJS = function(js, callback) {
        var fileref = document.createElement('script'),
            loaded;
        fileref.setAttribute("type", "text/javascript");
        fileref.setAttribute("src", js);
        if (callback) {
            fileref.onreadystatechange = fileref.onload = function() {
                if (!loaded) {
                    callback();
                }
                loaded = true;
            };
        }
        document.getElementsByTagName("head")[0].appendChild(fileref);
    };

    /**
    * Load CSS file
    * @param {string} css - path or url to css file
    * @param {callback=} callback - callback when file loaded
    * @example
    * CountlyHelpers.loadCSS("/myplugin/stylesheets/custom.css");
    */
    CountlyHelpers.loadCSS = function(css, callback) {
        var fileref = document.createElement("link"),
            loaded;
        fileref.setAttribute("rel", "stylesheet");
        fileref.setAttribute("type", "text/css");
        fileref.setAttribute("href", css);
        if (callback) {
            fileref.onreadystatechange = fileref.onload = function() {
                if (!loaded) {
                    callback();
                }
                loaded = true;
            };
        }
        document.getElementsByTagName("head")[0].appendChild(fileref);
    };

    CountlyHelpers.messageText = function(messagePerLocale) {
        if (!messagePerLocale) {
            return '';
        }
        else if (messagePerLocale.default) {
            return messagePerLocale.default;
        }
        else if (messagePerLocale.en) {
            return messagePerLocale.en;
        }
        else {
            for (var locale in messagePerLocale) {
                return messagePerLocale[locale];
            }
        }
        return '';
    };

    /**
    * Create Countly metric model to fetch metric data from server and provide it to views
    * @param {object} countlyMetric - initial metric object if you want to pre provide some methods, etc
    * @param {string} metric - metric name to retrieve from server
    * @param {jquery} $ - local jquery reference
    * @param {function=} fetchValue - default function to fetch and transform if needed value from standard metric model
    * @example
    *   window.countlyDensity = {};
    *   countlyDensity.checkOS = function(os, density){
    *        var lastIndex = density.toUpperCase().lastIndexOf("DPI");
    *        if(os.toLowerCase() == "android" && lastIndex !== -1 && lastIndex === density.length - 3)
    *            return true;
    *        if(os.toLowerCase() == "ios" && density[0] == "@")
    *            return true;
    *        return false;
    *   };
    *   CountlyHelpers.createMetricModel(window.countlyDensity, {name: "density", estOverrideMetric: "densities"}, jQuery, function(val, data, separate){
    *        if(separate){
    *            //request separated/unprocessed data
    *            return val;
    *        }
    *        else{
    *            //we can preprocess data and group, for example, by first letter
    *            return val[0];
    *        }
    *   });
    */
    CountlyHelpers.createMetricModel = function(countlyMetric, metric, $, fetchValue) {
        /**
        * Common metric object, all metric models inherit from it and should have these methods
        * @name countlyMetric
        * @global
        * @namespace countlyMetric
        */
        countlyMetric = countlyMetric || {};
        /**
        * Function to get value, modifying it before processing if needed.
        * @memberof countlyMetric
        * @param {string} value - value to fetch
        * @returns {string} modified value
        */
        countlyMetric.fetchValue = fetchValue;
        //Private Properties
        var _Db = {},
            _metrics = {},
            _activeAppKey = 0,
            _initialized = false,
            _processed = false,
            _period = null,
            _name = (metric.name) ? metric.name : metric,
            _estOverrideMetric = (metric.estOverrideMetric) ? metric.estOverrideMetric : "";
        var _promises = {};


        countlyMetric.getCurrentLoadState = function() {
            return {"init": _initialized, "period": _period};
        };
        //Public Methods
        /**
        * Initialize metric model to fetch initial data from server
        * @memberof countlyMetric
        * @param {boolean=} processed - if true will fetch processed data, will fetch raw data by default
        * @returns {jquery_promise} jquery promise to wait while data is loaded
        * @example
        * beforeRender: function() {
        *    return $.when(countlyMetric.initialize()).then(function () {});
        * }
        */
        countlyMetric.initialize = function(processed) {

            var periodToFetch = countlyCommon.getPeriodForAjax();

            var key = countlyCommon.ACTIVE_APP_ID + "-" + _name + "-" + periodToFetch;
            var key_refresh = countlyCommon.ACTIVE_APP_ID + "-" + _name + "-refresh";
            if (_promises[key]) {
                return _promises[key]; //we are currently running request for that. So return that.
            }
            else if (_promises[key_refresh]) {
                return _promises[key_refresh];
            }
            if (_initialized && _period === periodToFetch && _activeAppKey === countlyCommon.ACTIVE_APP_KEY) {
                return this.refresh();
            }
            _period = countlyCommon.getPeriodForAjax();

            if (!countlyCommon.DEBUG) {
                _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
                _initialized = true;

                if (processed) {
                    _processed = true;
                    return $.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.data.r + "/analytics/metric",
                        data: {
                            "app_id": countlyCommon.ACTIVE_APP_ID,
                            "metric": _name,
                            "period": _period
                        },
                        success: function(json) {
                            _Db = json;
                            if (countlyMetric.callback) {
                                countlyMetric.callback(false, json);
                            }
                        }
                    });
                }
                else {

                    _promises[key] = $.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.data.r,
                        data: {
                            "app_id": countlyCommon.ACTIVE_APP_ID,
                            "method": _name,
                            "period": _period
                        },
                        success: function(json) {
                            _Db = json;
                            setMeta();
                            if (countlyMetric.callback) {
                                countlyMetric.callback(false, json);
                            }
                            delete _promises[key];
                        },
                        error: function() {
                            delete _promises[key];
                        }
                    });

                    return _promises[key];
                }
            }
            else {
                _Db = {"2012": {}};
                if (countlyMetric.callback) {
                    countlyMetric.callback(false, _Db);
                }
                return true;
            }
        };

        /**
        * Refresh metric model by fetching data only for the latest time bucket using action=refresh on server. Currently does not fetch data for processed data loaded on initialization
        * @memberof countlyMetric
        * @returns {jquery_promise} jquery promise to wait while data is loaded
        * @example
        *$.when(countlyMetric.refresh()).then(function () {
        *    //data loaded, do something
        *});
        */
        countlyMetric.refresh = function() {
            if (!countlyCommon.DEBUG) {

                if (_activeAppKey !== countlyCommon.ACTIVE_APP_KEY) {
                    _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
                    return this.initialize();
                }

                if (_processed) {
                    if (countlyMetric.callback) {
                        countlyMetric.callback(true);
                    }
                }
                else {
                    var key = countlyCommon.ACTIVE_APP_ID + "-" + _name + "-refresh";
                    if (_promises[key]) {
                        return _promises[key]; //we are currently running request for that. So return that.
                    }
                    _promises[key] = $.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.data.r,
                        data: {
                            "app_id": countlyCommon.ACTIVE_APP_ID,
                            "method": _name,
                            "action": "refresh"
                        },
                        success: function(json) {
                            countlyCommon.extendDbObj(_Db, json);
                            extendMeta();
                            if (countlyMetric.callback) {
                                countlyMetric.callback(true, json);
                            }
                            delete _promises[key];
                        },
                        error: function() {
                            delete _promises[key];
                        }
                    });

                    return _promises[key];
                }
            }
            else {
                _Db = {"2012": {}};
                if (countlyMetric.callback) {
                    countlyMetric.callback(true, _Db);
                }
                return true;
            }
        };

        /**
        * Callback that each metric model can define, to be called when data is loaded or refreshed
        * @memberof countlyMetric
        * @example
        *countlyDeviceDetails.callback = function(isRefresh, data){
        *    if(isRefresh){
        *        countlyAppVersion.refresh(data);
        *    }
        *    else{
        *        countlyAppVersion.initialize();
        *    }
        *};
        */
        countlyMetric.callback;

        /**
        * Reset/delete all retrieved metric data, like when changing app or selected time period
        * @memberof countlyMetric
        */
        countlyMetric.reset = function() {
            if (_processed) {
                _Db = [];
            }
            else {
                _Db = {};
                setMeta();
            }
        };

        /**
        * Get current data, if some view or model requires access to raw data
        * @memberof countlyMetric
        * @return {object} raw data returned from server either in standard metric model or preprocessed data, based on what model uses
        */
        countlyMetric.getDb = function() {
            return _Db;
        };

        /**
        * Set current data for model, if you need to provide data for model from another resource (as loaded in different model)
        * @memberof countlyMetric
        * @param {object} db - set new data to be used by model
        */
        countlyMetric.setDb = function(db) {
            _Db = db;
            setMeta();
        };

        /**
        * Extend current data for model with some additional information about latest period (like data from action=refresh request)
        * @memberof countlyMetric
        * @param {object} data - set new data to be used by model
        */
        countlyMetric.extendDb = function(data) {
            countlyCommon.extendDbObj(_Db, data);
            extendMeta();
        };

        /**
        * Get array of unique segments available for metric data
        * @memberof countlyMetric
        * @param {string} metric1 - name of the segment/metric to get meta for, by default will use default _name provided on initialization
        * @returns {array} array of unique metric values
        */
        countlyMetric.getMeta = function(metric1) {
            metric1 = metric1 || _name;
            return _metrics[metric1] || [];
        };

        /**
        * Get data after initialize finished and data was retrieved
        * @memberof countlyMetric
        * @param {boolean} clean - should retrieve clean data or preprocessed by fetchValue function
        * @param {boolean} join - join new and total users into single graph, for example to dispaly in bars on the same graph and not 2 separate pie charts
        * @param {string} metric1 - name of the segment/metric to get data for, by default will use default _name provided on initialization
        * @param {string} estOverrideMetric - name of the total users estimation override, by default will use default _estOverrideMetric provided on initialization
        * @returns {object} chartData
        * @example <caption>Example output of separate data for 2 pie charts</caption>
        *{"chartData":[
        *    {"langs":"English","t":124,"u":112,"n":50},
        *    {"langs":"Italian","t":83,"u":74,"n":30},
        *    {"langs":"German","t":72,"u":67,"n":26},
        *    {"langs":"Japanese","t":62,"u":61,"n":19},
        *    {"langs":"French","t":66,"u":60,"n":28},
        *    {"langs":"Korean","t":64,"u":58,"n":26}
        *],
        *"chartDPTotal":{
        *    "dp":[
        *        {"data":[[0,124]],"label":"English"},
        *        {"data":[[0,83]],"label":"Italian"},
        *        {"data":[[0,72]],"label":"German"},
        *        {"data":[[0,62]],"label":"Japanese"},
        *        {"data":[[0,66]],"label":"French"},
        *        {"data":[[0,64]],"label":"Korean"}
        *    ]
        *},
        *"chartDPNew":{
        *    "dp":[
        *        {"data":[[0,50]],"label":"English"},
        *        {"data":[[0,30]],"label":"Italian"},
        *        {"data":[[0,26]],"label":"German"},
        *        {"data":[[0,19]],"label":"Japanese"},
        *        {"data":[[0,28]],"label":"French"},
        *        {"data":[[0,26]],"label":"Korean"}
        *    ]
        *}}
        * @example <caption>Example output of joined data for 1 bar chart</caption>
        *{"chartData":[
        *    {"langs":"English","t":124,"u":112,"n":50},
        *    {"langs":"Italian","t":83,"u":74,"n":30},
        *    {"langs":"German","t":72,"u":67,"n":26},
        *    {"langs":"Japanese","t":62,"u":61,"n":19},
        *    {"langs":"French","t":66,"u":60,"n":28},
        *    {"langs":"Korean","t":64,"u":58,"n":26}
        *],
        *"chartDP":{
        *    "dp":[
        *        {"data":[[-1,null],[0,124],[1,83],[2,72],[3,62],[4,66],[5,64],[6,null]],"label":"Total Sessions"},
        *        {"data":[[-1,null],[0,50],[1,30],[2,26],[3,19],[4,28],[5,26],[6,null]],"label":"New Users"}
        *    ],
        *   "ticks":[
        *        [-1,""], //used for padding for bars
        *        [23,""], //used for padding for bars
        *        [0,"English"],
        *        [1,"Italian"],
        *        [2,"German"],
        *        [3,"Japanese"],
        *        [4,"French"],
        *        [5,"Korean"]
        *    ]
        *}}
        */
        countlyMetric.getData = function(clean, join, metric1, estOverrideMetric) {
            var chartData = {};
            var i = 0;
            if (_processed) {
                chartData.chartData = [];
                var data = JSON.parse(JSON.stringify(_Db));
                for (i = 0; i < _Db.length; i++) {
                    if (fetchValue && !clean) {
                        data[i][metric1 || _name] = fetchValue(countlyCommon.decode(data[i]._id));
                    }
                    else {
                        data[i][metric1 || _name] = countlyCommon.decode(data[i]._id);
                    }
                    chartData.chartData[i] = data[i];
                }
            }
            else {
                chartData = countlyCommon.extractTwoLevelData(_Db, this.getMeta(metric1), this.clearObject, [
                    {
                        name: metric1 || _name,
                        func: function(rangeArr) {
                            rangeArr = countlyCommon.decode(rangeArr);
                            if (fetchValue && !clean) {
                                return fetchValue(rangeArr);
                            }
                            else {
                                return rangeArr;
                            }
                        }
                    },
                    { "name": "t" },
                    { "name": "u" },
                    { "name": "n" }
                ], estOverrideMetric || _estOverrideMetric);
            }
            chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, metric1 || _name);
            chartData.chartData.sort(function(a, b) {
                return b.t - a.t;
            });
            var namesData = _.pluck(chartData.chartData, metric1 || _name),
                totalData = _.pluck(chartData.chartData, 't'),
                newData = _.pluck(chartData.chartData, 'n');

            if (join) {
                chartData.chartDP = {ticks: []};
                var chartDP = [
                    {data: [], label: jQuery.i18n.map["common.table.total-sessions"]},
                    {data: [], label: jQuery.i18n.map["common.table.new-users"]}
                ];

                chartDP[0].data[0] = [-1, null];
                chartDP[0].data[namesData.length + 1] = [namesData.length, null];
                chartDP[1].data[0] = [-1, null];
                chartDP[1].data[namesData.length + 1] = [namesData.length, null];

                chartData.chartDP.ticks.push([-1, ""]);
                chartData.chartDP.ticks.push([namesData.length, ""]);

                for (i = 0; i < namesData.length; i++) {
                    chartDP[0].data[i + 1] = [i, totalData[i]];
                    chartDP[1].data[i + 1] = [i, newData[i]];
                    chartData.chartDP.ticks.push([i, namesData[i]]);
                }

                chartData.chartDP.dp = chartDP;
            }
            else {
                var chartData2 = [],
                    chartData3 = [];

                for (i = 0; i < namesData.length; i++) {
                    chartData2[i] = {
                        data: [
                            [0, totalData[i]]
                        ],
                        label: namesData[i]
                    };
                }

                for (i = 0; i < namesData.length; i++) {
                    chartData3[i] = {
                        data: [
                            [0, newData[i]]
                        ],
                        label: namesData[i]
                    };
                }

                chartData.chartDPTotal = {};
                chartData.chartDPTotal.dp = chartData2;

                chartData.chartDPNew = {};
                chartData.chartDPNew.dp = chartData3;
            }
            return chartData;
        };

        /**
        * Prefill all expected properties as u, t, n with 0, to avoid null values in the result, if they don't exist, which won't work when drawing graphs
        * @memberof countlyMetric
        * @param {object} obj - oject to prefill with  values if they don't exist
        * @returns {object} prefilled object
        */
        countlyMetric.clearObject = function(obj) {
            if (obj) {
                if (!obj.t) {
                    obj.t = 0;
                }
                if (!obj.n) {
                    obj.n = 0;
                }
                if (!obj.u) {
                    obj.u = 0;
                }
            }
            else {
                obj = {"t": 0, "n": 0, "u": 0};
            }

            return obj;
        };

        /**
        * Get bar data for metric with percentages of total
        * @memberof countlyMetric
        * @param {string} segment - name of the segment/metric to get data for, by default will use default _name provided on initialization
        * @param {string} mtric - name of the metric to use ordering and returning
        * @param {string} estOverrideMetric - name of the total users estimation override, by default will use default _estOverrideMetric provided on initialization
        * @returns {array} object to use when displaying bars as [{"name":"English","percent":44},{"name":"Italian","percent":29},{"name":"German","percent":27}]
        */
        countlyMetric.getBarsWPercentageOfTotal = function(segment, mtric, estOverrideMetric) {
            mtric = mtric || "t";
            if (_processed) {
                var rangeData = {};
                rangeData.chartData = [];
                var data = JSON.parse(JSON.stringify(_Db));
                for (var i = 0; i < _Db.length; i++) {
                    if (fetchValue) {
                        data[i].range = fetchValue(countlyCommon.decode(data[i]._id));
                    }
                    else {
                        data[i].range = countlyCommon.decode(data[i]._id);
                    }
                    rangeData.chartData[i] = data[i];
                }

                return countlyCommon.calculateBarDataWPercentageOfTotal(rangeData, mtric, this.fixBarSegmentData ? this.fixBarSegmentData.bind(null, segment) : undefined);
            }
            else {
                return countlyCommon.extractBarDataWPercentageOfTotal(_Db, this.getMeta(segment), this.clearObject, fetchValue, mtric, estOverrideMetric, this.fixBarSegmentData ? this.fixBarSegmentData.bind(null, segment) : undefined);
            }
        };

        /**
        * Get bar data for metric
        * @memberof countlyMetric
        * @param {string} metric_pd - name of the segment/metric to get data for, by default will use default _name provided on initialization
        * @returns {array} object to use when displaying bars as [{"name":"English","percent":44},{"name":"Italian","percent":29},{"name":"German","percent":27}]
        */
        countlyMetric.getBars = function(metric_pd) {
            if (_processed) {
                var rangeData = {};
                rangeData.chartData = [];
                var data = JSON.parse(JSON.stringify(_Db));
                for (var i = 0; i < _Db.length; i++) {
                    if (fetchValue) {
                        data[i].range = fetchValue(countlyCommon.decode(data[i]._id));
                    }
                    else {
                        data[i].range = countlyCommon.decode(data[i]._id);
                    }
                    rangeData.chartData[i] = data[i];
                }
                return countlyCommon.calculateBarData(rangeData);
            }
            else {
                return countlyCommon.extractBarData(_Db, this.getMeta(metric_pd), this.clearObject, fetchValue);
            }
        };

        /**
        * If this metric's data should be segmented by OS (which means be prefixed by first os letter on server side), you can get OS segmented data
        * @memberof countlyMetric
        * @param {string} os - os name for which to get segmented metrics data
        * @param {boolean} clean - should retrieve clean data or preprocessed by fetchValue function
        * @param {string} metric_pd - name of the segment/metric to get data for, by default will use default _name provided on initialization
        * @param {string} estOverrideMetric - name of the total users estimation override, by default will use default _estOverrideMetric provided on initialization
        * @returns {object} os segmented metric object
        * @example <caption>Example output</caption>
        * //call
        * //countlyMetric.getOSSegmentedData("wp")
        * //data for Windows Phone segment
        *{"chartData":[
        *    {"density":"2.0","t":18,"u":18,"n":9},
        *    {"density":"3.4","t":13,"u":12,"n":5},
        *    {"density":"1.2","t":11,"u":10,"n":5},
        *    {"density":"3.5","t":10,"u":10,"n":4},
        *    {"density":"3.3","t":9,"u":9,"n":3}
        *],
        *"chartDP":{
        *    "dp":[
        *        {"data":[[0,53]],"label":"2.0"},
        *        {"data":[[0,49]],"label":"3.4"},
        *        {"data":[[0,46]],"label":"1.2"},
        *        {"data":[[0,36]],"label":"3.5"},
        *        {"data":[[0,32]],"label":"3.3"}
        *    ]
        *},
        * //list of all os segments
        *"os":[
        *   {"name":"Windows Phone","class":"windows phone"},
        *    {"name":"Android","class":"android"},
        *    {"name":"iOS","class":"ios"}
        *]}
        */
        countlyMetric.getOSSegmentedData = function(os, clean, metric_pd, estOverrideMetric) {
            var _os = countlyDeviceDetails.getPlatforms();
            var oSVersionData = {};
            var i = 0;
            if (_processed) {
                oSVersionData.chartData = [];
                var data = JSON.parse(JSON.stringify(_Db));
                for (i = 0; i < _Db.length; i++) {
                    if (fetchValue && !clean) {
                        data[i][metric_pd || _name] = fetchValue(countlyCommon.decode(data[i]._id));
                    }
                    else {
                        data[i][metric_pd || _name] = countlyCommon.decode(data[i]._id);
                    }
                    oSVersionData.chartData[i] = data[i];
                }
            }
            else {
                oSVersionData = countlyCommon.extractTwoLevelData(_Db, this.getMeta(metric_pd), this.clearObject, [
                    {
                        name: metric_pd || _name,
                        func: function(rangeArr) {
                            rangeArr = countlyCommon.decode(rangeArr);
                            if (fetchValue && !clean) {
                                return fetchValue(rangeArr);
                            }
                            else {
                                return rangeArr;
                            }
                        }
                    },
                    { "name": "t" },
                    { "name": "u" },
                    { "name": "n" }
                ], estOverrideMetric || _estOverrideMetric);
            }

            os = ((os) ? os : ((_os) ? _os[0] : null));

            var chartData2 = [];
            var osSegmentation = os;
            oSVersionData = countlyDeviceDetails.eliminateOSVersion(oSVersionData, osSegmentation, metric_pd || _name, false);

            var platformVersionTotal = _.pluck(oSVersionData.chartData, 'u');
            oSVersionData.chartData = _.compact(oSVersionData.chartData);
            platformVersionTotal = _.without(platformVersionTotal, false, null, "", undefined, NaN);

            var platformVersionNames = _.pluck(oSVersionData.chartData, metric_pd || _name);

            for (i = 0; i < platformVersionNames.length; i++) {
                chartData2[chartData2.length] = {
                    data: [
                        [0, platformVersionTotal[i]]
                    ],
                    label: platformVersionNames[i].replace(((countlyDeviceDetails.os_mapping[osSegmentation.toLowerCase()]) ? countlyDeviceDetails.os_mapping[osSegmentation.toLowerCase()].name : osSegmentation) + " ", "")
                };
            }

            oSVersionData.chartDP = {};
            oSVersionData.chartDP.dp = chartData2;
            oSVersionData.os = [];

            if (_os && _os.length > 1) {
                for (i = 0; i < _os.length; i++) {
                    //if (_os[i] != osSegmentation) {
                    //    continue;
                    //}

                    oSVersionData.os.push({
                        "name": _os[i],
                        "class": _os[i].toLowerCase()
                    });
                }
            }

            return oSVersionData;
        };

        /** Get range data which is usually stored in some time ranges/buckets. As example is loyalty, session duration and session frequency
        * @memberof countlyMetric
        * @param {string} metric_pd - name of the property in the model to fetch
        * @param {string} meta - name of the meta where property's ranges are stored
        * @param {string} explain - function that receives index of the bucket and returns bucket name
        * @param {array} order - list of keys ordered in preferred order(to return in same order)
        * @returns {object} data
        * @example <caption>Example output</caption>
        * //call
        * //countlyMetric.getRangeData("f", "f-ranges", countlySession.explainFrequencyRange);
        * //returns
        * {"chartData":[
        *    {"f":"First session","t":271,"percent":"<div class='percent-bar' style='width:171px;'></div>85.5%"},
        *    {"f":"2 days","t":46,"percent":"<div class='percent-bar' style='width:29px;'></div>14.5%"}
        *  ],
        *  "chartDP":{
        *      "dp":[
        *        {"data":[[-1,null],[0,271],[1,46],[2,null]]}
        *      ],
        *      "ticks":[
        *        [-1,""],
        *        [2,""],
        *        [0,"First session"],
        *        [1,"2 days"]
        *      ]
        *   }
        *  }
        **/
        countlyMetric.getRangeData = function(metric_pd, meta, explain, order) {

            var chartData = {chartData: {}, chartDP: {dp: [], ticks: []}};

            chartData.chartData = countlyCommon.extractRangeData(_Db, metric_pd, this.getMeta(meta), explain, order);

            var frequencies = _.pluck(chartData.chartData, metric_pd),
                frequencyTotals = _.pluck(chartData.chartData, "t"),
                chartDP = [
                    {data: []}
                ];

            chartDP[0].data[0] = [-1, null];
            chartDP[0].data[frequencies.length + 1] = [frequencies.length, null];

            chartData.chartDP.ticks.push([-1, ""]);
            chartData.chartDP.ticks.push([frequencies.length, ""]);
            var i = 0;
            for (i = 0; i < frequencies.length; i++) {
                chartDP[0].data[i + 1] = [i, frequencyTotals[i]];
                chartData.chartDP.ticks.push([i, frequencies[i]]);
            }

            chartData.chartDP.dp = chartDP;

            for (i = 0; i < chartData.chartData.length; i++) {
                //TODO-LA: use only percent property when sessions views are finished
                chartData.chartData[i].percentageNumber = chartData.chartData[i].percent;
                chartData.chartData[i].percent = "<div class='percent-bar' style='width:" + (2 * chartData.chartData[i].percent) + "px;'></div>" + chartData.chartData[i].percent + "%";
            }

            return chartData;
        };
        /** function set meta
        */
        function setMeta() {
            if (_Db.meta) {
                for (var i in _Db.meta) {
                    _metrics[i] = (_Db.meta[i]) ? _Db.meta[i] : [];
                }
            }
            else {
                _metrics = {};
            }
        }
        /** function extend meta
        */
        function extendMeta() {
            if (_Db.meta) {
                for (var i in _Db.meta) {
                    _metrics[i] = countlyCommon.union(_metrics[i], _Db.meta[i]);
                }
            }
        }

    };

    /**
     * Shuffle string using crypto.getRandomValues
     * @param {string} text - text to be shuffled
     * @returns {string} shuffled password
     */
    CountlyHelpers.shuffleString = function(text) {
        var j, x, i;
        for (i = text.length; i; i--) {
            j = Math.floor(Math.random() * i);
            x = text[i - 1];
            text[i - 1] = text[j];
            text[j] = x;
        }

        return text.join("");

    };
    /**
     * Gets a random string from given character set string with given length
     * @param {string} charSet - charSet string
     * @param {number} length - length of the random string. default 1 
     * @returns {string} random string from charset
     */
    CountlyHelpers.getRandomValue = function(charSet, length = 1) {
        const randomValues = crypto.getRandomValues(new Uint8Array(charSet.length));
        let randomValue = "";

        if (length > charSet.length) {
            length = charSet.length;
        }

        for (let i = 0; i < length; i++) {
            randomValue += charSet[randomValues[i] % charSet.length];
        }

        return randomValue;
    };

    /**
    * Generate random password
    * @param {number} length - length of the password
    * @param {boolean} no_special - do not include special characters
    * @returns {string} password
    * @example
    * //outputs 4UBHvRBG1v
    * CountlyHelpers.generatePassword(10, true);
    */
    CountlyHelpers.generatePassword = function(length, no_special) {
        var text = [];
        var chars = "abcdefghijklmnopqrstuvwxyz";
        var upchars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        var numbers = "0123456789";
        var specials = '!@#$%^&*()_+{}:"<>?|[];\',./`~';
        var all = chars + upchars + numbers;
        if (!no_special) {
            all += specials;
        }

        //1 char
        text.push(this.getRandomValue(upchars));
        //1 number
        text.push(this.getRandomValue(numbers));
        //1 special char
        if (!no_special) {
            text.push(this.getRandomValue(specials));
            length--;
        }

        //5 any chars
        text.push(this.getRandomValue(all, Math.max(length - 2, 5)));

        //randomize order
        return this.shuffleString(text);
    };

    /**
    * Validate email address
    * @param {string} email - email address to validate
    * @returns {boolean} true if valid and false if invalid
    * @example
    * //outputs true
    * CountlyHelpers.validateEmail("test@test.test");
    *
    * //outputs false
    * CountlyHelpers.validateEmail("test@test");
    */
    CountlyHelpers.validateEmail = function(email) {
        var re = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
        return re.test(email);
    };

    /**
    * Validate password based on settings provided via security configuration
    * @param {string} password - password to validate
    * @returns {boolean} true if valid and false if invalid
    */
    CountlyHelpers.validatePassword = function(password) {
        if (password.length < countlyGlobal.security.password_min) {
            return jQuery.i18n.prop("management-users.password.length", countlyGlobal.security.password_min);
        }
        if (countlyGlobal.security.password_char && !/[A-Z]/.test(password)) {
            return jQuery.i18n.map["management-users.password.has-char"];
        }
        if (countlyGlobal.security.password_number && !/\d/.test(password)) {
            return jQuery.i18n.map["management-users.password.has-number"];
        }
        if (countlyGlobal.security.password_symbol && !/[^A-Za-z\d]/.test(password)) {
            return jQuery.i18n.map["management-users.password.has-special"];
        }
        return false;
    };

    /**
    * Get currently selected period that can be used in ajax requests
    * @memberof CountlyHelpers
    * @param {string} period selected date period    
    * @returns {string} supported values are (month, 60days, 30days, 7days, yesterday, hour or [startMiliseconds, endMiliseconds] as [1417730400000,1420149600000])
    */
    CountlyHelpers.getPeriodUrlQueryParameter = function(period) {
        if (Object.prototype.toString.call(period) === '[object Array]') {
            return JSON.stringify(period);
        }
        else {
            return period;
        }
    };
    /**
    * Format number to percentage value
    * @memberof CountlyHelpers
    * @param {number} value number to be converted to percentage    
    * @param {number} decimalPlaces number of decimal places to keep for percentage, default is two
    * @returns {number} percentage number for given value. Otherwise, returns 0 for falsy or non number values
    */
    CountlyHelpers.formatPercentage = function(value, decimalPlaces) {
        if (isNaN(value) || !value) {
            return 0;
        }
        if (!decimalPlaces) {
            decimalPlaces = 2;
        }
        return parseFloat((Math.round(value * 100)).toFixed(decimalPlaces));
    };

    /*
     * Function that returns difference between two arrays
     * @param {Array} a1 - first array
     * @param {Array} a2 - second array
     */
    CountlyHelpers.arrayDiff = function(a1, a2) {
        var a = [], diff = [];

        for (var i1 = 0; i1 < a1.length; i1++) {
            a[a1[i1]] = true;
        }

        for (var i2 = 0; i2 < a2.length; i2++) {
            if (a[a2[i2]]) {
                delete a[a2[i2]];
            }
            else {
                a[a2[i2]] = true;
            }
        }

        for (var k in a) {
            diff.push(k);
        }

        return diff;
    };

    /*
     * Function that returns difference between two arrays
     * @param {*} item - item
     * @param {Array} array - array
     */
    CountlyHelpers.removeItemFromArray = function(item, array) {
        var index = array.indexOf(item);
        if (index > -1) {
            array.splice(index, 1);
        }
        return array;
    };

    /**
     * Function that clean duplicates from passed array.
     * @param {Array} array - array
     * @return {Array} - array without duplicates
     */
    CountlyHelpers.arrayUnique = function(array) {
        var a = array.concat();
        for (var i = 0; i < a.length; ++i) {
            for (var j = i + 1; j < a.length; ++j) {
                if (a[i] === a[j]) {
                    a.splice(j--, 1);
                }
            }
        }
        return a;
    };

    /**
     * Function that remove empty values from array.
     * @param {array} array - array that contain empty values
     * @return {array} - array without empty values
     */
    CountlyHelpers.removeEmptyValues = function(array) {
        for (var i = array.length - 1; i >= 0; i--) {
            if (array[i] === "") {
                array.splice(i, 1);
            }
        }
        return array;
    };

    /**
     * Function that creates a shallow copy of an object excluding specified fields.
     * Warning: If no excluded fields specified, returns the original reference
     * @param {Object} obj Main object
     * @param {Array} excluded Array of excluded fields
     * @returns {Object} Shallow copy (If no excluded fields, the original reference)
     */
    CountlyHelpers.objectWithoutProperties = function(obj, excluded) {
        if (!obj || !excluded || excluded.length === 0) {
            return obj;
        }
        return Object.keys(obj).reduce(function(acc, val) {
            if (excluded.indexOf(val) === -1) {
                acc[val] = obj[val];
            }
            return acc;
        }, {});
    };

    /** function sha1
    * @param {string} str - string to encode
    * @returns {string} encoded sring
    */
    CountlyHelpers.sha1 = function(str) {
        //  discuss at: http://phpjs.org/functions/sha1/
        // original by: Webtoolkit.info (http://www.webtoolkit.info/)
        // improved by: Michael White (http://getsprink.com)
        // improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        //    input by: Brett Zamir (http://brett-zamir.me)
        //  depends on: utf8_encode
        //   example 1: sha1('Kevin van Zonneveld');
        //   returns 1: '54916d2e62f65b3afa6e192e6a601cdbe5cb5897'

        var rotate_left = function(n, s) {
            var t4 = (n << s) | (n >>> (32 - s));
            return t4;
        };

        /*var lsb_hex = function (val) { // Not in use; needed?
        var str="";
        var i;
        var vh;
        var vl;

        for ( i=0; i<=6; i+=2 ) {
        vh = (val>>>(i*4+4))&0x0f;
        vl = (val>>>(i*4))&0x0f;
        str += vh.toString(16) + vl.toString(16);
        }
        return str;
    };*/

        var cvt_hex = function(val) {
            var str1 = '';
            var i;
            var v;

            for (i = 7; i >= 0; i--) {
                v = (val >>> (i * 4)) & 0x0f;
                str1 += v.toString(16);
            }
            return str1;
        };

        var blockstart;
        var i, j;
        var W = new Array(80);
        var H0 = 0x67452301;
        var H1 = 0xEFCDAB89;
        var H2 = 0x98BADCFE;
        var H3 = 0x10325476;
        var H4 = 0xC3D2E1F0;
        var A, B, C, D, E;
        var temp;

        var str_len = str.length;

        var word_array = [];
        for (i = 0; i < str_len - 3; i += 4) {
            j = str.charCodeAt(i) << 24 | str.charCodeAt(i + 1) << 16 | str.charCodeAt(i + 2) << 8 | str.charCodeAt(i + 3);
            word_array.push(j);
        }

        switch (str_len % 4) {
        case 0:
            i = 0x080000000;
            break;
        case 1:
            i = str.charCodeAt(str_len - 1) << 24 | 0x0800000;
            break;
        case 2:
            i = str.charCodeAt(str_len - 2) << 24 | str.charCodeAt(str_len - 1) << 16 | 0x08000;
            break;
        case 3:
            i = str.charCodeAt(str_len - 3) << 24 | str.charCodeAt(str_len - 2) << 16 | str.charCodeAt(str_len - 1) <<
            8 | 0x80;
            break;
        }

        word_array.push(i);

        while ((word_array.length % 16) !== 14) {
            word_array.push(0);
        }

        word_array.push(str_len >>> 29);
        word_array.push((str_len << 3) & 0x0ffffffff);

        for (blockstart = 0; blockstart < word_array.length; blockstart += 16) {
            for (i = 0; i < 16; i++) {
                W[i] = word_array[blockstart + i];
            }
            for (i = 16; i <= 79; i++) {
                W[i] = rotate_left(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);
            }

            A = H0;
            B = H1;
            C = H2;
            D = H3;
            E = H4;

            for (i = 0; i <= 19; i++) {
                temp = (rotate_left(A, 5) + ((B & C) | (~B & D)) + E + W[i] + 0x5A827999) & 0x0ffffffff;
                E = D;
                D = C;
                C = rotate_left(B, 30);
                B = A;
                A = temp;
            }

            for (i = 20; i <= 39; i++) {
                temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0x0ffffffff;
                E = D;
                D = C;
                C = rotate_left(B, 30);
                B = A;
                A = temp;
            }

            for (i = 40; i <= 59; i++) {
                temp = (rotate_left(A, 5) + ((B & C) | (B & D) | (C & D)) + E + W[i] + 0x8F1BBCDC) & 0x0ffffffff;
                E = D;
                D = C;
                C = rotate_left(B, 30);
                B = A;
                A = temp;
            }

            for (i = 60; i <= 79; i++) {
                temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0x0ffffffff;
                E = D;
                D = C;
                C = rotate_left(B, 30);
                B = A;
                A = temp;
            }

            H0 = (H0 + A) & 0x0ffffffff;
            H1 = (H1 + B) & 0x0ffffffff;
            H2 = (H2 + C) & 0x0ffffffff;
            H3 = (H3 + D) & 0x0ffffffff;
            H4 = (H4 + E) & 0x0ffffffff;
        }

        temp = cvt_hex(H0) + cvt_hex(H1) + cvt_hex(H2) + cvt_hex(H3) + cvt_hex(H4);
        return temp.toLowerCase();
    };

}(window.CountlyHelpers = window.CountlyHelpers || {}));


var Template = function() {
    this.cached = {};
    this.raw = {};
};

/**
* Template loader for loading static resources over jquery
* @name T
* @global
* @namespace T
* @example <caption>Get Handlebar compiled HTML</caption>
*$.when(T.render('/density/templates/density.html', function(src){
*    self.template = src;
*})).then(function () {});
*
* @example <caption>Get raw resources</caption>
*$.when(T.get('/density/templates/density.html', function(src){
*    self.template = Handlebar.compile(src);
*})).then(function () {});
*/
var T = new Template();

$.extend(Template.prototype, {
    /**
     *  Process and return fetched template
     *  @memberof T
     *  @param {string} name - Template path
     *  @param {function} callback - when done
     *  @returns {Promise} ajax promise
     */
    render: function(name, callback) {
        if (T.isCached(name)) {
            if (typeof callback === "function") {
                callback(T.cached[name]);
            }
            return T.cached[name];
        }
        else {
            return $.get(T.urlFor(name), function(raw) {
                T.store(name, raw);
                T.render(name, callback);
            });
        }
    },
    /**
     *  Fetch and return raw template
     *  @memberof T
     *  @param {string} name - Template path
     *  @param {function} callback - when done
     *  @returns {Promise} ajax promise
     */
    get: function(name, callback) {
        if (T.isCached(name)) {
            if (typeof callback === "function") {
                callback(T.raw[name]);
            }
            return T.raw[name];
        }
        else {
            return $.get(T.urlFor(name), function(raw) {
                T.store(name, raw);
                T.get(name, callback);
            });
        }
    },
    /**
     *  Fetch and return raw template in sync
     *  @memberof T
     *  @param {string} name - Template path
     *  @param {function} callback - when done
     */
    renderSync: function(name, callback) {
        if (!T.isCached(name)) {
            T.fetch(name);
        }
        T.render(name, callback);
    },
    /**
     *  Prefetch template
     *  @memberof T
     *  @param {string} name - Template path
     */
    prefetch: function(name) {
        $.get(T.urlFor(name), function(raw) {
            T.store(name, raw);
        });
    },
    /**
     *  Fetch template in sync request
     *  @memberof T
     *  @param {string} name - Template path
     */
    fetch: function(name) {
        // synchronous, for those times when you need it.
        if (!T.isCached(name)) {
            var raw = $.ajax({ 'url': T.urlFor(name), 'async': false }).responseText;
            T.store(name, raw);
        }
    },
    /**
     *  Check if template is cached
     *  @memberof T
     *  @param {string} name - Template path
     *  @returns {boolean} true if template is cached
     */
    isCached: function(name) {
        return !!T.cached[name];
    },
    /**
     *  Store template in cache
     *  @memberof T
     *  @param {string} name - Template path
     *  @param {string} raw - Raw template data
     */
    store: function(name, raw) {
        T.raw[name] = raw;
        T.cached[name] = raw;
    },
    /**
     *  Generate request URL for template
     *  @memberof T
     *  @param {string} name - Template path
     *  @returns {string} URL where to fetch template
     */
    urlFor: function(name) {
        //return "/resources/templates/"+ name + ".handlebars";
        if (countlyGlobal.path && countlyGlobal.path.length && name.indexOf(countlyGlobal.path) !== 0) {
            name = countlyGlobal.path + name;
        }
        return name + "?" + countlyGlobal.countlyVersion;
    }
});
