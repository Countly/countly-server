/* global countlyVue,app,CV,countlyPushNotification,countlyPushNotificationComponent,CountlyHelpers,countlyCommon,$,countlyGlobal,countlyAuth,Promise*/

(function() {

    var featureName = 'push';

    var statusFilterOptions = [
        {label: countlyPushNotification.service.ALL_FILTER_OPTION_LABEL, value: countlyPushNotification.service.ALL_FILTER_OPTION_VALUE},
        {label: CV.i18n("push-notification.status-created"), value: countlyPushNotification.service.StatusEnum.CREATED},
        {label: CV.i18n("push-notification.status-scheduled"), value: countlyPushNotification.service.StatusEnum.SCHEDULED},
        {label: CV.i18n("push-notification.status-sent"), value: countlyPushNotification.service.StatusEnum.SENT},
        {label: CV.i18n("push-notification.status-sending"), value: countlyPushNotification.service.StatusEnum.SENDING},
        {label: CV.i18n("push-notification.status-failed"), value: countlyPushNotification.service.StatusEnum.FAILED},
        {label: CV.i18n("push-notification.status-stopped"), value: countlyPushNotification.service.StatusEnum.STOPPED},
        {label: CV.i18n("push-notification.status-draft"), value: countlyPushNotification.service.StatusEnum.DRAFT},
        {label: CV.i18n("push-notification.status-pending-approval"), value: countlyPushNotification.service.StatusEnum.PENDING_APPROVAL},
    ];

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

    var InitialEnabledUsers = {
        ios: 0,
        android: 0,
    };

    var InitialPushNotificationDrawerSettingsState = {
        ios: {
            isSubtitleEnabled: false,
            isMediaURLEnabled: false,
            isSoundFilenameEnabled: true,
            isBadgeNumberEnabled: false,
            isOnClickURLEnabled: false,
            isJsonEnabled: false,
            isUserDataEnabled: false,
        },
        android: {
            isMediaURLEnabled: false,
            isSoundFilenameEnabled: true,
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
        props: {
            id: {
                type: String,
                default: null,
                required: false,
            },
            type: {
                type: String,
                default: countlyPushNotification.service.TypeEnum.ONE_TIME
            },
            userCommand: {
                type: String,
                default: countlyPushNotification.service.UserCommandEnum.CREATE,
            },
            controls: {
                type: Object
            },
            from: {
                type: String,
                default: null
            },
            queryFilter: {
                type: Object,
                default: null,
            },
            wrappedUserProperties: {
                type: Boolean,
                default: false,
                required: false
            }
        },
        data: function() {
            return {
                isFetchCohortsLoading: false,
                isFetchEventsLoading: false,
                isFetchLocationsLoading: false,
                isLoading: false,
                localizationOptions: [],
                userPropertiesOptions: [],
                cohortOptions: [],
                locationOptions: [],
                eventOptions: [],
                enabledUsers: JSON.parse(JSON.stringify(InitialEnabledUsers)),
                totalAppUsers: 0,
                PlatformEnum: countlyPushNotification.service.PlatformEnum,
                TargetingEnum: countlyPushNotification.service.TargetingEnum,
                TypeEnum: countlyPushNotification.service.TypeEnum,
                MessageTypeEnum: countlyPushNotification.service.MessageTypeEnum,
                AudienceSelectionEnum: countlyPushNotification.service.AudienceSelectionEnum,
                SendEnum: countlyPushNotification.service.SendEnum,
                DeliveryMethodEnum: countlyPushNotification.service.DeliveryMethodEnum,
                TimezoneEnum: countlyPushNotification.service.TimezoneEnum,
                PastScheduleEnum: countlyPushNotification.service.PastScheduleEnum,
                TriggerEnum: countlyPushNotification.service.TriggerEnum,
                DeliveryDateCalculationEnum: countlyPushNotification.service.DeliveryDateCalculationEnum,
                TriggerNotMetEnum: countlyPushNotification.service.TriggerNotMetEnum,
                MediaTypeEnum: countlyPushNotification.service.MediaTypeEnum,
                UserCommandEnum: countlyPushNotification.service.UserCommandEnum,
                UserPropertyTypeEnum: countlyPushNotification.service.UserPropertyTypeEnum,
                messageTypeFilterOptions: messageTypeFilterOptions,
                startDateOptions: countlyPushNotification.service.startDateOptions,
                targetingOptions: countlyPushNotification.service.targetingOptions,
                audienceSelectionOptions: countlyPushNotification.service.audienceSelectionOptions,
                triggerOptions: countlyPushNotification.service.triggerOptions,
                triggerNotMetOptions: countlyPushNotification.service.triggerNotMetOptions,
                deliveryDateCalculationOptions: countlyPushNotification.service.deliveryDateCalculationOptions,
                deliveryMethodOptions: countlyPushNotification.service.deliveryMethodOptions,
                activeLocalization: countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE,
                selectedLocalizationFilter: countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE,
                isConfirmed: false,
                expandedPlatformSettings: [],
                settings: JSON.parse(JSON.stringify(InitialPushNotificationDrawerSettingsState)),
                userPropertiesIdCounter: 0,
                selectedUserPropertyId: null,
                selectedUserPropertyContainer: "title",
                isAddUserPropertyPopoverOpen: false,
                isUsersTimezoneSet: false,
                isEndDateSet: false,
                isLocationSet: false,
                multipleLocalizations: false,
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
                pushNotificationUnderEdit: JSON.parse(JSON.stringify(countlyPushNotification.helper.getInitialModel(this.type))),
                currentNumberOfUsers: 0,
            };
        },
        watch: {
            type: function() {
                this.pushNotificationUnderEdit = JSON.parse(JSON.stringify(countlyPushNotification.helper.getInitialModel(this.type)));
            }
        },
        computed: {
            saveButtonLabel: function() {
                if (!countlyPushNotification.service.isPushNotificationApproverPluginEnabled()) {
                    return "Save";
                }
                if (countlyPushNotification.service.hasApproverBypassPermission()) {
                    return "Save";
                }
                return "Send for approval";
            },
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
            isDraftButtonEnabled: function() {
                return this.userCommand === this.UserCommandEnum.EDIT_DRAFT ||
                this.userCommand === this.UserCommandEnum.CREATE ||
                this.userCommand === this.UserCommandEnum.DUPLICATE;
            },
            isDefaultLocalizationActive: function() {
                return this.activeLocalization === countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE;
            },
            isAddButtonDisabled: function() {
                return this.pushNotificationUnderEdit.message[this.activeLocalization].buttons.length === 2;
            },
            selectedLocalizationFilterOptions: function() {
                return this.pushNotificationUnderEdit.localizations;
            },
            selectedLocalizationMessage: function() {
                return this.pushNotificationUnderEdit.message[this.selectedLocalizationFilter];
            },
            totalEnabledUsers: function() {
                var self = this;
                var total = 0;
                if (this.pushNotificationUnderEdit.platforms.some(function(selectedPlatform) {
                    return selectedPlatform === self.PlatformEnum.ANDROID;
                })) {
                    total += this.enabledUsers[this.PlatformEnum.ANDROID];
                }
                if (this.pushNotificationUnderEdit.platforms.some(function(selectedPlatform) {
                    return selectedPlatform === self.PlatformEnum.IOS;
                })) {
                    total += this.enabledUsers[this.PlatformEnum.IOS];
                }
                return total;
            },
            selectedMessageLocale: function() {
                return this.pushNotificationUnderEdit.message[this.activeLocalization];
            },
            areCohortsAndLocationsRequired: function() {
                return !this.pushNotificationUnderEdit.cohorts.length && !this.pushNotificationUnderEdit.locations.length;
            },
            hasAllPlatformMediaOnly: function() {
                return (!this.pushNotificationUnderEdit.settings[this.PlatformEnum.IOS].mediaURL &&
                !this.pushNotificationUnderEdit.settings[this.PlatformEnum.ANDROID].mediaURL) ||
                (!this.settings[this.PlatformEnum.IOS].isMediaURLEnabled &&
                !this.settings[this.PlatformEnum.ANDROID].isMediaURLEnabled);
            },
            previewIOSMediaURL: function() {
                var result = "";
                if (this.pushNotificationUnderEdit.settings[this.PlatformEnum.ALL].mediaURL) {
                    result = this.pushNotificationUnderEdit.settings[this.PlatformEnum.ALL].mediaURL;
                }
                if (this.pushNotificationUnderEdit.settings[this.PlatformEnum.IOS].mediaURL && this.settings[this.PlatformEnum.IOS].isMediaURLEnabled) {
                    result = this.pushNotificationUnderEdit.settings[this.PlatformEnum.IOS].mediaURL;
                }
                return result;
            },
            previewAndroidMediaURL: function() {
                var result = "";
                if (this.pushNotificationUnderEdit.settings[this.PlatformEnum.ALL].mediaURL) {
                    result = this.pushNotificationUnderEdit.settings[this.PlatformEnum.ALL].mediaURL;
                }
                if (this.pushNotificationUnderEdit.settings[this.PlatformEnum.ANDROID].mediaURL && this.settings[this.PlatformEnum.ANDROID].isMediaURLEnabled) {
                    result = this.pushNotificationUnderEdit.settings[this.PlatformEnum.ANDROID].mediaURL;
                }
                return result;
            },
            previewMessageMedia: function() {
                var result = {};
                if (this.mediaMetadata[this.PlatformEnum.ANDROID] && this.settings[this.PlatformEnum.ANDROID].isMediaURLEnabled) {
                    result[this.PlatformEnum.ANDROID] = {url: this.pushNotificationUnderEdit.settings.android.mediaURL, type: this.MediaTypeEnum.IMAGE};
                }
                if (this.mediaMetadata[this.PlatformEnum.IOS] && this.settings[this.PlatformEnum.IOS].isMediaURLEnabled) {
                    result[this.PlatformEnum.IOS] = {url: this.pushNotificationUnderEdit.settings.ios.mediaURL, type: this.mediaMetadata.ios.type};
                }
                if (this.mediaMetadata[this.PlatformEnum.ALL]) {
                    result[this.PlatformEnum.ALL] = {url: this.pushNotificationUnderEdit.settings.all.mediaURL, type: this.MediaTypeEnum.IMAGE};
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
            },
            previewPlatforms: function() {
                return this.pushNotificationUnderEdit.platforms.map(function(selectedPlatform) {
                    return countlyPushNotification.service.platformOptions[selectedPlatform].label;
                });
            },
            previewLocations: function() {
                var self = this;
                return this.locationOptions.reduce(function(allLocations, currentLocation) {
                    if (self.pushNotificationUnderEdit.locations.some(function(selectedLocationId) {
                        return currentLocation._id === selectedLocationId;
                    })) {
                        allLocations.push(currentLocation.name);
                    }
                    return allLocations;
                }, []);
            }
        },
        methods: {
            previewCohorts: function(cohorts) {
                var selectedCohorts = this.cohortOptions.filter(function(cohort) {
                    return cohorts.some(function(selectedCohortId) {
                        return cohort._id === selectedCohortId;
                    });
                });
                return selectedCohorts.map(function(cohort) {
                    return cohort.name.replace(/&quot;/g, '\\"');
                });
            },
            formatDateTime: function(dateTime, format) {
                return countlyPushNotification.helper.formatDateTime(dateTime, format);
            },
            setUserPropertyOptions: function(propertyList) {
                var allPropertyOptions = [];
                if (this.type === this.TypeEnum.AUTOMATIC && this.pushNotificationUnderEdit.automatic.trigger === this.TriggerEnum.EVENT) {
                    allPropertyOptions.push({label: "Event Properties", name: "eventProperties", options: countlyPushNotification.helper.getEventPropertyOptions(propertyList)});
                }
                allPropertyOptions.push({label: "User Properties", name: "userProperties", options: countlyPushNotification.helper.getUserPropertyOptions(propertyList)});
                allPropertyOptions.push({label: "Custom Properties", name: "customProperties", options: countlyPushNotification.helper.getCustomPropertyOptions(propertyList)});
                this.userPropertiesOptions = allPropertyOptions;
            },
            fetchUserPropertyOptions: function() {
                var self = this;
                countlyPushNotification.service.fetchUserProperties().then(function(result) {
                    self.setUserPropertyOptions(result);
                });
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
            isContentNextStepFromAnyPreviousStep: function(nextStep, currentStep) {
                return nextStep === 2 && currentStep < 2;
            },
            isEditMode: function() {
                return this.userCommand === this.UserCommandEnum.DUPLICATE ||
                this.userCommand === this.UserCommandEnum.EDIT_DRAFT ||
                this.userCommand === this.UserCommandEnum.EDIT ||
                this.userCommand === this.UserCommandEnum.RESEND;
            },
            shouldEstimate: function(nextStep, currentStep) {
                return this.isDeliveryNextStepFromInfoStep(nextStep, currentStep) || this.isContentNextStepFromInfoStep(nextStep, currentStep);
            },
            shouldValidateContentOnEnter: function(nextStep, currentStep) {
                return (this.isContentNextStepFromAnyPreviousStep(nextStep, currentStep) && this.isEditMode());
            },
            shouldValidateContentBeforeExit: function(nextStep, currentStep) {
                return this.isReviewNextStepFromContentStep(nextStep, currentStep) && this.pushNotificationUnderEdit.messageType === this.MessageTypeEnum.CONTENT;
            },
            validateContentOnEnterIfNecessary: function(nextStep, currentStep) {
                if (this.shouldValidateContentOnEnter(nextStep, currentStep)) {
                    this.$refs.content.validate();
                }
            },
            fetchUserPropertyOptionsOnContentEnter: function(nextStep, currentStep) {
                if (this.isContentNextStepFromAnyPreviousStep(nextStep, currentStep)) {
                    this.fetchUserPropertyOptions();
                }
            },
            onStepClick: function(nextStep, currentStep) {
                this.validateContentOnEnterIfNecessary(nextStep, currentStep);
                this.fetchUserPropertyOptionsOnContentEnter(nextStep, currentStep);
                if (this.shouldEstimate(nextStep, currentStep)) {
                    return this.estimate();
                }
                if (this.shouldValidateContentBeforeExit(nextStep, currentStep)) {
                    return this.$refs.content.validate();
                }
                return Promise.resolve(true);
            },
            setId: function(id) {
                this.pushNotificationUnderEdit._id = id;
            },
            setCurrentNumberOfUsers: function(value) {
                this.currentNumberOfUsers = value;
            },
            setLocalizationOptions: function(localizations) {
                this.localizationOptions = localizations;
            },
            setIsLoading: function(value) {
                this.isLoading = value;
            },
            dispatchUnknownErrorNotification: function() {
                CountlyHelpers.notify({
                    title: "Push Notification Error",
                    message: "Unknown error occurred. Please try again later.",
                    type: "error"
                });
            },
            getQueryFilter: function() {
                if (!this.queryFilter) {
                    return {};
                }
                if (this.wrappedUserProperties) {
                    var result = Object.assign({}, this.queryFilter);
                    result.queryObject = countlyPushNotification.helper.unwrapUserProperties(this.queryFilter.queryObject);
                    return result;
                }
                return this.queryFilter;
            },
            estimate: function() {
                var self = this;
                this.setIsLoading(true);
                return new Promise(function(resolve) {
                    var options = {};
                    options.isLocationSet = self.isLocationSet;
                    options.from = self.from;
                    options.queryFilter = self.getQueryFilter();
                    var preparePushNotificationModel = Object.assign({}, self.pushNotificationUnderEdit);
                    preparePushNotificationModel.type = self.type;
                    countlyPushNotification.service.estimate(preparePushNotificationModel, options).then(function(response) {
                        self.setLocalizationOptions(response.localizations);
                        if (response._id) {
                            self.setId(response._id);
                        }
                        self.setCurrentNumberOfUsers(response.total);
                        resolve(true);
                    }).catch(function(error) {
                        self.setLocalizationOptions([]);
                        CountlyHelpers.notify({
                            message: error.message,
                            type: "error"
                        });
                        resolve(false);
                    }).finally(function() {
                        self.setIsLoading(false);
                    });
                });
            },
            getBaseOptions: function() {
                var options = {};
                options.totalAppUsers = this.totalAppUsers;
                options.localizations = this.localizationOptions;
                options.settings = this.settings;
                options.isUsersTimezoneSet = this.isUsersTimezoneSet;
                options.isEndDateSet = this.isEndDateSet;
                options.isLocationSet = this.isLocationSet;
                options.from = this.from;
                options.queryFilter = this.getQueryFilter();
                return options;
            },
            save: function(options) {
                if (!options) {
                    options = {};
                }
                options = Object.assign(options, this.getBaseOptions());
                var model = Object.assign({}, this.pushNotificationUnderEdit);
                model.type = this.type;
                return countlyPushNotification.service.save(model, options);
            },
            sendToTestUsers: function(options) {
                if (!options) {
                    options = {};
                }
                options = Object.assign(options, this.getBaseOptions());
                var model = Object.assign({}, this.pushNotificationUnderEdit);
                model.type = this.type;
                return countlyPushNotification.service.sendToTestUsers(model, options);
            },
            update: function(options) {
                if (!options) {
                    options = {};
                }
                options = Object.assign(options, this.getBaseOptions());
                var model = Object.assign({}, this.pushNotificationUnderEdit);
                model.type = this.type;
                return countlyPushNotification.service.update(model, options);
            },
            resend: function(options) {
                if (!options) {
                    options = {};
                }
                options = Object.assign(options, this.getBaseOptions());
                var model = Object.assign({}, this.pushNotificationUnderEdit);
                model.type = this.type;
                return countlyPushNotification.service.resend(model, options);
            },
            saveDraft: function() {
                var options = {};
                options.isDraft = true;
                options.isCreated = false;
                return this.save(options);
            },
            updateDraft: function() {
                var options = {};
                options.isDraft = true;
                options.isCreated = false;
                return this.update(options);
            },
            saveFromDraft: function() {
                var options = {};
                options.isDraft = true;
                options.isCreated = true;
                return this.update(options);
            },
            onDraft: function() {
                var self = this;
                var promiseMethod = null;
                if (this.userCommand === this.UserCommandEnum.EDIT_DRAFT) {
                    promiseMethod = this.updateDraft;
                }
                if (this.userCommand === this.UserCommandEnum.CREATE) {
                    promiseMethod = this.saveDraft;
                }
                if (this.userCommand === this.UserCommandEnum.DUPLICATE) {
                    promiseMethod = this.saveDraft;
                }
                if (!promiseMethod) {
                    throw new Error('Invalid user command:' + this.userCommand);
                }
                promiseMethod().then(function() {
                    self.$refs.drawer.doClose();
                    CountlyHelpers.notify({
                        message: "Push notification message was successfully saved."
                    });
                    self.$emit('save');
                }).catch(function(error) {
                    CountlyHelpers.notify({
                        message: error.message,
                        type: "error"
                    });
                });
            },
            onSubmit: function(_, done) {
                var self = this;
                var promiseMethod = null;
                if (this.userCommand === this.UserCommandEnum.EDIT_DRAFT) {
                    promiseMethod = this.saveFromDraft;
                }
                if (this.userCommand === this.UserCommandEnum.EDIT) {
                    promiseMethod = this.update;
                }
                if (this.userCommand === this.UserCommandEnum.CREATE) {
                    promiseMethod = this.save;
                }
                if (this.userCommand === this.UserCommandEnum.DUPLICATE) {
                    promiseMethod = this.save;
                }
                if (this.userCommand === this.UserCommandEnum.RESEND) {
                    promiseMethod = this.resend;
                }
                if (!promiseMethod) {
                    throw new Error('Invalid user command:' + this.userCommand);
                }
                promiseMethod().then(function() {
                    done();
                    CountlyHelpers.notify({
                        message: "Push notification message was successfully saved."
                    });
                    self.$emit('save');
                }).catch(function(error) {
                    CountlyHelpers.notify({
                        message: error.message,
                        type: "error"
                    });
                    done(true);
                });
            },
            onSendToTestUsers: function() {
                var self = this;
                this.isLoading = true;
                this.sendToTestUsers().then(function() {
                    CountlyHelpers.notify({
                        message: "Push notification message was successfully sent to test users."
                    });
                }).catch(function(error) {
                    CountlyHelpers.notify({
                        message: error.message,
                        type: "error"
                    });
                }).finally(function() {
                    self.isLoading = false;
                });
            },
            resetState: function() {
                this.activeLocalization = countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE;
                this.selectedLocalizationFilter = countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE;
                this.isUsersTimezoneSet = false;
                this.isEndDateSet = false;
                this.isLocationSet = false;
                this.isConfirmed = false;
                this.multipleLocalizations = false;
                this.expandedPlatformSettings = [];
                this.selectedUserPropertyContainer = "title";
                this.settings = JSON.parse(JSON.stringify(InitialPushNotificationDrawerSettingsState));
                this.pushNotificationUnderEdit = JSON.parse(JSON.stringify(countlyPushNotification.helper.getInitialModel(this.type)));
            },
            onClose: function() {
                this.resetState();
                this.closeAddUserPropertyPopover();
                this.$emit('onClose');
            },
            onOpen: function() {
                if (this.id) {
                    this.fetchPushNotificationById();
                }
            },
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
                    return selectedLocalization.value === countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE;
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
            expandPlatformSettingsIfSilentMessage: function() {
                if (this.pushNotificationUnderEdit.messageType === this.MessageTypeEnum.SILENT) {
                    this.expandedPlatformSettings = [].concat(this.pushNotificationUnderEdit.platforms);
                }
            },
            onMessageTypeChange: function(value) {
                this.pushNotificationUnderEdit.messageType = value;
                this.expandPlatformSettingsIfSilentMessage();
            },
            onMultipleLocalizationChange: function(isChecked) {
                this.multipleLocalizations = isChecked;
                if (!isChecked) {
                    this.setActiveLocalization(countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE);
                    this.resetMessageInHTMLToActiveLocalization();
                    this.deleteAllNonDefaultLocalizationMessages();
                    this.removeAllNonDefaultSelectedLocalizations();
                }
            },
            isDefaultLocalization: function(item) {
                return item.value === countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE;
            },
            isLocalizationSelected: function(item) {
                return this.pushNotificationUnderEdit.localizations.filter(function(selectedLocalization) {
                    return item.value === selectedLocalization.value;
                }).length > 0;
            },
            addEmptyLocalizationMessageIfNotFound: function(localization) {
                var value = localization.value;
                if (!this.pushNotificationUnderEdit.message[value]) {
                    this.$set(this.pushNotificationUnderEdit.message, value, {
                        title: "",
                        content: "",
                        buttons: [],
                        properties: {
                            title: {},
                            content: {}
                        }
                    });
                }
            },
            addLocalizationIfNotSelected: function(item) {
                if (!this.isLocalizationSelected(item)) {
                    this.pushNotificationUnderEdit.localizations.push(item);
                }
            },
            setActiveLocalization: function(value) {
                this.activeLocalization = value;
            },
            removeLocalization: function(item) {
                this.pushNotificationUnderEdit.localizations = this.pushNotificationUnderEdit.localizations.filter(function(selectedLocalization) {
                    return item.value !== selectedLocalization.value;
                });
            },
            resetMessageInHTMLToActiveLocalization: function() {
                this.$refs.title.reset(
                    this.pushNotificationUnderEdit.message[this.activeLocalization].title,
                    Object.keys(this.pushNotificationUnderEdit.message[this.activeLocalization].properties.title)
                );
                this.$refs.content.reset(
                    this.pushNotificationUnderEdit.message[this.activeLocalization].content,
                    Object.keys(this.pushNotificationUnderEdit.message[this.activeLocalization].properties.content)
                );
            },
            onLocalizationChange: function(localization) {
                if (!this.isLocalizationSelected(localization)) {
                    this.addEmptyLocalizationMessageIfNotFound(localization);
                    this.addLocalizationIfNotSelected(localization);
                    this.setActiveLocalization(localization.value);
                    this.resetMessageInHTMLToActiveLocalization();
                }
                else {
                    this.removeLocalization(localization);
                    this.setActiveLocalization(countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE);
                    this.resetMessageInHTMLToActiveLocalization();
                }
            },
            onLocalizationSelect: function(localization) {
                this.addEmptyLocalizationMessageIfNotFound(localization);
                this.setActiveLocalization(localization.value);
                this.resetMessageInHTMLToActiveLocalization();
            },

            onSettingChange: function(platform, property, value) {
                this.pushNotificationUnderEdit.settings[platform][property] = value;
            },
            onSettingToggle: function(platform, property, value) {
                this.settings[platform][property] = value;
            },
            prettifyJSON: function(value) {
                return countlyPushNotification.helper.prettifyJSON(value, 2);
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
                this.$refs[container].addEmptyUserProperty(id);
            },
            removeUserPropertyInHTML: function(id, container) {
                this.$refs[container].removeUserProperty(id);
            },
            setUserPropertyInHTML: function(id, container, previewValue, value, type) {
                this.$refs[container].setUserPropertyValue(id, previewValue, value, type);
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
                        type: this.UserPropertyTypeEnum.USER,
                        label: "Select property|",
                        fallback: "",
                        isUppercase: false
                    });
                    this.setSelectedUserPropertyId(propertyIndex);
                    this.setSelectedUserPropertyContainer(container);
                    this.addUserPropertyInHTML(propertyIndex, container);
                }
            },
            onRemoveUserProperty: function(payload) {
                var id = payload.id;
                var container = payload.container;
                this.closeAddUserPropertyPopover();
                this.$delete(this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container], id);
                this.removeUserPropertyInHTML(id, container);
            },
            onSelectUserProperty: function(payload) {
                var id = payload.id;
                var container = payload.container;
                var value = payload.value;
                var label = payload.label;
                var type = payload.type;
                this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].value = value;
                this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].label = label;
                this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].type = type;
                var currentFallbackValue = this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].fallback;
                var previewValue = label + "|" + currentFallbackValue;
                this.setUserPropertyInHTML(id, container, previewValue, value, type);
            },
            onInputUserProperty: function(payload) {
                var id = payload.id;
                var container = payload.container;
                var value = payload.value;
                var label = payload.value;
                var type = this.UserPropertyTypeEnum.API;
                this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].value = value;
                this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].label = label;
                this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].type = type;
                var currentFallbackValue = this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].fallback;
                var previewValue = "{" + value + "}|" + currentFallbackValue;
                this.setUserPropertyInHTML(id, container, previewValue, value, type);
            },
            onInputFallbackUserProperty: function(payload) {
                var id = payload.id;
                var container = payload.container;
                var fallback = payload.value;
                this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].fallback = fallback;
                var currentLabel = this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].label;
                var previewValue = currentLabel + "|" + fallback;
                this.setUserPropertyFallbackInHTML(id, container, previewValue, fallback);
            },
            onCheckUppercaseUserProperty: function(payload) {
                var id = payload.id;
                var container = payload.container;
                var isUppercase = payload.value;
                this.pushNotificationUnderEdit.message[this.activeLocalization].properties[container][id].isUppercase = isUppercase;
            },
            onUserPropertyClick: function(payload) {
                if (!this.isAddUserPropertyPopoverOpen) {
                    this.setSelectedUserPropertyId(payload.id);
                    this.setSelectedUserPropertyContainer(payload.container);
                    this.setAddUserPropertyPopoverPosition(payload.position);
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
            setMediaMime: function(platform, value) {
                this.pushNotificationUnderEdit.settings[platform].mediaMime = value;
            },
            setMediaMetadata: function(platform, metadata) {
                this.mediaMetadata[platform] = metadata;
            },
            fetchMediaMetadata: function(platform, url) {
                var self = this;
                countlyPushNotification.service.fetchMediaMetadata(url).then(function(mediaMetadata) {
                    self.setMediaMetadata(platform, mediaMetadata);
                    self.setMediaMime(platform, mediaMetadata.mime);
                }).catch(function() {
                    self.setMediaMetadata(platform, {});
                    self.setMediaMime(platform, "");
                });
            },
            setCohortOptions: function(cohorts) {
                this.cohortOptions = cohorts;
            },
            fetchCohorts: function() {
                var self = this;
                this.isFetchCohortsLoading = true;
                countlyPushNotification.service.fetchCohorts()
                    .then(function(cohorts) {
                        self.setCohortOptions(cohorts);
                    }).catch(function() {
                        self.setCohortOptions([]);
                    }).finally(function() {
                        self.isFetchCohortsLoading = false;
                    });
            },
            setLocationOptions: function(locations) {
                this.locationOptions = locations;
            },
            fetchLocations: function() {
                var self = this;
                this.isFetchLocationsLoading = true;
                countlyPushNotification.service.fetchLocations()
                    .then(function(locations) {
                        self.setLocationOptions(locations);
                    }).catch(function() {
                        self.setLocationOptions([]);
                    }).finally(function() {
                        self.isFetchLocationsLoading = false;
                    });
            },
            setEventOptions: function(events) {
                this.eventOptions = events;
            },
            fetchEvents: function() {
                var self = this;
                this.isFetchEventsLoading = true;
                countlyPushNotification.service.fetchEvents()
                    .then(function(events) {
                        self.setEventOptions(events);
                    }).catch(function() {
                        self.setEventOptions([]);
                    }).finally(function() {
                        self.isFetchEventsLoading = false;
                    });
            },
            setTotalAppUsers: function(totalAppUsers) {
                this.totalAppUsers = totalAppUsers;
            },
            setEnabledUsers: function(enabledUsers) {
                this.enabledUsers = enabledUsers;
            },
            fetchDashboard: function() {
                var self = this;
                countlyPushNotification.service.fetchDashboard(this.type)
                    .then(function(response) {
                        self.setTotalAppUsers(response.totalAppUsers);
                        self.setEnabledUsers(response.enabledUsers);
                    })
                    .catch(function() {
                        self.setTotalAppUsers(0);
                        self.setEnabledUsers(JSON.parse(JSON.stringify(InitialEnabledUsers)));
                        //TODO: log error;
                    });
            },
            setPushNotificationUnderEdit: function(value) {
                this.pushNotificationUnderEdit = value;
            },
            fetchPushNotificationById: function() {
                var self = this;
                this.setIsLoading(true);
                countlyPushNotification.service.fetchById(this.id)
                    .then(function(response) {
                        self.setPushNotificationUnderEdit(response);
                        if (self.userCommand === self.UserCommandEnum.DUPLICATE) {
                            self.setId(null);
                        }
                        self.resetMessageInHTMLToActiveLocalization();
                    })
                    .catch(function() {
                        var initialModel = JSON.parse(JSON.stringify(countlyPushNotification.helper.getInitialModel(this.type)));
                        initialModel.type = self.type;
                        self.setPushNotificationUnderEdit(initialModel);
                        //TODO: log error;
                    })
                    .finally(function() {
                        self.setIsLoading(false);
                    });
            },
            shouldDisplayPlatformSettings: function(platform) {
                return this.pushNotificationUnderEdit.platforms.filter(function(selectedPlatform) {
                    return selectedPlatform === platform;
                }).length > 0;
            },
        },
        mounted: function() {
            this.fetchCohorts();
            this.fetchLocations();
            this.fetchEvents();
            this.fetchDashboard();
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
        mixins: [countlyVue.mixins.commonFormatters],
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
                statusOptions: countlyPushNotification.service.statusOptions,
                selectedAutomaticPeriodFilter: countlyPushNotification.service.PeriodEnum.DAILY,
                transactionalPeriodFilters: transactionalPeriodFilterOptions,
                selectedTransactionalPeriodFilter: countlyPushNotification.service.PeriodEnum.DAILY,
                TypeEnum: countlyPushNotification.service.TypeEnum,
                PlatformEnum: countlyPushNotification.service.PlatformEnum,
                UserCommandEnum: countlyPushNotification.service.UserCommandEnum,
                StatusEnum: countlyPushNotification.service.StatusEnum,
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
                return this.$store.state.countlyPushNotification.main.selectedPushNotificationType;
            },
            isDashboardLoading: function() {
                return this.$store.state.countlyPushNotification.main.isDashboardLoading;
            },
            areRowsLoading: function() {
                return this.$store.state.countlyPushNotification.main.areRowsLoading;
            },
            isUserCommandLoading: function() {
                return this.$store.getters['countlyPushNotification/main/isLoading'];
            },
            pushNotificationRows: function() {
                var self = this;
                if (this.selectedStatusFilter === countlyPushNotification.service.ALL_FILTER_OPTION_VALUE) {
                    return this.$store.state.countlyPushNotification.main.rows;
                }
                return this.$store.state.countlyPushNotification.main.rows.filter(function(rowItem) {
                    return rowItem.status === self.selectedStatusFilter;
                });
            },
            pushNotificationOptions: function() {
                return {
                    xAxis: {
                        data: this.xAxisPushNotificationPeriods
                    },
                    series: this.yAxisPushNotificationSeries
                };
            },
            totalAppUsers: function() {
                return this.$store.state.countlyPushNotification.main.dashboard.totalAppUsers;
            },
            enabledUsers: function() {
                return this.$store.state.countlyPushNotification.main.dashboard.enabledUsers[this.PlatformEnum.ALL];
            },
            enabledUsersPercentage: function() {
                if (!this.totalAppUsers) {
                    return 0;
                }
                return Math.ceil(this.enabledUsers / this.totalAppUsers);
            },
            xAxisPushNotificationPeriods: function() {
                return this.$store.state.countlyPushNotification.main.dashboard.periods[this.selectedPeriodFilter];
            },
            yAxisPushNotificationSeries: function() {
                var self = this;
                return this.$store.state.countlyPushNotification.main.dashboard.series[this.selectedPeriodFilter].map(function(pushNotificationSerie) {
                    return {
                        data: pushNotificationSerie.data[self.selectedPlatformFilter],
                        name: pushNotificationSerie.label
                    };
                });
            },
            legend: function() {
                return {
                    show: true,
                    type: "primary",
                    data: [
                        {
                            name: CV.i18n('push-notification.sent-serie-name'),
                            value: this.formatNumber(this.$store.state.countlyPushNotification.main.dashboard.totalSent[this.selectedPushNotificationType]),
                            tooltip: CV.i18n('push-notification.sent-serie-description')
                        },
                        {
                            name: CV.i18n('push-notification.actions-performed-serie-name'),
                            value: this.formatNumber(this.$store.state.countlyPushNotification.main.dashboard.totalActions[this.selectedPushNotificationType]),
                            tooltip: CV.i18n('push-notification.actions-performed-serie-description')
                        }
                    ]
                };
            },
            selectedStatusFilter: {
                get: function() {
                    return this.$store.state.countlyPushNotification.main.statusFilter;
                },
                set: function(value) {
                    this.$store.dispatch("countlyPushNotification/main/onSetStatusFilter", value);
                }
            },
            selectedPlatformFilter: {
                get: function() {
                    return this.$store.state.countlyPushNotification.main.platformFilter;
                },
                set: function(value) {
                    this.$store.dispatch("countlyPushNotification/main/onSetPlatformFilter", value);
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
                this.$store.dispatch('countlyPushNotification/main/fetchAll', false);
            },
            formatPercentage: function(value, decimalPlaces) {
                return this.formatNumber(CountlyHelpers.formatPercentage(value, decimalPlaces));
            },
            getPreviewPlatforms: function(platforms) {
                return platforms.map(function(item) {
                    return countlyPushNotification.service.platformOptions[item].label;
                }).sort().join(', ');
            },
            onApprove: function(id) {
                this.handleUserCommands(this.UserCommandEnum.APPROVE, id);
            },
            handleUserCommands: function(command, pushNotificationId) {
                this.$store.dispatch('countlyPushNotification/main/onUserCommand', {type: command, pushNotificationId: pushNotificationId});
                switch (command) {
                case this.UserCommandEnum.RESEND: {
                    this.$store.dispatch('countlyPushNotification/main/onSetIsDrawerOpen', true);
                    break;
                }
                case this.UserCommandEnum.DUPLICATE: {
                    this.$store.dispatch('countlyPushNotification/main/onSetIsDrawerOpen', true);
                    break;
                }
                case this.UserCommandEnum.DELETE: {
                    this.$store.dispatch('countlyPushNotification/main/onDelete', pushNotificationId);
                    break;
                }
                case this.UserCommandEnum.REJECT: {
                    this.$store.dispatch('countlyPushNotification/main/onReject', pushNotificationId);
                    break;
                }
                case this.UserCommandEnum.APPROVE: {
                    this.$store.dispatch('countlyPushNotification/main/onApprove', pushNotificationId);
                    break;
                }
                case this.UserCommandEnum.EDIT: {
                    this.$store.dispatch('countlyPushNotification/main/onSetIsDrawerOpen', true);
                    break;
                }
                case this.UserCommandEnum.EDIT_DRAFT: {
                    this.$store.dispatch('countlyPushNotification/main/onSetIsDrawerOpen', true);
                    break;
                }
                case this.UserCommandEnum.CREATE: {
                    this.$store.dispatch('countlyPushNotification/main/onSetIsDrawerOpen', true);
                    break;
                }
                default: {
                    throw new Error("Unknown user command:" + command);
                }
                }
            },
            shouldShowDuplicateUserCommand: function() {
                return true;
            },
            shouldShowDeleteUserCommand: function() {
                return true;
            },
            shouldShowResendUserCommand: function(status) {
                return status === this.StatusEnum.STOPPED || status === this.StatusEnum.FAILED;
            },
            shouldShowEditDraftUserCommand: function(status) {
                return status === this.StatusEnum.DRAFT;
            },
            shouldShowApproveUserCommand: function(status) {
                return status === this.StatusEnum.PENDING_APPROVAL;
            },
            shouldShowRejectUserCommand: function(status) {
                return status === this.StatusEnum.PENDING_APPROVAL;
            },
            shouldShowEditUserCommand: function(status) {
                return status === this.StatusEnum.PENDING_APPROVAL || status === this.StatusEnum.SCHEDULED;
            },
            getStatusBackgroundColor: function(status) {
                switch (status) {
                case this.StatusEnum.CREATED: {
                    return "green";
                }
                case this.StatusEnum.PENDING_APPROVAL: {
                    return "yellow";
                }
                case this.StatusEnum.DRAFT: {
                    return "yellow";
                }
                case this.StatusEnum.SCHEDULED: {
                    return "yellow";
                }
                case this.StatusEnum.SENDING: {
                    return "blue";
                }
                case this.StatusEnum.SENT: {
                    return "green";
                }
                case this.StatusEnum.STOPPED: {
                    return "red";
                }
                case this.StatusEnum.FAILED: {
                    return "red";
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
            this.$store.dispatch('countlyPushNotification/main/fetchDashboard');
            this.$store.dispatch('countlyPushNotification/main/fetchAll', true);
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
                ],
                UserCommandEnum: countlyPushNotification.service.UserCommandEnum
            };
        },
        computed: {
            selectedPushNotificationTab: {
                get: function() {
                    return this.$store.state.countlyPushNotification.main.selectedPushNotificationType;
                },
                set: function(value) {
                    this.$store.dispatch('countlyPushNotification/main/onSetPushNotificationType', value);
                    this.$store.dispatch('countlyPushNotification/main/fetchAll', true);
                    this.$store.dispatch('countlyPushNotification/main/fetchDashboard');
                }
            },
            isDrawerOpen: function() {
                return this.$store.state.countlyPushNotification.main.isDrawerOpen;
            },
            userCommand: function() {
                return this.$store.state.countlyPushNotification.main.userCommand;
            },
        },
        watch: {
            isDrawerOpen: function(value) {
                if (value) {
                    this.openDrawer("pushNotificationDrawer");
                }
            }
        },
        methods: {
            onCreatePushNotification: function() {
                this.$store.dispatch('countlyPushNotification/main/onUserCommand', {type: this.UserCommandEnum.CREATE, pushNotificationId: null});
                this.$store.dispatch('countlyPushNotification/main/onSetIsDrawerOpen', true);
            },
            onDrawerClose: function() {
                this.$store.dispatch('countlyPushNotification/main/onSetIsDrawerOpen', false);
            },
            onSave: function() {
                this.$store.dispatch('countlyPushNotification/main/fetchAll', true);
            }
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
        mixins: [countlyVue.mixins.hasDrawers("pushNotificationDrawer")],
        data: function() {
            return {
                StatusEnum: countlyPushNotification.service.StatusEnum,
                PlatformEnum: countlyPushNotification.service.PlatformEnum,
                selectedPlatformFilter: countlyPushNotification.service.PlatformEnum.ALL,
                platformFilters: platformFilterOptions,
                statusOptions: countlyPushNotification.service.statusOptions,
                selectedLocalization: countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE,
                DEFAULT_ALPHA_COLOR_VALUE_HEX: 50,
                currentSummaryTab: "message",
                UserCommandEnum: countlyPushNotification.service.UserCommandEnum,
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
                return this.$store.state.countlyPushNotification.details.pushNotification.message[this.selectedLocalization];
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
            },
            isLoading: function() {
                return this.$store.getters['countlyPushNotification/details/isLoading'];
            },
            localizations: function() {
                return this.$store.state.countlyPushNotification.details.pushNotification.localizations;
            },
            hasApproverPermission: function() {
                return countlyPushNotification.service.hasApproverPermission();
            },
            previewMessageMedia: function() {
                var result = {};
                result[this.PlatformEnum.ALL] = {url: this.pushNotification.settings[this.PlatformEnum.ALL].mediaURL, type: this.pushNotification.settings[this.PlatformEnum.ALL].mediaMime };
                result[this.PlatformEnum.IOS] = {url: this.pushNotification.settings[this.PlatformEnum.IOS].mediaURL, type: this.pushNotification.settings[this.PlatformEnum.IOS].mediaMime };
                result[this.PlatformEnum.ANDROID] = {url: this.pushNotification.settings[this.PlatformEnum.ANDROID].mediaURL, type: this.pushNotification.settings[this.PlatformEnum.ANDROID].mediaMime};
                return result;
            },
            isDrawerOpen: function() {
                return this.$store.state.countlyPushNotification.details.isDrawerOpen;
            },
            userCommand: function() {
                return this.$store.state.countlyPushNotification.details.userCommand;
            }
        },
        watch: {
            isDrawerOpen: function(value) {
                if (value) {
                    this.openDrawer("pushNotificationDrawer");
                }
            }
        },
        methods: {
            onApprove: function(id) {
                this.handleUserCommands(this.UserCommandEnum.APPROVE, id);
            },
            onReject: function(id) {
                this.handleUserCommands(this.UserCommandEnum.REJECT, id);
            },
            handleUserCommands: function(command, pushNotificationId) {
                this.$store.dispatch('countlyPushNotification/details/onUserCommand', {type: command, pushNotificationId: pushNotificationId});
                switch (command) {
                case this.UserCommandEnum.RESEND: {
                    this.$store.dispatch('countlyPushNotification/details/onSetIsDrawerOpen', true);
                    break;
                }
                case this.UserCommandEnum.DUPLICATE: {
                    this.$store.dispatch('countlyPushNotification/details/onSetIsDrawerOpen', true);
                    break;
                }
                case this.UserCommandEnum.DELETE: {
                    this.$store.dispatch('countlyPushNotification/details/onDelete', pushNotificationId)
                        .then(function() {
                            window.location.hash = "#/messaging";
                        });
                    break;
                }
                case this.UserCommandEnum.REJECT: {
                    this.$store.dispatch('countlyPushNotification/details/onReject', pushNotificationId);
                    break;
                }
                case this.UserCommandEnum.APPROVE: {
                    this.$store.dispatch('countlyPushNotification/details/onApprove', pushNotificationId);
                    break;
                }
                case this.UserCommandEnum.EDIT: {
                    this.$store.dispatch('countlyPushNotification/details/onSetIsDrawerOpen', true);
                    break;
                }
                case this.UserCommandEnum.EDIT_DRAFT: {
                    this.$store.dispatch('countlyPushNotification/details/onSetIsDrawerOpen', true);
                    break;
                }
                case this.UserCommandEnum.CREATE: {
                    this.$store.dispatch('countlyPushNotification/details/onSetIsDrawerOpen', true);
                    break;
                }
                default: {
                    throw new Error("Unknown user command:" + command);
                }
                }
            },
            shouldShowDuplicateUserCommand: function() {
                return true;
            },
            shouldShowDeleteUserCommand: function() {
                return true;
            },
            shouldShowResendUserCommand: function(status) {
                return status === this.StatusEnum.STOPPED || status === this.StatusEnum.FAILED;
            },
            shouldShowEditDraftUserCommand: function(status) {
                return status === this.StatusEnum.DRAFT;
            },
            shouldShowApproveUserCommand: function(status) {
                return status === this.StatusEnum.PENDING_APPROVAL;
            },
            shouldShowRejectUserCommand: function(status) {
                return status === this.StatusEnum.PENDING_APPROVAL;
            },
            shouldShowEditUserCommand: function(status) {
                return status === this.StatusEnum.PENDING_APPROVAL || status === this.StatusEnum.SCHEDULED;
            },
            getStatusBackgroundColor: function(status) {
                switch (status) {
                case this.StatusEnum.CREATED: {
                    return "green";
                }
                case this.StatusEnum.PENDING_APPROVAL: {
                    return "yellow";
                }
                case this.StatusEnum.DRAFT: {
                    return "yellow";
                }
                case this.StatusEnum.SCHEDULED: {
                    return "yellow";
                }
                case this.StatusEnum.SENDING: {
                    return "blue";
                }
                case this.StatusEnum.SENT: {
                    return "green";
                }
                case this.StatusEnum.STOPPED: {
                    return "red";
                }
                case this.StatusEnum.FAILED: {
                    return "red";
                }
                default: {
                    return "#FFFFFF";
                }
                }
            },
            formatTimeAgoText: function(date) {
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
            },
            onDrawerClose: function() {
                this.$store.dispatch('countlyPushNotification/details/onSetIsDrawerOpen', false);
            }
        },
        components: {
            "mobile-message-preview": countlyPushNotificationComponent.MobileMessagePreview,
            "push-notification-drawer": PushNotificationDrawer
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

    //Push plugin application level configuration view
    var initialAppLevelConfig = {
        rate: "",
        period: ""
    };
    initialAppLevelConfig[countlyPushNotification.service.PlatformEnum.IOS] = {
        _id: "",
        keyId: "",
        p8KeyFile: "",
        p12KeyFile: "",
        teamId: "",
        bundleId: "",
        authType: countlyPushNotification.service.IOSAuthConfigTypeEnum.P8,
        passphrase: "",
        hasKeyFile: false,
        hasUploadedKeyFile: false,
    };
    initialAppLevelConfig[countlyPushNotification.service.PlatformEnum.ANDROID] = {
        _id: "",
        firebaseKey: "",
        type: "fcm"
    };
    initialAppLevelConfig[countlyPushNotification.service.PlatformEnum.HUAWEI] = {
        _id: "",
        appId: "",
        appSecret: ""
    };

    var keyFileReader = new FileReader();

    var PushNotificationAppConfigView = countlyVue.views.create({
        componentName: "AppSettingsContainerObservable",
        template: CV.T("/push/templates/push-notification-app-config.html"),
        mixins: [countlyVue.mixins.hasDrawers("testUsersDrawer")],
        data: function() {
            return {
                PlatformEnum: countlyPushNotification.service.PlatformEnum,
                IOSAuthConfigTypeEnum: countlyPushNotification.service.IOSAuthConfigTypeEnum,
                iosAuthConfigType: countlyPushNotification.service.IOSAuthConfigTypeEnum.P8,
                iosAuthConfigTypeOptions: countlyPushNotification.service.iosAuthConfigTypeOptions,
                viewModel: JSON.parse(JSON.stringify(initialAppLevelConfig)),
                modelUnderEdit: Object.assign({}, { rate: "", period: ""}),
                uploadedIOSKeyFilename: '',
                selectedAppId: this.$route.params.app_id || countlyCommon.ACTIVE_APP_ID,
                isHuaweiConfigTouched: false,
                isIOSConfigTouched: false,
                AddTestUserDefinitionTypeEnum: countlyPushNotification.service.AddTestUserDefinitionTypeEnum,
                userIdOptions: [],
                cohortOptions: [],
                isSearchUsersLoading: false,
                isFetchCohortsLoading: false,
                isAddTestUsersLoading: false,
                isDialogVisible: false,
                areRowsLoading: false,
                testUsersRows: [],
                selectedKeyToDelete: null,
            };
        },
        computed: {
            isHuaweiConfigRequired: function() {
                return this.isHuaweiConfigTouched;
            },
            isIOSConfigRequired: function() {
                return this.isIOSConfigTouched;
            },
        },
        methods: {
            setModel: function(newModel) {
                Object.assign(this.modelUnderEdit, newModel);
            },
            setViewModel: function(newViewModel) {
                this.viewModel = JSON.parse(JSON.stringify(newViewModel));
            },
            resetConfig: function() {
                this.setViewModel(initialAppLevelConfig);
                this.setModel({rate: "", period: ""});
                this.$refs.keyFileUploader.clearFiles();
                this.isHuaweiConfigTouched = false;
                this.isIOSConfigTouched = false;
                this.uploadedIOSKeyFilename = '';
            },
            onIOSAuthTypeChange: function(value) {
                this.iosAuthConfigType = value;
                this.$refs.keyFileUploader.clearFiles();
                this.uploadedIOSKeyFilename = '';
                this.isIOSConfigTouched = true;
                var appPluginConfigDto = countlyGlobal.apps[this.selectedAppId].plugins;
                var pushNotificationAppConfigDto = appPluginConfigDto && appPluginConfigDto.push;
                var model = countlyPushNotification.mapper.incoming.mapAppLevelConfig(pushNotificationAppConfigDto);
                if (model && model[this.PlatformEnum.IOS] && model[this.PlatformEnum.IOS].authType === value) {
                    this.setModel(model);
                    this.reconcilateViewModel(model);
                }
                else {
                    this.resetIOSModelPlatform();
                    this.resetIOSViewModelPlatform();
                    this.dispatchAppLevelConfigChangeEvent('authType', this.PlatformEnum.IOS);
                }
            },
            setKeyFile: function(dataUrlFile) {
                this.initializeModelPlatformIfNotFound(this.PlatformEnum.IOS);
                if (this.iosAuthConfigType === this.IOSAuthConfigTypeEnum.P8) {
                    this.modelUnderEdit[this.PlatformEnum.IOS].p8KeyFile = dataUrlFile;
                }
                else {
                    this.modelUnderEdit[this.PlatformEnum.IOS].p12KeyFile = dataUrlFile;
                }
                this.modelUnderEdit[this.PlatformEnum.IOS].hasUploadedKeyFile = true;
                this.isIOSConfigTouched = true;
            },
            onKeyFileChange: function(file) {
                this.uploadedIOSKeyFilename = file.name;
                keyFileReader.readAsDataURL(file.raw);
            },
            resetIOSViewModelPlatform: function() {
                var platform = this.PlatformEnum.IOS;
                this.viewModel[platform] = Object.assign({}, initialAppLevelConfig[platform]);
                this.viewModel[platform].authType = this.iosAuthConfigType;
            },
            resetIOSModelPlatform: function() {
                var platform = this.PlatformEnum.IOS;
                this.modelUnderEdit[this.PlatformEnum.IOS] = Object.assign({}, initialAppLevelConfig[platform]);
                this.modelUnderEdit[platform].authType = this.iosAuthConfigType;
            },
            initializeModelPlatformIfNotFound: function(platform) {
                if (!this.modelUnderEdit[platform]) {
                    this.modelUnderEdit[platform] = Object.assign({}, initialAppLevelConfig[platform]);
                    if (platform === this.PlatformEnum.IOS) {
                        this.modelUnderEdit[platform].authType = this.iosAuthConfigType;
                    }
                }
            },
            dispatchAppLevelConfigChangeEvent: function(property, platform) {
                if (platform) {
                    var platformDto = countlyPushNotification.mapper.outgoing.mapPlatformItem(platform);
                    var appConfigPlatformDto = countlyPushNotification.mapper.outgoing.mapAppLevelConfigByPlatform(this.modelUnderEdit, platform);
                    this.$emit('change', 'push' + '.' + platformDto, appConfigPlatformDto);
                }
                else {
                    this.$emit('change', 'push' + '.' + 'rate' + '.' + property, this.modelUnderEdit[property]);
                }
            },
            updateAllModelsOnInput: function(property, value, platform) {
                if (platform) {
                    this.viewModel[platform][property] = value;
                    this.modelUnderEdit[platform][property] = value;
                }
                else {
                    this.viewModel[property] = value;
                    this.modelUnderEdit[property] = value;
                }
            },
            setIsConfigTouchedByPlatform: function(platform) {
                if (platform === this.PlatformEnum.IOS) {
                    this.isIOSConfigTouched = true;
                }
                if (platform === this.PlatformEnum.HUAWEI) {
                    this.isHuaweiConfigTouched = true;
                }
            },
            onInput: function(property, value, platform) {
                if (platform) {
                    this.initializeModelPlatformIfNotFound(platform);
                    this.setIsConfigTouchedByPlatform(platform);
                }
                this.updateAllModelsOnInput(property, value, platform);
                this.dispatchAppLevelConfigChangeEvent(property, platform);
            },
            onDiscard: function() {
                this.resetConfig();
                this.reconcilate();
            },
            onSelectApp: function(appId) {
                this.selectedAppId = appId;
                this.iosAuthConfigType = countlyPushNotification.service.IOSAuthConfigTypeEnum.P8;
                this.resetConfig();
                this.reconcilate();
            },
            onDeleteKey: function(platformKey) {
                this.selectedKeyToDelete = platformKey;
                CountlyHelpers.confirm('', 'danger', this.onConfirmCallback, ['Cancel', 'I understand, delete this key'], {title: 'Delete key'});
            },
            deleteAndroidKey: function() {
                var platform = this.PlatformEnum.ANDROID;
                var platformDto = countlyPushNotification.mapper.outgoing.mapPlatformItem(platform);
                this.modelUnderEdit[platform] = Object.assign({}, initialAppLevelConfig[platform]);
                this.viewModel[platform] = Object.assign({}, initialAppLevelConfig[platform]);
                this.$emit('change', 'push' + '.' + platformDto, null);
            },
            deleteIosKey: function() {
                var platform = this.PlatformEnum.IOS;
                var platformDto = countlyPushNotification.mapper.outgoing.mapPlatformItem(platform);
                this.modelUnderEdit[platform] = Object.assign({}, initialAppLevelConfig[platform]);
                this.viewModel[platform] = Object.assign({}, initialAppLevelConfig[platform]);
                this.modelUnderEdit[platform].authType = this.iosAuthConfigType;
                this.viewModel[platform].authType = this.iosAuthConfigType;
                this.$emit('change', 'push' + '.' + platformDto, null);
                this.isIOSConfigTouched = false;
            },
            deleteHuaweiKey: function() {
                var platform = this.PlatformEnum.HUAWEI;
                var platformDto = countlyPushNotification.mapper.outgoing.mapPlatformItem(platform);
                this.modelUnderEdit[platform] = Object.assign({}, initialAppLevelConfig[platform]);
                this.viewModel[platform] = Object.assign({}, initialAppLevelConfig[platform]);
                this.$emit('change', 'push' + '.' + platformDto, null);
            },
            deleteKeyOnCofirm: function() {
                if (this.selectedKeyToDelete === this.PlatformEnum.ANDROID) {
                    this.deleteAndroidKey();
                    return;
                }
                if (this.selectedKeyToDelete === this.PlatformEnum.IOS) {
                    this.deleteIosKey();
                    return;
                }
                if (this.selectedKeyToDelete === this.PlatformEnum.HUAWEI) {
                    this.deleteHuaweiKey();
                    return;
                }
                if (!this.selectedKeyToDelete) {
                    return;
                }
                throw new Error('Unknown platform key, ' + this.selectedKeyToDelete);
            },
            onConfirmCallback: function(isConfirmed) {
                if (isConfirmed) {
                    this.deleteKeyOnCofirm();
                }
                this.selectedKeyToDelete = null;
            },
            addSelectedAppEventListener: function(callback) {
                this.$on('selectedApp', callback);
            },
            addDiscardEventListener: function(callback) {
                this.$on('discard', callback);
            },
            addKeyFileReaderLoadListener: function(callback) {
                keyFileReader.addEventListener('load', callback);
            },
            removeKeyFileReaderLoadListener: function(callback) {
                keyFileReader.removeEventListener('load', callback);
            },
            onKeyFileReady: function() {
                this.setKeyFile(keyFileReader.result);
                if (this.iosAuthConfigType === this.IOSAuthConfigTypeEnum.P8) {
                    this.dispatchAppLevelConfigChangeEvent('p8KeyFile', this.PlatformEnum.IOS);
                }
                else {
                    this.dispatchAppLevelConfigChangeEvent('p12KeyFile', this.PlatformEnum.IOS);
                }
            },
            reconcilateViewModel: function(newModel) {
                var self = this;
                Object.keys(this.PlatformEnum).forEach(function(platformKey) {
                    var platform = self.PlatformEnum[platformKey];
                    self.viewModel[platform] = newModel[platform] || Object.assign({}, initialAppLevelConfig[platform]);
                });
                this.viewModel.period = newModel.period;
                this.viewModel.rate = newModel.rate;
            },
            reconcilate: function() {
                var appPluginConfigDto = countlyGlobal.apps[this.selectedAppId].plugins;
                var pushNotificationAppConfigDto = appPluginConfigDto && appPluginConfigDto.push;
                if (pushNotificationAppConfigDto) {
                    var model = countlyPushNotification.mapper.incoming.mapAppLevelConfig(pushNotificationAppConfigDto);
                    this.reconcilateViewModel(model);
                    this.setModel(model);
                    if (model[this.PlatformEnum.IOS]) {
                        this.iosAuthConfigType = model[this.PlatformEnum.IOS].authType;
                    }
                }
            },
            setUserIdOptions: function(userIds) {
                this.userIdOptions = userIds;
            },
            setCohortOptions: function(cohorts) {
                this.cohortOptions = cohorts;
            },
            setTestUserRows: function(testUsers) {
                this.testUsersRows = testUsers;
            },
            openTestUsersDialog: function() {
                this.isDialogVisible = true;
            },
            fetchCohortsIfNotFound: function() {
                var self = this;
                if (this.cohortOptions && this.cohortOptions.length) {
                    return;
                }
                this.isFetchCohortsLoading = true;
                countlyPushNotification.service.fetchCohorts()
                    .then(function(cohorts) {
                        self.setCohortOptions(cohorts);
                    }).catch(function() {
                        // TODO:log error;
                        self.setCohortOptions([]);
                    }).finally(function() {
                        self.isFetchCohortsLoading = false;
                    });
            },
            fetchTestUsers: function(options) {
                var self = this;
                this.areRowsLoading = true;
                countlyPushNotification.service.fetchTestUsers(options)
                    .then(function(testUserRows) {
                        self.setTestUserRows(testUserRows);
                    }).catch(function(error) {
                        // TODO:log error;
                        self.setTestUserRows([]);
                        CountlyHelpers.notify({message: error.message, type: 'error'});
                    }).finally(function() {
                        self.areRowsLoading = false;
                    });
            },
            getTestUsersFromAppConfig: function() {
                var appConfig = countlyGlobal.apps[this.selectedAppId].plugins;
                var pushNotificationConfig = appConfig && appConfig.push || {};
                var result = {};
                if (pushNotificationConfig && pushNotificationConfig.test) {
                    if (pushNotificationConfig.test.uids) {
                        result.uids = pushNotificationConfig.test.uids.split(',');
                    }
                    if (pushNotificationConfig.test.cohorts) {
                        result.cohorts = pushNotificationConfig.test.cohorts.split(',');
                    }
                }
                return result;
            },
            onAddNewTestUser: function() {
                this.openDrawer('testUsersDrawer', countlyPushNotification.helper.getInitialTestUsersAppConfigModel());
            },
            onShowTestUserList: function() {
                this.openTestUsersDialog();
                this.fetchTestUsers(this.getTestUsersFromAppConfig());
            },
            onOpen: function() {
                this.fetchCohortsIfNotFound();
            },
            updateTestUsersAppConfig: function(editedObject) {
                var testDto = countlyPushNotification.mapper.outgoing.mapTestUsersEditedModelToDto(editedObject);
                countlyGlobal.apps[this.selectedAppId].plugins.push.test = testDto;
            },
            onSubmit: function(editedObject, done) {
                var self = this;
                this.isAddTestUsersLoading = true;
                var options = {};
                options.app_id = this.selectedAppId;
                countlyPushNotification.service.addTestUsers(editedObject, options)
                    .then(function() {
                        self.updateTestUsersAppConfig(editedObject);
                        done();
                        CountlyHelpers.notify({message: 'Test users have been successfully added.'});
                    }).catch(function() {
                        // TODO: log error
                        CountlyHelpers.notify({message: 'Unknown error occurred. Please try again later.'});
                    }).finally(function() {
                        self.isAddTestUsersLoading = false;
                        done(false);
                    });
            },
            onSearchUsers: function(query) {
                var self = this;
                this.isSearchUsersLoading = true;
                countlyPushNotification.service.searchUsersById(query)
                    .then(function(userIds) {
                        self.setUserIdOptions(userIds);
                    }).catch(function(error) {
                        // TODO:log error;
                        self.setUserIdOptions([]);
                        CountlyHelpers.notify({message: error.message, type: 'error'});
                    }).finally(function() {
                        self.isSearchUsersLoading = false;
                    });
            },
        },
        mounted: function() {
            this.addKeyFileReaderLoadListener(this.onKeyFileReady);
            this.addDiscardEventListener(this.onDiscard);
            this.addSelectedAppEventListener(this.onSelectApp);
            this.reconcilate();
        },
        destroyed: function() {
            this.removeKeyFileReaderLoadListener(this.onKeyFileReady);
        }
    });

    countlyVue.container.registerData("/app/settings", {
        _id: "push",
        inputs: {},
        title: CV.i18n('push-notification.title'),
        component: PushNotificationAppConfigView
    });

    //NOTE: modifyUserDetailsForPush adds the create new message action in user details page and sends the message to the actual user
    //     /**
    // * Modify user profile views with push additions
    // **/
    //     function modifyUserDetailsForPush() {
    //         if (Array.isArray(countlyGlobal.member.restrict) && countlyGlobal.member.restrict.indexOf('#/messaging') !== -1 || !countlyAuth.validateCreate(featureName)) {
    //             return;
    //         }
    //         if (Backbone.history.fragment.indexOf('manage/') === -1 && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === 'mobile') {
    //         //check if it is profile view
    //             if (app.activeView.updateEngagement) {
    //                 var userDetails = countlyUserdata.getUserdetails();

    //                 var tokens = [], platforms = [], test = false, prod = false;
    //                 tokens = Object.keys(userDetails).filter(function(k) {
    //                     return k.indexOf('tk') === 0;
    //                 }).map(function(k) {
    //                     return k.substr(2);
    //                 });
    //                 if (userDetails.tkid || userDetails.tkia || userDetails.tkip) {
    //                     platforms.push('i');
    //                 }
    //                 if (userDetails.tkat || userDetails.tkap) {
    //                     platforms.push('a');
    //                 }

    //                 test = !!userDetails.tkid || !!userDetails.tkia || !!userDetails.tkat;
    //                 prod = !!userDetails.tkip || !!userDetails.tkap;

    //                 if (tokens.length && countlyAuth.validateCreate('push')) {
    //                     if (!$('.btn-create-message').length) {
    //                         $('#user-profile-detail-buttons .cly-button-menu').append('<div class="item btn-create-message" >' + jQuery.i18n.map['push.create'] + '</div>');
    //                         app.activeView.resetExportSubmenu();
    //                     }
    //                     $('.btn-create-message').show().off('click').on('click', function() {
    //                         if (platforms.length) {
    //                             components.push.popup.show({
    //                                 platforms: platforms,
    //                                 apps: [countlyCommon.ACTIVE_APP_ID],
    //                                 test: test && !prod,
    //                                 userConditions: {did: {$in: [app.userdetailsView.user_did]}}
    //                             });
    //                         }
    //                         else {
    //                             CountlyHelpers.alert(jQuery.i18n.map['push.no-user-token'], 'red');
    //                         }
    //                     });
    //                     if (!$('#userdata-info > tbody > tr:last-child table .user-property-push').length) {
    //                         $('<tr class="user-property-push"><td class="text-left"><span>' + components.t('userdata.push') + '</span></td><td class="text-right"></td></tr>').appendTo($('#userdata-info > tbody > tr:last-child table tbody'));
    //                     }
    //                     $('#userdata-info > tbody > tr:last-child table .user-property-push td.text-right').html(tokens.map(function(t) {
    //                         return components.t('pu.tk.' + t);
    //                     }).join('<br />'));
    //                 }
    //                 else {
    //                     $('#userdata-info > tbody > tr:last-child table .user-property-push').remove();
    //                     $('.btn-create-message').remove();
    //                     app.activeView.resetExportSubmenu();
    //                 }
    //             }
    //         }
    //     }

    var CreateMessageDropdownItemWrapper = countlyVue.views.create({
        data: function() {
            return {
                command: "CREATE_PUSH_NOTIFICATION",
                label: "Send message to users"
            };
        },
        computed: {
            activeAppType: function() {
                return this.$store.state.countlyCommon.activeApp.type;
            },
            isDisabled: function() {
                if (this.activeAppType !== 'mobile') {
                    return true;
                }
                if (Array.isArray(countlyGlobal.member.restrict) && countlyGlobal.member.restrict.indexOf('#/messaging') !== -1 || !countlyAuth.validateCreate(featureName)) {
                    return true;
                }
                return false;
            }
        },
        template: '<el-dropdown-item :disabled="isDisabled" :command="command">{{label}}</el-dropdown-item>',
    });

    var PushNotificationDrawerWrapper = countlyVue.views.create({
        props: {
            type: {
                type: String,
                default: countlyPushNotification.service.TypeEnum.ONE_TIME
            },
            controls: {
                type: Object
            },
            from: {
                type: String,
                default: null,
            },
            queryFilter: {
                type: Object,
                default: null,
            },
            wrappedUserProperties: {
                type: Boolean,
                default: false,
                required: false
            }
        },
        data: function() {
            return {};
        },
        computed: {
            activeAppType: function() {
                return this.$store.state.countlyCommon.activeApp.type;
            },
            shouldDisplay: function() {
                if (this.activeAppType !== 'mobile') {
                    return false;
                }
                if (Array.isArray(countlyGlobal.member.restrict) && countlyGlobal.member.restrict.indexOf('#/messaging') !== -1 || !countlyAuth.validateCreate(featureName)) {
                    return false;
                }
                return true;
            }
        },
        components: {
            'push-notification-drawer': PushNotificationDrawer
        },
        template: '<push-notification-drawer v-if="shouldDisplay" :queryFilter="queryFilter" :from="from" :wrappedUserProperties="wrappedUserProperties" :controls="controls" :type="type"></push-notification-drawer>',
    });

    var PushNotificationWidgetDrawer = countlyVue.views.create({
        template: CV.T('/push/templates/push-notification-widget-drawer.html'),
        props: {
            scope: {
                type: Object,
                default: function() {
                    return {};
                }
            }
        },
        data: function() {
            return {
                metrics: [
                    { label: this.i18n("dashboards.sent"), value: "sent" },
                    { label: this.i18n("dashboards.actioned"), value: "actioned" }
                ]
            };
        },
        computed: {
            enabledVisualizationTypes: function() {
                /**
                 * Allowed visualization types for this widget are time-series and number
                 */

                if (this.scope.editedObject.app_count === 'single') {
                    return ['time-series', 'number'];
                }
                else {
                    return ['time-series'];
                }
            },
            isMultipleMetric: function() {
                var multiple = false;

                if ((this.scope.editedObject.app_count === 'single') &&
                    (this.scope.editedObject.visualization === 'time-series')) {
                    multiple = true;
                }

                return multiple;
            }
        }
    });

    var PushNotificationWidgetComponent = countlyVue.views.create({
        template: CV.T('/push/templates/push-notification-widget.html'),
        props: {
            data: {
                type: Object,
                default: function() {
                    return {};
                }
            }
        },
        data: function() {
            return {};
        },
        computed: {
            dashboardData: function() {
                return this.data.data || {};
            },
            selectedMetric: function() {
                return this.data.metrics[0];
            },
            selectedBucket: function() {
                return this.data.bucket;
            },
            xAxisPeriods: function() {
                var keys = Object.keys(this.dashboardData);
                if (keys.length) {
                    return Object.keys(this.dashboardData[keys[0]]);
                }
                return [];
            },
            yAxisSeries: function() {
                var self = this;
                return Object.keys(this.dashboardData).sort(function(a, b) {
                    return a < b;
                }).map(function(appKey) {
                    return {
                        data: Object.keys(self.dashboardData[appKey]).map(function(periodKey) {
                            return self.dashboardData[appKey][periodKey][self.selectedMetric];
                        }),
                        name: countlyGlobal.apps[appKey].label
                    };
                });
            },
            barchartOptions: function() {
                return {
                    xAxis: {
                        data: this.xAxisPeriods
                    },
                    series: this.yAxisSeries
                };
            },
            legend: function() {
                return {
                    show: false,
                    type: "primary",
                };
            },
        }
    });



    /**
     * 
     * @returns {Object} container data with create new message event handler
     */
    function getCreateNewMessageEventContainerData() {
        return {
            id: "createMessageDropdownItemWrapper",
            name: "createMessageDropdownItemWrapper",
            command: "CREATE_PUSH_NOTIFICATION",
            component: CreateMessageDropdownItemWrapper,
            click: function() {
                this.openDrawer("pushNotificationDrawer");
            }
        };
    }
    /**
     * 
     * @returns {Object} container data with push notification drawer
     */
    function getDrawerContainerData() {
        return {
            id: "pushNotificationDrawer",
            name: "pushNotificationDrawer",
            component: PushNotificationDrawerWrapper,
            type: countlyPushNotification.service.TypeEnum.ONE_TIME,
        };
    }
    /**
     * addDrawerToDrillmainView - adds push notification drawer to drill main view.
     */
    function addDrawerToDrillMainView() {
        countlyVue.container.registerMixin("/drill/external/mixins", countlyVue.mixins.hasDrawers("pushNotificationDrawer"));
        countlyVue.container.registerTemplate("/drill/external/templates", "/push/templates/common-components.html");
        countlyVue.container.registerData("/drill/external/events", getCreateNewMessageEventContainerData());
        countlyVue.container.registerData("/drill/external/drawers", getDrawerContainerData());
    }

    /**
     * addDrawerToUserProfilesMainView - adds push notification drawer to user profiles main view.
     */
    function addDrawerToUserProfilesMainView() {
        countlyVue.container.registerMixin("/users/external/mixins", countlyVue.mixins.hasDrawers("pushNotificationDrawer"));
        countlyVue.container.registerTemplate("/users/external/templates", "/push/templates/common-components.html");
        countlyVue.container.registerData("/users/external/events", getCreateNewMessageEventContainerData());
        countlyVue.container.registerData("/users/external/drawers", getDrawerContainerData());
    }

    /**
     * addWidgetToCustomDashboard - adds push notification widget to custom dashboard
     */
    function addWidgetToCustomDashboard() {
        countlyVue.container.registerData('/custom/dashboards/widget', {
            type: 'push',
            label: CV.i18n('push-notification.title'),
            priority: 6,
            primary: true,
            drawer: {
                component: PushNotificationWidgetDrawer,
                getEmpty: function() {
                    return {
                        title: "",
                        widget_type: "push",
                        isPluginWidget: true,
                        apps: [],
                        app_count: 'single',
                        visualization: "",
                        metrics: [],
                    };
                },
                beforeLoadFn: function() {},
                beforeSaveFn: function() {}
            },
            grid: {
                component: PushNotificationWidgetComponent,
                dimensions: function() {
                    return {
                        minWidth: 6,
                        minHeight: 4,
                        width: 7,
                        height: 4
                    };
                }
            }

        });
    }

    addDrawerToDrillMainView();
    addDrawerToUserProfilesMainView();


    //countly.view global management settings
    $(document).ready(function() {
        if (countlyAuth.validateRead(featureName)) {
            app.addMenuForType("mobile", "reach", {code: "push", url: "#/messaging", text: "push-notification.title", icon: '<div class="logo ion-chatbox-working"></div>', priority: 10});
            addWidgetToCustomDashboard();
        }

        if (app.configurationsView) {
            app.configurationsView.registerLabel("push", "push.plugin-title");
            app.configurationsView.registerLabel("push.proxyhost", "push.proxyhost");
            app.configurationsView.registerInput("push.proxypass", {input: "el-input", attrs: {type: "password"}});
            app.configurationsView.registerLabel("push.proxyport", "push.proxyport");
        }
    });
}());