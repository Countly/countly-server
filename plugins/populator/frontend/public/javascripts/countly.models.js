/* eslint-disable no-unused-vars */
/* global $, _, countlyCommon, countlyGlobal, countlyVue, faker, Promise, CountlyHelpers */

(function(countlyPopulator) {
    countlyPopulator.getVuexModule = function() {
        var _module = {
            state: function() {
                return {
                    bulk: [],
                    campaignClicks: [],
                    ratingWidgetList: [],
                    npsWidgetList: [],
                    surveyWidgetList: {},
                    startTs: 1356998400,
                    endTs: new Date().getTime() / 1000,
                    timeout: 1000,
                    bucket: 50,
                    generating: false,
                    users: [],
                    userAmount: 1000,
                    queued: 0,
                    stats: {u: 0, s: 0, x: 0, d: 0, e: 0, r: 0, b: 0, c: 0, p: 0},
                    templates: []
                };
            },
            getters: {},
            actions: {},
            mutations: {},
            submodules: []
        };

        _module.getters.template = function(state) {
            return function(templateId) {
                return state.templates.find(function(template) {
                    return template._id === templateId;
                });
            };
        };

        _module.getters.templates = function(state) {
            return state.templates;
        };

        _module.actions.createTemplate = function(context, template) {
            var serializedTemplate = countlyPopulator.serializeTemplate(template);

            return countlyVue.$.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/i/populator/templates/create",
                data: serializedTemplate,
                success: function() {
                    context.state.templates.push(serializedTemplate);
                },
                error: function() {
                    CountlyHelpers.notify({message: $.i18n.map["populator.failed-to-create-template"], type: "error"});
                }
            });
        };

        _module.actions.editTemplate = function(context, newTemplate) {
            var serializedTemplate = countlyPopulator.serializeTemplate(newTemplate);

            var templateIndex = context.state.templates.findIndex(function(template) {
                return template.template_id === serializedTemplate.template_id;
            });

            if (templateIndex === -1) {
                return Promise.reject();
            }

            $.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/i/populator/templates/edit",
                data: serializedTemplate,
                success: function() {
                    context.state.templates.splice(templateIndex, 1, serializedTemplate);
                },
                error: function() {
                    CountlyHelpers.notify({message: $.i18n.prop("populator.failed-to-edit-template", newTemplate.template_id), type: "error"});
                }
            });
        };

        _module.actions.removeTemplate = function(context, templateId) {
            var templateIndex = context.state.templates.findIndex(function(template) {
                return template.template_id === templateId;
            });

            if (typeof foundDefault === "undefined") {
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_URL + "/i/populator/templates/remove",
                    data: {template_id: templateId},
                    success: function() {
                        context.state.templates.splice(templateIndex, 1);
                    },
                    error: function() {
                        CountlyHelpers.notify({message: $.i18n.prop("populator.failed-to-remove-template", templateId), type: "error"});
                    }
                });
            }
        };

        _module.actions.createFeedbackWidget = function(context, widget) {
            if (!("app_id" in widget)) {
                widget.app_id = countlyCommon.ACTIVE_APP_ID;
            }

            ["target_devices", "target_pages"].forEach(function(key) {
                if (Array.isArray(widget[key])) {
                    widget[key] = JSON.stringify(widget[key]);
                }
            });

            return countlyVue.$.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/i/feedback/widgets/create",
                data: {
                    popup_header_text: widget.popup_header_text,
                    popup_comment_callout: widget.popup_comment_callout,
                    popup_email_callout: widget.popup_email_callout,
                    popup_button_callout: widget.popup_button_callout,
                    popup_thanks_message: widget.popup_thanks_message,
                    trigger_position: widget.trigger_position,
                    trigger_bg_color: widget.trigger_bg_color,
                    trigger_font_color: widget.trigger_font_color,
                    trigger_button_text: widget.trigger_button_text,
                    target_devices: widget.target_devices,
                    target_pages: widget.target_pages,
                    target_page: widget.target_page,
                    is_active: widget.is_active,
                    hide_sticker: widget.hide_sticker,
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    populator: true
                }
            });
        };

        _module.actions.createNPSWidget = function(context, widget) {
            return countlyVue.$.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/i/surveys/nps/create",
                data: {
                    status: widget.true,
                    name: widget.name,
                    followUpType: widget.followUpType || "score",
                    msg: JSON.stringify({
                        mainQuestion: widget.mainQuestion,
                        followUpPromoter: widget.followUpPromoter,
                        followUpPassive: widget.followUpPassive,
                        followUpDetractor: widget.followUpDetractor,
                        followUpAll: widget.followUpAll,
                        thanks: widget.thanks
                    }),
                    appearance: JSON.stringify({
                        style: widget.style || "",
                        show: widget.show || "",
                        color: widget.color || ""
                    }),
                    targeting: null,
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    populator: true
                },
                success: function(json) {
                    if (json && json.result) {
                        var id = json.result.split(" ");
                        context.state.npsWidgets.push(id[2]);
                    }
                }
            });
        };

        _module.actions.generateNPSWidgets = function(context) {
            var promises = [];

            promises.push(context.dispatch("createNPSWidget", {
                name: "Separate per response type",
                followUpType: "score",
                mainQuestion: "How likely are you to recommend our product to a friend or colleague?",
                followUpPromoter: "We're glad you like us. What do you like the most about our product?",
                followUpPassive: "Thank you for your feedback. How can we improve your experience?",
                followUpDetractor: "We're sorry to hear it. What would you like us to improve on?",
                followUpAll: "",
                thanks: "Thank you for your feedback",
                style: "full",
                show: "uclose",
                color: "#ddd"
            }));

            promises.push(context.dispatch("createNPSWidget", {
                name: "One response for all",
                followUpType: "one",
                mainQuestion: "How likely are you to recommend our product to a friend or colleague?",
                followUpPromoter: "",
                followUpPassive: "",
                followUpDetractor: "",
                followUpAll: "What can/should we do to WOW you?",
                thanks: "Thank you for your feedback",
                style: "full",
                show: "uclose",
                color: "#ddd"
            }));

            return Promise.all(promises);
        };

        _module.actions.createSurveyWidget = function(context, widget) {
            return $.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/i/surveys/survey/create",
                data: {
                    status: true,
                    name: widget.name,
                    questions: JSON.stringify(widget.questions),
                    msg: JSON.stringify({
                        thanks: widget.thanks
                    }),
                    appearance: JSON.stringify({
                        position: widget.position,
                        show: widget.show,
                        color: widget.color,
                        logo: widget.logo
                    }),
                    targeting: widget.null,
                    exitPolicy: widget.exitPolicy || "onAbandon",
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    populator: true
                },
            });
        };

        _module.actions.generateSurveyWidgets = function(context) {
            var promises = [];

            promises.push(context.dispatch("createSurveyWidget", {
                name: "Product Feedback example",
                thanks: "Thank you for your feedback",
                position: "bottom right",
                show: "uclose",
                color: "#ddd",
                logo: null,
                exitPolicy: "onAbandon",
                questions: [
                    {
                        type: "rating",
                        question: "How satisfied are you with the stability of the app?",
                        required: true
                    },
                    {
                        type: "multi",
                        question: "Which feature of the app are most important to you?",
                        choices: ["Ready-to-use templates", "Image editor", "Download in multiple formats"],
                        required: true
                    },
                    {
                        type: "text",
                        question: "What features would you like to add to the app?",
                        required: true
                    }
                ]
            }));

            promises.push(context.dispatch("createSurveyWidget", {
                name: "User Experience example",
                thanks: "Thank you for your feedback",
                position: "bottom right",
                show: "uclose",
                color: "#ddd",
                logo: null,
                exitPolicy: "onAbandon",
                questions: [
                    {
                        type: "rating",
                        question: "How satisfied are you with the look and feel of the app?",
                        required: true
                    },
                    {
                        type: "text",
                        question: "What confused/annoyed you about the app?",
                        required: true
                    },
                    {
                        type: "dropdown",
                        question: "Which feature did you like most on new version?",
                        choices: ["In-app support", "Quick access to menu", "Template library", "User management"],
                        required: true
                    }
                ]
            }));

            promises.push(context.dispatch("createSurveyWidget", {
                name: "Customer support example",
                thanks: "Thank you for your feedback",
                position: "bottom right",
                show: "uclose",
                color: "#ddd",
                logo: null,
                exitPolicy: "onAbandon",
                questions: [
                    {
                        type: "radio",
                        question: "Were you able to find the information you were looking for?",
                        choices: ["Yes", "No"],
                        required: true
                    },
                    {
                        type: "text",
                        question: "What type of support communication methods do you prefer?",
                        required: true
                    },
                    {
                        type: "rating",
                        question: "How would you rate our service on a scale of 0-10?",
                        required: true
                    }
                ]
            }));

            var combinedPromise = Promise.all(promises);

            combinedPromise.then(function() {
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_URL + "/o/surveys/survey/widgets",
                    data: {
                        app_id: countlyCommon.ACTIVE_APP_ID
                    },
                    success: function(json) {
                        if (json && json.aaData && json.aaData.length > 0) {
                            json.aaData.forEach(function(widget) {
                                context.state.surveyWidgets[widget._id] = widget;
                            });
                        }
                    },
                });
            });

            return combinedPromise;
        };

        _module.actions.generateRatingWidgets = function(context) {
            var promises = [];

            promises.push(context.dispatch("createFeedbackWidget", {
                popup_header_text: "What's your opinion about this page?",
                popup_comment_callout: "Add comment",
                popup_email_callout: "Contact me by email",
                popup_button_callout: "Send feedback",
                popup_thanks_message: "Thanks for feedback!",
                trigger_position: "mleft",
                trigger_bg_color: "#fff",
                trigger_font_color: "#ddd",
                trigger_button_text: "Feedback",
                target_devices: {phone: true, tablet: false, desktop: true},
                target_pages: ["/"],
                target_page: "selected",
                is_active: true,
                hide_sticker: false
            }));

            promises.push(context.dispatch("createFeedbackWidget", {
                popup_header_text: "Leave us a feedback",
                popup_comment_callout: "Add comment",
                popup_email_callout: "Contact me by email",
                popup_button_callout: "Send feedback",
                popup_thanks_message: "Thanks!",
                trigger_position: "mleft",
                trigger_bg_color: "#fff",
                trigger_font_color: "#ddd",
                trigger_button_text: "Feedback",
                target_devices: {phone: true, tablet: false, desktop: false},
                target_pages: ["/"],
                target_page: "selected",
                is_active: true,
                hide_sticker: false
            }));

            promises.push(context.dispatch("createFeedbackWidget", {
                popup_header_text: "Did you like this webpage?",
                popup_comment_callout: "Add comment",
                popup_email_callout: "Contact me by email",
                popup_button_callout: "Send feedback",
                popup_thanks_message: "Thanks!",
                trigger_position: "bright",
                trigger_bg_color: "#fff",
                trigger_font_color: "#ddd",
                trigger_button_text: "Feedback",
                target_devices: {phone: true, tablet: false, desktop: false},
                target_pages: ["/"],
                target_page: "selected",
                is_active: true,
                hide_sticker: false
            }));

            return Promise.all(promises);
        };

        _module.actions.generateWidgets = function(context) {
            var promises = [];

            promises.push(context.dispatch("generateRatingWidgets"));

            if (countlyGlobal.plugins.indexOf("surveys") !== -1) {
                promises.push(context.dispatch("generateNPSWidgets"));
                promises.push(context.dispatch("generateSurveyWidgets"));
            }

            return Promise.all(promises);
        };

        _module.actions.createCampaign = function(context, campaign) {
            return countlyVue.$.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/i/campaign/create",
                data: {
                    args: JSON.stringify({
                        "_id": campaign.id + countlyCommon.ACTIVE_APP_ID,
                        "name": campaign.name,
                        "link": "http://count.ly",
                        "cost": campaign.cost,
                        "costtype": campaign.type,
                        "fingerprint": false,
                        "links": {},
                        "postbacks": [],
                        "app_id": countlyCommon.ACTIVE_APP_ID
                    }),
                    populator: true
                },
            });
        };

        _module.actions.clickCampaign = function(context, id) {
            var ip = faker.random.arrayElement(countlyPopulator.predefinedIPAddresses);

            return countlyVue.$.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/i/campaign/click/" + id + countlyCommon.ACTIVE_APP_ID,
                data: {
                    ip_address: ip,
                    test: true,
                    timestamp: faker.datatype.number({
                        min: context.state.startTs,
                        max: context.state.endTs
                    }),
                    populator: true
                },
                success: function(data) {
                    var parameters = data.link
                        .replace("&amp;", "&")
                        .split("?")[1]
                        .split("&")
                        .map(function(pair) {
                            return pair.split("=")[1];
                        });

                    context.state.campaignClicks.push({
                        name: id,
                        cly_id: parameters.cly_id,
                        cly_uid: parameters.cly_uid
                    });

                }
            });
        };

        _module.actions.generateCampaigns = function(context) {
            Promise.all(countlyPopulator.campaigns.map(function(campaign) {
                return context.dispatch("createCampaign", campaign);
            })).then(function() {
                Array(countlyPopulator.campaigns.length * 33).fill(null).forEach(function() {
                    context.dispatch("clickCampaign", faker.random.arrayElement(countlyPopulator.campaigns).id);
                });
            });
        };

        _module.actions.createPushMessage = function(context, message) {
            return countlyVue.$.ajax({
                type: "POST",
                url: countlyCommon.API_URL + "/i/pushes/create",
                message: {
                    args: JSON.stringify(message),
                    populator: true
                }
            });
        };

        _module.actions.generateRetentionUser = function(context, data) {
            var bulk = [];

            for (var userIndex = 0; userIndex < data.userCount; userIndex++) {
                for (var j = 0; j < data.ids.length; j++) {
                    var platform, metrics = {};

                    if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web") {
                        platform = countlyPopulator.getProp("_os_web");
                    }
                    else if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "desktop") {
                        platform = countlyPopulator.getProp("_os_desktop");
                    }
                    else {
                        platform = countlyPopulator.getProp("_os");
                    }
                    metrics._os = platform;

                    var metricProps = countlyPopulator.metricProps.mobile;
                    if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type && countlyPopulator.metricProps[countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type]) {
                        metricProps = countlyPopulator.metricProps[countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type];
                    }

                    for (var k = 0; k < metricProps.length; k++) {
                        if (metricProps[k] !== "_os") {
                            //handle specific cases
                            if (metricProps[k] === "_store" && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web") {
                                metrics[metricProps[k]] = countlyPopulator.getProp("_source");
                            }
                            else {
                                //check os specific metric
                                if (typeof countlyPopulator.props[metricProps[k] + "_" + platform.toLowerCase().replace(/\s/g, "_")] !== "undefined") {
                                    metrics[metricProps[k]] = countlyPopulator.getProp(metricProps[k] + "_" + platform.toLowerCase().replace(/\s/g, "_"));
                                }
                                //default metric set
                                else {
                                    metrics[metricProps[k]] = countlyPopulator.getProp(metricProps[k]);
                                }
                            }
                        }
                    }

                    var gender = (countlyPopulator.chancePercent(50) ? "male" : "female"),
                        firstName = faker.name.firstName(gender),
                        lastName = faker.name.lastName(),
                        currentYear = new Date().getFullYear();

                    var userDetails = {
                        name: faker.name.findName(firstName, lastName),
                        username: faker.internet.userName(firstName, lastName),
                        email: faker.internet.email(firstName, lastName),
                        organization: faker.company.companyName(),
                        phone: faker.phone.phoneNumber(),
                        gender: gender.charAt(0).toUpperCase(),
                        byear: faker.datatype.number({min: currentYear - 80, max: currentYear - 20}),
                        custom: countlyPopulator.generateUserProperties(data.templateUp)
                    };

                    bulk.push({
                        ip_address: faker.random.arrayElement(countlyPopulator.predefinedIPAddresses),
                        device_id: userIndex + "" + data.ids[j],
                        begin_session: 1,
                        metrics: metrics,
                        user_details: userDetails,
                        timestamp: data.ts,
                        hour: faker.datatype.number({min: 0, max: 23}),
                        dow: faker.datatype.number({min: 0, max: 6}),
                        request_id: userIndex + "" + data.ids[j] + "_" + data.ts
                    });

                    context.state.stats.s++;
                    context.state.stats.u++;
                }
            }
            context.state.stats.r++;

            return countlyVue.$.ajax({
                type: "POST",
                url: countlyCommon.API_URL + "/i/bulk",
                data: {
                    app_key: countlyCommon.ACTIVE_APP_KEY,
                    requests: JSON.stringify(bulk),
                    populator: true
                },
            });
        };

        _module.actions.generateRetention = function(context, templateUp) {
            if (typeof countlyRetention === "undefined") {
                return Promise.resolve();
            }

            var promises = [];

            for (var index = 0; index < 8; index++) {
                var ts = context.state.endTs - (60 * 60 * 24) * (9 - index);

                promises.push(context.dispatch("generateRetentionUser", {
                    ts: ts,
                    ids: Array(index + 1).fill(ts).map(function(id, idIndex) {
                        return id + (60 * 60 * 24) * idIndex;
                    }),
                    userCount: 10 - index
                }));
            }

            return Promise.all(promises);
        };

        _module.actions.reportConversions = function(context) {
            context.state.campaignClicks.forEach(function(click, index) {
                if (countlyPopulator.chancePercent(50)) {
                    context.state.users[index].reportConversion(click.cly_id, click.cly_uid);
                }
            });
        };

        _module.actions.refresh = function(context, isRefresh) {
            var promises = [];

            promises.push(countlyVue.$.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/o/populator/templates",
                data: {},
                success: function(templates) {
                    context.state.templates = countlyPopulator.defaultTemplates.concat(templates) ;

                    context.state.templates = context.state.templates.map(function(template) {
                        template.upCount = Object.keys(template.up || {}).length;
                        template.eventCount = Object.keys(template.events || {}).length;

                        return template;
                    });
                },
                error: function() {
                    if (!isRefresh) {
                        CountlyHelpers.notify({message: $.i18n.map["populator.failed-to-fetch-templates"], type: "error"});
                    }
                }
            }));

            return Promise.all(promises);
        };

        _module.actions.initialize = function(context) {
            context.dispatch("refresh", false);
        };

        return countlyVue.vuex.Module("countlyPopulator", _module);
    };
}(window.countlyPopulator = window.countlyPopulator || {}));