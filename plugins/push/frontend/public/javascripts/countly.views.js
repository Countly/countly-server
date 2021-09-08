/* global countlyVue,app,CV,countlyPushNotification,countlyPushNotificationComponent,CountlyHelpers,jQuery,countlyManagementView,countlyCommon,$,countlyGlobal,countlyAuth,countlySegmentation,countlyUserdata,components,Backbone,moment,countlyEventsOverview,Promise*/
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

    var messageTypeFilterOptions = [
        {label: "Content message", value: countlyPushNotification.service.MessageTypeEnum.CONTENT},
        {label: "Silent message", value: countlyPushNotification.service.MessageTypeEnum.SILENT}
    ];

    var InitialEditedPushNotification = {
        activePlatformSettings: [],
        multipleLocalizations: false,
        name: "",
        platforms: [countlyPushNotification.service.PlatformEnum.ANDROID],
        targeting: countlyPushNotification.service.TargetingEnum.ALL,
        whenToDetermine: countlyPushNotification.service.WhenToDetermineEnum.BEFORE,
        message: {
            default: {
                title: "",
                content: "",
                localizationLabel: countlyPushNotification.service.DEFAULT_LOCALIZATION_LABEL,
                buttons: [],
                properties: {
                    title: {},
                    content: {}
                }
            },
        },
        settings: {
            ios: {
                subtitle: "",
                mediaURL: "",
                soundFileName: "",
                badgeNumber: "",
                onClickURL: "",
                json: null,
                userData: []
            },
            android: {
                mediaURL: "",
                soundFileName: "",
                badgeNumber: "",
                icon: "",
                onClickURL: "",
                json: null,
                userData: []
            },
            all: {
                mediaURL: ""
            }
        },
        messageType: countlyPushNotification.service.MessageTypeEnum.CONTENT,
        localizations: [countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE],
        cohorts: [],
        locations: [],
        delivery: {
            type: countlyPushNotification.service.DeliveryEnum.NOW,
            startDate: moment().valueOf(),
            endDate: moment().valueOf(),
            method: countlyPushNotification.service.DeliveryEnum.NOW
        },
        timeZone: countlyPushNotification.service.TimeZoneEnum.SAME,
        pastSchedule: countlyPushNotification.service.PastScheduleEnum.SKIP,
        expiration: {
            days: 7,
            hours: 0
        },
        automatic: {
            trigger: countlyPushNotification.service.TriggerEnum.COHORT_ENTRY,
            deliveryDate: countlyPushNotification.service.AutomaticDeliveryDateEnum.EVENT_SERVER_DATE,
            whenNotMet: countlyPushNotification.service.AutomaticWhenConditionNotMetEnum.SEND_ANYWAY,
            events: [],
            capping: false,
            maximumMessagesPerUser: 1,
            minimumTimeBetweenMessages: {
                days: 0,
                hours: 0
            },
            delayed: {
                days: 0,
                hours: 0
            }
        },
    };

    var InitialPushNotificationDrawerSettingsState = {
        ios: {
            isSubtitleEnabled: false,
            isMediaURLEnabled: false,
            isSoundFileNameEnabled: false,
            isBadgeNumberEnabled: false,
            isOnClickURLEnabled: false,
            isJsonEnabled: false,
            isUserDataEnabled: false,
        },
        android: {
            isMediaURLEnabled: false,
            isSoundFileNameEnabled: false,
            isBadgeNumberEnabled: false,
            isIconEnabled: false,
            isOnClickURLEnabled: false,
            isJsonEnabled: false,
            isUserDataEnabled: false,
        },
        all: {
            isMediaURLEnabled: false,
        }
    };

    var PushNotificationDrawer = countlyVue.views.create({
        template: CV.T("/push/templates/push-notification-drawer.html"),
        mixins: [countlyVue.mixins.i18n],
        data: function() {
            return {
                loading: false,
                //NOTE-LA:temporarily loading for drawer prepare method
                isLoading: false,
                localizationOptions: [],
                userPropertiesOptions: [],
                eventOptions: [],
                saveButtonLabel: "Submit",
                PlatformEnum: countlyPushNotification.service.PlatformEnum,
                TargetingEnum: countlyPushNotification.service.TargetingEnum,
                TypeEnum: countlyPushNotification.service.TypeEnum,
                MessageTypeEnum: countlyPushNotification.service.MessageTypeEnum,
                WhenToDetermineEnum: countlyPushNotification.service.WhenToDetermineEnum,
                DeliveryEnum: countlyPushNotification.service.DeliveryEnum,
                TimeZoneEnum: countlyPushNotification.service.TimeZoneEnum,
                PastScheduleEnum: countlyPushNotification.service.PastScheduleEnum,
                TriggerEnum: countlyPushNotification.service.TriggerEnum,
                AutomaticDeliveryDateEnum: countlyPushNotification.service.AutomaticDeliveryDateEnum,
                AutomaticWhenConditionNotMetEnum: countlyPushNotification.service.AutomaticWhenConditionNotMetEnum,
                MediaTypeEnum: countlyPushNotification.service.MediaTypeEnum,
                messageTypeFilterOptions: messageTypeFilterOptions,
                activeLocalization: countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE,
                selectedLocalizationFilter: countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE,
                isConfirmed: false,
                expandedPlatformSettings: [],
                isEndDateEnabled: false,
                settings: JSON.parse(JSON.stringify(InitialPushNotificationDrawerSettingsState)),
                userPropertiesIdCounter: 0,
                selectedUserPropertyId: null,
                selectedUserPropertyContainer: "title",
                isAddUserPropertyPopoverOpen: false,
                urlRegex: new RegExp('([A-Za-z][A-Za-z0-9+\\-.]*):(?:(//)(?:((?:[A-Za-z0-9\\-._~!$&\'()*+,;=:]|%[0-9A-Fa-f]{2})*)@)?((?:\\[(?:(?:(?:(?:[0-9A-Fa-f]{1,4}:){6}|::(?:[0-9A-Fa-f]{1,4}:){5}|(?:[0-9A-Fa-f]{1,4})?::(?:[0-9A-Fa-f]{1,4}:){4}|(?:(?:[0-9A-Fa-f]{1,4}:){0,1}[0-9A-Fa-f]{1,4})?::(?:[0-9A-Fa-f]{1,4}:){3}|(?:(?:[0-9A-Fa-f]{1,4}:){0,2}[0-9A-Fa-f]{1,4})?::(?:[0-9A-Fa-f]{1,4}:){2}|(?:(?:[0-9A-Fa-f]{1,4}:){0,3}[0-9A-Fa-f]{1,4})?::[0-9A-Fa-f]{1,4}:|(?:(?:[0-9A-Fa-f]{1,4}:){0,4}[0-9A-Fa-f]{1,4})?::)(?:[0-9A-Fa-f]{1,4}:[0-9A-Fa-f]{1,4}|(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))|(?:(?:[0-9A-Fa-f]{1,4}:){0,5}[0-9A-Fa-f]{1,4})?::[0-9A-Fa-f]{1,4}|(?:(?:[0-9A-Fa-f]{1,4}:){0,6}[0-9A-Fa-f]{1,4})?::)|[Vv][0-9A-Fa-f]+\\.[A-Za-z0-9\\-._~!$&\'()*+,;=:]+)\\]|(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|(?:[A-Za-z0-9\\-._~!$&\'()*+,;=]|%[0-9A-Fa-f]{2})*))(?::([0-9]*))?((?:/(?:[A-Za-z0-9\\-._~!$&\'()*+,;=:@]|%[0-9A-Fa-f]{2})*)*)|/((?:(?:[A-Za-z0-9\\-._~!$&\'()*+,;=:@]|%[0-9A-Fa-f]{2})+(?:/(?:[A-Za-z0-9\\-._~!$&\'()*+,;=:@]|%[0-9A-Fa-f]{2})*)*)?)|((?:[A-Za-z0-9\\-._~!$&\'()*+,;=:@]|%[0-9A-Fa-f]{2})+(?:/(?:[A-Za-z0-9\\-._~!$&\'()*+,;=:@]|%[0-9A-Fa-f]{2})*)*)|)(?:\\?((?:[A-Za-z0-9\\-._~!$&\'()*+,;=:@/?]|%[0-9A-Fa-f]{2})*))?(?:\\#((?:[A-Za-z0-9\\-._~!$&\'()*+,;=:@/?]|%[0-9A-Fa-f]{2})*))?'),
                addUserPropertyPopoverPosition: {
                    top: 0,
                    left: 0
                },
                mediaMetadata: {
                    all: null,
                    ios: null,
                    android: null
                },
                pushNotificationUnderEdit: JSON.parse(JSON.stringify(InitialEditedPushNotification))
            };
        },
        props: {
            type: {
                type: String,
                default: countlyPushNotification.service.TypeEnum.ONE_TIME
            },
            controls: {
                type: Object
            }
        },
        computed: {
            title: function() {
                if (this.type === countlyPushNotification.service.TypeEnum.ONE_TIME) {
                    return "Create One-Time Push Notification";
                }
                if (this.type === countlyPushNotification.service.TypeEnum.AUTOMATIC) {
                    return "Create Automated Push Notification";
                }
                if (this.type === countlyPushNotification.service.TypeEnum.TRANSACTIONAL) {
                    return "Create Transactional Push Notification";
                }
            },
            addButtonLabel: function() {
                if (this.pushNotificationUnderEdit.message[this.activeLocalization].buttons.length === 0) {
                    return "+Add First button";
                }
                return "+Add Second button";
            },
            isDefaultLocalizationActive: function() {
                return this.activeLocalization === countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE;
            },
            isAddButtonDisabled: function() {
                return this.pushNotificationUnderEdit.message[this.activeLocalization].buttons.length === 2;
            },
            selectedLocalizationFilterOptions: function() {
                var self = this;
                return this.pushNotificationUnderEdit.localizations.map(function(selectedLocalization) {
                    return {label: self.pushNotificationUnderEdit.message[selectedLocalization].label, value: selectedLocalization};
                });
            },
            selectedLocalizationMessage: function() {
                return this.pushNotificationUnderEdit.message[this.selectedLocalizationFilter];
            },
            enabledUsers: function() {
                return this.$store.state.countlyPushNotification.pushNotifications.enabledUsers;
            },
            selectedMessageLocale: function() {
                return this.pushNotificationUnderEdit.message[this.activeLocalization];
            },
            cohortOptions: function() {
                return this.$store.state.countlyPushNotification.pushNotifications.cohorts.map(function(cohort) {
                    return {label: cohort.name.replace(/&quot;/g, '\\"'), value: cohort._id};
                });
            },
            locationOptions: function() {
                return this.$store.state.countlyPushNotification.pushNotifications.locations.map(function(location) {
                    return {label: location.title, value: location._id};
                });
            },
            areCohortsAndLocationsRequired: function() {
                return !this.pushNotificationUnderEdit.cohorts.length && !this.pushNotificationUnderEdit.locations.length;
            },
            areEventsAndLocationsRequired: function() {
                return !this.pushNotificationUnderEdit.automatic.events.length && !this.pushNotificationUnderEdit.locations.length;
            },
            areLocationsRequired: function() {
                if (this.pushNotificationUnderEdit.automatic.trigger === countlyPushNotification.service.TriggerEnum.EVENT) {
                    return this.areEventsAndLocationsRequired;
                }
                else {
                    return this.areCohortsAndLocationsRequired;
                }
            },
            previewMessageMedia: function() {
                var result = {};
                if (this.mediaMetadata[this.PlatformEnum.ANDROID]) {
                    result[this.PlatformEnum.ANDROID] = {url: this.pushNotificationUnderEdit.settings.android.mediaURL, type: this.MediaTypeEnum.IMAGE};
                }
                if (this.mediaMetadata[this.PlatformEnum.IOS]) {
                    result[this.PlatformEnum.IOS] = {url: this.pushNotificationUnderEdit.settings.ios.mediaURL, type: this.mediaMetadata.ios.type };
                }
                if (this.mediaMetadata[this.PlatformEnum.ALL]) {
                    result[this.PlatformEnum.ALL] = {url: this.pushNotificationUnderEdit.settings.all.mediaURL, type: this.MediaTypeEnum.IMAGE };
                }
                return result;
            },
            previewMessageTitle: function() {
                return countlyPushNotification.helper.getPreviewMessageComponentsList(this.pushNotificationUnderEdit.message[this.selectedLocalizationFilter].title);
            },
            previewMessageContent: function() {
                return countlyPushNotification.helper.getPreviewMessageComponentsList(this.pushNotificationUnderEdit.message[this.selectedLocalizationFilter].content);
            },
            shouldDisplayIOSSettings: function() {
                return this.shouldDisplayPlatformSettings(this.PlatformEnum.IOS);
            },
            shouldDisplayAndroidSettings: function() {
                return this.shouldDisplayPlatformSettings(this.PlatformEnum.ANDROID);
            }
        },
        methods: {
            setUserPropertiesOptions: function(userPropertiesOptionsDto) {
                this.userPropertiesOptions = userPropertiesOptionsDto.reduce(function(allUserPropertyOptions, userPropertyOptionDto) {
                    if (userPropertyOptionDto.id) {
                        allUserPropertyOptions.push({label: userPropertyOptionDto.name, value: userPropertyOptionDto.id});
                    }
                    return allUserPropertyOptions;
                }, []);
            },
            fetchUserPropertiesOptionsIfEmpty: function() {
                if (!this.userPropertiesOptions.length) {
                    var self = this;
                    countlySegmentation.initialize("").then(function() {
                        self.setUserPropertiesOptions(countlySegmentation.getFilters());
                    });
                }
            },
            isDeliveryNextStepFromInfoStep: function(nextStep, currentStep) {
                return nextStep === 1 && currentStep === 0;
            },
            isReviewNextStepFromContentStep: function(nextStep, currentStep) {
                return nextStep === 3 && currentStep === 2;
            },
            isContentNextStepFromInfoStep: function(nextStep, currentStep) {
                return nextStep === 2 && currentStep === 0;
            },
            onStepClick: function(nextStep, currentStep) {
                if (this.isDeliveryNextStepFromInfoStep(nextStep, currentStep) || this.isContentNextStepFromInfoStep(nextStep, currentStep)) {
                    return this.prepareMessage();
                }
                if (this.isReviewNextStepFromContentStep(nextStep, currentStep)) {
                    return this.$refs.content.validate();
                }
                return Promise.reject(false);
            },
            setLocalizationOptions: function(localizations) {
                this.localizationOptions = localizations;
            },
            prepareMessage: function() {
                //TODO-LA: prepareMessage must return a promise 
                var self = this;
                var preparePushNotificationModel = Object.assign({}, this.pushNotificationUnderEdit);
                preparePushNotificationModel.type = this.type;
                countlyPushNotification.service.prepare(preparePushNotificationModel).then(function(response) {
                    self.setLocalizationOptions(response.localizations);
                // eslint-disable-next-line no-unused-vars
                }).catch(function(error) {
                    //TODO-LA: return promise that rejects to false and display proper error message in drawer
                    self.setLocalizationOptions([]);
                }).finally(function() {
                    self.isLoading = false;
                });
                return true;
            },
            onSubmit: function() {},
            resetState: function() {
                this.activeLocalization = countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE,
                this.selectedLocalizationFilter = countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE,
                this.isConfirmed = false,
                this.expandedPlatformSettings = [],
                this.isEndDateEnabled = false;
                this.selectedUserPropertyContainer = "title";
                this.settings = JSON.parse(JSON.stringify(InitialPushNotificationDrawerSettingsState));
                this.pushNotificationUnderEdit = JSON.parse(JSON.stringify(InitialEditedPushNotification));
            },
            onClose: function() {
                this.resetState();
                this.closeAddUserPropertyPopover();
            },
            onOpen: function() {
                this.fetchUserPropertiesOptionsIfEmpty();
            },
            onInfoAndTargetFormSubmit: function() {},
            remoteMethod: function() {},
            addButton: function() {
                this.pushNotificationUnderEdit.message[this.activeLocalization].buttons.push({label: "", url: ""});
            },
            removeButton: function(index) {
                var filteredButtons = this.pushNotificationUnderEdit.message[this.activeLocalization].buttons.filter(function(buttonItem, buttonIndex) {
                    return buttonIndex !== index;
                });
                this.pushNotificationUnderEdit.message[this.activeLocalization].buttons = filteredButtons;
            },
            removeAllNonDefaultSelectedLocalizations: function() {
                this.pushNotificationUnderEdit.localizations = this.pushNotificationUnderEdit.localizations.filter(function(selectedLocalization) {
                    return selectedLocalization === countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE;
                });
            },
            deleteAllNonDefaultLocalizationMessages: function() {
                var self = this;
                Object.keys(this.pushNotificationUnderEdit.message).forEach(function(key) {
                    if (key && key !== countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE) {
                        self.$delete(self.pushNotificationUnderEdit.message, key);
                    }
                });
            },
            onMultipleLocalizationChange: function(isChecked) {
                this.pushNotificationUnderEdit.multipleLocalizations = isChecked;
                if (!isChecked) {
                    this.setActiveLocalization(countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE);
                    this.resetMessageInHTMLToActiveLocalization();
                    this.deleteAllNonDefaultLocalizationMessages();
                    this.removeAllNonDefaultSelectedLocalizations();
                }
            },
            isDefaultLocalization: function(value) {
                return value === countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE;
            },
            isLocalizationSelected: function(value) {
                return this.pushNotificationUnderEdit.localizations.filter(function(selectedLocalization) {
                    return value === selectedLocalization;
                }).length > 0;
            },
            addEmptyLocalizationMessageIfNotFound: function(localization) {
                var value = localization.value;
                var label = localization.label;
                if (!this.pushNotificationUnderEdit.message[value]) {
                    this.$set(this.pushNotificationUnderEdit.message, value, {
                        title: "",
                        content: "",
                        localizationLabel: label,
                        buttons: [],
                        properties: {
                            title: {},
                            content: {}
                        }
                    });
                }
            },
            addLocalizationIfNotSelected: function(value) {
                if (!this.isLocalizationSelected(value)) {
                    this.pushNotificationUnderEdit.localizations.push(value);
                }
            },
            setActiveLocalization: function(value) {
                this.activeLocalization = value;
            },
            removeLocalization: function(value) {
                this.pushNotificationUnderEdit.localizations = this.pushNotificationUnderEdit.localizations.filter(function(activeLocalization) {
                    return value !== activeLocalization;
                });
            },
            resetMessageInHTMLToActiveLocalization: function() {
                this.$refs.title.reset(
                    this.pushNotificationUnderEdit.message[this.activeLocalization].title,
                    Object.keys(this.pushNotificationUnderEdit.message[this.activeLocalization].properties.title),
                    'title'
                );
                this.$refs.content.reset(
                    this.pushNotificationUnderEdit.message[this.activeLocalization].content,
                    Object.keys(this.pushNotificationUnderEdit.message[this.activeLocalization].properties.content),
                    'content'
                );
            },
            onLocalizationChange: function(localization) {
                if (!this.isLocalizationSelected(localization.value)) {
                    this.addEmptyLocalizationMessageIfNotFound(localization);
                    this.addLocalizationIfNotSelected(localization.value);
                    this.setActiveLocalization(localization.value);
                    this.resetMessageInHTMLToActiveLocalization();
                }
                else {
                    this.removeLocalization(localization.value);
                    this.setActiveLocalization(countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE);
                    this.resetMessageInHTMLToActiveLocalization();
                }
            },
            onLocalizationSelect: function(localization) {
                this.addEmptyLocalizationMessageIfNotFound(localization);
                this.setActiveLocalization(localization.value);
                this.resetMessageInHTMLToActiveLocalization();
            },
            onSendToTestUsers: function() {},
            onSettingChange: function(platform, property, value) {
                this.pushNotificationUnderEdit.settings[platform][property] = value;
            },
            onSettingToggle: function(platform, property, value) {
                this.settings[platform][property] = value;
                if (!value) {
                    this.pushNotificationUnderEdit.settings[platform][property] = "";
                }
            },
            onTitleChange: function(value) {
                this.pushNotificationUnderEdit.message[this.activeLocalization].title = value;
            },
            onContentChange: function(value) {
                this.pushNotificationUnderEdit.message[this.activeLocalization].content = value;
            },
            setSelectedUserPropertyId: function(id) {
                this.selectedUserPropertyId = id;
            },
            setSelectedUserPropertyContainer: function(container) {
                this.selectedUserPropertyContainer = container;
            },
            openAddUserPropertyPopover: function() {
                this.isAddUserPropertyPopoverOpen = true;
            },
            closeAddUserPropertyPopover: function() {
                this.isAddUserPropertyPopoverOpen = false;
            },
            addUserPropertyInHTML: function(id, container) {
                this.$refs[container].addEmptyUserProperty(id, container);
            },
            removeUserPropertyInHTML: function(id, container) {
                this.$refs[container].removeUserProperty(id);
            },
            setUserPropertyInHTML: function(id, container, previewValue, value) {
                this.$refs[container].setUserPropertyValue(id, previewValue, value);
            },
            setUserPropertyFallbackInHTML: function(id, container, previewValue, fallback) {
                this.$refs[container].setUserPropertyFallbackValue(id, previewValue, fallback);
            },
            setAddUserPropertyPopoverPosition: function(position) {
                this.addUserPropertyPopoverPosition = position;
            },
            onAddUserProperty: function(container) {
                if (!this.isAddUserPropertyPopoverOpen) {
                    var propertyIndex = this.userPropertiesIdCounter;
                    this.userPropertiesIdCounter = this.userPropertiesIdCounter + 1;
                    this.$set(this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container], propertyIndex, {
                        id: propertyIndex,
                        value: "",
                        label: "Select property|",
                        fallback: "",
                        isUppercase: false
                    });
                    this.setSelectedUserPropertyId(propertyIndex);
                    this.setSelectedUserPropertyContainer(container);
                    this.addUserPropertyInHTML(propertyIndex, container);
                }
            },
            onRemoveUserProperty: function(id, container) {
                this.closeAddUserPropertyPopover();
                this.$delete(this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container], id);
                this.removeUserPropertyInHTML(id, container);
            },
            onSelectUserProperty: function(id, container, value, label) {
                this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].value = value;
                this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].label = label;
                var currentFallbackValue = this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].fallback;
                var previewValue = label + "|" + currentFallbackValue;
                this.setUserPropertyInHTML(id, container, previewValue, value);
            },
            onInputFallbackUserProperty: function(id, container, fallback) {
                this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].fallback = fallback;
                var currentLabel = this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].label;
                var previewValue = currentLabel + "|" + fallback;
                this.setUserPropertyFallbackInHTML(id, container, previewValue, fallback);
            },
            onCheckUppercaseUserProperty: function(id, container, isUppercase) {
                this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].isUppercase = isUppercase;
            },
            onUserPropertyClick: function(id, container, position) {
                if (!this.isAddUserPropertyPopoverOpen) {
                    this.setSelectedUserPropertyId(id);
                    this.setSelectedUserPropertyContainer(container);
                    this.setAddUserPropertyPopoverPosition(position);
                    this.openAddUserPropertyPopover();
                }
            },
            resetAllMediaURLIfNecessary: function() {
                if (this.pushNotificationUnderEdit.settings.android.mediaURL && this.pushNotificationUnderEdit.settings.ios.mediaURL) {
                    this.pushNotificationUnderEdit.settings.all.mediaURL = "";
                }
            },
            onAllMediaURLInput: function(value) {
                var self = this;
                this.pushNotificationUnderEdit.settings.all.mediaURL = value;
                this.$refs.allMediaURLValidationProvider.validate(value).then(function(result) {
                    self.afterMediaURLValidate(self.PlatformEnum.ALL, result.valid);
                });
            },
            onAndroidMediaURLInput: function(value) {
                var self = this;
                this.pushNotificationUnderEdit.settings.android.mediaURL = value;
                this.$refs.androidMediaURLValidationProvider.validate(value).then(function(result) {
                    self.afterMediaURLValidate(self.PlatformEnum.ANDROID, result.valid);
                });
                this.resetAllMediaURLIfNecessary();
            },
            onIOSMediaURLInput: function(value) {
                var self = this;
                this.pushNotificationUnderEdit.settings.ios.mediaURL = value;
                this.$refs.iosMediaURLValidationProvider.validate(value).then(function(result) {
                    self.afterMediaURLValidate(self.PlatformEnum.IOS, result.valid);
                });
                this.resetAllMediaURLIfNecessary();
            },
            afterMediaURLValidate: function(platform, isValid) {
                if (isValid) {
                    this.fetchMediaMetadata(platform, this.pushNotificationUnderEdit.settings[platform].mediaURL);
                }
                else {
                    this.mediaMetadata[platform] = null;
                }
            },
            setMediaMetadata: function(platform, metadata) {
                this.mediaMetadata[platform] = metadata;
            },
            fetchMediaMetadata: function(platform, url) {
                var self = this;
                countlyPushNotification.service.fetchMediaMetadata(url).then(function(mediaMetadata) {
                    self.setMediaMetadata(platform, mediaMetadata);
                }).catch(function() {
                    self.setMediaMetadata(platform, {});
                });
            },
            fetchAllEvents: function() {
                var self = this;
                countlyEventsOverview.service.fetchAllEvents()
                    .then(function(events) {
                        self.eventOptions = events.list.map(function(event) {
                            return {label: event, value: event};
                        });
                    });
            },
            getUserProperties: function() {
                return countlySegmentation.getFilters().map(function(userFilter) {
                    return {label: userFilter.name, value: userFilter.id};
                });
            },
            shouldDisplayPlatformSettings: function(platform) {
                return this.pushNotificationUnderEdit.platforms.filter(function(selectedPlatform) {
                    return selectedPlatform === platform;
                }).length > 0;
            },
        },
        mounted: function() {
            this.fetchAllEvents();
            this.getUserProperties();
        },
        components: {
            "message-setting-element": countlyPushNotificationComponent.MessageSettingElement,
            "mobile-message-preview": countlyPushNotificationComponent.MobileMessagePreview,
            "message-editor-with-emoji-picker": countlyPushNotificationComponent.MessageEditorWithEmojiPicker,
            "add-user-property-popover": countlyPushNotificationComponent.AddUserPropertyPopover,
            "large-radio-button-with-description": countlyPushNotificationComponent.LargeRadioButtonWithDescription,
            "line-radio-button-with-description": countlyPushNotificationComponent.LineRadioButtonWithDescription,
            "review-section-row": countlyPushNotificationComponent.ReviewSectionRow,
            'user-property-preview': countlyPushNotificationComponent.UserPropertyPreview,
            'user-property-text-preview': countlyPushNotificationComponent.UserPropertyTextPreview
        },
    });

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
                //TODO-LA: filter table by status
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
            //TODO-LA: use status action specifications when ready
            // eslint-disable-next-line no-unused-vars
            shouldShowDuplicateUserEvent: function(status) {
                return true;
            },
            //TODO-LA: use status action specifications when ready
            // eslint-disable-next-line no-unused-vars
            shouldShowResendUserEvent: function(status) {
                return true;
            },
            //TODO-LA: use status action specifications when ready
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
        mixins: [countlyVue.mixins.hasDrawers("pushNotificationDrawer")],
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
            onCreatePushNotification: function() {
                this.openDrawer("pushNotificationDrawer");
            },
        },
        components: {
            "push-notification-drawer": PushNotificationDrawer
        }
    });

    var pushNotificationVuex = [{
        clyModel: countlyPushNotification
    }];

    var pushNotificationViewWrapper = new countlyVue.views.BackboneWrapper({
        component: PushNotificationView,
        vuex: pushNotificationVuex,
        templates: [
            "/push/templates/common-components.html",
            "/push/templates/push-notification.html",
            "/push/templates/push-notification-tab.html"
        ]
    });

    app.route('/messaging', 'messagingDashboardView', function() {
        this.renderWhenReady(pushNotificationViewWrapper);
    });


    var PushNotificationDetailsView = countlyVue.views.BaseView.extend({
        template: "#push-notification-details",
        data: function() {
            return {
                selectedPlatformFilter: countlyPushNotification.service.PlatformEnum.ALL,
                platformFilters: platformFilterOptions,
                selectedLocalizationFilter: countlyPushNotification.service.LocalizationEnum.ALL,
                localizationFilters: countlyPushNotification.service.getLocalizationFilterOptions(),
                DEFAULT_ALPHA_COLOR_VALUE_HEX: 50,
                currentSummaryTab: "message",
                UserEventEnum: countlyPushNotification.service.UserEventEnum,
                summaryTabs: [
                    {
                        title: CV.i18n('push-notification-details.message-tab'),
                        name: "message",
                        component: countlyPushNotificationComponent.DetailsMessageTab
                    },
                    {
                        title: CV.i18n('push-notification-details.targeting-tab'),
                        name: "targeting",
                        component: countlyPushNotificationComponent.DetailsTargetingTab
                    },
                    {
                        title: CV.i18n('push-notification-details.errors-tab'),
                        name: "errors",
                        component: countlyPushNotificationComponent.DetailsErrorsTab
                    }
                ],
                usersTargetedOptionsXAxis: {
                    type: "category",
                    data: [0],
                    show: false
                },
                usersTargetedOptionsYAxis: {
                    type: "value",
                    max: 100,
                    show: false,
                },
                barWidth: 150,
                barGrid: {
                    right: "80%",
                    left: 0,
                }
            };
        },
        computed: {
            pushNotification: function() {
                return this.$store.state.countlyPushNotification.details.pushNotification;
            },
            message: function() {
                return this.$store.state.countlyPushNotification.details.pushNotification.message;
            },
            pushNotificationChartBars: function() {
                return {
                    targetedUsers: this.getDetailsBaseChartOptions(this.findTargetedUsers()),
                    sentPushNotifications: this.getDetailsBaseChartOptions(this.findSentPushNotifications()),
                    clickedPushNotifications: this.getDetailsBaseChartOptions(this.findClickedPushNotifications()),
                    failedPushNotifications: this.getDetailsBaseChartOptions(this.findFailedPushNotifications())
                };
            },
            chartBarLegend: function() {
                return {
                    show: false
                };
            },
            totalAppUsers: function() {
                return this.$store.state.countlyPushNotification.details.pushNotification.total;
            }
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
            getDetailsBaseChartOptions: function(seriesData) {
                return {
                    xAxis: this.usersTargetedOptionsXAxis,
                    yAxis: this.usersTargetedOptionsYAxis,
                    series: [{data: [seriesData]}, this.getRemainingStackBar(seriesData)],
                    tooltip: {show: false},
                    stack: 'total',
                    grid: this.barGrid,
                    barWidth: this.barWidth
                };
            },
            getRemainingStackBar: function(value) {
                return {data: [100 - value], itemStyle: {color: "#E2E4E8"}, silent: true};
            },
            findTargetedUsers: function() {
                //TODO-LA: find how to calculate the targeted users;
                return CountlyHelpers.formatPercentage(1);
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
            "mobile-message-preview": countlyPushNotificationComponent.MobileMessagePreview
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
            "/push/templates/common-components.html",
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
            //TODO-LA: when geolocations is finished, remove the submenu and instead keep the menu entry only
            // app.addMenu("push", {code: "push", url: "#/messaging", text: "push-notification-title", priority: 20});
            app.addSubMenu("push", {code: "push", url: "#/messaging", text: "push-notification.title", priority: 20});
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