/*global _, chance, CountlyHelpers, countlyAuth, countlyGlobal, countlyCommon, countlyCohorts, $, jQuery, app, countlyPopulatorHelper*/
(function(countlyPopulator) {
        _device_type: ["console", "mobile", "tablet", "smarttv", "wearable", "embedded", "desktop"],
    var messages = [
        {"demo": 1, "apps": [countlyCommon.ACTIVE_APP_ID], "platforms": ["i", "a"], "tz": false, "auto": false, "type": "message", "messagePerLocale": {"default|t": "💥 Promotion! 💥", "default|0|t": "Get It", "default|1|t": "Cancel", "default|0|l": "theapp://promo/30off", "default|1|l": "theapp://promo/30off/cancel", "de|t": "💥 SALE! 💥", "de|0|t": "OK", "de|0|l": "theapp://promo/30off", "de|1|t": "Stornieren", "de|1|l": "theapp://promo/30off/cancel", "default": "HOT offers with 30% discount, only 6 hours left!", "default|p": {}, "default|tp": {}, "de|tp": {}, "de": "Abonnieren Sie jetzt mit 30% Rabatt, nur noch 6 Stunden!", "de|p": {}}, "locales": [{"value": "default", "title": "Default", "count": 200, "percent": 100}, {"value": "de", "title": "German", "count": 100, "percent": 50}, {"value": "en", "title": "English", "count": 100, "percent": 50}], "sound": "default", "url": "theapp://promo/30off", "source": "dash", "buttons": 2, "media": location.origin + "/images/push/sale.png", "autoOnEntry": false, "autoCohorts": []},
        {"demo": 2, "apps": [countlyCommon.ACTIVE_APP_ID], "platforms": ["i", "a"], "tz": false, "auto": false, "type": "message", "messagePerLocale": {"default|t": "💥 Promotion! 💥", "default|0|t": "Get It", "default|1|t": "Cancel", "default|0|l": "theapp://promo/30off", "default|1|l": "theapp://promo/30off/cancel", "de|t": "💥SALE! 💥", "de|0|t": "OK", "de|0|l": "theapp://promo/30off", "de|1|t": "Stornieren", "de|1|l": "theapp://promo/30off/cancel", "default": "Last chance! Only 3 hours left to get 30% discount!", "default|p": {}, "default|tp": {}, "de|tp": {}, "de": "Letzte Möglichkeit! Nur noch 3 Stunden, um 30% Rabatt zu erhalten", "de|p": {}}, "locales": [{"value": "default", "title": "Default", "count": 200, "percent": 100}, {"value": "de", "title": "German", "count": 100, "percent": 50}, {"value": "en", "title": "English", "count": 100, "percent": 50}], "sound": "default", "url": "theapp://promo/30off", "source": "dash", "buttons": 2, "media": location.origin + "/images/push/sale.png", "autoOnEntry": false, "autoCohorts": []},
        {"demo": 3, "apps": [countlyCommon.ACTIVE_APP_ID], "platforms": ["i", "a"], "tz": false, "auto": true, "type": "message", "messagePerLocale": {"default|t": "💥 Latest 💥", "default|0|t": "Go", "default|0|l": "theapp://offers", "default": "Check our latest offers!"}, "sound": "default", "source": "dash", "buttons": 1, "autoOnEntry": "events", "autoEvents": ["Login"], "autoTime": 576000, "autoCapMessages": 1, "autoCapSleep": 864000},
        // {
        //     demo: 4,
        //     app: countlyCommon.ACTIVE_APP_ID,
        //     platforms: ['i', 'a'],
        //     contents: [{
        //         message: 'Automated message'
        //     }],
        //     triggers: [
        //         {kind: 'auto', }
        //     ]
        // }
    ];

    /**
     * Generate a user with random properties and actions
     * @param {object} templateUp user properties template, if available
     **/
    function getUser(templateUp) {
        this.getId = function() {
            /**
             * Generate hash for id
             * @returns {string} returns string contains 4 characters
             **/
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
            }
            return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
        };

        this.getProp = countlyPopulatorHelper.getProp;

        var that = this;
        this.stats = {u: 0, s: 0, x: 0, d: 0, e: 0, r: 0, b: 0, c: 0, p: 0};
        this.id = this.getId();
        this.isRegistered = false;

        this.hasSession = false;
        this.ip = countlyPopulatorHelper.predefined_ip_addresses[Math.floor(chance.random() * (countlyPopulatorHelper.predefined_ip_addresses.length - 1))];
        if ((totalCountWithoutUserProps < totalUserCount / 3)) {
            this.userdetails = { custom: countlyPopulatorHelper.getUserProperties(templateUp) };
            totalCountWithoutUserProps++;
        }
        else {
            this.userdetails = { name: chance.name(), username: chance.twitter().substring(1), email: chance.email(), organization: countlyPopulatorHelper.capitaliseFirstLetter(chance.word()), phone: chance.phone(), gender: chance.gender().charAt(0), byear: chance.birthday().getFullYear(), custom: countlyPopulatorHelper.getUserProperties(templateUp) };
        }
        this.userdetails.custom.populator = true;
        this.metrics = {};
        this.startTs = startTs;
        this.endTs = endTs;
        this.events = [];
        this.ts = countlyPopulatorHelper.getRandomInt(this.startTs, this.endTs);
        if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web") {
            this.platform = this.getProp("_os_web");
        }
        else if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "desktop") {
            this.platform = this.getProp("_os_desktop");
        }
        else {
            this.platform = this.getProp("_os");
        }
        this.metrics._os = this.platform;
        var m_props = countlyPopulatorHelper.metric_props.mobile;
        if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type && countlyPopulatorHelper.metric_props[countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type]) {
            m_props = countlyPopulatorHelper.metric_props[countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type];
        }
        for (var mPropsIndex = 0; mPropsIndex < m_props.length; mPropsIndex++) {
            if (m_props[mPropsIndex] !== "_os") {
                //handle specific cases
                if (m_props[mPropsIndex] === "_store" && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web") {
                    this.metrics[m_props[mPropsIndex]] = this.getProp("_source");
                }
                else {
                    //check os specific metric
                    if (typeof countlyPopulatorHelper.props[m_props[mPropsIndex] + "_" + this.platform.toLowerCase().replace(/\s/g, "_")] !== "undefined") {
                        this.metrics[m_props[mPropsIndex]] = this.getProp(m_props[mPropsIndex] + "_" + this.platform.toLowerCase().replace(/\s/g, "_"));
                    }
                    //default metric set
                    else {
                        this.metrics[m_props[mPropsIndex]] = this.getProp(m_props[mPropsIndex]);
                    }
                }
            }
        }

        this.getCrash = countlyPopulatorHelper.getCrash;
        this.getError = countlyPopulatorHelper.getError;
        this.getLog = countlyPopulatorHelper.getLog;
        this.getTrace = countlyPopulatorHelper.getTrace;
        this.getEvent = countlyPopulatorHelper.getEvent;
        this.getEvents = countlyPopulatorHelper.getEvents;

        this.getFeedbackEvents = countlyPopulatorHelper.getFeedbackEvents;
        this.getRatingEvent = countlyPopulatorHelper.getRatingEvent;
        this.getNPSEvent = countlyPopulatorHelper.getNPSEvent;
        this.getSurveyEvent = countlyPopulatorHelper.getSurveyEvent;
        this.getHeatmapEvents = countlyPopulatorHelper.getHeatmapEvents;
        this.getHeatmapEvent = countlyPopulatorHelper.getHeatmapEvent;
        this.getScrollmapEvents = countlyPopulatorHelper.getScrollmapEvents;
        this.getScrollmapEvent = countlyPopulatorHelper.getScrollmapEvent;

        this.startSession = function(template) {
            this.ts = this.ts + 60 * 60 * 24 + 100;
            this.stats.s++;
            var req = {};
            var events;

            if (!this.isRegistered) {
                this.isRegistered = true;
                this.stats.u++;
                // note login event was here
                events = this.getEvent("[CLY]_view", template && template.events && template.events["[CLY]_view"]).concat(this.getEvent("[CLY]_orientation", template && template.events && template.events["[CLY]_orientation"]), this.getEvents(4, template && template.events));
                req = {timestamp: this.ts, begin_session: 1, metrics: this.metrics, user_details: this.userdetails, events: events, apm: this.getTrace()};
                this.stats.p++;
                req.events = req.events.concat(this.getHeatmapEvents());
                req.events = req.events.concat(this.getFeedbackEvents());
                req.events = req.events.concat(this.getScrollmapEvents());
            }
            else {
                events = this.getEvent("[CLY]_view", template && template.events && template.events["[CLY]_view"]).concat(this.getEvent("[CLY]_orientation", template && template.events && template.events["[CLY]_orientation"]), this.getEvents(4, template && template.events));
                req = {timestamp: this.ts, begin_session: 1, events: events, apm: this.getTrace()};
            }

            if (Math.random() > 0.10) {
                this.hasPush = true;
                req.token_session = 1;
                req.test_mode = 0;
                req[this.platform.toLowerCase() + "_token"] = countlyPopulatorHelper.randomString(8);
            }

            this.stats.c++;
            req.crash = this.getCrash();

            var consents = ["sessions", "events", "views", "scrolls", "clicks", "forms", "crashes", "push", "attribution", "users"];
            req.consent = {};

            for (var consentIndex = 0; consentIndex < consents.length; consentIndex++) {
                req.consent[consents[consentIndex]] = (Math.random() > 0.8) ? false : true;
            }

            this.hasSession = true;
            this.request(req);
            this.timer = setTimeout(function() {
                that.extendSession(template);
            }, timeout);
        };

        this.extendSession = function(template) {
            if (this.hasSession) {
                var req = {};
                this.ts = this.ts + 30;
                this.stats.x++;
                this.stats.d += 30;
                var events = this.getEvent("[CLY]_view", template && template.events && template.events["[CLY]_view"]).concat(this.getEvent("[CLY]_orientation", template && template.events && template.events["[CLY]_orientation"]), this.getEvents(2, template && template.events));
                req = {timestamp: this.ts, session_duration: 30, events: events, apm: this.getTrace()};
                if (Math.random() > 0.8) {
                    this.timer = setTimeout(function() {
                        that.extendSession(template);
                    }, timeout);
                }
                else {
                    if (Math.random() > 0.5) {
                        this.stats.c++;
                        req.crash = this.getCrash();
                    }
                    this.timer = setTimeout(function() {
                        that.endSession(template);
                    }, timeout);
                }
                this.request(req);
            }
        };

        this.endSession = function(template) {
            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = null;
            }
            if (this.hasSession) {
                this.hasSession = false;
                var events = this.getEvents(2, template && template.events);
                this.request({timestamp: this.ts, end_session: 1, events: events, apm: this.getTrace()});
            }
        };

        this.request = function(params) {
            this.stats.r++;
            params.device_id = this.id;
            params.ip_address = this.ip;
            params.hour = countlyPopulatorHelper.getRandomInt(0, 23);
            params.dow = countlyPopulatorHelper.getRandomInt(0, 6);
            params.stats = JSON.parse(JSON.stringify(this.stats));
            params.populator = true;
            bulk.push(params);
            this.stats = {u: 0, s: 0, x: 0, d: 0, e: 0, r: 0, b: 0, c: 0, p: 0};
            countlyPopulator.sync();
        };

        this.reportConversion = function(uid, campaingId) {
            $.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/i",
                data: {
                    campaign_id: uid,
                    campaign_user: campaingId,
                    app_key: countlyCommon.ACTIVE_APP_KEY,
                    device_id: this.id,
                    timestamp: countlyPopulatorHelper.getRandomInt(startTs, endTs),
                    populator: true
                },
                success: function() {}
            });
        };
    }

    var bulk = [];
    var campaingClicks = [];
    var startTs = 1356998400;
    var endTs = new Date().getTime() / 1000;
    var timeout = 1000;
    var bucket = 50;
    var generating = false;
    var stopCallback = null;
    var users = [];
    var userAmount = 1000;
    var totalUserCount = 0;
    var totalCountWithoutUserProps = 0;
    var queued = 0;
    var totalStats = {u: 0, s: 0, x: 0, d: 0, e: 0, r: 0, b: 0, c: 0, p: 0};
    var _templateType = '';
    /**
     * Update populator UI
     * @param {object} stats - current populator stats
     **/
    function updateUI(stats) {
        for (var i in stats) {
            totalStats[i] += stats[i];
            $(".populate-stats-" + i).text(totalStats[i]);
        }
    }
    /**
     * Create campaign
     * @param {string} id - id of campaign
     * @param {string} name - name of campaign
     * @param {number} cost - cost of campaign
     * @param {string} type - cost type of campaign
     * @param {callback} callback - callback method
     **/
    function createCampaign(id, name, cost, type, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/i/campaign/create",
            data: {
                args: JSON.stringify({
                    "_id": id + countlyCommon.ACTIVE_APP_ID,
                    "name": name,
                    "link": "http://count.ly",
                    "cost": cost,
                    "costtype": type,
                    "fingerprint": false,
                    "links": {},
                    "postbacks": [],
                    "app_id": countlyCommon.ACTIVE_APP_ID
                }),
                populator: true
            },
            success: callback,
            error: callback
        });
    }
    /**
     * Create message
     * @param {object} data - message data
     * @param {callback} callback - callback method
     **/
    function createMessage(data, callback) {
        if (data._id) {
            return;
        }

        if (data.triggers) {
            $.ajax({
                type: "POST",
                url: countlyCommon.API_URL + "/i/push/message/create",
                data: data,
                contentTYpe: "application/json",
                success: function(json) {
                    data._id = json._id;
                    if (callback) {
                        callback();
                    }
                },
                error: callback
            });
        }
        else {
            $.ajax({
                type: "POST",
                url: countlyCommon.API_URL + "/i/pushes/create",
                data: {
                    args: JSON.stringify(data),
                },
                success: function(json) {
                    data._id = json._id;
                    if (callback) {
                        callback();
                    }
                },
                error: callback
            });
        }
    }
    /**
     * Create feedback popup
     * @param {string} popup_header_text - Popup header text
     * @param {string} popup_comment_callout - Popup comment input callout
     * @param {string} popup_email_callout - Popup email input callout
     * @param {string} popup_button_callout - Popup button callout
     * @param {string} popup_thanks_message - Popup thanks message
     * @param {string} trigger_position - Position of feedback trigger div on the screen
     * @param {string} trigger_bg_color - Background color of feedback trigger div
     * @param {string} trigger_font_color - Text color of feedback trigger div
     * @param {string} trigger_button_text - Text of trigger button text
     * @param {object} target_devices - Target devices object
     * @param {array}  target_pages - Array of target pages
     * @param {string} target_page - Only selected pages? or all pages (one of these; "all","selected")
     * @param {boolean} is_active - Is feedback popup active?
     * @param {boolean} hide_sticker - Hide sticker option
     * @param {function} callback - callback method
     * @return {function} returns ajax get request
     **/
    function createFeedbackWidget(popup_header_text, popup_comment_callout, popup_email_callout, popup_button_callout, popup_thanks_message, trigger_position, trigger_bg_color, trigger_font_color, trigger_button_text, target_devices, target_pages, target_page, is_active, hide_sticker, callback) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/i/feedback/widgets/create",
            data: {
                popup_header_text: popup_header_text,
                popup_comment_callout: popup_comment_callout,
                popup_email_callout: popup_email_callout,
                popup_button_callout: popup_button_callout,
                popup_thanks_message: popup_thanks_message,
                trigger_position: trigger_position,
                trigger_bg_color: trigger_bg_color,
                trigger_font_color: trigger_font_color,
                trigger_button_text: trigger_button_text,
                target_devices: JSON.stringify(target_devices),
                target_pages: JSON.stringify(target_pages),
                target_page: target_page,
                is_active: is_active,
                hide_sticker: hide_sticker,
                app_id: countlyCommon.ACTIVE_APP_ID,
                populator: true
            },
            success: function(json, textStatus, xhr) {
                callback(json, textStatus, xhr);
            },
            error: function(json, textStatus, xhr) {
                callback(json, textStatus, xhr);
            }
        });
    }

    /**
     *  Create NPS popup
     *  @param {string} name - NPS Widget name
     *  @param {string} followUpType - type of follow up question
     *  @param {string} mainQuestion - main question
     *  @param {string} followUpPromoter - follow up question for promoter
     *  @param {string} followUpPassive - follow up question for passive
     *  @param {string} followUpDetractor - follow up question for detractor
     *  @param {string} followUpAll - follow up question for all
     *  @param {string} thanks - thank you text
     *  @param {string} style - type of displaying widget (full or outline)
     *  @param {string} show - show until specific action from user
     *  @param {string} color - color theme
     *  @param {function} callback - callback method
     *  @return {function} returns ajax get request
     */
    function createNPSWidget(name, followUpType, mainQuestion, followUpPromoter, followUpPassive, followUpDetractor, followUpAll, thanks, style, show, color, callback) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/i/surveys/nps/create",
            data: {
                status: true,
                name: name,
                followUpType: followUpType || "score",
                msg: JSON.stringify({
                    mainQuestion: mainQuestion,
                    followUpPromoter: followUpPromoter,
                    followUpPassive: followUpPassive,
                    followUpDetractor: followUpDetractor,
                    followUpAll: followUpAll,
                    thanks: thanks
                }),
                appearance: JSON.stringify({
                    style: style || "",
                    show: show || "",
                    color: color || ""
                }),
                targeting: null,
                app_id: countlyCommon.ACTIVE_APP_ID,
                populator: true
            },
            success: function(json, textStatus, xhr) {
                if (json && json.result) {
                    var id = json.result.split(" ");
                    countlyPopulatorHelper.npsWidgetList.push(id[2]);
                }
                callback(json, textStatus, xhr);
            },
            error: function(json, textStatus, xhr) {
                callback(json, textStatus, xhr);
            }
        });
    }

    /**
     *  Create survey popup
     *  @param {string} name - widget name
     *  @param {array} questions - array with question objects
     *  @param {string} thanks - thank you message
     *  @param {string} position - survey position
     *  @param {string} show - show until specific action from user
     *  @param {string} color - color theme
     *  @param {string} logo - link to logo
     *  @param {string} exitPolicy - what to count as exit
     *  @param {function} callback - callback method
     *  @return {function} returns ajax get request
     */
    function createSurveyWidget(name, questions, thanks, position, show, color, logo, exitPolicy, callback) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/i/surveys/survey/create",
            data: {
                status: true,
                name: name,
                questions: JSON.stringify(questions),
                msg: JSON.stringify({
                    thanks: thanks
                }),
                appearance: JSON.stringify({
                    position: position,
                    show: show,
                    color: color,
                    logo: logo
                }),
                targeting: null,
                exitPolicy: exitPolicy || "onAbandon",
                app_id: countlyCommon.ACTIVE_APP_ID,
                populator: true
            },
            success: function(json, textStatus, xhr) {
                callback(json, textStatus, xhr);
            },
            error: function(json, textStatus, xhr) {
                callback(json, textStatus, xhr);
            }
        });
    }

    /**
     * Generate feedback popups three times
     * @param {funciton} done - callback method
     **/
    function generateWidgets(done) {

        /**
         *  Create rating widgets
         *  @param {function} callback - callback method
         */
        function generateRatingWidgets(callback) {
            createFeedbackWidget("What's your opinion about this page?", "Add comment", "Contact me by e-mail", "Send feedback", "Thanks for feedback!", "mleft", "#fff", "#ddd", "Feedback", {phone: true, tablet: false, desktop: true}, ["/"], "selected", true, false, function() {
                createFeedbackWidget("Leave us a feedback", "Add comment", "Contact me by e-mail", "Send feedback", "Thanks!", "mleft", "#fff", "#ddd", "Feedback", {phone: true, tablet: false, desktop: false}, ["/"], "selected", true, false, function() {
                    createFeedbackWidget("Did you like this web page?", "Add comment", "Contact me by e-mail", "Send feedback", "Thanks!", "bright", "#fff", "#ddd", "Feedback", {phone: true, tablet: false, desktop: false}, ["/"], "selected", true, false, function() {
                        $.ajax({
                            type: "GET",
                            url: countlyCommon.API_URL + "/o/feedback/widgets",
                            data: {
                                app_id: countlyCommon.ACTIVE_APP_ID
                            },
                            success: function(json) {
                                countlyPopulatorHelper.ratingWidgetList = json;
                                callback();
                            },
                            error: function() {
                                callback();
                            }
                        });
                    });
                });
            });
        }

        /**
         *  Create NPS widgets
         *  @param {function} callback - callback method
         */
        function generateNPSWidgets(callback) {
            createNPSWidget("Separate per response type", "score", "How likely are you to recommend our product to a friend or colleague?", "We're glad you like us. What do you like the most about our product?", "Thank you for your feedback. How can we improve your experience?", "We're sorry to hear it. What would you like us to improve on?", "", "Thank you for your feedback", "full", "uclose", "#ddd", function() {
                createNPSWidget("One response for all", "one", "How likely are you to recommend our product to a friend or colleague?", "", "", "", "What can/should we do to WOW you?", "Thank you for your feedback", "full", "uclose", "#ddd", callback);
            });
        }

        /**
         *  Create survey widgets
         *  @param {function} callback - callback method
         */
        function generateSurveyWidgets(callback) {
            createSurveyWidget("Product Feedback example", [
                {
                    "type": "rating",
                    "question": "How satisfied are you with the stability of the app?",
                    "required": true
                },
                {
                    "type": "multi",
                    "question": "Which feature of the app are most important to you?",
                    "choices": ["Ready-to-use templates", "Image editor", "Download in multiple formats"],
                    "required": true
                },
                {
                    "type": "text",
                    "question": "What features would you like to add to the app?",
                    "required": true
                }
            ], "Thank you for your feedback", "bottom right", "uclose", "#ddd", null, "onAbandon", function() {
                createSurveyWidget("User Experience example", [
                    {
                        "type": "rating",
                        "question": "How satisfied are you with the look and feel of the app?",
                        "required": true
                    },
                    {
                        "type": "text",
                        "question": "What confused/annoyed you about the app?",
                        "required": true
                    },
                    {
                        "type": "dropdown",
                        "question": "Which feature did you like most on new version?",
                        "choices": ["In-app support", "Quick access to menu", "Template library", "User management"],
                        "required": true
                    }
                ], "Thank you for your feedback", "bottom right", "uclose", "#ddd", null, "onAbandon", function() {
                    createSurveyWidget("Customer support example", [
                        {
                            "type": "radio",
                            "question": "Were you able to find the information you were looking for?",
                            "choices": ["Yes", "No"],
                            "required": true
                        },
                        {
                            "type": "text",
                            "question": "What type of support communication methods do you prefer?",
                            "required": true
                        },
                        {
                            "type": "rating",
                            "question": "How would you rate our service on a scale of 0-10?",
                            "required": true
                        }
                    ], "Thank you for your feedback", "bottom right", "uclose", "#ddd", null, "onAbandon", function() {
                        $.ajax({
                            type: "GET",
                            url: countlyCommon.API_URL + "/o/surveys/survey/widgets",
                            data: {
                                app_id: countlyCommon.ACTIVE_APP_ID
                            },
                            success: function(json) {
                                if (json && json.aaData) {
                                    for (var i = 0; i < json.aaData.length; i++) {
                                        countlyPopulatorHelper.surveyWidgetList[json.aaData[i]._id] = json.aaData[i];
                                    }
                                }
                                callback();
                            },
                            error: function() {
                                callback();
                            }
                        });
                    });
                });
            });
        }

        generateRatingWidgets(function() {
            if (countlyGlobal.plugins.indexOf("surveys") !== -1 && countlyAuth.validateCreate("surveys")) {
                generateNPSWidgets(function() {
                    generateSurveyWidgets(done);
                });
            }
            else {
                done();
            }
        });
    }

    /**
     * To parse querystring
     * @param {string} queryString | Query string
     * @returns {object} | Query string params as object
     */
    function parseQueryString(queryString) {
        var params = {}, queries, temp, i, l;
        queries = queryString.split("&");
        for (i = 0, l = queries.length; i < l; i++) {
            temp = queries[i].split('=');
            params[temp[0]] = temp[1];
        }
        return params;
    }

    /**
     * Create a click for campaign which passed as param
     * @param {string} name - campaign name
     **/
    function clickCampaign(name) {
        var ip = countlyPopulatorHelper.predefined_ip_addresses[Math.floor(chance.random() * (countlyPopulatorHelper.predefined_ip_addresses.length - 1))];
        $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/i/campaign/click/" + name + countlyCommon.ACTIVE_APP_ID,
            data: {ip_address: ip, test: true, timestamp: countlyPopulatorHelper.getRandomInt(startTs, endTs), populator: true},
            success: function(data) {
                var link = data.link.replace('&amp;', '&');
                var queryString = link.split('?')[1];
                var parameters = parseQueryString(queryString);
                campaingClicks.push({
                    name: name,
                    cly_id: parameters.cly_id,
                    cly_uid: parameters.cly_uid
                });

            }
        });
    }
    /**
     * Generate social, ads and landing campaings and
     * generate some dummy click for them
     * @param {callback} callback - callback method
     **/
    function generateCampaigns(callback) {
        if (typeof countlyAttribution === "undefined") {
            callback();
            return;
        }

        var campaignsIndex = 0;

        /**
         * Recursively generates all the campaigns in the global variable
         **/
        function recursiveCallback() {
            if (campaignsIndex < countlyPopulatorHelper.campaigns.length) {
                createCampaign(countlyPopulatorHelper.campaigns[campaignsIndex].id, countlyPopulatorHelper.campaigns[campaignsIndex].name, countlyPopulatorHelper.campaigns[campaignsIndex].cost, countlyPopulatorHelper.campaigns[campaignsIndex].type, recursiveCallback);
                campaignsIndex++; // future async issues?
            }
            else {
                for (var clickIndex = 0; clickIndex < (countlyPopulatorHelper.campaigns.length * 33); clickIndex++) {
                    clickCampaign(countlyPopulatorHelper.campaigns[countlyPopulatorHelper.getRandomInt(0, countlyPopulatorHelper.campaigns.length - 1)].id);
                }
                setTimeout(callback, 3000);
            }
        }

        recursiveCallback();
    }


    /**
     * Generate retention user
     * @param {date} ts - date as timestamp
     * @param {number} userCount - users count will be generated
     * @param {array} ids - ids array
     * @param {object} templateUp user properties template, if available
     * @param {callback} callback - callback function
     **/
    function generateRetentionUser(ts, userCount, ids, templateUp, callback) {
        var bulker = [];
        for (var userIndex = 0; userIndex < userCount; userIndex++) {
            for (var j = 0; j < ids.length; j++) {
                var metrics = {};
                var platform;
                if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web") {
                    platform = countlyPopulatorHelper.getProp("_os_web");
                }
                else if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "desktop") {
                    platform = countlyPopulatorHelper.getProp("_os_desktop");
                }
                else {
                    platform = countlyPopulatorHelper.getProp("_os");
                }
                metrics._os = platform;
                var m_props = countlyPopulatorHelper.metric_props.mobile;
                if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type && countlyPopulatorHelper.metric_props[countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type]) {
                    m_props = countlyPopulatorHelper.metric_props[countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type];
                }
                for (var k = 0; k < m_props.length; k++) {
                    if (m_props[k] !== "_os") {
                        //handle specific cases
                        if (m_props[k] === "_store" && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web") {
                            metrics[m_props[k]] = countlyPopulatorHelper.getProp("_source");
                        }
                        else {
                            //check os specific metric
                            if (typeof countlyPopulatorHelper.props[m_props[k] + "_" + platform.toLowerCase().replace(/\s/g, "_")] !== "undefined") {
                                metrics[m_props[k]] = countlyPopulatorHelper.getProp(m_props[k] + "_" + platform.toLowerCase().replace(/\s/g, "_"));
                            }
                            //default metric set
                            else {
                                metrics[m_props[k]] = countlyPopulatorHelper.getProp(m_props[k]);
                            }
                        }
                    }
                }

                var userdetails = new getUser(templateUp);
                userdetails.begin_session = 1;
                userdetails.device_id = userIndex + "" + ids[j];
                userdetails.dow = countlyPopulatorHelper.getRandomInt(0, 6);
                userdetails.hour = countlyPopulatorHelper.getRandomInt(0, 23);
                userdetails.ip_address = countlyPopulatorHelper.predefined_ip_addresses[Math.floor(chance.random() * (countlyPopulatorHelper.predefined_ip_addresses.length - 1))];
                delete userdetails.ip;
                userdetails.request_id = userIndex + "" + ids[j] + "_" + ts;
                userdetails.timestamp = ts;
                delete userdetails.metrics;
                userdetails.metrics = metrics;

                bulker.push(userdetails);
                totalStats.s++;
                totalStats.u++;
            }
        }

        totalStats.r++;
        for (var index = 0; index < bulker.length; index++) {
            bulker[index].startSession(templateUp);
        }

        callback("");
    }

    /**
     * Generate retentions
     * @param {object} templateUp user properties template, if available
     * @param {callback} callback - callback function
     **/
    function generateRetention(templateUp, callback) {
        if (typeof countlyRetention === "undefined") {
            callback();
            return;
        }
        var ts = endTs - 60 * 60 * 24 * 9;
        var ids = [ts];
        var userCount = 10;
        var retentionCall = 8; // number of generateRetentionUser function call
        var retentionLastUserCount = (userCount - retentionCall) + 1;

        var idCount = 1;
        for (var i = userCount; i >= retentionLastUserCount; i--) { //total retension user
            totalUserCount += idCount * i;
            idCount++;
        }

        totalUserCount += userAmount + retentionCall; // campaign users
        totalCountWithoutUserProps = 0;

        generateRetentionUser(ts, userCount--, ids, templateUp, function() {
            ts += 60 * 60 * 24;
            ids.push(ts);
            generateRetentionUser(ts, userCount--, ids, templateUp, function() {
                ts += 60 * 60 * 24;
                ids.push(ts);
                generateRetentionUser(ts, userCount--, ids, templateUp, function() {
                    ts += 60 * 60 * 24;
                    ids.push(ts);
                    generateRetentionUser(ts, userCount--, ids, templateUp, function() {
                        ts += 60 * 60 * 24;
                        ids.push(ts);
                        generateRetentionUser(ts, userCount--, ids, templateUp, function() {
                            ts += 60 * 60 * 24;
                            ids.push(ts);
                            generateRetentionUser(ts, userCount--, ids, templateUp, function() {
                                ts += 60 * 60 * 24;
                                ids.push(ts);
                                generateRetentionUser(ts, userCount--, ids, templateUp, function() {
                                    ts += 60 * 60 * 24;
                                    ids.push(ts);
                                    generateRetentionUser(ts, userCount--, ids, templateUp, callback);
                                });
                            });
                        });
                    });
                });
            });
        });
    }

    /**
     * To report campaign clicks conversion
     */
    function reportConversions() {
        for (var i = 0; i < campaingClicks.length; i++) {
            var click = campaingClicks[i];
            if ((Math.random() > 0.5)) {
                users[i].reportConversion(click.cly_id, click.cly_uid);
            }
        }
    }

    /**
     * Serializes a template object members for API use
     * @param {object} template a template object
     * @returns {object} an API-safe template object
     **/
    function serializeTemplate(template) {
        if (template && template.up && !_.isString(template.up)) {
            delete template.up[""]; // delete user properties without keys

            if (Object.keys(template.up).length === 0) {
                delete template.up;
            }
            else {
                template.up = JSON.stringify(template.up);
            }
        }

        if (template && template.events && !_.isString(template.events)) {
            delete template.events[""]; // delete events without keys
            Object.keys(template.events).forEach(function(key) {
                var event = template.events[key];

                if (event.segments) {
                    delete event.segments[""];
                }

                if (event.segments && event.segments.length === 0) {
                    delete event.segments;
                }

                template.events[key] = event;
            });

            if (template.events.length === 0) {
                delete template.events;
            }
            else {
                template.events = JSON.stringify(template.events);
            }
        }
        template.app_id = countlyCommon.ACTIVE_APP_ID;
        return template;
    }

    //Public Methods
    countlyPopulator.setStartTime = function(time) {
        startTs = time;
    };
    countlyPopulator.getStartTime = function() {
        return startTs;
    };
    countlyPopulator.setEndTime = function(time) {
        endTs = time;
    };
    countlyPopulator.getEndTime = function() {
        return endTs;
    };
    countlyPopulator.getUserAmount = function() {
        return userAmount;
    };
    countlyPopulator.generateUI = function() {
        for (var i in totalStats) {
            $(".populate-stats-" + i).text(totalStats[i]);
        }
    };
    countlyPopulator.generateUsers = function(amount, template) {
        this.currentTemplate = template;
        stopCallback = null;
        userAmount = amount;
        bulk = [];
        totalStats = {u: 0, s: 0, x: 0, d: 0, e: 0, r: 0, b: 0, c: 0, p: 0};
        bucket = Math.max(amount / 50, 10);
        var mult = (Math.round(queued / 10) + 1);
        timeout = bucket * 10 * mult * mult;
        generating = true;
        /**
         * Create new user
         **/
        function createUser() {
            var u = new getUser(template && template.up);
            users.push(u);
            u.timer = setTimeout(function() {
                u.startSession(template);
            }, Math.random() * timeout);
        }

        var seg = {};

        if (template && template.name) {
            seg.template = template.name;
        }

        app.recordEvent({
            "key": "populator-execute",
            "count": 1,
            "segmentation": seg
        });

        /**
         * Start user session process
         * @param {object} u - user object
         **/
        function processUser(u) {
            if (u && !u.hasSession) {
                u.timer = setTimeout(function() {
                    u.startSession(template);
                }, Math.random() * timeout);
            }
        }
        /**
         * Start user session process
         * @param {object} u - user object
         **/
        function processUsers() {
            for (var userAmountIndex = 0; userAmountIndex < amount; userAmountIndex++) {
                processUser(users[userAmountIndex]);
            }
            if (users.length > 0 && generating) {
                setTimeout(processUsers, timeout);
            }
            else {
                countlyPopulator.sync(true);
            }
        }

        if (countlyGlobal.plugins.indexOf("star-rating") !== -1 && countlyAuth.validateCreate("star-rating")) {
            generateWidgets(function() {
                generateRetention(template, function() {
                    generateCampaigns(function() {
                        for (var campaignAmountIndex = 0; campaignAmountIndex < amount; campaignAmountIndex++) {
                            createUser();
                        }
                        // Generate campaigns conversion for web
                        if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web") {
                            setTimeout(reportConversions, timeout);
                        }
                        setTimeout(processUsers, timeout);
                    });
                });
            });
        }


        if (countlyGlobal.plugins.indexOf("systemlogs") !== -1) {
            $.ajax({
                type: "POST",
                url: countlyCommon.API_URL + "/i/systemlogs",
                data: {
                    data: JSON.stringify({app_id: countlyCommon.ACTIVE_APP_ID}),
                    action: "populator_run",
                    populator: true
                },
                success: function() {}
            });
        }

        //if (countlyGlobal.plugins.indexOf("star-rating") !== -1 && countlyAuth.validateCreate("star-rating")) {
        //    generateWidgets(function() {});
        //}
    };

    countlyPopulator.stopGenerating = function(callback) {
        stopCallback = callback;
        generating = false;

        var u;
        for (var userGenerationIndex = 0; userGenerationIndex < users.length; userGenerationIndex++) {
            u = users[userGenerationIndex];
            if (u) {
                u.endSession(this.currentTemplate);
            }
        }
        users = [];


        countlyPopulator.ensureJobs();

        if (stopCallback) {
            stopCallback(!countlyPopulator.bulking);
        }
    };

    countlyPopulator.isGenerating = function() {
        return generating;
    };

    countlyPopulator.sync = function(force) {
        if (generating && (force || bulk.length > bucket) && !countlyPopulator.bulking) {
            queued++;
            var mult = Math.round(queued / 10) + 1;
            timeout = bucket * 10 * mult * mult;
            $(".populate-stats-br").text(queued);
            countlyPopulator.bulking = true;
            var req = bulk.splice(0, bucket);
            var temp = {u: 0, s: 0, x: 0, d: 0, e: 0, r: 0, b: 0, c: 0, p: 0};
            for (var i in req) {
                if (req[i].stats) {
                    for (var stat in req[i].stats) {
                        temp[stat] += req[i].stats[stat];
                    }
                    delete req[i].stats;
                }
            }
            $.ajax({
                type: "POST",
                url: countlyCommon.API_URL + "/i/bulk",
                data: {
                    app_key: countlyCommon.ACTIVE_APP_KEY,
                    requests: JSON.stringify(req),
                    populator: true
                },
                success: function() {
                    queued--;
                    $(".populate-stats-br").text(queued);
                    updateUI(temp);
                    countlyPopulator.bulking = false;
                    countlyPopulator.sync();
                },
                error: function() {
                    queued--;
                    $(".populate-stats-br").text(queued);
                    countlyPopulator.bulking = false;
                    countlyPopulator.sync();
                }
            });
        }
    };

    countlyPopulator.ensureJobs = function() {
        messages.forEach(function(m) {
            m.apps = [countlyCommon.ACTIVE_APP_ID];
        });

        var template = this.currentTemplate || {};

        if (typeof countlyCohorts !== "undefined" && countlyAuth.validateCreate('cohorts')) {
            if (template && template.events && Object.keys(template.events).length > 0) {
                var firstEventKey = Object.keys(template.events)[0];

                if (template.up && Object.keys(template.up).length > 0) {
                    var firstUserProperty = Object.keys(template.up)[0];
                    var firstUserPropertyValue = JSON.stringify(template.up[firstUserProperty][0]);

                    countlyCohorts.add({
                        cohort_name: firstUserProperty + " = " + firstUserPropertyValue + " users who performed " + firstEventKey,
                        steps: JSON.stringify([
                            {
                                type: "did",
                                event: firstEventKey,
                                times: "{\"$gte\":1}",
                                period: "0days",
                                query: "{\"custom." + firstUserProperty + "\":{\"$in\":[" + firstUserPropertyValue + "]}}",
                                byVal: "",
                            }
                        ]),
                        populator: true
                    });
                }


                if (template.events[firstEventKey].segments && Object.keys(template.events[firstEventKey].segments).length > 0) {
                    var firstEventSegment = Object.keys(template.events[firstEventKey].segments)[0];
                    var firstEventSegmentValue = JSON.stringify(template.events[firstEventKey].segments[firstEventSegment][0]);

                    countlyCohorts.add({
                        cohort_name: "Users who performed " + firstEventKey + " with " + firstEventSegment + " = " + firstEventSegmentValue,
                        steps: JSON.stringify([
                            {
                                type: "did",
                                event: firstEventKey,
                                times: "{\"$gte\":1}",
                                period: "0days",
                                query: "{\"sg." + firstEventSegment + ":{\"$in\":[" + firstEventSegmentValue + "]}}",
                                byVal: "",
                            }
                        ]),
                        populator: true
                    });
                }

                if (Object.keys(template.events).length > 1) {
                    var secondEventKey = Object.keys(template.events)[1];

                    countlyCohorts.add({
                        cohort_name: "Users who performed " + firstEventKey + " but not " + secondEventKey,
                        steps: JSON.stringify([
                            {
                                type: "did",
                                event: firstEventKey,
                                times: "{\"$gte\":1}",
                                period: "0days",
                                query: "{}",
                                byVal: "",
                                conj: "and"
                            },
                            {
                                type: "didnot",
                                event: secondEventKey,
                                times: "{\"$gte\":1}",
                                period: "0days",
                                query: "{}",
                                byVal: "",
                                conj: "and"
                            }
                        ]),
                        populator: true
                    });
                }
            }

            countlyCohorts.add({
                cohort_name: "Users who experienced a crash",
                steps: JSON.stringify([
                    {
                        type: "did",
                        event: "[CLY]_crash",
                        times: "{\"$gte\":1}",
                        period: "0days",
                        query: "{}",
                        byVal: "",
                    }
                ]),
                populator: true
            });

            countlyCohorts.add({
                cohort_name: "iOS users with at least 2 sessions",
                steps: JSON.stringify([
                    {
                        type: "did",
                        event: "[CLY]_session",
                        times: "{\"$gte\":2}",
                        period: "0days",
                        query: "{\"up.p\":{\"$in\":[\"iOS\"]}}",
                        byVal: "",
                    }
                ]),
                populator: true
            });

            countlyCohorts.add({
                cohort_name: "Users who didn’t view privacy policy",
                steps: JSON.stringify([
                    {
                        type: "didnot",
                        event: "[CLY]_view",
                        times: "{\"$gte\":1}",
                        period: "0days",
                        query: "{\"sg.name\":{\"$in\":[\"Privacy Policy\"]}}",
                        byVal: "",
                    }
                ]),
                populator: true
            });
        }



        createMessage(messages[0]);
        createMessage(messages[1]);
        createMessage(messages[2]);
    };

    countlyPopulator.getSelectedTemplate = function() {
        return _templateType;
    };

    countlyPopulator.setSelectedTemplate = function(value) {
        _templateType = value;
    };

    countlyPopulator.getTemplate = function(templateId, callback) {
        var foundDefault = countlyPopulatorHelper.defaultTemplates.find(function(template) {
            return template._id === templateId;
        });

        if (typeof foundDefault !== "undefined") {
            callback(foundDefault);
        }
        else {
            $.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/o/populator/templates",
                data: {template_id: templateId, app_id: countlyCommon.ACTIVE_APP_ID},
                success: callback,
                error: function() {
                    CountlyHelpers.notify({message: $.i18n.prop("populator.failed-to-fetch-template", templateId), type: "error"});
                }
            });
        }
    };

    countlyPopulator.getTemplates = function(callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o/populator/templates",
            data: {
                app_id: countlyCommon.ACTIVE_APP_ID
            },
            success: function(templates) {
                callback(templates.concat(countlyPopulatorHelper.defaultTemplates));
            },
            error: function() {
                CountlyHelpers.notify({message: $.i18n.map["populator.failed-to-fetch-templates"], type: "error"});
            }
        });
    };

    countlyPopulator.createTemplate = function(template, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/i/populator/templates/create",
            data: serializeTemplate(template),
            success: callback || function() {},
            error: function() {
                CountlyHelpers.notify({message: $.i18n.map["populator.failed-to-create-template"], type: "error"});
            }
        });
    };

    countlyPopulator.editTemplate = function(templateId, newTemplate, callback) {
        newTemplate.template_id = templateId;

        var foundDefault = countlyPopulatorHelper.defaultTemplates.find(function(template) {
            return template._id === templateId;
        });

        if (typeof foundDefault !== "undefined") {
            // this should never happen
        }
        else {
            $.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/i/populator/templates/edit",
                data: serializeTemplate(newTemplate),
                success: callback || function() {},
                error: function() {
                    CountlyHelpers.notify({message: $.i18n.prop("populator.failed-to-edit-template", templateId), type: "error"});
                }
            });
        }
    };

    countlyPopulator.removeTemplate = function(templateId, callback) {
        var foundDefault = countlyPopulatorHelper.defaultTemplates.find(function(template) {
            return template._id === templateId;
        });

        if (typeof foundDefault !== "undefined") {
            // this should never happen
        }
        else {
            $.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/i/populator/templates/remove",
                data: {template_id: templateId, app_id: countlyCommon.ACTIVE_APP_ID},
                success: callback,
                error: function() {
                    CountlyHelpers.notify({message: $.i18n.prop("populator.failed-to-remove-template", templateId), type: "error"});
                }
            });
        }
    };
}(window.countlyPopulator = window.countlyPopulator || {}, jQuery));