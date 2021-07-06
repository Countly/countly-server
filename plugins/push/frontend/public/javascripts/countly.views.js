/* global countlyVue,app,CV,countlyPushNotification,CountlyHelpers,jQuery,countlyManagementView,countlyCommon,$,countlyGlobal,countlyAuth,countlySegmentation,countlyUserdata,components,Backbone,moment*/
(function() {

    var AUTOMATIC_PUSH_NOTIFICATION_STATUS_FILTER_OPTIONS = [
        {label: CV.i18n("push-notification.status-scheduled"), value: countlyPushNotification.service.StatusEnum.SCHEDULED},
        {label: CV.i18n("push-notification.status-all"), value: countlyPushNotification.service.StatusEnum.ALL},
        {label: CV.i18n("push-notification.status-sent"), value: countlyPushNotification.service.StatusEnum.SENT},
        {label: CV.i18n("push-notification.status-sending"), value: countlyPushNotification.service.StatusEnum.SENDING},
        {label: CV.i18n("push-notification.status-aborted"), value: countlyPushNotification.service.StatusEnum.ABORTED},
        {label: CV.i18n("push-notification.status-failed"), value: countlyPushNotification.service.StatusEnum.FAILED},
        {label: CV.i18n("push-notification.status-stopped"), value: countlyPushNotification.service.StatusEnum.STOPPED}
    ];
    var TRANSACTIONAL_PUSH_NOTIFICATION_STATUS_FILTER_OPTIONS = AUTOMATIC_PUSH_NOTIFICATION_STATUS_FILTER_OPTIONS;

    var ONE_TIME_PUSH_NOTIFICATION_STATUS_FILTER_OPTIONS = AUTOMATIC_PUSH_NOTIFICATION_STATUS_FILTER_OPTIONS.concat([
        {label: CV.i18n("push-notification.status-draft"), value: countlyPushNotification.service.StatusEnum.DRAFT},
        {label: CV.i18n("push-notification.status-not-approved"), value: countlyPushNotification.service.StatusEnum.NOT_APPROVED},
    ]);

    var statusFilterOptions = {
        oneTime: ONE_TIME_PUSH_NOTIFICATION_STATUS_FILTER_OPTIONS,
        automatic: AUTOMATIC_PUSH_NOTIFICATION_STATUS_FILTER_OPTIONS,
        transactional: TRANSACTIONAL_PUSH_NOTIFICATION_STATUS_FILTER_OPTIONS
    };

    var platformFilterOptions = [
        {label: CV.i18n("push-notification.platform-filter-all"), value: countlyPushNotification.service.PlatformEnum.ALL},
        {label: CV.i18n("push-notification.platform-filter-android"), value: countlyPushNotification.service.PlatformEnum.ANDROID},
        {label: CV.i18n("push-notification.platform-filter-ios"), value: countlyPushNotification.service.PlatformEnum.IOS}
    ];

    var oneTimePeriodFilterOptions = [
        {label: CV.i18n("push-notification.time-chart-period-weekly"), value: countlyPushNotification.service.PeriodEnum.WEEKLY},
        {label: CV.i18n("push-notification.time-chart-period-monthly"), value: countlyPushNotification.service.PeriodEnum.MONTHLY},
    ];
    var automaticPeriodFilterOptions = [{label: CV.i18n("push-notification.time-chart-period-daily"), value: countlyPushNotification.service.PeriodEnum.DAILY}];
    var transactionalPeriodFilterOptions = [{label: CV.i18n("push-notification.time-chart-period-daily"), value: countlyPushNotification.service.PeriodEnum.DAILY}];


    var localizationFilterOptions = [
        {label: CV.i18n("push-notification-details.localization-filter-all"), value: countlyPushNotification.service.LocalizationEnum.ALL}
    ];
    var PushNotificationTabView = countlyVue.views.BaseView.extend({
        template: "#push-notification-tab",
        data: function() {
            return {
                platformFilters: platformFilterOptions,
                platformFilterLabels: {
                    oneTime: CV.i18n('push-notification.platform-filter-label-one-time'),
                    automatic: CV.i18n('push-notification.platform-filter-label-automatic'),
                    transactional: CV.i18n('push-notification.platform-filter-label-transactional')
                },
                statusFilters: statusFilterOptions,
                DEFAULT_ALPHA_COLOR_VALUE_HEX: 50,
                oneTimePeriodFilters: oneTimePeriodFilterOptions,
                selectedOneTimePeriodFilter: countlyPushNotification.service.PeriodEnum.WEEKLY,
                automaticPeriodFilters: automaticPeriodFilterOptions,
                selectedAutomaticPeriodFilter: countlyPushNotification.service.PeriodEnum.DAILY,
                transactionalPeriodFilters: transactionalPeriodFilterOptions,
                selectedTransactionalPeriodFilter: countlyPushNotification.service.PeriodEnum.DAILY,
                TypeEnum: countlyPushNotification.service.TypeEnum,
                UserEventEnum: countlyPushNotification.service.UserEventEnum,
                optionalTableColumns: [
                    {
                        value: "content",
                        label: CV.i18n('push-notification.table-message-content'),
                        default: false
                    },
                    {
                        value: "createdBy",
                        label: CV.i18n('push-notification.table-created-by'),
                        default: false
                    }
                ]
            };
        },
        computed: {
            selectedPushNotificationType: function() {
                return this.$store.state.countlyPushNotification.selectedPushNotificationType;
            },
            pushNotifications: function() {
                return this.$store.state.countlyPushNotification.pushNotifications;
            },
            isLoading: function() {
                return this.$store.state.countlyPushNotification.isLoading;
            },
            pushNotificationRows: function() {
                return this.pushNotifications.rows;
            },
            pushNotificationOptions: function() {
                var series = this.yAxisPushNotificationSeries;
                return {
                    xAxis: {
                        data: this.xAxisPushNotificationPeriods
                    },
                    series: series
                };
            },
            totalAppUsers: function() {
                return this.$store.state.countlyPushNotification.pushNotifications.totalAppUsers;
            },
            enabledUsers: function() {
                return this.$store.state.countlyPushNotification.pushNotifications.enabledUsers;
            },
            xAxisPushNotificationPeriods: function() {
                return this.$store.state.countlyPushNotification.pushNotifications.periods[this.selectedPeriodFilter];
            },
            yAxisPushNotificationSeries: function() {
                return this.pushNotifications.series[this.selectedPeriodFilter].map(function(pushNotificationSerie) {
                    return {
                        data: pushNotificationSerie.data,
                        name: pushNotificationSerie.label
                    };
                });
            },
            selectedStatusFilter: {
                get: function() {
                    return this.$store.state.countlyPushNotification.statusFilter;
                },
                set: function(value) {
                    this.$store.dispatch("countlyPushNotification/onSetStatusFilter", value);
                //TODO: filter table by status
                // this.$store.dispatch("countlyPushNotification/fetchByType");
                }
            },
            selectedPlatformFilter: {
                get: function() {
                    return this.$store.state.countlyPushNotification.platformFilter;
                },
                set: function(value) {
                    this.$store.dispatch("countlyPushNotification/onSetPlatformFilter", value);
                    this.$store.dispatch("countlyPushNotification/fetchAll");
                }
            },
            selectedPlatformFilterLabel: function() {
                return this.platformFilterLabel[this.selectedPushNotificationType];
            },
            selectedPeriodFilter: function() {
                if (this.selectedPushNotificationType === countlyPushNotification.service.TypeEnum.ONE_TIME) {
                    return this.selectedOneTimePeriodFilter;
                }
                else if (this.selectedPushNotificationType === countlyPushNotification.service.TypeEnum.AUTOMATIC) {
                    return this.selectedAutomaticPeriodFilter;
                }
                else {
                    return this.selectedTransactionalPeriodFilter;
                }
            }
        },
        methods: {
            refresh: function() {
                this.$store.dispatch('countlyPushNotification/fetchAll');
            },
            formatPercentage: function(value, decimalPlaces) {
                return CountlyHelpers.formatPercentage(value, decimalPlaces);
            },
            handleUserEvents: function(event, pushNotificationId) {
                if (event === this.UserEventEnum.DUPLICATE) {
                    this.$store.dispatch('countlyPushNotification/onDuplicatePushNotification', pushNotificationId);
                }
                else if (event === this.UserEventEnum.RESEND) {
                    this.$store.dispatch('countlyPushNotification/onResendPushNotification', pushNotificationId);
                }
                else {
                    this.$store.dispatch('countlyPushNotification/onDeletePushNotification', pushNotificationId);
                }
            },
            //TODO: use status action specifications when ready
            // eslint-disable-next-line no-unused-vars
            shouldShowDuplicateUserEvent: function(status) {
                return true;
            },
            //TODO: use status action specifications when ready
            // eslint-disable-next-line no-unused-vars
            shouldShowResendUserEvent: function(status) {
                return true;
            },
            //TODO: use status action specifications when ready
            // eslint-disable-next-line no-unused-vars
            shouldShowDeleteUserEvent: function(status) {
                return true;
            },
            getStatusBackgroundColor: function(status) {
                switch (status) {
                case countlyPushNotification.service.StatusEnum.SENT: {
                    return "#12AF51";
                }
                case countlyPushNotification.service.StatusEnum.ABORTED: {
                    return "#D23F00";
                }
                case countlyPushNotification.service.StatusEnum.SCHEDULED: {
                    return "#CDAD7A";
                }
                case countlyPushNotification.service.StatusEnum.STOPPED: {
                    return "#D23F00";
                }
                default: {
                    return "#FFFFFF";
                }
                }
            },
            onRowClick: function(row) {
                window.location.hash = "#/messaging/details/" + row._id;
            }
        },
        mounted: function() {
            this.$store.dispatch('countlyPushNotification/fetchAll');
        }
    });

    var PushNotificationView = countlyVue.views.BaseView.extend({
        template: "#push-notification",
        data: function() {
            return {
                pushNotificationTabs: [
                    {title: CV.i18n('push-notification.one-time'), name: countlyPushNotification.service.TypeEnum.ONE_TIME, component: PushNotificationTabView},
                    {title: CV.i18n('push-notification.automatic'), name: countlyPushNotification.service.TypeEnum.AUTOMATIC, component: PushNotificationTabView},
                    {title: CV.i18n('push-notification.transactional'), name: countlyPushNotification.service.TypeEnum.TRANSACTIONAL, component: PushNotificationTabView}
                ]
            };
        },
        computed: {
            selectedPushNotificationTab: {
                get: function() {
                    return this.$store.state.countlyPushNotification.selectedPushNotificationType;
                },
                set: function(value) {
                    this.$store.dispatch('countlyPushNotification/onSetPushNotificationType', value);
                    this.$store.dispatch('countlyPushNotification/fetchAll');
                }
            }
        },
        methods: {
            onCreatePushNotification: function() {},
        }
    });

    var pushNotificationVuex = [{
        clyModel: countlyPushNotification
    }];

    var pushNotificationViewWrapper = new countlyVue.views.BackboneWrapper({
        component: PushNotificationView,
        vuex: pushNotificationVuex,
        templates: [
            "/push/templates/push-notification.html",
            "/push/templates/push-notification-tab.html"
        ]
    });

    app.route('/messaging', 'messagingDashboardView', function() {
        this.renderWhenReady(pushNotificationViewWrapper);
    });

    var PushNotificationDetailsMessageContentTab = countlyVue.views.create({
        template: CV.T('/push/templates/push-notification-details-message-content-tab.html'),
        data: function() {
            return {
                selectedLocalizationFilter: countlyPushNotification.service.LocalizationEnum.ALL,
                localizationFilters: localizationFilterOptions
            };
        },
        computed: {
            message: function() {
                return this.$store.state.countlyPushNotification.details.pushNotification.message;
            }
        }
    });

    var PushNotificationDetailsTargetingTab = countlyVue.views.create({
        template: CV.T('/push/templates/push-notification-details-targeting-tab.html'),
        data: function() {
            return {
                DAY_TO_MS_RATIO: 86400 * 1000
            };
        },
        computed: {
            pushNotification: function() {
                return this.$store.state.countlyPushNotification.details.pushNotification;
            }
        },
        methods: {
            convertDaysInMsToDays: function(daysInMs) {
                return daysInMs / this.DAY_TO_MS_RATIO;
            }
        }
    });

    var PushNotificationDetailsErrorsTab = countlyVue.views.create({
        template: CV.T('/push/templates/push-notification-details-errors-tab.html'),
        computed: {
            errors: function() {
                return this.$store.state.countlyPushNotification.details.pushNotification.errors;
            },
        },
        methods: {
            hasErrors: function() {
                return this.$store.state.countlyPushNotification.details.pushNotification.failed > 0;
            }
        }
    });

    var MobileMessagePreview = countlyVue.views.create({
        template: CV.T("/push/templates/mobile-message-preview.html"),
        data: function() {
            return {
                selectedPlatform: this.getDefaultSelectedPlatform,
                PlatformEnum: countlyPushNotification.service.PlatformEnum,
                appName: countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].name || CV.i18n('push-notification.mobile-preview-default-app-name')
            };
        },
        props: {
            platforms: {
                type: Array,
                default: []
            },
            title: {
                type: String,
                default: CV.i18n('push-notification.mobile-preview-default-title')
            },
            content: {
                type: String,
                default: CV.i18n('push-notification.mobile-preview-default-content'),
            },
            buttons: {
                type: Array,
                default: []
            },
            media: {
                type: String,
                default: null
            }
        },
        computed: {
            hasAndroidPlatform: function() {
                return this.platforms.filter(function(platform) {
                    return platform.value === countlyPushNotification.service.PlatformEnum.ANDROID;
                }).length > 0;
            },
            hasIOSPlatform: function() {
                return this.platforms.filter(function(platform) {
                    return platform.value === countlyPushNotification.service.PlatformEnum.IOS;
                }).length > 0;
            },
            isAndroidPlatformSelected: function() {
                return this.selectedPlatform === countlyPushNotification.service.PlatformEnum.ANDROID;
            },
            isIOSPlatformSelected: function() {
                return this.selectedPlatform === countlyPushNotification.service.PlatformEnum.IOS;
            },
            getDefaultSelectedPlatform: function() {
                return this.hasIOSPlatform ? countlyPushNotification.service.PlatformEnum.IOS : countlyPushNotification.service.PlatformEnum.ANDROID;
            },
        },
        watch: {
            platforms: function() {
                this.selectedPlatform = this.getDefaultSelectedPlatform;
            }
        },
        methods: {
            timeNow: function() {
                return moment().format("H:mm");
            },
            setSelectedPlatform: function(value) {
                this.selectedPlatform = value;
            }
        },
    });

    var PushNotificationDetailsView = countlyVue.views.BaseView.extend({
        template: "#push-notification-details",
        data: function() {
            return {
                selectedPlatformFilter: countlyPushNotification.service.PlatformEnum.ALL,
                platformFilters: platformFilterOptions,
                selectedLocalizationFilter: countlyPushNotification.service.LocalizationEnum.ALL,
                localizationFilters: localizationFilterOptions,
                DEFAULT_ALPHA_COLOR_VALUE_HEX: 50,
                currentSummaryTab: "content",
                UserEventEnum: countlyPushNotification.service.UserEventEnum,
                summaryTabs: [
                    {
                        title: CV.i18n('push-notification-details.message-content-tab'),
                        name: "content",
                        component: PushNotificationDetailsMessageContentTab
                    },
                    {
                        title: CV.i18n('push-notification-details.targeting-tab'),
                        name: "targeting",
                        component: PushNotificationDetailsTargetingTab
                    },
                    {
                        title: CV.i18n('push-notification-details.errors-tab'),
                        name: "errors",
                        component: PushNotificationDetailsErrorsTab
                    }
                ]
            };
        },
        computed: {
            pushNotification: function() {
                return this.$store.state.countlyPushNotification.details.pushNotification;
            },
            message: function() {
                return this.$store.state.countlyPushNotification.details.pushNotification.message;
            },
            usersTargetedOptions: function() {
                return {
                    xAxis: {
                        type: "category",
                        data: [0, 1, 2, 3],
                        show: false
                    },
                    yAxis: {
                        type: "value",
                        max: 100,
                    },
                    series: [
                        {data: [ this.findTargetedUsers(), this.findSentPushNotifications(), this.findClickedPushNotifications(), this.findFailedPushNotifications()], showBackground: true, tooltip: {show: false}},
                        {data: [0, 0, 0, 0], tooltip: {show: false}},
                        {data: [0, 0, 0, 0], tooltip: {show: false}},
                        {data: [0, 0, 0, 0], tooltip: {show: false}}
                    ]
                };
            },
        },
        methods: {
            // eslint-disable-next-line no-unused-vars
            handleUserEvents: function(event, id) {
            },
            getStatusBackgroundColor: function() {
                if (this.pushNotification.status) {
                    switch (this.pushNotification.status.value) {
                    case countlyPushNotification.service.StatusEnum.SENT: {
                        return "#12AF51";
                    }
                    case countlyPushNotification.service.StatusEnum.ABORTED: {
                        return "#D23F00";
                    }
                    case countlyPushNotification.service.StatusEnum.SCHEDULED: {
                        return "#CDAD7A";
                    }
                    case countlyPushNotification.service.StatusEnum.STOPPED: {
                        return "#D23F00";
                    }
                    default: {
                        return "#FFFFFF";
                    }
                    }
                }
                return "#FFFFFF";
            },
            formatDateAgoText: function(date) {
                return countlyCommon.formatTimeAgoText(date).text;
            },
            findTargetedUsers: function() {
                //TODO: find how to calculate the targeted users;
                return CountlyHelpers.formatPercentage(100);
            },
            findSentPushNotifications: function() {
                return CountlyHelpers.formatPercentage(this.pushNotification.sent / this.pushNotification.total);
            },
            findClickedPushNotifications: function() {
                return CountlyHelpers.formatPercentage(this.pushNotification.actioned / this.pushNotification.sent);
            },
            findFailedPushNotifications: function() {
                return CountlyHelpers.formatPercentage(this.pushNotification.failed / this.pushNotification.total);
            }
        },
        components: {
            "mobile-message-preview": MobileMessagePreview
        },
        mounted: function() {
            if (this.$route.params.id) {
                this.$store.dispatch('countlyPushNotification/details/fetchById', this.$route.params.id);
            }
        }
    });

    var pushNotificationDetailsViewWrapper = new countlyVue.views.BackboneWrapper({
        component: PushNotificationDetailsView,
        vuex: pushNotificationVuex,
        templates: [
            "/push/templates/push-notification-details.html"
        ],
    });

    app.route('/messaging/details/*id', "messagingDetails", function(id) {
        pushNotificationDetailsViewWrapper.params = {
            id: id
        };
        this.renderWhenReady(pushNotificationDetailsViewWrapper);
    });

    //countly.views application management settings
    var featureName = 'push';

    app.addAppManagementView('push', jQuery.i18n.map['push.plugin-title'], countlyManagementView.extend({
        initialize: function() {
            this.plugin = 'push';
            this.templatePath = '/push/templates/push.html';
            this.resetTemplateData();
        },

        resetTemplateData: function() {
            var c = this.config();
            if (c.i && c.i._id) {
                this.templateData = {
                    i: {
                        _id: c.i._id,
                        type: c.i.type,
                        key: c.i.key,
                        team: c.i.team,
                        bundle: c.i.bundle,
                        help: c.i.type === 'apn_universal' && c.i._id ? '<i class="fa fa-check-circle"></i>' + jQuery.i18n.map['mgmt-plugins.push.uploaded.p12'] : c.i.type === 'apn_token' ? '<i class="fa fa-check-circle"></i>' + jQuery.i18n.map['mgmt-plugins.push.uploaded.p8'] : ''
                    // help: '<a href="' + countlyCommon.API_URL + '/i/pushes/download/' + c.i._id + '?api_key=' + countlyGlobal.member.api_key + '">' + jQuery.i18n.map['mgmt-plugins.push.uploaded'] + '</a>. ' + (c.i.type === 'apn_universal' ? (jQuery.i18n.map['mgmt-plugins.push.uploaded.bundle'] + ' ' + c.i.bundle) : '')
                    }
                };
            }
            else {
                this.templateData = {
                    i: {
                        type: 'apn_token',
                        key: '',
                        team: '',
                        bundle: '',
                    }
                };
            }
            var t = c.a && c.a && c.a.key ? jQuery.i18n.map['mgmt-plugins.push.detected'] + ' ' + (c.a.key.length > 50 ? 'FCM' : 'GCM') : '';
            this.templateData.a = {
                _id: c.a && c.a._id || '',
                key: c.a && c.a && c.a.key || '',
                help: c.a && c.a && c.a.key && c.a.key.length > 50 ? t : '',
                ehelp: c.a && c.a && c.a.key && c.a.key.length < 50 ? t : ''
            };
            this.templateData.h = {
                _id: c.h && c.h._id || '',
                key: c.h && c.h && c.h.key || '',
                secret: c.h && c.h && c.h.secret || ''
            };
            this.templateData.rate = {
                rate: c.rate && c.rate.rate || '',
                period: c.rate && c.rate.period || ''
            };
        },

        onChange: function(name, value) {
            if (name === 'i.type') {
                this.resetTemplateData();
                countlyCommon.dot(this.templateData, name, value);
                this.render();
            }
            else if (name === 'a.key' && value) {
                this.templateData.a.type = value.length > 100 ? 'fcm' : 'gcm';
                this.el.find('input[name="a.type"]').val(this.templateData.a.type);
            }
            else if (name === 'i.pass' && !value) {
                delete this.templateData.i.pass;
            }
        },

        isSaveAvailable: function() {
            var td = JSON.parse(JSON.stringify(this.templateData)),
                std = JSON.parse(this.savedTemplateData);

            if (td.i) {
                delete td.i.pass;
            }

            if (std.i) {
                delete std.i.pass;
            }

            return JSON.stringify(td) !== JSON.stringify(std);
        },

        validate: function() {
            var i = this.config().i || {},
                //a = this.config().a || {},
                t = this.templateData;

            if (t.i.type) {
                if (t.i.file && t.i.file.length) {
                    if (t.i.type === 'apn_token') {
                        if (!t.i.key) {
                            return jQuery.i18n.map['mgmt-plugins.push.error.nokey'];
                        }
                        if (!t.i.team) {
                            return jQuery.i18n.map['mgmt-plugins.push.error.noteam'];
                        }
                        if (!t.i.bundle) {
                            return jQuery.i18n.map['mgmt-plugins.push.error.nobundle'];
                        }
                    }
                }
                else {
                    if (t.i.type === 'apn_token') {
                        if ((t.i.key || '') !== (i.key || '') || (t.i.team || '') !== (i.team || '') || (t.i.bundle || '') !== (i.bundle || '')) {
                            return jQuery.i18n.map['mgmt-plugins.push.error.nofile'];
                        }
                    }
                }
            }

            if (!t.h.key && t.h.secret) {
                return jQuery.i18n.map['mgmt-plugins.push.error.h.key'];
            }
            if (t.h.key && !t.h.secret) {
                return jQuery.i18n.map['mgmt-plugins.push.error.h.secret'];
            }
            if (t.h.key && (parseInt(t.h.key) + '') !== t.h.key) {
                return jQuery.i18n.map['mgmt-plugins.push.error.h.keynum'];
            }
        },

        loadFile: function() {
            var data = JSON.parse(JSON.stringify(this.templateData));

            if (data.i.file) {
                if (data.i.file.indexOf('.p8') === data.i.file.length - 3) {
                    data.i.fileType = 'p8';
                }
                else if (data.i.file.indexOf('.p12') === data.i.file.length - 4) {
                    data.i.fileType = 'p12';
                }
                else {
                    return $.Deferred().reject('File type not supported');
                }

                var d = new $.Deferred(),
                    reader = new window.FileReader();

                reader.addEventListener('load', function() {
                    data.i.file = reader.result;
                    d.resolve({push: data});
                });
                reader.addEventListener('error', d.reject.bind(d));
                reader.readAsDataURL(this.el.find('input[name="i.file"]')[0].files[0]);

                return d.promise();
            }
            else {
                return $.when({push: data});
            }
        },

        prepare: function() {
        // var text = jQuery.i18n.map["plugins.confirm"];
        // var msg = { title: jQuery.i18n.map["plugins.processing"], message: jQuery.i18n.map["plugins.wait"], info: jQuery.i18n.map["plugins.hold-on"], sticky: true };
        // CountlyHelpers.confirm(text, "popStyleGreen popStyleGreenWide", function (result) {
        //     if (!result) {
        //         return true;
        //     }
        //     CountlyHelpers.notify(msg);
        //     app.activeView.togglePlugin(plugins);
        // },[jQuery.i18n.map["common.no-dont-continue"],jQuery.i18n.map["plugins.yes-i-want-to-apply-changes"]],{title:jQuery.i18n.map["plugins-apply-changes-to-plugins"],image:"apply-changes-to-plugins"});
            return this.loadFile().then(function(data) {
                delete data.push.i.help;
                delete data.push.a.help;

                if (!data.push.i.file && !data.push.i._id) {
                    data.push.i = null;
                }
                else if (data.push.i.file) {
                    delete data.push.i._id;
                }

                if (!data.push.a.key) {
                    data.push.a = null;
                }

                if (!data.push.h.key || !data.push.h.secret) {
                    data.push.h = null;
                }

                return data;
            });
        }
    }));

    app.addPageScript('/drill#', function() {
        if (Array.isArray(countlyGlobal.member.restrict) && countlyGlobal.member.restrict.indexOf('#/messaging') !== -1 || !countlyAuth.validateCreate(featureName)) {
            return;
        }
        if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === 'mobile') {
            if (countlyAuth.validateCreate(featureName)) {
                var content =
            '<div class="item" id="action-create-message">' +
                '<div class="item-icon">' +
                    '<span class="logo ion-chatbox-working"></span>' +
                '</div>' +
                '<div class="content">' +
                    '<div class="title" data-localize="pu.send-message"></div>' +
                    '<div class="subtitle" data-localize="pu.send-message-desc"></div>' +
                '</div>' +
            '</div>';

                $('#actions-popup').append(content);
                app.localize();
                $('#action-create-message').off('click').on('click', function() {
                    var message = {
                        apps: [countlyCommon.ACTIVE_APP_ID],
                        drillConditions: countlySegmentation.getRequestData()
                    };

                    // for (var k in filterData.dbFilter) {
                    //     if (k.indexOf('up.') === 0) message.conditions[k.substr(3).replace("cmp_","cmp.")] = filterData.dbFilter[k];
                    // }

                    components.push.popup.show(message);
                    app.recordEvent({
                        "key": "drill-action",
                        "count": 1,
                        "segmentation": {action: "push"}
                    });
                });
                $('#bookmark-view').on('click', '.bookmark-action.send', function() {
                    var filter = $(this).data('query');

                    var message = {
                        apps: [countlyCommon.ACTIVE_APP_ID],
                        drillConditions: filter
                    };

                    // for (var k in filter) {
                    //     if (k.indexOf('up.') === 0) message.conditions[k.substr(3).replace("cmp_","cmp.")] = filter[k];
                    // }

                    components.push.popup.show(message);
                });
            }
            else {
                $('#drill-actions').remove('.btn-create-message');
            }
        }
    });
    /**
* Modify user profile views with push additions
**/
    function modifyUserDetailsForPush() {
        if (Array.isArray(countlyGlobal.member.restrict) && countlyGlobal.member.restrict.indexOf('#/messaging') !== -1 || !countlyAuth.validateCreate(featureName)) {
            return;
        }
        if (Backbone.history.fragment.indexOf('manage/') === -1 && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === 'mobile') {
        //check if it is profile view
            if (app.activeView.updateEngagement) {
                var userDetails = countlyUserdata.getUserdetails();

                var tokens = [], platforms = [], test = false, prod = false;
                tokens = Object.keys(userDetails).filter(function(k) {
                    return k.indexOf('tk') === 0;
                }).map(function(k) {
                    return k.substr(2);
                });
                if (userDetails.tkid || userDetails.tkia || userDetails.tkip) {
                    platforms.push('i');
                }
                if (userDetails.tkat || userDetails.tkap) {
                    platforms.push('a');
                }

                test = !!userDetails.tkid || !!userDetails.tkia || !!userDetails.tkat;
                prod = !!userDetails.tkip || !!userDetails.tkap;

                if (tokens.length && countlyAuth.validateCreate('push')) {
                    if (!$('.btn-create-message').length) {
                        $('#user-profile-detail-buttons .cly-button-menu').append('<div class="item btn-create-message" >' + jQuery.i18n.map['push.create'] + '</div>');
                        app.activeView.resetExportSubmenu();
                    }
                    $('.btn-create-message').show().off('click').on('click', function() {
                        if (platforms.length) {
                            components.push.popup.show({
                                platforms: platforms,
                                apps: [countlyCommon.ACTIVE_APP_ID],
                                test: test && !prod,
                                userConditions: {did: {$in: [app.userdetailsView.user_did]}}
                            });
                        }
                        else {
                            CountlyHelpers.alert(jQuery.i18n.map['push.no-user-token'], 'red');
                        }
                    });
                    if (!$('#userdata-info > tbody > tr:last-child table .user-property-push').length) {
                        $('<tr class="user-property-push"><td class="text-left"><span>' + components.t('userdata.push') + '</span></td><td class="text-right"></td></tr>').appendTo($('#userdata-info > tbody > tr:last-child table tbody'));
                    }
                    $('#userdata-info > tbody > tr:last-child table .user-property-push td.text-right').html(tokens.map(function(t) {
                        return components.t('pu.tk.' + t);
                    }).join('<br />'));
                }
                else {
                    $('#userdata-info > tbody > tr:last-child table .user-property-push').remove();
                    $('.btn-create-message').remove();
                    app.activeView.resetExportSubmenu();
                }
            }
            else {
            //list view
                if (countlyAuth.validateCreate('push')) {
                    if (!$('.btn-create-message').length) {
                        $('.widget-header').append($('<a class="icon-button green btn-header right btn-create-message" data-localize="push.create"></a>').text(jQuery.i18n.map['push.create']));

                    }
                    $('.btn-create-message').off('click').on('click', function() {
                        var q = app.userdataView.getExportQuery().query, filterData = {};
                        if (q) {
                            try {
                                filterData = JSON.parse(q);
                            }
                            catch (ignored) {
                            //ignoring error
                            }
                        }

                        components.push.popup.show({
                            apps: [countlyCommon.ACTIVE_APP_ID],
                            userConditions: filterData
                        });
                    });
                }
                else {
                    $('.btn-create-message').remove();
                }
            }
        }
    }

    app.addRefreshScript('/users#', modifyUserDetailsForPush);
    app.addPageScript('/users#', modifyUserDetailsForPush);

    //countly.view global management settings
    $(document).ready(function() {
        if (countlyAuth.validateRead('push')) {
            app.addMenuForType("mobile", "reach", {code: "push", url: "#/messaging", text: "push-notification.title", icon: '<div class="logo ion-chatbox-working"></div>', priority: 10});
        }


        if (app.configurationsView) {
            app.configurationsView.registerLabel("push", "push.plugin-title");
            app.configurationsView.registerLabel("push.proxyhost", "push.proxyhost");
            app.configurationsView.registerLabel("push.proxyport", "push.proxyport");
        }

        var notes = countlyGlobal.member.notes;
        if (notes && notes.push && notes.push.gcm && notes.push.gcm !== true) {
            CountlyHelpers.notify({
                type: 'error',
                title: jQuery.i18n.map['push.note.gcm.t'],
                message: jQuery.i18n.prop('push.note.gcm.m', notes.push.gcm.apps.map(function(a) {
                    return a.name;
                }).join(', ')),
                sticky: true,
                onClick: function() {
                    return $.ajax({
                        type: "GET",
                        url: countlyCommon.API_URL + "/i/users/ack",
                        data: {
                            path: 'push.gcm'
                        },
                        success: function() {
                            notes.push.gcm = true;
                        }
                    });
                }
            });
        }

        $('body').off('click', '.routename-messagingDashboardView > .tab-buttons > div').on('click', '.routename-messagingDashboardView > .tab-buttons > div', function() {
            if ($(this).next().length === 1) {
                $('.widget-content').addClass('hide-zoom');
            }
            else {
                $('.widget-content').removeClass('hide-zoom');
            }
        });
    });
}());