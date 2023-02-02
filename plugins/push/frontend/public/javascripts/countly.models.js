/* eslint-disable no-console */
/*global countlyVue,CV,countlyCommon,countlySegmentation,moment,_,countlyGlobalLang,countlyEventsOverview,countlyPushNotificationApprover,countlyGlobal,CountlyHelpers*/
(function(countlyPushNotification) {

    var messagesSentLabel = CV.i18n('push-notification.sent-serie-name');
    var actionsPerformedLabel = CV.i18n('push-notification.actions-performed-serie-name');
    var DEBOUNCE_TIME_IN_MS = 250;
    var MB_TO_BYTES_RATIO = 1000000;
    var DAY_TO_MS_RATIO = 86400 * 1000;
    var HOUR_TO_MS_RATIO = 3600000;
    var MINUTES_TO_MS_RATIO = 60000;
    var ERROR_MESSAGE_REGEX = /^([ia])([0-9]+)(\+(.+))?$/;

    var DEFAULT_LOCALIZATION_VALUE = 'default';
    var DEFAULT_LOCALIZATION_LABEL = 'Default';
    var ALL_FILTER_OPTION_VALUE = 'all';
    var ALL_FILTER_OPTION_LABEL = CV.i18n("push-notification.status-filter-all");

    var TypeEnum = Object.freeze({
        ONE_TIME: "oneTime",
        AUTOMATIC: "automatic",
        TRANSACTIONAL: "transactional"
    });
    var PeriodEnum = Object.freeze({
        WEEKLY: "weekly",
        MONTHLY: "monthly",
        DAILY: "daily"
    });
    var PlatformEnum = Object.freeze({
        ANDROID: "android",
        ALL: "all",
        IOS: "ios",
        HUAWEI: "huawei"
    });
    var StatusEnum = Object.freeze({
        CREATED: "created",
        PENDING_APPROVAL: "pending_approval",
        DRAFT: "draft",
        SCHEDULED: "scheduled",
        SENDING: "sending",
        SENT: "sent",
        STOPPED: "stopped",
        FAILED: "failed",
        REJECT: 'reject',
    });
    var UserCommandEnum = Object.freeze({
        RESEND: 'resend',
        DUPLICATE: 'duplicate',
        DELETE: 'delete',
        REJECT: 'reject',
        APPROVE: 'approve',
        EDIT_DRAFT: 'edit_draft',
        CREATE: 'create',
        EDIT: 'edit',
        EDIT_REJECT: 'edit_reject',
        STOP: 'stop',
        START: 'start'
    });
    var MediaTypeEnum = Object.freeze({
        IMAGE: 'image',
        VIDEO: 'video'
    });
    var TargetingEnum = Object.freeze({
        ALL: 'all',
        SEGMENTED: "segmented"
    });
    var AudienceSelectionEnum = Object.freeze({
        NOW: 'now',
        BEFORE: "before"
    });
    var SendEnum = Object.freeze({
        NOW: 'now',
        LATER: 'later',
    });
    var TimezoneEnum = Object.freeze({
        SAME: 'same',
        DEVICE: 'device'
    });
    var PastScheduleEnum = Object.freeze({
        SKIP: 'skip',
        NEXT_DAY: 'nextDay'
    });
    var MessageTypeEnum = Object.freeze({
        SILENT: 'silent',
        CONTENT: 'content'
    });
    var TriggerEnum = Object.freeze({
        COHORT_ENTRY: 'cohortEntry',
        COHORT_EXIT: 'cohortExit',
        EVENT: 'event'
    });
    var DeliveryDateCalculationEnum = Object.freeze({
        EVENT_SERVER_DATE: 'eventServerDate',
        EVENT_DEVICE_DATE: 'eventDeviceDate'
    });
    var TriggerNotMetEnum = Object.freeze({
        SEND_ANYWAY: 'sendAnyway',
        CANCEL_ON_EXIT: 'cancelOnExit'
    });
    var DeliveryMethodEnum = Object.freeze({
        IMMEDIATELY: 'immediately',
        DELAYED: 'delayed'
    });
    var IOSAuthConfigTypeEnum = Object.freeze({
        P8: 'p8',
        P12: 'p12'
    });
    var UserPropertyTypeEnum = Object.freeze({
        EVENT: 'e',
        USER: 'u',
        CUSTOM: 'c',
        API: 'a'
    });

    var AddTestUserDefinitionTypeEnum = Object.freeze({
        USER_ID: 'userId',
        COHORT: 'cohorts'
    });

    var audienceSelectionOptions = {};
    audienceSelectionOptions[AudienceSelectionEnum.NOW] = {label: CV.i18n('push-notification.now'), value: AudienceSelectionEnum.NOW};
    audienceSelectionOptions[AudienceSelectionEnum.BEFORE] = {label: CV.i18n('push-notification.right-before-sending-the-message'), value: AudienceSelectionEnum.BEFORE};

    var startDateOptions = {};
    startDateOptions[SendEnum.NOW] = {label: CV.i18n('push-notification.send-now'), value: SendEnum.NOW};
    startDateOptions[SendEnum.LATER] = {label: CV.i18n('push-notification.scheduled'), value: SendEnum.LATER };

    var targetingOptions = {};
    targetingOptions[TargetingEnum.ALL] = {label: CV.i18n('push-notification.all-push-enabled-users'), value: TargetingEnum.ALL};
    targetingOptions[TargetingEnum.SEGMENTED] = {label: CV.i18n('push-notification.segmented-push-enabled-users'), value: TargetingEnum.SEGMENTED};

    var triggerOptions = {};
    triggerOptions[TriggerEnum.COHORT_ENTRY] = {label: CV.i18n('push-notification.cohorts-entry'), value: TriggerEnum.COHORT_ENTRY};
    triggerOptions[TriggerEnum.COHORT_EXIT] = {label: CV.i18n('push-notification.cohorts-exit'), value: TriggerEnum.COHORT_EXIT};
    triggerOptions[TriggerEnum.EVENT] = {label: CV.i18n('push-notification.performed-events'), value: TriggerEnum.EVENT};

    var triggerNotMetOptions = {};
    triggerNotMetOptions[TriggerNotMetEnum.SEND_ANYWAY] = {label: CV.i18n('push-notification.send-anyway'), value: TriggerNotMetEnum.SEND_ANYWAY};
    triggerNotMetOptions[TriggerNotMetEnum.CANCEL_ON_EXIT] = {label: CV.i18n('push-notification.cancel-when-user-exits-cohort'), value: TriggerNotMetEnum.CANCEL_ON_EXIT};

    var deliveryDateCalculationOptions = {};
    deliveryDateCalculationOptions[DeliveryDateCalculationEnum.EVENT_SERVER_DATE] = {label: CV.i18n('push-notification.relative-to-the-date-event-server'), value: DeliveryDateCalculationEnum.EVENT_SERVER_DATE};
    deliveryDateCalculationOptions[DeliveryDateCalculationEnum.EVENT_DEVICE_DATE] = {label: CV.i18n('push-notification.relative-to-the-date-event-device'), value: DeliveryDateCalculationEnum.EVENT_DEVICE_DATE};

    var deliveryMethodOptions = {};
    deliveryMethodOptions[DeliveryMethodEnum.IMMEDIATELY] = {label: CV.i18n('push-notification.immediately'), value: DeliveryMethodEnum.IMMEDIATELY};
    deliveryMethodOptions[DeliveryMethodEnum.DELAYED] = {label: CV.i18n('push-notification.delayed'), value: DeliveryMethodEnum.DELAYED};

    var platformOptions = {};
    platformOptions[PlatformEnum.ANDROID] = {label: "Android", value: PlatformEnum.ANDROID};
    platformOptions[PlatformEnum.IOS] = {label: 'iOS', value: PlatformEnum.IOS};

    var statusOptions = {};
    statusOptions[StatusEnum.CREATED] = {label: CV.i18n('push-notification.created'), value: StatusEnum.CREATED};
    statusOptions[StatusEnum.PENDING_APPROVAL] = {label: CV.i18n('push-notification.waiting-for-approval'), value: StatusEnum.PENDING_APPROVAL};
    statusOptions[StatusEnum.REJECT] = {label: CV.i18n('push-notification.rejected'), value: StatusEnum.REJECT};
    statusOptions[StatusEnum.DRAFT] = {label: CV.i18n('push-notification.draft'), value: StatusEnum.DRAFT};
    statusOptions[StatusEnum.SCHEDULED] = {label: CV.i18n('push-notification.scheduled'), value: StatusEnum.SCHEDULED};
    statusOptions[StatusEnum.SENDING] = {label: CV.i18n('push-notification.sending'), value: StatusEnum.SENDING};
    statusOptions[StatusEnum.SENT] = {label: CV.i18n('push-notification.sent'), value: StatusEnum.SENT};
    statusOptions[StatusEnum.STOPPED] = {label: CV.i18n('push-notification.stopped'), value: StatusEnum.STOPPED};
    statusOptions[StatusEnum.FAILED] = {label: CV.i18n('push-notification.failed'), value: StatusEnum.FAILED};

    var iosAuthConfigTypeOptions = {};
    iosAuthConfigTypeOptions[IOSAuthConfigTypeEnum.P8] = {label: CV.i18n('push-notification.key-file-p8'), value: IOSAuthConfigTypeEnum.P8};
    iosAuthConfigTypeOptions[IOSAuthConfigTypeEnum.P12] = {label: CV.i18n('push-notification.key-file-p12'), value: IOSAuthConfigTypeEnum.P12};

    var PlatformDtoEnum = Object.freeze({
        ANDROID: 'a',
        IOS: 'i',
        HUAWEI: 'h'
    });

    countlyPushNotification.helper = {
        getMessageMediaInitialState: function() {
            var result = {};
            result[PlatformEnum.ALL] = {};
            result[PlatformEnum.IOS] = {};
            result[PlatformEnum.ANDROID] = {};
            return result;
        },
        getInitialSeriesStateByType: function(type) {
            if (type === TypeEnum.ONE_TIME) {
                return {
                    monthly: [{data: [], label: actionsPerformedLabel}, {data: [], label: messagesSentLabel}],
                    weekly: [{data: [], label: actionsPerformedLabel}, {data: [], label: messagesSentLabel}]
                };
            }
            return {
                daily: [{data: [], label: actionsPerformedLabel}, {data: [], label: messagesSentLabel}]
            };
        },
        getInitialPeriodsStateByType: function(type) {
            if (type === TypeEnum.ONE_TIME) {
                return {
                    periods: {monthly: [], weekly: []},
                };
            }
            return {
                periods: {daily: []},
            };
        },
        getInitialModelDashboardPlatform: function() {
            return {
                sent: 0,
                actioned: 0,
                errored: 0,
                processed: 0,
                total: 0,
                locales: {}
            };
        },
        getInitialModelDashboard: function() {
            var result = {};
            result[PlatformEnum.ANDROID] = this.getInitialModelDashboardPlatform();
            result[PlatformEnum.IOS] = this.getInitialModelDashboardPlatform();
            result[PlatformEnum.ALL] = this.getInitialModelDashboardPlatform();
            return result;
        },
        getInitialBaseModel: function() {
            return {
                isEe: typeof countlySegmentation !== 'undefined',
                isGeo: typeof countlyLocationTargetComponent !== 'undefined',
                isCohorts: typeof countlyCohorts !== 'undefined',
                _id: null,
                demo: false,
                name: "",
                platforms: [],
                message: {
                    default: {
                        title: "",
                        content: "",
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
                        mediaMime: "",
                        soundFilename: "default",
                        badgeNumber: "",
                        onClickURL: "",
                        json: null,
                        userData: []
                    },
                    android: {
                        mediaURL: "",
                        mediaMime: "",
                        soundFilename: "default",
                        badgeNumber: "",
                        icon: "",
                        onClickURL: "",
                        json: null,
                        userData: []
                    },
                    all: {
                        mediaURL: "",
                        mediaMime: "",
                    }
                },
                error: null,
                errors: [],
                status: "",
                messageType: MessageTypeEnum.CONTENT,
                localizations: [this.getDefaultLocalization()],
                cohorts: [],
                locations: [],
                delivery: {
                    type: SendEnum.NOW,
                    startDate: moment().valueOf(),
                    endDate: moment().valueOf(),
                },
                timezone: TimezoneEnum.SAME,
                expiration: {
                    days: 7,
                    hours: 0
                },
                dashboard: {}
            };
        },
        getInitialOneTimeModel: function() {
            var baseModel = this.getInitialBaseModel();
            baseModel.oneTime = {
                targeting: TargetingEnum.ALL,
                pastSchedule: PastScheduleEnum.SKIP,
                audienceSelection: AudienceSelectionEnum.NOW,
            };
            return baseModel;
        },
        getInitialAutomaticModel: function() {
            var baseModel = this.getInitialBaseModel();
            baseModel.automatic = {
                deliveryMethod: DeliveryMethodEnum.IMMEDIATELY,
                delayed: {
                    days: 0,
                    hours: 0
                },
                deliveryDateCalculation: DeliveryDateCalculationEnum.EVENT_SERVER_DATE,
                trigger: typeof countlyCohorts === 'undefined' ? TriggerEnum.EVENT : TriggerEnum.COHORT_ENTRY,
                triggerNotMet: TriggerNotMetEnum.SEND_ANYWAY,
                events: [],
                cohorts: [],
                capping: false,
                maximumMessagesPerUser: 1,
                minimumTimeBetweenMessages: {
                    days: 0,
                    hours: 0
                },
                usersTimezone: "00"
            };
            return baseModel;
        },
        getInitialTransactionalModel: function() {
            return this.getInitialBaseModel();
        },
        getInitialModel: function(type) {
            if (type === TypeEnum.ONE_TIME) {
                return this.getInitialOneTimeModel();
            }
            if (type === TypeEnum.AUTOMATIC) {
                return this.getInitialAutomaticModel();
            }
            if (type === TypeEnum.TRANSACTIONAL) {
                return this.getInitialTransactionalModel();
            }
            throw new Error('Unknown push notification type:' + type);
        },
        getInitialTestUsersAppConfigModel: function() {
            return {
                definitionType: AddTestUserDefinitionTypeEnum.USER_ID,
                cohorts: [],
                userIds: [],
            };
        },
        replaceTagElements: function(htmlString) {
            if (htmlString) {
                return htmlString.replace(/(<([^>]+)>)/gi, "");
            }
            return htmlString;
        },
        decodeMessage: function(message) {
            if (!message) {
                return message;
            }
            var textArea = document.createElement('textarea');
            textArea.innerHTML = message;
            return textArea.value;
        },
        getPreviewMessageComponentsList: function(content) {
            var self = this;
            var htmlTitle = document.createElement("div");
            htmlTitle.innerHTML = content;
            var components = [];
            htmlTitle.childNodes.forEach(function(node, index) {
                if (node.hasChildNodes()) {
                    var withAttribues = htmlTitle.childNodes[index];
                    node.childNodes.forEach(function(childNode) {
                        if (childNode.nodeValue) {
                            var selectedProperty = withAttribues.getAttributeNode('data-user-property-label').value;
                            var fallbackValue = self.replaceTagElements(withAttribues.getAttributeNode('data-user-property-fallback').value);
                            components.push({name: 'user-property-preview', value: {fallback: fallbackValue, userProperty: selectedProperty}});
                        }
                    });
                }
                else {
                    if (node.nodeValue) {
                        node.nodeValue = self.replaceTagElements(node.nodeValue);
                        components.push({name: 'user-property-text-preview', value: node.nodeValue});
                    }
                }
            });
            return components;
        },
        getDefaultLocalization: function() {
            return {label: DEFAULT_LOCALIZATION_LABEL, value: DEFAULT_LOCALIZATION_VALUE, percentage: 100};
        },
        hasNoUsersToSendPushNotification: function(infoDto) {
            return infoDto.count === 0;
        },
        isServerError: function(response) {
            if (response && response.responseJSON) {
                return response.responseJSON.kind === 'ServerError';
            }
            return false;
        },
        isValidationError: function(response) {
            if (response && response.responseJSON) {
                return response.responseJSON.errors && response.responseJSON.errors.length && response.responseJSON.kind === 'ValidationError';
            }
            return false;
        },
        hasErrors: function(response) {
            if (response && response.responseJSON) {
                return response.responseJSON.errors && response.responseJSON.errors.length;
            }
            return false;
        },
        isResultError: function(response) {
            if (response && response.responseJSON) {
                return response.responseJSON && response.responseJSON.result;
            }
            return false;
        },
        isNetworkError: function(response) {
            return response && !response.responseJSON && response.readyState === 0;
        },
        getFirstValidationErrorMessageIfFound: function(response) {
            if (this.isValidationError(response)) {
                return response.responseJSON.errors[0];
            }
            return null;
        },
        getResultErrorMessageIfFound: function(response) {
            if (this.isResultError(response)) {
                return response.responseJSON.result;
            }
            return null;
        },
        getFirstErrorMessageIfFound: function(response) {
            if (this.hasErrors(response)) {
                return response.responseJSON.errors[0];
            }
        },
        getErrorMessage: function(error) {
            if (this.isServerError(error)) {
                return 'Server error occured. Please try again later.';
            }
            if (this.isValidationError(error)) {
                return this.getFirstValidationErrorMessageIfFound(error);
            }
            if (this.isResultError(error)) {
                return this.getResultErrorMessageIfFound(error);
            }
            if (this.hasErrors(error)) {
                return this.getFirstErrorMessageIfFound(error);
            }
            if (error && error.message) {
                return error.message;
            }
            if (this.isNetworkError(error)) {
                return 'Network error occurred.';
            }
            return CV.i18n('push-notification.unknown-error');
        },
        convertDateTimeToMS: function(datetime) {
            var result = 0;
            if (datetime.days) {
                result += moment.duration(parseInt(datetime.days, 10), 'd').asMilliseconds();
            }
            if (datetime.hours) {
                result += moment.duration(parseInt(datetime.hours, 10), 'h').asMilliseconds();
            }
            if (datetime.minutes) {
                result += moment.duration(parseInt(datetime.minutes, 10), 'm').asMilliseconds();
            }
            return result;
        },
        convertMSToDaysAndHours: function(dateTimeInMs) {
            if (!dateTimeInMs) {
                return {
                    days: 0,
                    hours: 0,
                    minutes: 0
                };
            }
            var days = parseInt(dateTimeInMs / DAY_TO_MS_RATIO, 10);
            var hours = parseInt((dateTimeInMs / HOUR_TO_MS_RATIO) % 24, 10);
            var minutes = parseInt((dateTimeInMs / MINUTES_TO_MS_RATIO) % 60, 10);
            return {
                days: days,
                hours: hours,
                minutes: minutes
            };
        },
        formatDateTime: function(dateTime, format) {
            if (!dateTime) {
                return dateTime;
            }
            if (!format) {
                format = "DD.MM.YYYY hh:mm a";
            }
            return moment(dateTime).format(format);
        },
        shouldAddFilter: function(model, options) {
            if (options.queryFilter && options.from) {
                return true;
            }
            if (model.type === TypeEnum.ONE_TIME) {
                return model.oneTime.targeting === TargetingEnum.SEGMENTED || model.user || model.drill;
            }
            if (model.type === TypeEnum.AUTOMATIC) {
                return true;
            }
            return false;
        },
        prettifyJSON: function(value, indentation) {
            if (!value) {
                return value;
            }
            if (!indentation) {
                indentation = 2;
            }
            return JSON.stringify(JSON.parse(value), null, indentation);
        },
        getEventPropertyOptions: function(propertyList) {
            return this.getPropertyOptionsByCategory(propertyList, 'Event Properties', UserPropertyTypeEnum.EVENT);
        },
        getUserPropertyOptions: function(propertyList) {
            return this.getPropertyOptionsByCategory(propertyList, 'User Properties', UserPropertyTypeEnum.USER);
        },
        getCustomPropertyOptions: function(propertyList) {
            return this.getPropertyOptionsByCategory(propertyList, 'Custom Properties', UserPropertyTypeEnum.CUSTOM);
        },
        isUserPropertyCategory: function(item) {
            return !item.id;
        },
        isUserPropertyOption: function(item) {
            return Boolean(item.id);
        },
        getPropertyOptionsByCategory: function(propertyList, category, type) {
            var result = [];
            var shouldAddPropertyOption = false;
            for (var index = 0; index < propertyList.length; index += 1) {
                if (this.isUserPropertyCategory(propertyList[index]) && propertyList[index].name === category) {
                    shouldAddPropertyOption = true;
                }
                if (this.isUserPropertyCategory(propertyList[index]) && propertyList[index].name !== category) {
                    shouldAddPropertyOption = false;
                }
                if (this.isUserPropertyOption(propertyList[index]) && shouldAddPropertyOption) {
                    result.push({label: propertyList[index].name, value: propertyList[index].id, type: type});
                }
            }
            return result;
        },
        findUserPropertyLabelByValue: function(value, propertyList) {
            var result = "";
            result = propertyList.find(function(property) {
                return property.id === value;
            });
            if (result) {
                return result.name;
            }
            return result;
        },
        isInternationalizationFound: function(key) {
            return key !== CV.i18n(key);
        }
    };
    var pushTableResource = countlyVue.vuex.ServerDataTable("pushTable", {
        columns: ['name', 'status', 'sent', 'actioned', 'createdDateTime', 'lastDate'],
        onRequest: function(context) {
            context.rootState.countlyPushNotificationMain.isLoadingTable = true;
            var data = {
                app_id: countlyCommon.ACTIVE_APP_ID,
                visibleColumns: JSON.stringify(context.state.params.selectedDynamicCols),
            };
            var type = context.rootState.countlyPushNotificationMain.selectedPushNotificationType;
            var status = context.rootState.countlyPushNotificationMain.statusFilter;
            var params = countlyPushNotification.service.getFetchAllParameters(type, status);
            for (var key in params) {
                data[key] = params[key];
            }
            return {
                type: "GET",
                url: countlyCommon.API_PARTS.data.r + "/push/message/all",
                data: data
            };
        },
        onReady: function(context, rows) {
            rows = countlyPushNotification.mapper.incoming.mapRows({"aaData": rows});
            context.rootState.countlyPushNotificationMain.isLoadingTable = false;
            return rows;
        },
        onError: function(context, error) {
            if (error) {
                if (error.status !== 0) {
                    console.log(error);
                }
            }
        }
    });
    //NOTE: api object will reside temporarily in countlyPushNotification until countlyApi object is created;
    countlyPushNotification.api = {
        findById: function(id) {
            var data = {
                _id: id,
                app_id: countlyCommon.ACTIVE_APP_ID
            };
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    type: "GET",
                    url: window.countlyCommon.API_URL + "/o/push/message/GET",
                    data: data,
                    contentType: "application/json",
                    success: function(response) {
                        resolve(response);
                    },
                    error: function(error) {
                        console.error(error);
                        var errorMessage = countlyPushNotification.helper.getErrorMessage(error);
                        reject(new Error(errorMessage));
                    },
                }, {disableAutoCatch: true});
            });
        },
        findAll: function(data) {
            data.app_id = countlyCommon.ACTIVE_APP_ID;
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r + "/push/message/all",
                    data: data,
                    dataType: "json",
                    success: function(response) {
                        resolve(response);
                    },
                    error: function(error) {
                        console.error(error);
                        var errorMessage = countlyPushNotification.helper.getErrorMessage(error);
                        reject(new Error(errorMessage));
                    },
                }, {disableAutoCatch: true});
            });
        },
        getDashboard: function(echo) {
            var data = {
                app_id: countlyCommon.ACTIVE_APP_ID
            };
            if (echo) {
                data.echo = echo;
            }
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    type: "GET",
                    url: window.countlyCommon.API_URL + '/o/push/dashboard',
                    data: data,
                    dataType: "json",
                    success: function(response) {
                        resolve(response);
                    },
                    error: function(error) {
                        console.error(error);
                        var errorMessage = countlyPushNotification.helper.getErrorMessage(error);
                        reject(new Error(errorMessage));
                    },
                }, {disableAutoCatch: true});
            });
        },
        delete: function(data) {
            data.app_id = countlyCommon.ACTIVE_APP_ID;
            return new Promise(function(resolve, reject) {
                return CV.$.ajax({
                    method: 'GET',
                    url: window.countlyCommon.API_URL + '/i/push/message/remove',
                    data: data,
                    dataType: "json",
                    success: function(response) {
                        resolve(response);
                    },
                    error: function(error) {
                        console.error(error);
                        var errorMessage = countlyPushNotification.helper.getErrorMessage(error);
                        reject(new Error(errorMessage));
                    },
                }, {disableAutoCatch: true});
            });
        },
        save: function(dto) {
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    type: "POST",
                    url: window.countlyCommon.API_URL + '/i/push/message/create?app_id=' + countlyCommon.ACTIVE_APP_ID,
                    data: JSON.stringify(dto),
                    contentType: "application/json",
                    success: function(response) {
                        if (response.error) {
                            reject(new Error(response.error));
                            return;
                        }
                        resolve();
                    },
                    error: function(error) {
                        console.error(error);
                        var errorMessage = countlyPushNotification.helper.getErrorMessage(error);
                        reject(new Error(errorMessage));
                    }
                }, {disableAutoCatch: true});
            });
        },
        sendToTestUsers: function(dto) {
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    type: "POST",
                    url: window.countlyCommon.API_URL + '/i/push/message/test?app_id=' + countlyCommon.ACTIVE_APP_ID,
                    data: JSON.stringify(dto),
                    contentType: "application/json",
                    success: function(response) {
                        resolve(response);
                    },
                    error: function(error) {
                        console.error(error);
                        var errorMessage = countlyPushNotification.helper.getErrorMessage(error);
                        reject(new Error(errorMessage));
                    }
                }, {disableAutoCatch: true});
            });
        },
        update: function(dto) {
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    type: "POST",
                    url: window.countlyCommon.API_URL + '/i/push/message/update?app_id=' + countlyCommon.ACTIVE_APP_ID,
                    data: JSON.stringify(dto),
                    contentType: "application/json",
                    success: function(response) {
                        if (response.error) {
                            reject(new Error(response.error));
                            return;
                        }
                        resolve();
                    },
                    error: function(error) {
                        console.error(error);
                        var errorMessage = countlyPushNotification.helper.getErrorMessage(error);
                        reject(new Error(errorMessage));
                    }
                }, {disableAutoCatch: true});
            });
        },
        estimate: function(data) {
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    type: "POST",
                    url: window.countlyCommon.API_URL + '/o/push/message/estimate?app_id=' + countlyCommon.ACTIVE_APP_ID,
                    data: JSON.stringify(data),
                    contentType: "application/json",
                    success: function(response) {

                        resolve(response);
                    },
                    error: function(error) {
                        console.error(error);
                        var errorMessage = countlyPushNotification.helper.getErrorMessage(error);
                        reject(new Error(errorMessage));
                    }
                }, {disableAutoCatch: true});
            });
        },
        getMime: function(url) {
            var data = {
                url: url,
                app_id: countlyCommon.ACTIVE_APP_ID
            };
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    method: 'GET',
                    url: window.countlyCommon.API_URL + '/o/push/mime',
                    data: data,
                    success: function(response) {
                        resolve(response);
                    },
                    error: function(error) {
                        console.error(error);
                        var errorMessage = countlyPushNotification.helper.getErrorMessage(error);
                        reject(new Error(errorMessage));
                    },
                }, {disableAutoCatch: true});
            });
        },
        findAllUserProperties: function() {
            if (typeof countlySegmentation === 'undefined') {
                return Promise.resolve({});
            }
            return countlySegmentation.initialize("").then(function() {
                return Promise.resolve(countlySegmentation.getFilters());
            });
        },
        searchUsers: function(query, options) {
            var data = {
                query: JSON.stringify(query)
            };
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    type: "POST",
                    url: countlyCommon.API_PARTS.data.r + "?app_id=" + options.appId + "&method=user_details",
                    contentType: "application/json",
                    data: JSON.stringify(data),
                    success: function(response) {
                        resolve(response);
                    },
                    error: function(error) {
                        console.error(error);
                        var errorMessage = countlyPushNotification.helper.getErrorMessage(error);
                        reject(new Error(errorMessage));
                    },
                }, {disableAutoCatch: true});
            });
        },
        updateAppConfig: function(config, options) {
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    type: "POST",
                    url: countlyCommon.API_PARTS.apps.w + '/update/plugins?app_id=' + options.app_id,
                    data: {
                        args: JSON.stringify(config),
                        app_id: options.app_id
                    },
                    dataType: "json",
                    success: function(response) {
                        resolve(response);
                    },
                    error: function(error) {
                        console.error(error);
                        var errorMessage = countlyPushNotification.helper.getErrorMessage(error);
                        reject(new Error(errorMessage));
                    },
                }, {disableAutoCatch: true});
            });
        },
        toggle: function(id, isActive) {
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    type: "GET",
                    url: window.countlyCommon.API_URL + '/i/push/message/toggle',
                    data: {
                        _id: id,
                        active: isActive,
                        app_id: countlyCommon.ACTIVE_APP_ID
                    },
                    dataType: "json",
                    success: function(response) {
                        resolve(response);
                    },
                    error: function(error) {
                        console.error(error);
                        var errorMessage = countlyPushNotification.helper.getErrorMessage(error);
                        reject(new Error(errorMessage));
                    },
                }, {disableAutoCatch: true});
            });
        }
    };

    countlyPushNotification.mapper = {
        incoming: {
            addLabelToUserPropertiesDto: function(userPropertiesDto, userProperties) {
                if (!userPropertiesDto) {
                    return;
                }
                Object.keys(userPropertiesDto).forEach(function(key) {
                    if (userPropertiesDto[key].t === UserPropertyTypeEnum.API) {
                        userPropertiesDto[key].l = userPropertiesDto[key].k;
                    }
                    else {
                        userPropertiesDto[key].l = countlyPushNotification.helper.findUserPropertyLabelByValue(userPropertiesDto[key].k, userProperties);
                    }
                });
            },
            getUserPropertyElement: function(index, userProperty) {
                var newElement = document.createElement("span");
                newElement.setAttribute("id", "id-" + index);
                newElement.setAttribute("contentEditable", false);
                newElement.setAttribute("class", "cly-vue-push-notification-message-editor-with-emoji-picker__user-property");
                newElement.setAttribute("data-user-property-label", userProperty.l);
                newElement.setAttribute("data-user-property-value", userProperty.k);
                newElement.setAttribute("data-user-property-fallback", userProperty.f);
                newElement.innerText = userProperty.l + "|" + userProperty.f;
                return newElement.outerHTML;
            },
            insertUserPropertyAtIndex: function(message, index, userProperty) {
                return [message.slice(0, index), userProperty, message.slice(index)].join('');
            },
            sortUserProperties: function(userPropertiesDto) {
                return Object.keys(userPropertiesDto).sort(function(firstUserPropertyId, secondUserPropertyId) {
                    return firstUserPropertyId - secondUserPropertyId;
                });
            },
            isAdjacentIndex: function(previousIndex, currentIndex) {
                return (parseInt(currentIndex) - 1) === parseInt(previousIndex);
            },
            decodeHtml: function(str) {
                var map =
                {
                    '&amp;': '&',
                    '&lt;': '<',
                    '&gt;': '>',
                    '&quot;': '"',
                    '&#039;': "'",
                    '&#39;': "'"
                };
                return str.replace(/&amp;|&lt;|&gt;|&quot;|&#039;|&#39;/g, function(m) {
                    return map[m];
                });
            },
            buildMessageText: function(message, userPropertiesDto) {
                var self = this;
                if (!message) {
                    message = "";
                }
                if (!userPropertiesDto) {
                    return message;
                }
                // var html = '',
                //     keys = this.sortUserProperties(userPropertiesDto),
                //     ranges = [-1]
                //         .concat(keys.map(function(k) {
                //             return parseInt(k);
                //         }))
                //         .concat([-1]);

                // ranges.forEach(function(start, idx) {
                //     if (idx === ranges.length - 1) {
                //         return;
                //     }

                //     var end = ranges[idx + 1];
                //     if (end === 0) { // prop at index 0
                //         return;
                //     }
                //     else if (start === -1) { // first range
                //         html += message.substr(0, end) + self.getUserPropertyElement(end, userPropertiesDto[end]);
                //     }
                //     else if (end === -1) { // last range
                //         html += message.substr(start);
                //     }
                //     else {
                //         html += message.substr(start, end - start) + self.getUserPropertyElement(end, userPropertiesDto[end]);
                //     }
                // });
                // return html;
                var messageInHTMLString = this.decodeHtml(message);
                var buildMessageLength = 0;
                var previousIndex = undefined;
                this.sortUserProperties(userPropertiesDto).forEach(function(currentUserPropertyIndex, index) {
                    var userPropertyStringElement = self.getUserPropertyElement(currentUserPropertyIndex, userPropertiesDto[currentUserPropertyIndex]);
                    if (index === 0) {
                        messageInHTMLString = self.insertUserPropertyAtIndex(messageInHTMLString, currentUserPropertyIndex, userPropertyStringElement);
                        buildMessageLength = Number(currentUserPropertyIndex) + userPropertyStringElement.length;
                    }
                    else {
                        var addedStringLength = currentUserPropertyIndex - previousIndex;
                        if (self.isAdjacentIndex(previousIndex, currentUserPropertyIndex)) {
                            addedStringLength = 0;
                        }
                        var newIndex = buildMessageLength + addedStringLength;
                        messageInHTMLString = self.insertUserPropertyAtIndex(messageInHTMLString, newIndex, userPropertyStringElement);
                        buildMessageLength += userPropertyStringElement.length + addedStringLength;
                    }
                    previousIndex = currentUserPropertyIndex;
                });
                return messageInHTMLString;
            },
            mapType: function(dto) {
                if (dto.triggers[0].kind === 'plain') {
                    return TypeEnum.ONE_TIME;
                }
                if (dto.triggers[0].kind === 'cohort' || dto.triggers[0].kind === 'event') {
                    return TypeEnum.AUTOMATIC;
                }
                if (dto.triggers[0].kind === 'api') {
                    return TypeEnum.TRANSACTIONAL;
                }
                throw new Error('Unknown push notification type:', dto);
            },
            mapOneTimeSeriesData: function(dto) {
                var monthlySendData = {};
                monthlySendData[PlatformEnum.ALL] = dto.sent.monthly.data || [];
                monthlySendData[PlatformEnum.ANDROID] = dto.sent.platforms[PlatformDtoEnum.ANDROID].monthly.data || [];
                monthlySendData[PlatformEnum.IOS] = dto.sent.platforms[PlatformDtoEnum.IOS].monthly.data || [];
                var monthlyActionsData = {};
                monthlyActionsData[PlatformEnum.ALL] = dto.actions.monthly.data || [];
                monthlyActionsData[PlatformEnum.ANDROID] = dto.actions.platforms[PlatformDtoEnum.ANDROID].monthly.data || [];
                monthlyActionsData[PlatformEnum.IOS] = dto.actions.platforms[PlatformDtoEnum.IOS].monthly.data || [];
                var weeklySentData = {};
                weeklySentData[PlatformEnum.ALL] = dto.sent.weekly.data || [];
                weeklySentData[PlatformEnum.ANDROID] = dto.sent.platforms[PlatformDtoEnum.ANDROID].weekly.data || [];
                weeklySentData[PlatformEnum.IOS] = dto.sent.platforms[PlatformDtoEnum.IOS].weekly.data || [];
                var weeklyActionsData = {};
                weeklyActionsData[PlatformEnum.ALL] = dto.actions.weekly.data || [];
                weeklyActionsData[PlatformEnum.ANDROID] = dto.actions.platforms[PlatformDtoEnum.ANDROID].weekly.data || [];
                weeklyActionsData[PlatformEnum.IOS] = dto.actions.platforms[PlatformDtoEnum.IOS].weekly.data || [];
                return {
                    monthly: [{data: monthlySendData, label: messagesSentLabel}, {data: monthlyActionsData, label: actionsPerformedLabel}],
                    weekly: [{data: weeklySentData, label: messagesSentLabel}, {data: weeklyActionsData, label: actionsPerformedLabel}],
                };
            },
            mapAutomaticSeriesData: function(dto) {
                var dailySendData = {};
                dailySendData[PlatformEnum.ALL] = dto.sent_automated.daily.data || [];
                dailySendData[PlatformEnum.ANDROID] = dto.sent_automated.platforms[PlatformDtoEnum.ANDROID].daily.data || [];
                dailySendData[PlatformEnum.IOS] = dto.sent_automated.platforms[PlatformDtoEnum.IOS].daily.data || [];
                var dailyActionsData = {};
                dailyActionsData[PlatformEnum.ALL] = dto.actions_automated.daily.data || [];
                dailyActionsData[PlatformEnum.ANDROID] = dto.actions_automated.platforms[PlatformDtoEnum.ANDROID].daily.data || [];
                dailyActionsData[PlatformEnum.IOS] = dto.actions_automated.platforms[PlatformDtoEnum.IOS].daily.data || [];
                return {
                    daily: [{data: dailySendData || [], label: messagesSentLabel}, {data: dailyActionsData || [], label: actionsPerformedLabel}]
                };
            },
            mapTransactionalSeriesData: function(dto) {
                var dailySendData = {};
                dailySendData[PlatformEnum.ALL] = dto.sent_tx.daily.data || [];
                dailySendData[PlatformEnum.ANDROID] = dto.sent_tx.platforms[PlatformDtoEnum.ANDROID].daily.data || [];
                dailySendData[PlatformEnum.IOS] = dto.sent_tx.platforms[PlatformDtoEnum.IOS].daily.data || [];
                var dailyActionsData = {};
                dailyActionsData[PlatformEnum.ALL] = dto.actions_tx.daily.data || [];
                dailyActionsData[PlatformEnum.ANDROID] = dto.actions_tx.platforms[PlatformDtoEnum.ANDROID].daily.data || [];
                dailyActionsData[PlatformEnum.IOS] = dto.actions_tx.platforms[PlatformDtoEnum.IOS].daily.data || [];
                return {
                    daily: [{data: dailySendData || [], label: messagesSentLabel}, {data: dailyActionsData || [], label: actionsPerformedLabel}]
                };
            },
            mapSeries: function(dto) {
                var result = {};
                result[TypeEnum.ONE_TIME] = this.mapOneTimeSeriesData(dto);
                result[TypeEnum.AUTOMATIC] = this.mapAutomaticSeriesData(dto);
                result[TypeEnum.TRANSACTIONAL] = this.mapTransactionalSeriesData(dto);
                return result;
            },
            mapPeriods: function(dto) {
                var result = {};
                result[TypeEnum.ONE_TIME] = {
                    weekly: dto.actions.weekly.keys,
                    monthly: dto.actions.monthly.keys
                };
                result[TypeEnum.AUTOMATIC] = {
                    daily: dto.actions_automated.daily.keys
                };
                result[TypeEnum.TRANSACTIONAL] = {
                    daily: dto.actions_tx.daily.keys
                };
                return result;
            },
            mapPlatforms: function(dto) {
                return dto.reduce(function(allPlatformItems, currentPlatformItem) {
                    if (currentPlatformItem === PlatformDtoEnum.IOS) {
                        allPlatformItems.push(PlatformEnum.IOS);
                    }
                    if (currentPlatformItem === PlatformDtoEnum.ANDROID) {
                        allPlatformItems.push(PlatformEnum.ANDROID);
                    }
                    return allPlatformItems;
                }, []);
            },
            mapStatus: function(dto) {
                if (dto.status === 'draft' && dto.info.rejected) {
                    return StatusEnum.REJECT;
                }
                if (dto.status === 'inactive') {
                    return StatusEnum.PENDING_APPROVAL;
                }
                return dto.status;
            },
            mapDemo: function(dto) {
                if (dto.info && dto.info.demo) {
                    return true;
                }
                return false;
            },
            mapRows: function(dto) {
                var self = this;
                var rowsModel = [];
                dto.aaData.forEach(function(pushNotificationDtoItem, index) {
                    rowsModel[index] = {
                        _id: pushNotificationDtoItem._id,
                        name: pushNotificationDtoItem.info && pushNotificationDtoItem.info.title || '-',
                        status: self.mapStatus(pushNotificationDtoItem),
                        createdDateTime: {
                            date: moment(pushNotificationDtoItem.info && pushNotificationDtoItem.info.created).format("MMMM Do YYYY"),
                            time: moment(pushNotificationDtoItem.info && pushNotificationDtoItem.info.created).format("h:mm:ss a")
                        },
                        sent: pushNotificationDtoItem.result.sent || 0,
                        actioned: pushNotificationDtoItem.result.actioned || 0,
                        createdBy: pushNotificationDtoItem.info && pushNotificationDtoItem.info.createdByName || '',
                        lastDate: {
                            date: pushNotificationDtoItem.info && pushNotificationDtoItem.info.lastDate ? moment(pushNotificationDtoItem.info.lastDate).format("MMMM Do YYYY") : null,
                            time: pushNotificationDtoItem.info && pushNotificationDtoItem.info.lastDate ? moment(pushNotificationDtoItem.info.lastDate).format("h:mm:ss a") : null,
                        },
                        platforms: self.mapPlatforms(pushNotificationDtoItem.platforms),
                        content: self.findDefaultLocaleItem(pushNotificationDtoItem.contents).message
                    };
                });
                return rowsModel;
            },
            mapTargeting: function(dto) {
                if (dto.filter && (dto.filter.cohorts && dto.filter.cohorts.length || dto.filter.geos && dto.filter.geos.length)) {
                    return TargetingEnum.SEGMENTED;
                }
                return TargetingEnum.ALL;
            },
            getExpiredTokenErrorIfFound: function(dto) {
                if (dto.result && (dto.result.processed > (dto.result.sent + dto.result.errored))) {
                    var affectedUsers = dto.result.processed - (dto.result.sent + dto.result.errored);
                    return {'ExpiredToken': affectedUsers};
                }
                return null;
            },
            mapGlobalError: function(dto) {
                if (dto.result && dto.result.error) {
                    return {
                        code: dto.result.error,
                        affectedUsers: dto.result.total || '',
                        description: CV.i18n('push-notification.error-code.' + dto.result.error + '.desc') || ''
                    };
                }
                return null;
            },
            mapErrors: function(dto) {
                var expiredTokenError = this.getExpiredTokenErrorIfFound(dto);
                if (expiredTokenError) {
                    if (dto.result && !dto.result.errors) {
                        dto.result.errors = {};
                    }
                    Object.assign(dto.result.errors, expiredTokenError);
                }
                if (!(dto.result && dto.result.errors)) {
                    return [];
                }
                return Object.keys(dto.result.errors).map(function(errorKey) {
                    var errorCodeParts = errorKey.match(ERROR_MESSAGE_REGEX) || [];
                    var platformError = errorCodeParts[1];
                    var numberError = errorCodeParts[2];
                    var result = {
                        code: errorKey,
                        affectedUsers: dto.result.errors[errorKey] || '',
                        description: CV.i18n('push-notification.error-code.' + errorKey + '.desc')
                    };
                    if (countlyPushNotification.helper.isInternationalizationFound('push-notification.error-code.' + errorKey + '.desc')) {
                        result.description = CV.i18n('push-notification.error-code.' + errorKey + '.desc');
                        return result;
                    }
                    if (countlyPushNotification.helper.isInternationalizationFound('push-notification.error-code.' + platformError + numberError + '.desc')) {
                        result.description = CV.i18n('push-notification.error-code.' + platformError + numberError + '.desc');
                        return result;
                    }
                    result.description = "";
                    return result;
                });
            },
            mapAndroidSettings: function(androidSettingsDto) {
                return {
                    // NOte: icon will reside at index zero for now. There are no other platform specifics
                    icon: androidSettingsDto && androidSettingsDto.specific && androidSettingsDto.specific[0] && androidSettingsDto.specific[0].large_icon || "",
                    soundFilename: androidSettingsDto && androidSettingsDto.sound || "",
                    badgeNumber: androidSettingsDto && androidSettingsDto.badge && androidSettingsDto.badge.toString(),
                    json: androidSettingsDto && androidSettingsDto.data || null,
                    userData: androidSettingsDto && androidSettingsDto.extras || [],
                    onClickURL: androidSettingsDto && androidSettingsDto.url ? countlyCommon.decodeHtml(androidSettingsDto.url) : '',
                    mediaURL: androidSettingsDto && androidSettingsDto.media ? countlyCommon.decodeHtml(androidSettingsDto.media) : '',
                    mediaMime: androidSettingsDto && androidSettingsDto.mediaMime || '',
                };
            },
            mapIOSSettings: function(iosSettingsDto) {
                return {
                    // NOte: subtitle will reside at index zero for now. There are no other platform specifics
                    subtitle: iosSettingsDto && iosSettingsDto.specific && iosSettingsDto.specific[0] && countlyPushNotification.helper.decodeMessage(iosSettingsDto.specific[0].subtitle || ""),
                    soundFilename: iosSettingsDto && iosSettingsDto.sound || "",
                    badgeNumber: iosSettingsDto && iosSettingsDto.badge && iosSettingsDto.badge.toString(),
                    json: iosSettingsDto && iosSettingsDto.data || null,
                    userData: iosSettingsDto && iosSettingsDto.extras || [],
                    onClickURL: iosSettingsDto && iosSettingsDto.url ? countlyCommon.decodeHtml(iosSettingsDto.url) : '',
                    mediaURL: iosSettingsDto && iosSettingsDto.media ? countlyCommon.decodeHtml(iosSettingsDto.media) : '',
                    mediaMime: iosSettingsDto && iosSettingsDto.mediaMime || '',
                };
            },
            mapEvents: function(eventsList) {
                return eventsList.map(function(event) {
                    return {label: event, value: event};
                });
            },
            isNonDefaultLocale: function(locale) {
                return Boolean(locale.la) && !locale.p;
            },
            isPlatformSetting: function(locale) {
                return !locale.la && Boolean(locale.p);
            },
            findDefaultLocaleItem: function(contentsDto) {
                //NOTE: default locale always resides at index position 0 of contents array
                return contentsDto[0];
            },
            findPlatformSetting: function(platform, contentDto) {
                var found = false;
                var index = 0;
                while (!found && index < contentDto.length) {
                    var locale = contentDto[index];
                    if (this.isPlatformSetting(locale) && locale.p === platform) {
                        found = true;
                    }
                    else {
                        index += 1;
                    }
                }
                if (found) {
                    return contentDto[index];
                }
                return null;
            },
            findNonDefaultLocaleItem: function(localeKey, contentDto) {
                var found = false;
                var index = 0;
                while (!found && index < contentDto.length) {
                    var locale = contentDto[index];
                    if (this.isNonDefaultLocale(locale) && locale.la === localeKey) {
                        found = true;
                    }
                    else {
                        index += 1;
                    }
                }
                if (found) {
                    return contentDto[index];
                }
                return null;
            },
            findLocaleItem: function(localeKey, contentDto) {
                if (localeKey === DEFAULT_LOCALIZATION_VALUE) {
                    return this.findDefaultLocaleItem(contentDto);
                }
                return this.findNonDefaultLocaleItem(localeKey, contentDto);
            },
            mapSettings: function(dto) {
                var result = {};
                var iosSettingsDto = this.findPlatformSetting(PlatformDtoEnum.IOS, dto.contents);
                var androidSetting = this.findPlatformSetting(PlatformDtoEnum.ANDROID, dto.contents);
                result[PlatformEnum.IOS] = this.mapIOSSettings(iosSettingsDto);
                result[PlatformEnum.ANDROID] = this.mapAndroidSettings(androidSetting);
                var defaultLocale = this.findDefaultLocaleItem(dto.contents);
                result[PlatformEnum.ALL] = {};
                result[PlatformEnum.ALL].mediaURL = defaultLocale.media ? countlyCommon.decodeHtml(defaultLocale.media) : "";
                result[PlatformEnum.ALL].mediaMime = defaultLocale.mediaMime || "";
                return result;
            },
            mapMessageLocalizationUserProperties: function(userPropertyDto) {
                var userPropertyModel = {};
                if (!userPropertyDto) {
                    return userPropertyModel;
                }
                Object.keys(userPropertyDto).forEach(function(userPropertyKey) {
                    userPropertyModel[userPropertyKey] = {
                        id: userPropertyKey,
                        value: userPropertyDto[userPropertyKey].k,
                        label: userPropertyDto[userPropertyKey].l || "",
                        fallback: userPropertyDto[userPropertyKey].f,
                        isUppercase: userPropertyDto[userPropertyKey].c,
                        type: userPropertyDto[userPropertyKey].t || UserPropertyTypeEnum.USER
                    };
                });
                return userPropertyModel;
            },
            mapMessageLocalizationButtons: function(buttonsDto) {
                var buttons = [];
                buttonsDto.map(function(buttonDtoItem) {
                    buttons.push({label: buttonDtoItem.title, url: buttonDtoItem.url ? countlyCommon.decodeHtml(buttonDtoItem.url) : buttonDtoItem.url});
                });
                return buttons;
            },
            mapMessageLocalization: function(localeKey, dto) {
                var localeItem = this.findLocaleItem(localeKey, dto.contents);
                if (!localeItem) {
                    throw new Error('Unable to find locale item with key:', localeKey);
                }
                this.addLabelToUserPropertiesDto(localeItem.titlePers, dto.userProperties);
                this.addLabelToUserPropertiesDto(localeItem.messagePers, dto.userProperties);
                var result = {
                    title: this.buildMessageText(localeItem.title, localeItem.titlePers),
                    content: this.buildMessageText(localeItem.message, localeItem.messagePers),
                    properties: {
                        title: this.mapMessageLocalizationUserProperties(localeItem.titlePers),
                        content: this.mapMessageLocalizationUserProperties(localeItem.messagePers),
                    },
                    buttons: []
                };
                if (localeItem.buttons) {
                    result.buttons = this.mapMessageLocalizationButtons(localeItem.buttons);
                }
                return result;
            },
            mapMessageLocalizationsList: function(localizations, dto) {
                var self = this;
                var messages = {};
                localizations.forEach(function(localizationItem) {
                    messages[localizationItem.value] = self.mapMessageLocalization(localizationItem.value, dto);
                });
                return messages;
            },
            mapEnabledUsers: function(dto) {
                var result = {};
                result[PlatformEnum.ALL] = parseInt(dto.enabled.total);
                result[PlatformEnum.ANDROID] = parseInt(dto.enabled.a);
                if (dto.enabled.h) {
                    result[PlatformEnum.ANDROID] += parseInt(dto.enabled.h);
                }
                result[PlatformEnum.IOS] = parseInt(dto.enabled.i);
                return result;
            },
            mapDashboardTotal: function(dto, type, property) {
                var result = {};
                result[type] = {};
                result[type][PlatformEnum.ALL] = dto[property].total;
                result[type][PlatformEnum.IOS] = dto[property].platforms[PlatformDtoEnum.IOS].total;
                result[type][PlatformEnum.ANDROID] = dto[property].platforms[PlatformDtoEnum.ANDROID].total;
                return result;
            },
            mapTotalActions: function(dto) {
                var result = {};
                Object.assign(result, this.mapDashboardTotal(dto, TypeEnum.ONE_TIME, 'actions'));
                Object.assign(result, this.mapDashboardTotal(dto, TypeEnum.AUTOMATIC, 'actions_automated'));
                Object.assign(result, this.mapDashboardTotal(dto, TypeEnum.TRANSACTIONAL, 'actions_tx'));
                return result;
            },
            mapTotalSent: function(dto) {
                var result = {};
                Object.assign(result, this.mapDashboardTotal(dto, TypeEnum.ONE_TIME, 'sent'));
                Object.assign(result, this.mapDashboardTotal(dto, TypeEnum.AUTOMATIC, 'sent_automated'));
                Object.assign(result, this.mapDashboardTotal(dto, TypeEnum.TRANSACTIONAL, 'sent_tx'));
                return result;
            },
            mapMainDashboard: function(dashboardDto) {
                return {
                    series: this.mapSeries(dashboardDto),
                    periods: this.mapPeriods(dashboardDto),
                    totalAppUsers: parseInt(dashboardDto.users),
                    enabledUsers: this.mapEnabledUsers(dashboardDto),
                    totalActions: this.mapTotalActions(dashboardDto),
                    totalSent: this.mapTotalSent(dashboardDto),
                    tokens: dashboardDto.tokens,
                };
            },
            mapAndroidDashboard: function(dto) {
                return {
                    sent: dto.result.subs[PlatformDtoEnum.ANDROID].sent || 0,
                    actioned: dto.result.subs[PlatformDtoEnum.ANDROID].actioned || 0,
                    errored: dto.result.subs[PlatformDtoEnum.ANDROID].errored || 0,
                    processed: dto.result.subs[PlatformDtoEnum.ANDROID].processed || 0,
                    total: dto.result.subs[PlatformDtoEnum.ANDROID].total || 0,
                    locales: dto.result.subs[PlatformDtoEnum.ANDROID].subs || {},
                };
            },
            mapIosDashboard: function(dto) {
                return {
                    sent: dto.result.subs[PlatformDtoEnum.IOS].sent || 0,
                    actioned: dto.result.subs[PlatformDtoEnum.IOS].actioned || 0,
                    errored: dto.result.subs[PlatformDtoEnum.IOS].errored || 0,
                    processed: dto.result.subs[PlatformDtoEnum.IOS].processed || 0,
                    total: dto.result.subs[PlatformDtoEnum.IOS].total || 0,
                    locales: dto.result.subs[PlatformDtoEnum.IOS].subs || {},
                };
            },
            mapAllDashboardLocales: function(locales, dto, platformDto, platform) {
                var allLocales = Object.assign({}, locales);
                if (dto.result.subs[platformDto] && !dto.result.subs[platformDto].subs) {
                    return allLocales;
                }
                Object.keys(dto.result.subs[platformDto].subs).forEach(function(key) {
                    if (!allLocales[platform]) {
                        allLocales[key] = countlyPushNotification.helper.getInitialModelDashboardPlatform();
                    }
                    allLocales[key].sent = allLocales[key].sent + dto.result.subs[platformDto].subs[key].sent || 0;
                    allLocales[key].actioned = allLocales[key].actioned + dto.result.subs[platformDto].subs[key].actioned || 0;
                    allLocales[key].errored = allLocales[key].failed + dto.result.subs[platformDto].subs[key].errored || 0;
                    allLocales[key].processed = allLocales[key].processed + dto.result.subs[platformDto].subs[key].processed || 0;
                    allLocales[key].total = allLocales[key].total + dto.result.subs[platformDto].subs[key].total || 0;
                });
                return allLocales;
            },
            mapAllDashboard: function(dto) {
                var allLocales = {};
                if (dto.result.subs && dto.result.subs[PlatformDtoEnum.IOS]) {
                    allLocales = this.mapAllDashboardLocales(allLocales, dto, PlatformDtoEnum.IOS, PlatformEnum.IOS);
                }
                if (dto.result.subs && dto.result.subs[PlatformDtoEnum.ANDROID]) {
                    allLocales = this.mapAllDashboardLocales(allLocales, dto, PlatformDtoEnum.ANDROID, PlatformEnum.ANDROID);
                }
                return {
                    sent: dto.result.sent || 0,
                    actioned: dto.result.actioned || 0,
                    errored: dto.result.errored || 0,
                    processed: dto.result.processed || 0,
                    total: dto.result.total || 0,
                    locales: allLocales,
                };
            },
            mapDashboard: function(dto) {
                var model = {};
                if (dto.result.subs && dto.result.subs[PlatformDtoEnum.ANDROID]) {
                    model[PlatformEnum.ANDROID] = this.mapAndroidDashboard(dto);
                }
                if (dto.result.subs && dto.result.subs[PlatformDtoEnum.IOS]) {
                    model[PlatformEnum.IOS] = this.mapIosDashboard(dto);
                }
                model[PlatformEnum.ALL] = this.mapAllDashboard(dto);
                return model;
            },
            mapDtoToBaseModel: function(dto) {
                var localizations = this.mapLocalizations(dto.info && dto.info.locales || []);
                return {
                    _id: dto._id || null,
                    demo: this.mapDemo(dto),
                    status: this.mapStatus(dto),
                    createdAt: dto.info && dto.info.created ? moment(dto.info.created).format("dddd, Do MMMM YYYY h:mm") : null,
                    name: dto.info && dto.info.title,
                    createdBy: dto.info && dto.info.createdByName || '',
                    platforms: this.mapPlatforms(dto.platforms),
                    localizations: localizations,
                    message: this.mapMessageLocalizationsList(localizations, dto),
                    settings: this.mapSettings(dto),
                    messageType: dto.info && dto.info.silent ? MessageTypeEnum.SILENT : MessageTypeEnum.CONTENT,
                    error: this.mapGlobalError(dto),
                    errors: this.mapErrors(dto),
                    locations: dto.filter && dto.filter.geos || [],
                    cohorts: dto.filter && dto.filter.cohorts || [],
                    user: dto.filter && dto.filter.user,
                    drill: dto.filter && dto.filter.drill,
                    expiration: countlyPushNotification.helper.convertMSToDaysAndHours(this.findDefaultLocaleItem(dto.contents).expiration),
                    dashboard: this.mapDashboard(dto),
                };
            },
            mapDtoToOneTimeModel: function(dto) {
                var model = this.mapDtoToBaseModel(dto);
                model[TypeEnum.ONE_TIME] = {};
                model[TypeEnum.ONE_TIME].targeting = this.mapTargeting(dto);
                model[TypeEnum.ONE_TIME].pastSchedule = PastScheduleEnum.SKIP; //NOTE: past schedule is not supported at the moment. Auto trigger reschedule is not used anywhere.
                model.type = TypeEnum.ONE_TIME;
                var triggerDto = dto.triggers[0];
                model.delivery = {
                    startDate: triggerDto.start ? moment(triggerDto.start).valueOf() : null,
                    endDate: null,
                    type: dto.info && dto.info.scheduled ? SendEnum.LATER : SendEnum.NOW,
                };
                // overwrite date with now() for send-now drafts
                if (model.status === 'draft' && model.delivery.type === SendEnum.NOW) {
                    model.delivery.startDate = moment().valueOf();
                }
                model[TypeEnum.ONE_TIME].audienceSelection = triggerDto.delayed ? AudienceSelectionEnum.BEFORE : AudienceSelectionEnum.NOW;
                model.timezone = triggerDto.tz ? TimezoneEnum.DEVICE : TimezoneEnum.SAME;
                return model;
            },
            mapDtoToAutomaticModel: function(dto) {
                var model = this.mapDtoToBaseModel(dto);
                model.type = TypeEnum.AUTOMATIC;
                var triggerDto = dto.triggers[0];
                model.cohorts = triggerDto.cohorts || [];
                model.delivery = {
                    startDate: moment(triggerDto.start).valueOf(),
                    endDate: triggerDto.end ? moment(triggerDto.end).valueOf() : null,
                    type: dto.info && dto.info.scheduled ? SendEnum.LATER : SendEnum.NOW,
                };
                model.automatic = {
                    deliveryMethod: triggerDto.delay ? DeliveryMethodEnum.DELAYED : DeliveryMethodEnum.IMMEDIATELY,
                    deliveryDateCalculation: triggerDto.actuals ? DeliveryDateCalculationEnum.EVENT_DEVICE_DATE : DeliveryDateCalculationEnum.EVENT_SERVER_DATE,
                    trigger: triggerDto.kind === 'event' ? TriggerEnum.EVENT : triggerDto.entry ? TriggerEnum.COHORT_ENTRY : TriggerEnum.COHORT_EXIT,
                    triggerNotMet: triggerDto.cancels ? TriggerNotMetEnum.CANCEL_ON_EXIT : TriggerNotMetEnum.SEND_ANYWAY,
                    cohorts: triggerDto.cohorts || [],
                    events: triggerDto.events || [],
                    capping: Boolean(triggerDto.cap),
                    usersTimezone: null,
                };
                if (triggerDto.time) {
                    var result = countlyPushNotification.helper.convertMSToDaysAndHours(triggerDto.time);
                    model.automatic.usersTimezone = new Date();
                    model.automatic.usersTimezone.setHours(result.hours, result.minutes);
                }
                model.automatic.delayed = countlyPushNotification.helper.convertMSToDaysAndHours(triggerDto.delay);
                model.automatic.maximumMessagesPerUser = triggerDto.cap || 1,
                model.automatic.minimumTimeBetweenMessages = countlyPushNotification.helper.convertMSToDaysAndHours(triggerDto.sleep);
                return model;
            },
            mapDtoToTransactionalModel: function(dto) {
                var model = this.mapDtoToBaseModel(dto);
                model.type = TypeEnum.TRANSACTIONAL;
                var triggerDto = dto.triggers[0];
                model.delivery = {
                    startDate: triggerDto.start ? moment(triggerDto.start).valueOf() : null,
                    endDate: null,
                    type: dto.info && dto.info.scheduled ? SendEnum.LATER : SendEnum.NOW,
                };
                return model;
            },
            mapDtoToModel: function(dto) {
                var pushNotificationType = this.mapType(dto);
                if (pushNotificationType === TypeEnum.ONE_TIME) {
                    return this.mapDtoToOneTimeModel(dto);
                }
                if (pushNotificationType === TypeEnum.AUTOMATIC) {
                    return this.mapDtoToAutomaticModel(dto);
                }
                if (pushNotificationType === TypeEnum.TRANSACTIONAL) {
                    return this.mapDtoToTransactionalModel(dto);
                }
                throw new Error('Unknown push notification type:' + pushNotificationType);
            },
            mapMediaMetadata: function(metadataDto) {
                var typeAndFileExtension = metadataDto.mediaMime.split('/');
                return {
                    type: typeAndFileExtension[0],
                    extension: typeAndFileExtension[1],
                    mime: metadataDto.mediaMime,
                    size: metadataDto.mediaSize / MB_TO_BYTES_RATIO,
                };
            },
            mapLocalizationByKey: function(localizationKey) {
                var label = countlyGlobalLang.languages[localizationKey] && countlyGlobalLang.languages[localizationKey].englishName;
                return { label: label || localizationKey, value: localizationKey};
            },
            hasAnyLocales: function(localesDto) {
                if (localesDto) {
                    return Object.keys(localesDto).some(function(localeKey) {
                        return Boolean(countlyGlobalLang.languages[localeKey]);
                    });
                }
                return false;
            },
            mapLocalizations: function(localesDto) {
                var self = this;
                if (!this.hasAnyLocales(localesDto)) {
                    return [countlyPushNotification.helper.getDefaultLocalization()];
                }
                var result = Object.keys(localesDto).reduce(function(allLocales, localeKey) {
                    if (localeKey !== DEFAULT_LOCALIZATION_VALUE && localeKey !== 'count') {
                        var localizationItem = self.mapLocalizationByKey(localeKey);
                        localizationItem.count = localesDto[localeKey];
                        if (localesDto.count && localesDto.count !== 0) {
                            localizationItem.percentage = CountlyHelpers.formatPercentage(localesDto[localeKey] / localesDto.count);
                        }
                        else {
                            localizationItem.percentage = 0;
                        }
                        allLocales.push(localizationItem);
                    }
                    return allLocales;
                }, []);
                result.unshift(countlyPushNotification.helper.getDefaultLocalization());
                return result;
            },
            //TODO-LA:Re-use the mapper from target location
            mapLocationTarget: function(dto) {
                return dto.map(function(locationItem) {
                    return {
                        _id: locationItem._id,
                        name: locationItem.title,
                        radius: locationItem.radius,
                        unit: locationItem.unit,
                        coordinates: locationItem.geo.coordinates.join(", "),
                    };
                });
            },
            hasAppLevelPlatformConfig: function(dto, platform) {
                return dto[platform] && dto[platform]._id && dto[platform]._id !== 'demo';
            },
            mapIOSAppLevelConfig: function(dto) {
                var hasIOSConfig = this.hasAppLevelPlatformConfig(dto, PlatformDtoEnum.IOS);
                if (hasIOSConfig) {
                    return {
                        _id: dto[PlatformDtoEnum.IOS]._id || '',
                        keyId: dto[PlatformDtoEnum.IOS].type === 'apn_token' ? dto[PlatformDtoEnum.IOS].keyid : '',
                        p8KeyFile: dto[PlatformDtoEnum.IOS].type === 'apn_token' ? dto[PlatformDtoEnum.IOS].key : '',
                        p12KeyFile: dto[PlatformDtoEnum.IOS].type === 'apn_universal' ? dto[PlatformDtoEnum.IOS].cert : '',
                        bundleId: dto[PlatformDtoEnum.IOS].bundle,
                        authType: dto[PlatformDtoEnum.IOS].type === 'apn_universal' ? IOSAuthConfigTypeEnum.P12 : IOSAuthConfigTypeEnum.P8,
                        passphrase: dto[PlatformDtoEnum.IOS].type === 'apn_universal' ? dto[PlatformDtoEnum.IOS].secret : '',
                        teamId: dto[PlatformDtoEnum.IOS].type === 'apn_token' ? dto[PlatformDtoEnum.IOS].team : '',
                        hasKeyFile: hasIOSConfig,
                        hasUploadedKeyFile: false
                    };
                }
                return null;
            },
            mapAndroidAppLevelConfig: function(dto) {
                if (this.hasAppLevelPlatformConfig(dto, PlatformDtoEnum.ANDROID)) {
                    return {
                        _id: dto[PlatformDtoEnum.ANDROID]._id || '',
                        firebaseKey: dto[PlatformDtoEnum.ANDROID].key,
                        type: dto[PlatformDtoEnum.ANDROID].type
                    };
                }
                return null;
            },
            mapHuaweiAppLevelConfig: function(dto) {
                if (this.hasAppLevelPlatformConfig(dto, PlatformDtoEnum.HUAWEI)) {
                    return {
                        _id: dto[PlatformDtoEnum.HUAWEI]._id || '',
                        type: dto[PlatformDtoEnum.HUAWEI].type,
                        appId: dto[PlatformDtoEnum.HUAWEI].app,
                        appSecret: dto[PlatformDtoEnum.HUAWEI].secret
                    };
                }
                return null;
            },
            mapAppLevelConfig: function(dto) {
                if (!dto) {
                    var emptyModel = {};
                    emptyModel[PlatformEnum.IOS] = null;
                    emptyModel[PlatformEnum.ANDROID] = null;
                    emptyModel[PlatformEnum.HUAWEI] = null;
                    emptyModel.rate = '';
                    emptyModel.period = '';
                    return emptyModel;
                }
                var model = {
                    rate: dto.rate && dto.rate.rate || '',
                    period: dto.rate && dto.rate.period || ''
                };
                model[PlatformEnum.IOS] = this.mapIOSAppLevelConfig(dto);
                model[PlatformEnum.ANDROID] = this.mapAndroidAppLevelConfig(dto);
                model[PlatformEnum.HUAWEI] = this.mapHuaweiAppLevelConfig(dto);
                return model;
            },
        },
        outgoing: {
            getUserPropertiesIds: function(localizedMessage, container) {
                var userPropertyIds = [];
                var htmlElement = document.createElement('div');
                htmlElement.innerHTML = localizedMessage[container];
                for (var index = 0; index < htmlElement.children.length; index++) {
                    var idAttribute = htmlElement.children[index].getAttributeNode('id');
                    if (idAttribute && idAttribute.value) {
                        var idAtributeValue = idAttribute.value;
                        var idNumber = idAtributeValue.split('-')[1];
                        userPropertyIds.push(idNumber);
                    }

                }
                return userPropertyIds;
            },
            isAdjacentUserProperty: function(firstNodeIndex, secondNodeIndex) {
                return firstNodeIndex === secondNodeIndex;
            },
            getUserPropertiesIndices: function(localizedMessage, container) {
                var self = this;
                var indices = [];
                var element = document.createElement('div');
                element.innerHTML = localizedMessage[container];
                var currentIndex = 0;
                element.childNodes.forEach(function(node) {
                    if (node.hasChildNodes()) {
                        //NOTE:this is a user property node
                        var previousIndex = indices[indices.length - 1];
                        if (self.isAdjacentUserProperty(previousIndex, currentIndex)) {
                            currentIndex += 1 ;
                            indices.push(currentIndex);
                        }
                        else {
                            indices.push(currentIndex);
                        }
                    }
                    else {
                        //NOTE:this is a text content node;
                        currentIndex += node.textContent.length;
                    }
                });
                return indices;
            },
            hasUserProperties: function(localizedMessage, container) {
                return localizedMessage.properties && Object.keys(localizedMessage.properties[container]).length > 0;
            },
            removeUserProperties: function(message, container) {
                var element = document.createElement('div');
                element.innerHTML = message[container];
                Object.keys(message.properties[container]).forEach(function(userPropertyId) {
                    var userPropertyElement = element.querySelector("#id-" + userPropertyId);
                    element.removeChild(userPropertyElement);
                });
                return element.innerHTML;
            },
            getMessageText: function(message, container) {
                var element = document.createElement('div');
                element.innerHTML = message;
                if (message.properties && message.properties[container]) {
                    element.innerHTML = this.removeUserProperties(message, container);
                }
                return element.textContent;
            },
            mapPlatformItem: function(platform) {
                if (platform === PlatformEnum.IOS) {
                    return PlatformDtoEnum.IOS;
                }
                if (platform === PlatformEnum.ANDROID) {
                    return PlatformDtoEnum.ANDROID;
                }
                if (platform === PlatformEnum.HUAWEI) {
                    return PlatformDtoEnum.HUAWEI;
                }
            },
            mapPlatforms: function(model) {
                var self = this;
                return model.map(function(platform) {
                    return self.mapPlatformItem(platform);
                });
            },
            mapUserProperties: function(localizedMessage, container) {
                var userPropertyDto = {};
                var indices = this.getUserPropertiesIndices(localizedMessage, container);
                var userPropertyIds = this.getUserPropertiesIds(localizedMessage, container);
                userPropertyIds.forEach(function(userPropertyId, index) {
                    userPropertyDto[indices[index]] = {
                        f: localizedMessage.properties[container][userPropertyId].fallback,
                        c: localizedMessage.properties[container][userPropertyId].isUppercase,
                        k: localizedMessage.properties[container][userPropertyId].value,
                        t: localizedMessage.properties[container][userPropertyId].type,
                    };
                });
                return userPropertyDto;
            },
            mapButtons: function(localizedMessage) {
                var result = [];
                localizedMessage.buttons.forEach(function(localizedButton) {
                    var buttonDto = {};
                    if (localizedButton.label) {
                        buttonDto.title = localizedButton.label;
                    }
                    if (localizedButton.url) {
                        buttonDto.url = countlyCommon.decodeHtml(localizedButton.url);
                    }
                    result.push(buttonDto);
                });
                return result;
            },
            arePlatformSettingsEmpty: function(platform, settingDto) {
                var emptySetting = {};
                emptySetting.p = platform;
                return JSON.stringify(emptySetting) === JSON.stringify(settingDto);
            },
            isPlatformSelected: function(platform, model) {
                return model.platforms.some(function(selectedPlatform) {
                    return selectedPlatform === platform;
                });
            },
            mapIOSSettings: function(model, options) {
                if (!this.isPlatformSelected(PlatformEnum.IOS, model)) {
                    return null;
                }
                var iosSettings = model.settings[PlatformEnum.IOS];
                var result = {};
                result.p = PlatformDtoEnum.IOS;
                if (iosSettings.soundFilename && options.settings[PlatformEnum.IOS].isSoundFilenameEnabled && model.messageType === MessageTypeEnum.CONTENT) {
                    result.sound = iosSettings.soundFilename;
                }
                if (iosSettings.badgeNumber && options.settings[PlatformEnum.IOS].isBadgeNumberEnabled) {
                    result.badge = parseInt(iosSettings.badgeNumber);
                }
                if (iosSettings.json && options.settings[PlatformEnum.IOS].isJsonEnabled) {
                    result.data = countlyPushNotification.helper.prettifyJSON(iosSettings.json, 0);
                }
                if (iosSettings.userData && iosSettings.userData.length && options.settings[PlatformEnum.IOS].isUserDataEnabled) {
                    result.extras = iosSettings.userData;
                }
                if (iosSettings.onClickURL && options.settings[PlatformEnum.IOS].isOnClickURLEnabled && model.messageType === MessageTypeEnum.CONTENT) {
                    result.url = countlyCommon.decodeHtml(iosSettings.onClickURL);
                }
                if (iosSettings.subtitle && options.settings[PlatformEnum.IOS].isSubtitleEnabled) {
                    result.specific = [{subtitle: iosSettings.subtitle}];
                }
                if (model.settings[PlatformEnum.IOS].mediaURL && options.settings[PlatformEnum.IOS].isMediaURLEnabled && model.messageType === MessageTypeEnum.CONTENT) {
                    result.media = countlyCommon.decodeHtml(model.settings[PlatformEnum.IOS].mediaURL);
                    result.mediaMime = model.settings[PlatformEnum.IOS].mediaMime;
                }
                return result;
            },
            mapAndroidSettings: function(model, options) {
                if (!this.isPlatformSelected(PlatformEnum.ANDROID, model)) {
                    return null;
                }
                var androidSettings = model.settings[PlatformEnum.ANDROID];
                var result = {};
                result.p = PlatformDtoEnum.ANDROID;
                if (androidSettings.soundFilename && options.settings[PlatformEnum.ANDROID].isSoundFilenameEnabled && model.messageType === MessageTypeEnum.CONTENT) {
                    result.sound = androidSettings.soundFilename;
                }
                if (androidSettings.badgeNumber && options.settings[PlatformEnum.ANDROID].isBadgeNumberEnabled) {
                    result.badge = parseInt(androidSettings.badgeNumber);
                }
                if (androidSettings.json && options.settings[PlatformEnum.ANDROID].isJsonEnabled) {
                    result.data = countlyPushNotification.helper.prettifyJSON(androidSettings.json, 0);
                }
                if (androidSettings.userData && androidSettings.userData.length && options.settings[PlatformEnum.ANDROID].isUserDataEnabled) {
                    result.extras = androidSettings.userData;
                }
                if (androidSettings.onClickURL && options.settings[PlatformEnum.ANDROID].isOnClickURLEnabled && model.messageType === MessageTypeEnum.CONTENT) {
                    result.url = countlyCommon.decodeHtml(androidSettings.onClickURL);
                }
                if (androidSettings.icon && options.settings[PlatformEnum.ANDROID].isIconEnabled) {
                    result.specific = [{large_icon: androidSettings.icon}];
                }
                if (model.settings[PlatformEnum.ANDROID].mediaURL && options.settings[PlatformEnum.ANDROID].isMediaURLEnabled && model.messageType === MessageTypeEnum.CONTENT) {
                    result.media = countlyCommon.decodeHtml(model.settings[PlatformEnum.ANDROID].mediaURL);
                    result.mediaMime = model.settings[PlatformEnum.ANDROID].mediaMime;
                }
                return result;
            },
            mapMessageLocalization: function(pushNotificationModel) {
                var self = this;
                if (pushNotificationModel.messageType === MessageTypeEnum.SILENT) {
                    return [{}];
                }
                var content = [];
                Object.keys(pushNotificationModel.message).forEach(function(localizationKey) {
                    var localeDto = {};
                    if (!pushNotificationModel.localizations.some(function(item) {
                        return item.value === localizationKey;
                    })) {
                        return;
                    }
                    if (localizationKey !== DEFAULT_LOCALIZATION_VALUE) {
                        localeDto.la = localizationKey;
                    }
                    localeDto.message = self.getMessageText(pushNotificationModel.message[localizationKey], 'content');
                    var title = self.getMessageText(pushNotificationModel.message[localizationKey], 'title');
                    if (title) {
                        localeDto.title = title;
                    }
                    if (self.hasUserProperties(pushNotificationModel.message[localizationKey], 'content')) {
                        localeDto.messagePers = self.mapUserProperties(pushNotificationModel.message[localizationKey], 'content');
                    }
                    if (self.hasUserProperties(pushNotificationModel.message[localizationKey], 'title')) {
                        localeDto.titlePers = self.mapUserProperties(pushNotificationModel.message[localizationKey], 'title');
                        if (!title) {
                            localeDto.title = title;
                        }
                    }
                    if (pushNotificationModel.message[localizationKey].buttons.length) {
                        localeDto.buttons = self.mapButtons(pushNotificationModel.message[localizationKey]);
                    }
                    if (localizationKey === DEFAULT_LOCALIZATION_VALUE) {
                        content.unshift(localeDto);
                    }
                    else {
                        content.push(localeDto);
                    }
                });
                return content;
            },
            mapOneTimeTrigger: function(model) {
                var result = {
                    kind: 'plain',
                    start: model.delivery.startDate,
                };
                if (model.delivery.type === SendEnum.LATER) {
                    if (model.timezone === TimezoneEnum.DEVICE) {
                        result.tz = true;
                        result.sctz = new Date().getTimezoneOffset();
                    }
                }
                result.delayed = model[TypeEnum.ONE_TIME].audienceSelection === AudienceSelectionEnum.BEFORE;
                return [result];
            },
            mapAutomaticTrigger: function(model, options) {
                var result = {
                    kind: model.automatic.trigger === TriggerEnum.EVENT ? 'event' : 'cohort',
                    start: model.delivery.startDate,
                    actuals: model.automatic.deliveryDateCalculation === DeliveryDateCalculationEnum.EVENT_DEVICE_DATE,
                };
                if (options.isEndDateSet) {
                    result.end = model.delivery.endDate;
                }
                if (options.isUsersTimezoneSet) {
                    var usersTimezone = {
                        hours: model.automatic.usersTimezone.getHours(),
                        minutes: model.automatic.usersTimezone.getMinutes()
                    };
                    result.time = countlyPushNotification.helper.convertDateTimeToMS(usersTimezone);
                }
                if (model.automatic.deliveryMethod === DeliveryMethodEnum.DELAYED) {
                    var deliveryDateTime = {
                        days: model.automatic.delayed.days,
                        hours: model.automatic.delayed.hours
                    };
                    result.delay = countlyPushNotification.helper.convertDateTimeToMS(deliveryDateTime);
                }
                if (model.automatic.capping) {
                    result.cap = parseInt(model.automatic.maximumMessagesPerUser, 10);
                    var cappingDateTime = {
                        days: model.automatic.minimumTimeBetweenMessages.days,
                        hours: model.automatic.minimumTimeBetweenMessages.hours
                    };
                    result.sleep = countlyPushNotification.helper.convertDateTimeToMS(cappingDateTime);
                }
                if (model.automatic.trigger === TriggerEnum.EVENT) {
                    result.events = model.automatic.events;
                }
                if (model.automatic.trigger !== TriggerEnum.EVENT) {
                    result.cohorts = model.automatic.cohorts;
                    result.entry = model.automatic.trigger === TriggerEnum.COHORT_ENTRY,
                    result.cancels = model.automatic.triggerNotMet === TriggerNotMetEnum.CANCEL_ON_EXIT;
                }
                return [result];
            },
            mapTransactionalTrigger: function(model) {
                return [{kind: 'api', start: model.delivery.startDate}];
            },
            mapFilters: function(model, options) {
                var result = {};
                if (model.user) {
                    result.user = model.user;
                }
                if ((options.queryFilter && options.from === 'user' && Object.keys(options.queryFilter.queryObject).length)) {
                    result.user = JSON.stringify(options.queryFilter.queryObject);
                }
                if (model.drill) {
                    result.drill = model.drill;
                }
                if (options.queryFilter && options.from === 'drill') {
                    var drillFilter = Object.assign({}, options.queryFilter);
                    drillFilter.queryObject = JSON.stringify(options.queryFilter.queryObject);
                    var period = countlyCommon.getPeriod();
                    drillFilter.period = period;
                    if (Array.isArray(period)) {
                        drillFilter.period = JSON.stringify(period);
                    }
                    result.drill = JSON.stringify(drillFilter);
                }
                if (model.type === TypeEnum.ONE_TIME && model[TypeEnum.ONE_TIME].targeting === TargetingEnum.SEGMENTED && model.cohorts.length) {
                    result.cohorts = model.cohorts;
                }
                if (model.type === TypeEnum.ONE_TIME && model[TypeEnum.ONE_TIME].targeting === TargetingEnum.SEGMENTED && model.locations.length) {
                    result.geos = model.locations;
                }
                if (model.type === TypeEnum.AUTOMATIC && options.isLocationSet && model.locations.length) {
                    result.geos = model.locations;
                }
                return Object.keys(result).length === 0 ? null : result;
            },
            getLocalizationsCount: function(locales) {
                var count = 0;
                locales.forEach(function(currentItem) {
                    if (currentItem.value === DEFAULT_LOCALIZATION_VALUE) {
                        return;
                    }
                    count += currentItem.count;
                });
                return count;
            },
            mapStatus: function(options) {
                if (options.isDraft && options.isCreated) {
                    return StatusEnum.CREATED;
                }
                if (options.isDraft && !options.isCreated) {
                    return StatusEnum.DRAFT;
                }
                return null;
            },
            mapLocalizations: function(selectedLocalizations, allLocalizations) {
                var result = {};
                allLocalizations.forEach(function(currentItem) {
                    if (currentItem.value === DEFAULT_LOCALIZATION_VALUE) {
                        return;
                    }
                    if (selectedLocalizations.some(function(selectedLocaleKey) {
                        return Boolean(currentItem.value === selectedLocaleKey.value);
                    })) {
                        result[currentItem.value] = currentItem.count;
                    }
                });
                result[DEFAULT_LOCALIZATION_VALUE] = 0;
                result.count = this.getLocalizationsCount(allLocalizations);
                return result;
            },
            mapInfo: function(model, options) {
                var result = {};
                if (model.name) {
                    result.title = model.name;
                }
                result.locales = this.mapLocalizations(model.localizations, options.localizations);
                result.scheduled = model.delivery.type === SendEnum.LATER;
                result.silent = model.messageType === MessageTypeEnum.SILENT;
                return result;
            },
            mapModelToBaseDto: function(pushNotificationModel, options) {
                var resultDto = {
                    app: countlyCommon.ACTIVE_APP_ID,
                    platforms: this.mapPlatforms(pushNotificationModel.platforms),
                };
                if (pushNotificationModel._id) {
                    resultDto._id = pushNotificationModel._id;
                }
                var contentsDto = this.mapMessageLocalization(pushNotificationModel);
                if (pushNotificationModel.settings[PlatformEnum.ALL].mediaURL && pushNotificationModel.messageType === MessageTypeEnum.CONTENT) {
                    var defaultLocale = countlyPushNotification.mapper.incoming.findDefaultLocaleItem(contentsDto);
                    defaultLocale.media = countlyCommon.decodeHtml(pushNotificationModel.settings[PlatformEnum.ALL].mediaURL);
                    defaultLocale.mediaMime = pushNotificationModel.settings[PlatformEnum.ALL].mediaMime;
                }
                var androidSettingsDto = this.mapAndroidSettings(pushNotificationModel, options);
                if (androidSettingsDto && !this.arePlatformSettingsEmpty(PlatformDtoEnum.ANDROID, androidSettingsDto)) {
                    contentsDto.push(androidSettingsDto);
                }
                var iosSettingsDto = this.mapIOSSettings(pushNotificationModel, options);
                if (iosSettingsDto && !this.arePlatformSettingsEmpty(PlatformDtoEnum.IOS, iosSettingsDto)) {
                    contentsDto.push(iosSettingsDto);
                }
                resultDto.contents = contentsDto;
                var filtersDto = this.mapFilters(pushNotificationModel, options);
                if (filtersDto) {
                    resultDto.filter = filtersDto;
                }
                resultDto.info = this.mapInfo(pushNotificationModel, options);
                var expirationInMS = countlyPushNotification.helper.convertDateTimeToMS({
                    days: pushNotificationModel.expiration.days,
                    hours: pushNotificationModel.expiration.hours
                });
                //NOTE:expiration is set/found in default locale
                contentsDto[0].expiration = expirationInMS;
                var statusDto = this.mapStatus(options);
                if (statusDto) {
                    resultDto.status = statusDto;
                }
                return resultDto;
            },
            mapModelToOneTimeDto: function(pushNotificationModel, options) {
                var dto = this.mapModelToBaseDto(pushNotificationModel, options);
                dto.triggers = this.mapOneTimeTrigger(pushNotificationModel);
                return dto;
            },
            mapModelToAutomaticDto: function(pushNotificationModel, options) {
                var dto = this.mapModelToBaseDto(pushNotificationModel, options);
                dto.triggers = this.mapAutomaticTrigger(pushNotificationModel, options);
                return dto;
            },
            mapModelToTransactionalDto: function(pushNotificationModel, options) {
                var dto = this.mapModelToBaseDto(pushNotificationModel, options);
                dto.triggers = this.mapTransactionalTrigger(pushNotificationModel);
                return dto;
            },
            mapModelToDto: function(pushNotificationModel, options) {
                if (pushNotificationModel.type === TypeEnum.ONE_TIME) {
                    return this.mapModelToOneTimeDto(pushNotificationModel, options);
                }
                if (pushNotificationModel.type === TypeEnum.AUTOMATIC) {
                    return this.mapModelToAutomaticDto(pushNotificationModel, options);
                }
                if (pushNotificationModel.type === TypeEnum.TRANSACTIONAL) {
                    return this.mapModelToTransactionalDto(pushNotificationModel, options);
                }
                throw Error('Unknown push notification type:', pushNotificationModel.type);
            },
            mapIOSAppLevelConfig: function(model) {
                var iosConfigModel = model[PlatformEnum.IOS];
                if (iosConfigModel) {
                    var result = {
                        type: iosConfigModel.authType === IOSAuthConfigTypeEnum.P8 ? 'apn_token' : 'apn_universal',
                        keyid: iosConfigModel.authType === IOSAuthConfigTypeEnum.P8 ? iosConfigModel.keyId : 'team',
                        bundle: iosConfigModel.bundleId || "",
                        fileType: iosConfigModel.authType
                    };
                    if (iosConfigModel._id) {
                        result._id = iosConfigModel._id;
                    }
                    if (iosConfigModel.authType === IOSAuthConfigTypeEnum.P8) {
                        result.key = iosConfigModel.p8KeyFile;
                    }
                    else {
                        result.cert = iosConfigModel.p12KeyFile;
                    }
                    if (iosConfigModel.authType === IOSAuthConfigTypeEnum.P12) {
                        result.secret = iosConfigModel.passphrase;
                    }
                    if (iosConfigModel.authType === IOSAuthConfigTypeEnum.P8) {
                        result.team = iosConfigModel.teamId;
                    }
                    return result;
                }
                return null;
            },
            mapAndroidAppLevelConfig: function(model) {
                if (model[PlatformEnum.ANDROID]) {
                    var result = {
                        key: model[PlatformEnum.ANDROID].firebaseKey,
                        type: model[PlatformEnum.ANDROID].type
                    };
                    if (model[PlatformEnum.ANDROID]._id) {
                        result._id = model[PlatformEnum.ANDROID]._id;
                    }
                    return result;
                }
                return null;
            },
            mapHuaweiAppLevelConfig: function(model) {
                if (model[PlatformEnum.HUAWEI]) {
                    var result = {
                        type: model[PlatformEnum.HUAWEI].type,
                        app: model[PlatformEnum.HUAWEI].appId,
                        secret: model[PlatformEnum.HUAWEI].appSecret
                    };

                    if (model[PlatformEnum.HUAWEI]._id) {
                        result._id = model[PlatformEnum.HUAWEI]._id;
                    }

                    return result;
                }
                return null;
            },
            mapAppLevelConfig: function(model) {
                var dto = {
                    rate: {
                        rate: model.rate,
                        period: model.period
                    }
                };
                dto[PlatformDtoEnum.IOS] = this.mapIOSAppLevelConfig(model);
                dto[PlatformDtoEnum.ANDROID] = this.mapAndroidAppLevelConfig(model);
                dto[PlatformDtoEnum.HUAWEI] = this.mapHuaweiAppLevelConfig(model);
                return dto;
            },
            mapTestUsersEditedModelToDto: function(editedModel) {
                var testUsersDto = {};
                if (editedModel.userIds && editedModel.userIds.length) {
                    Object.assign(testUsersDto, {uids: editedModel.userIds.join(',')});
                }
                if (editedModel.cohorts && editedModel.cohorts.length) {
                    Object.assign(testUsersDto, {cohorts: editedModel.cohorts.join(',')});
                }
                return testUsersDto;
            },
            mapAppLevelConfigByPlatform: function(model, platform) {
                if (platform === PlatformEnum.ANDROID) {
                    return this.mapAndroidAppLevelConfig(model);
                }
                if (platform === PlatformEnum.IOS) {
                    return this.mapIOSAppLevelConfig(model);
                }
                if (platform === PlatformEnum.HUAWEI) {
                    return this.mapHuaweiAppLevelConfig(model);
                }
                throw new Error('Unknown platform type:' + platform);
            }
        }
    };

    countlyPushNotification.service = {
        DEFAULT_LOCALIZATION_VALUE: DEFAULT_LOCALIZATION_VALUE,
        DEFAULT_LOCALIZATION_LABEL: DEFAULT_LOCALIZATION_LABEL,
        ALL_FILTER_OPTION_VALUE: ALL_FILTER_OPTION_VALUE,
        ALL_FILTER_OPTION_LABEL: ALL_FILTER_OPTION_LABEL,
        TypeEnum: TypeEnum,
        PeriodEnum: PeriodEnum,
        PlatformEnum: PlatformEnum,
        StatusEnum: StatusEnum,
        UserCommandEnum: UserCommandEnum,
        MediaTypeEnum: MediaTypeEnum,
        TargetingEnum: TargetingEnum,
        AudienceSelectionEnum: AudienceSelectionEnum,
        SendEnum: SendEnum,
        TimezoneEnum: TimezoneEnum,
        PastScheduleEnum: PastScheduleEnum,
        MessageTypeEnum: MessageTypeEnum,
        TriggerEnum: TriggerEnum,
        DeliveryMethodEnum: DeliveryMethodEnum,
        DeliveryDateCalculationEnum: DeliveryDateCalculationEnum,
        TriggerNotMetEnum: TriggerNotMetEnum,
        IOSAuthConfigTypeEnum: IOSAuthConfigTypeEnum,
        UserPropertyTypeEnum: UserPropertyTypeEnum,
        AddTestUserDefinitionTypeEnum: AddTestUserDefinitionTypeEnum,
        platformOptions: platformOptions,
        startDateOptions: startDateOptions,
        audienceSelectionOptions: audienceSelectionOptions,
        targetingOptions: targetingOptions,
        triggerOptions: triggerOptions,
        triggerNotMetOptions: triggerNotMetOptions,
        deliveryDateCalculationOptions: deliveryDateCalculationOptions,
        deliveryMethodOptions: deliveryMethodOptions,
        statusOptions: statusOptions,
        iosAuthConfigTypeOptions: iosAuthConfigTypeOptions,
        isPushNotificationApproverPluginEnabled: function() {
            return Boolean(window.countlyPushNotificationApprover);
        },
        isUserProfilesPluginEnabled: function() {
            return Boolean(window.countlyUsers);
        },
        isDrillPluginEnabled: function() {
            return Boolean(window.countlyDrill);
        },
        hasApproverBypassPermission: function() {
            return this.isPushNotificationApproverPluginEnabled && countlyGlobal.member.approver_bypass;
        },
        hasApproverPermission: function() {
            return this.isPushNotificationApproverPluginEnabled && countlyGlobal.member.approver;
        },
        getFetchAllParameters: function(type, status) {
            var ret = {};
            if (type === this.TypeEnum.AUTOMATIC) {
                ret.auto = true;
            }
            if (type === this.TypeEnum.TRANSACTIONAL) {
                ret.api = true;
            }
            if (status !== ALL_FILTER_OPTION_VALUE) {
                ret.status = status;
            }
            return ret;
        },
        fetchCohorts: function(cohortIdsList, shouldFetchIfEmpty, appId) {
            if (!shouldFetchIfEmpty && cohortIdsList && !cohortIdsList.length) {
                return Promise.resolve([]);
            }
            if (typeof countlyCohorts === 'undefined') {
                return Promise.resolve([]);
            }
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        app_id: appId || countlyCommon.ACTIVE_APP_ID,
                        method: "get_cohorts",
                        outputFormat: "full"
                    },
                    dataType: "json",
                    success: function(response) {
                        try {
                            var result = response.aaData;
                            if (cohortIdsList && cohortIdsList.length) {
                                result = response.aaData.filter(function(cohort) {
                                    return cohortIdsList.some(function(cohortId) {
                                        return cohort._id === cohortId;
                                    });
                                });
                            }
                            resolve(result);
                        }
                        catch (error) {
                            console.error(error);
                            reject(new Error(CV.i18n('push-notification.unknown-error')));
                        }
                    },
                    error: function(error) {
                        console.error(error);
                        reject(error);
                    }
                }, {disableAutoCatch: true});
            });
        },
        fetchLocations: function(locationIdsList, shouldFetchIfEmpty) {
            if (!shouldFetchIfEmpty && locationIdsList && !locationIdsList.length) {
                return Promise.resolve([]);
            }
            if (typeof countlyLocationTargetComponent === 'undefined') {
                return Promise.resolve([]);
            }
            return new Promise(function(resolve, reject) {
                //TODO-LA:re-use the target location service to fetch locations;
                CV.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        app_id: countlyCommon.ACTIVE_APP_ID,
                        method: "get_locations",
                    },
                    dataType: "json",
                    success: function(response) {
                        try {
                            var targetLocations = countlyPushNotification.mapper.incoming.mapLocationTarget(response);
                            if (locationIdsList && locationIdsList.length) {
                                targetLocations = targetLocations.filter(function(targetLocationItem) {
                                    return locationIdsList.some(function(locationId) {
                                        return targetLocationItem._id === locationId;
                                    });
                                });
                            }
                            resolve(targetLocations);
                        }
                        catch (error) {
                            console.error(error);
                            reject(new Error(CV.i18n('push-notification.unknown-error')));
                        }
                    },
                    error: function(error) {
                        console.error(error);
                        reject(error);
                    }
                }, {disableAutoCatch: true});
            });
        },
        fetchEvents: function() {
            return new Promise(function(resolve, reject) {
                countlyEventsOverview.service.fetchAllEvents()
                    .then(function(events) {
                        try {
                            resolve(countlyPushNotification.mapper.incoming.mapEvents(events.list || []));
                        }
                        catch (error) {
                            console.error(error);
                            reject(new Error(CV.i18n('push-notification.unknown-error')));
                        }
                    }).catch(function(error) {
                        console.error(error);
                        reject(error);
                    });
            });
        },
        fetchAll: function(type, status) {
            var self = this;
            return new Promise(function(resolve, reject) {
                countlyPushNotification.api.findAll(self.getFetchAllParameters(type, status))
                    .then(function(response) {
                        try {
                            resolve(countlyPushNotification.mapper.incoming.mapRows(response));
                        }
                        catch (error) {
                            console.error(error);
                            reject(new Error(CV.i18n('push-notification.unknown-error')));
                        }
                    })
                    .catch(function(error) {
                        console.error(error);
                        reject(error);
                    });
            });
        },
        fetchById: function(id) {
            var self = this;
            return new Promise(function(resolve, reject) {
                self.fetchUserProperties().then(function(userProperties) {
                    countlyPushNotification.api.findById(id).then(function(response) {
                        response.userProperties = userProperties;
                        var model = null;
                        try {
                            model = countlyPushNotification.mapper.incoming.mapDtoToModel(response);
                            resolve(model);
                        }
                        catch (error) {
                            console.error(error);
                            reject(new Error(CV.i18n('push-notification.unknown-error')));
                        }
                    }).catch(function(error) {
                        console.error(error);
                        reject(error);
                    });
                });
            });
        },
        fetchDashboard: function(echo) {
            return new Promise(function(resolve, reject) {
                countlyPushNotification.api.getDashboard(echo)
                    .then(function(response) {
                        try {
                            resolve(countlyPushNotification.mapper.incoming.mapMainDashboard(response));
                        }
                        catch (error) {
                            console.error(error);
                            reject(new Error(CV.i18n('push-notification.unknown-error')));
                        }
                    }).catch(function(error) {
                        console.error(error);
                        reject(error);
                    });
            });
        },
        fetchMediaMetadata: function(url) {
            return new Promise(function(resolve, reject) {
                countlyPushNotification.api.getMime(url).then(function(response) {
                    try {
                        resolve(countlyPushNotification.mapper.incoming.mapMediaMetadata(response));
                    }
                    catch (error) {
                        console.error(error);
                        reject(new Error(CV.i18n('push-notification.unknown-error')));
                    }
                }).catch(function(error) {
                    console.error(error);
                    reject(error);
                });
            });
        },
        fetchMediaMetadataWithDebounce: _.debounce(function(url, resolveCallback, rejectCallback) {
            this.fetchMediaMetadata(url).then(resolveCallback).catch(rejectCallback);
        }, DEBOUNCE_TIME_IN_MS),
        fetchUserProperties: function() {
            return countlyPushNotification.api.findAllUserProperties().catch(function(error) {
                console.error(error);
                return Promise.resolve([]);
            });
        },
        fetchTestUsers: function(testUsers, options) {
            var self = this;
            var usersQuery = null;
            if (testUsers.uids && testUsers.uids.length) {
                usersQuery = {uid: {$in: testUsers.uids}};
            }
            return new Promise(function(resolve, reject) {
                if (!self.isDrillPluginEnabled()) {
                    reject(new Error('Error finding test users. Drill plugin must be enabled.'));
                    return;
                }
                if (!self.isUserProfilesPluginEnabled()) {
                    reject(new Error('Error finding test users. User profiles plugin must be enabled.'));
                    return;
                }
                Promise.all([usersQuery ? countlyPushNotification.api.searchUsers(usersQuery, options) : Promise.resolve([]), self.fetchCohorts(testUsers.cohorts || [], false)])
                    .then(function(responses) {
                        try {
                            var usersList = responses[0];
                            var cohortsList = responses[1];

                            var users = usersList.aaData;
                            var result = {};
                            result[AddTestUserDefinitionTypeEnum.USER_ID] = users;
                            result[AddTestUserDefinitionTypeEnum.COHORT] = cohortsList;
                            resolve(result);
                        }
                        catch (error) {
                            console.error(error);
                            reject(new Error(CV.i18n('push-notification.unknown-error')));
                        }
                    }).catch(function(error) {
                        console.error(error);
                        reject(error);
                    });
            });
        },
        searchUsersById: function(idQuery, options) {
            var self = this;
            return new Promise(function(resolve, reject) {
                if (!self.isDrillPluginEnabled()) {
                    reject(new Error('Error finding test users. Drill plugin must be enabled.'));
                    return;
                }
                if (!self.isUserProfilesPluginEnabled()) {
                    reject(new Error('Error finding test users. User profiles plugin must be enabled.'));
                    return;
                }
                var drillQuery = {did: {rgxcn: [idQuery]}};
                countlyPushNotification.api.searchUsers(drillQuery, options)
                    .then(function(response) {
                        resolve(response.aaData);
                    }).catch(function(error) {
                        console.error(error);
                        reject(error);
                    });
            });
        },
        estimate: function(pushNotificationModel, options) {
            var data = {
                app: countlyCommon.ACTIVE_APP_ID,
            };
            try {
                var platformsDto = countlyPushNotification.mapper.outgoing.mapPlatforms(pushNotificationModel.platforms);
                data.platforms = platformsDto;
                var filtersDto = countlyPushNotification.mapper.outgoing.mapFilters(pushNotificationModel, options);
                if (countlyPushNotification.helper.shouldAddFilter(pushNotificationModel, options) && filtersDto) {
                    data.filter = filtersDto;
                }
            }
            catch (error) {
                return Promise.reject(new Error(CV.i18n('push-notification.unknown-error')));
            }
            return new Promise(function(resolve, reject) {
                countlyPushNotification.api.estimate(data).then(function(response) {
                    try {
                        var localesDto = response.locales;
                        localesDto.count = response.count;
                        var localizations = countlyPushNotification.mapper.incoming.mapLocalizations(localesDto);
                        resolve({localizations: localizations, total: response.count, _id: response._id});
                    }
                    catch (error) {
                        console.error(error);
                        reject(new Error(CV.i18n('push-notification.unknown-error')));
                    }

                }).catch(function(error) {
                    console.error(error);
                    reject(error);
                });
            });
        },
        delete: function(id) {
            var data = {
                app_id: countlyCommon.ACTIVE_APP_ID,
                _id: id
            };
            return countlyPushNotification.api.delete(data);
        },
        save: function(model, options) {
            var dto = null;
            try {
                dto = countlyPushNotification.mapper.outgoing.mapModelToDto(model, options);
            }
            catch (error) {
                console.error(error);
                return Promise.reject(new Error(CV.i18n('push-notification.unknown-error')));
            }
            return countlyPushNotification.api.save(dto);
        },
        update: function(model, options) {
            var dto = null;
            try {
                dto = countlyPushNotification.mapper.outgoing.mapModelToDto(model, options);
            }
            catch (error) {
                console.error(error);
                return Promise.reject(new Error(CV.i18n('push-notification.unknown-error')));
            }
            return countlyPushNotification.api.update(dto);
        },
        sendToTestUsers: function(model, options) {
            var dto = null;
            try {
                dto = countlyPushNotification.mapper.outgoing.mapModelToDto(model, options);
            }
            catch (error) {
                console.error(error);
                return Promise.reject(new Error(CV.i18n('push-notification.unknown-error')));
            }
            return new Promise(function(resolve, reject) {
                countlyPushNotification.api.sendToTestUsers(dto)
                    .then(function(testDto) {
                        if (!testDto.result) {
                            reject(new Error(CV.i18n('push-notification.unknown-error')));
                            console.error(testDto);
                            return;
                        }
                        if (testDto.result.errors) {
                            reject(new Error('Error sending push notificaiton to test users:' + JSON.stringify(testDto.result.errors)));
                            console.error(testDto);
                            return;
                        }
                        if (testDto.result.errored) {
                            reject(new Error('Error sending push notification to test users. Number of errors:' + testDto.result.errored));
                            console.error(testDto);
                            return;
                        }
                        if (testDto.result.sent > 0) {
                            resolve();
                            return;
                        }
                        reject(new Error(CV.i18n('push-notification.unknown-error')));
                        console.error(testDto);
                    }).catch(function(error) {
                        console.error(error);
                        reject(error);
                    });
            });
        },
        resend: function(model, options) {
            var dto = null;
            try {
                dto = countlyPushNotification.mapper.outgoing.mapModelToDto(model, options);
                dto._id = undefined;
                var resendUserFilter = {message: {$nin: [model._id]}};
                if (!dto.filter) {
                    dto.filter = {};
                }
                if (!dto.filter.user) {
                    dto.filter.user = JSON.stringify(resendUserFilter);
                }
                else {
                    if (typeof dto.filter.user === 'string') {
                        dto.filter.user = JSON.parse(dto.filter.user);
                    }
                    if (dto.filter.user.$and) {
                        dto.filter.user.push(resendUserFilter);
                    }
                    else {
                        dto.filter.user.message = resendUserFilter.message;
                    }
                    dto.filter.user = JSON.stringify(dto.filter.user);
                }
            }
            catch (error) {
                console.error(error);
                return Promise.reject(new Error(CV.i18n('push-notification.unknown-error')));
            }
            return countlyPushNotification.api.save(dto);
        },
        approve: function(messageId) {
            if (!this.isPushNotificationApproverPluginEnabled()) {
                throw new Error('Push approver plugin is not enabled');
            }
            return new Promise(function(resolve, reject) {
                countlyPushNotificationApprover.service.approve(messageId)
                    .then(function(response) {
                        resolve(response);
                    })
                    .catch(function(error) {
                        console.error(error);
                        var errorMessage = countlyPushNotification.helper.getErrorMessage(error);
                        reject(new Error(errorMessage));
                    });
            });

        },
        reject: function(messageId) {
            if (!this.isPushNotificationApproverPluginEnabled()) {
                throw new Error('Push approver plugin is not enabled');
            }
            return new Promise(function(resolve, reject) {
                countlyPushNotificationApprover.service.reject(messageId)
                    .then(function(response) {
                        resolve(response);
                    })
                    .catch(function(error) {
                        console.error(error);
                        var errorMessage = countlyPushNotification.helper.getErrorMessage(error);
                        reject(new Error(errorMessage));
                    });
            });

        },
        updateTestUsers: function(testUsersModel, options) {
            var appConfig = {push: {test: {}}};
            try {
                var testDto = countlyPushNotification.mapper.outgoing.mapTestUsersEditedModelToDto(testUsersModel);
                appConfig.push.test = testDto;
            }
            catch (error) {
                console.error(error);
                return Promise.reject(new Error(CV.i18n('push-notification.unknown-error')));
            }
            return countlyPushNotification.api.updateAppConfig(appConfig, options);
        },
        toggle: function(id, isActive) {
            return countlyPushNotification.api.toggle(id, isActive);
        }
    };

    var getDetailsInitialState = function() {
        var messageSettings = {};
        messageSettings[PlatformEnum.ALL] = {};
        messageSettings[PlatformEnum.IOS] = {};
        messageSettings[PlatformEnum.ANDROID] = {};
        return {
            pushNotification: countlyPushNotification.helper.getInitialModel(TypeEnum.ONE_TIME),
            platformFilter: null,
            platformFilterOptions: [],
            localeFilter: null,
            messageLocaleFilter: countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE,
            userCommand: {
                type: null,
                pushNotificationId: null
            },
            isDrawerOpen: false,
            mobileMessagePlatform: null,
        };
    };

    var detailsActions = {
        fetchById: function(context, id) {
            context.dispatch('onFetchInit', {useLoader: true});
            countlyPushNotification.service.fetchById(id)
                .then(function(model) {
                    context.commit('setPushNotification', model);
                    context.dispatch('onSetPlatformFilterOptions', model);
                    context.dispatch('onFetchSuccess', {useLoader: true});
                }).catch(function(error) {
                    console.error(error);
                    context.dispatch('onFetchError', {error: error, useLoader: true});
                });
        },
        onUserCommand: function(context, payload) {
            context.commit('setUserCommand', payload);
        },
        onSetIsDrawerOpen: function(context, value) {
            context.commit('setIsDrawerOpen', value);
        },
        onApprove: function(context, id) {
            context.dispatch('onFetchInit', {useLoader: false});
            countlyPushNotification.service.approve(id).then(function() {
                context.dispatch('onFetchSuccess', {useLoader: false});
                context.dispatch('fetchById', id);
                CountlyHelpers.notify({message: CV.i18n('push-notification.was-successfully-approved')});
            }).catch(function(error) {
                console.error(error);
                context.dispatch('onFetchError', {error: error, useLoader: false});
                CountlyHelpers.notify({message: error.message, type: "error"});
            });
        },
        onReject: function(context, id) {
            context.dispatch('onFetchInit', {useLoader: false});
            countlyPushNotification.service.reject(id).then(function() {
                context.dispatch('onFetchSuccess', {useLoader: false});
                context.dispatch('fetchById', id);
                CountlyHelpers.notify({message: CV.i18n('push-notification.was-successfully-rejected')});
            }).catch(function(error) {
                console.error(error);
                context.dispatch('onFetchError', {error: error, useLoader: false});
                CountlyHelpers.notify({message: error.message, type: "error"});
            });
        },
        onDelete: function(context, id) {
            return new Promise(function(resolve, reject) {
                context.dispatch('onFetchInit', {useLoader: true});
                countlyPushNotification.service.delete(id)
                    .then(function() {
                        context.dispatch('onFetchSuccess', {useLoader: true});
                        CountlyHelpers.notify({message: CV.i18n('push-notification.was-successfully-deleted')});
                        resolve();
                    }).catch(function(error) {
                        console.error(error);
                        context.dispatch('onFetchError', {error: error, useLoader: true});
                        reject(error);
                        CountlyHelpers.notify({message: error.message, type: "error"});
                    });
            });
        },
        onToggle: function(context, payload) {
            context.dispatch('onFetchInit', {useLoader: false});
            countlyPushNotification.service.toggle(payload.id, payload.isActive).then(function() {
                context.dispatch('onFetchSuccess', {useLoader: false});
                context.dispatch('fetchById', payload.id);
                CountlyHelpers.notify({message: CV.i18n(payload.isActive ? 'push-notification.was-successfully-started' : 'push-notification.was-successfully-stopped')});
            }).catch(function(error) {
                console.error(error);
                context.dispatch('onFetchError', {error: error, useLoader: false});
                CountlyHelpers.notify({message: error.message, type: "error"});
            });
        },
        onSetLocaleFilter: function(context, value) {
            context.commit('setLocaleFilter', value);
        },
        onSetPlatformFilter: function(context, value) {
            context.commit('setPlatformFilter', value);
        },
        onSetMessageLocaleFilter: function(context, value) {
            context.commit('setMessageLocaleFilter', value);
        },
        onSetPlatformFilterOptions: function(context, value) {
            context.commit('setPlatformFilterOptions', value);
        },
        onSetMobileMessagePlatform: function(context, value) {
            context.commit('setMobileMessagePlatform', value);
        }
    };

    var detailsMutations = {
        setPushNotification: function(state, value) {
            state.pushNotification = value;
        },
        setUserCommand: function(state, value) {
            state.userCommand = value;
        },
        setIsDrawerOpen: function(state, value) {
            state.isDrawerOpen = value;
        },
        setLocaleFilter: function(state, value) {
            state.localeFilter = value;
        },
        setPlatformFilter: function(state, value) {
            state.platformFilter = value;
        },
        setMessageLocaleFilter: function(state, value) {
            state.messageLocaleFilter = value;
        },
        setPlatformFilterOptions: function(state, value) {
            var filterOptions = [];
            if (value.dashboard[PlatformEnum.IOS]) {
                filterOptions.push({label: CV.i18n("push-notification.platform-filter-ios"), value: countlyPushNotification.service.PlatformEnum.IOS});
                state.platformFilter = PlatformEnum.IOS;
            }
            if (value.dashboard[PlatformEnum.ANDROID]) {
                filterOptions.push({label: CV.i18n("push-notification.platform-filter-android"), value: countlyPushNotification.service.PlatformEnum.ANDROID});
                state.platformFilter = PlatformEnum.ANDROID;
            }
            if (value.dashboard[PlatformEnum.ALL]) {
                filterOptions.push({label: CV.i18n("push-notification.platform-filter-all"), value: countlyPushNotification.service.PlatformEnum.ALL});
                state.platformFilter = PlatformEnum.ALL;
            }
            state.platformFilterOptions = filterOptions;
        },
        setDashboardTokens: function(state, value) {
            state.dashboardTokens = value;
        },
        setMobileMessagePlatform: function(state, value) {
            state.mobileMessagePlatform = value;
        }
    };

    countlyPushNotification.details = {};
    countlyPushNotification.details.getVuexModule = function() {
        return countlyVue.vuex.Module("countlyPushNotificationDetails", {
            state: getDetailsInitialState,
            actions: detailsActions,
            mutations: detailsMutations,
            submodules: [countlyVue.vuex.FetchMixin()]
        });
    };

    var getMainInitialState = function() {
        return {
            rows: [],
            selectedPushNotificationType: countlyPushNotification.service.TypeEnum.ONE_TIME,
            statusFilter: ALL_FILTER_OPTION_VALUE,
            platformFilter: countlyPushNotification.service.PlatformEnum.ALL,
            areRowsLoading: false,
            userCommand: {
                type: null,
                pushNotificationId: null
            },
            isDrawerOpen: false,
            isLoadingTable: true,
        };
    };

    var mainActions = {
        fetchAll: function(context) {
            context.dispatch('fetchPushTable');
        },
        onDelete: function(context, id) {
            context.dispatch('onFetchInit', {useLoader: true});
            countlyPushNotification.service.delete(id)
                .then(function() {
                    context.dispatch('fetchAll', true);
                    context.dispatch('onFetchSuccess', {useLoader: true});
                    CountlyHelpers.notify({message: CV.i18n('push-notification.was-successfully-deleted')});
                }).catch(function(error) {
                    console.error(error);
                    context.dispatch('onFetchError', {error: error, useLoader: true});
                    CountlyHelpers.notify({message: error.message, type: "error"});
                });
        },
        onApprove: function(context, id) {
            context.dispatch('onFetchInit', {useLoader: true});
            countlyPushNotification.service.approve(id).then(function() {
                context.dispatch('fetchAll', false);
                context.dispatch('onFetchSuccess', {useLoader: true});
                CountlyHelpers.notify({message: CV.i18n('push-notification.was-successfully-approved')});
            }).catch(function(error) {
                console.error(error);
                context.dispatch('onFetchError', {error: error, useLoader: true});
                CountlyHelpers.notify({message: error.message, type: "error"});
            });
        },
        onReject: function(context, id) {
            context.dispatch('onFetchInit', {useLoader: true});
            countlyPushNotification.service.reject(id).then(function() {
                context.dispatch('fetchAll', false);
                context.dispatch('onFetchSuccess', {useLoader: true});
                CountlyHelpers.notify({message: CV.i18n('push-notification.was-successfully-rejected')});
            }).catch(function(error) {
                console.error(error);
                context.dispatch('onFetchError', {error: error, useLoader: true});
                CountlyHelpers.notify({message: error.message, type: "error"});
            });
        },
        onToggle: function(context, payload) {
            context.dispatch('onFetchInit', {useLoader: false});
            countlyPushNotification.service.toggle(payload.id, payload.isActive).then(function() {
                context.dispatch('fetchAll', false);
                context.dispatch('onFetchSuccess', {useLoader: true});
                CountlyHelpers.notify({message: CV.i18n(payload.isActive ? 'push-notification.was-successfully-started' : 'push-notification.was-successfully-stopped')});
            }).catch(function(error) {
                console.error(error);
                context.dispatch('onFetchError', {error: error, useLoader: false});
                CountlyHelpers.notify({message: error.message, type: "error"});
            });
        },
        onUserCommand: function(context, payload) {
            context.commit('setUserCommand', payload);
        },
        onSetIsDrawerOpen: function(context, value) {
            context.commit('setIsDrawerOpen', value);
        },
        onSetAreRowsLoading: function(context, value) {
            context.commit('setAreRowsLoading', value);
        },
        onSetPushNotificationType: function(context, value) {
            context.commit('resetPushNotifications');
            context.commit('setPushNotificationType', value);
        },
        onSetPlatformFilter: function(context, value) {
            context.commit('setPlatformFilter', value);
        },
        onSetStatusFilter: function(context, value) {
            context.commit('setStatusFilter', value);
        },
    };

    var mainMutations = {
        setPushNotificationType: function(state, value) {
            state.selectedPushNotificationType = value;
        },
        resetPushNotifications: function(state) {
            Object.assign(state, getMainInitialState());
        },
        setAreRowsLoading: function(state, value) {
            state.areRowsLoading = value;
        },
        setRows: function(state, value) {
            state.rows = value;
        },
        setUserCommand: function(state, value) {
            state.userCommand = value;
        },
        setIsDrawerOpen: function(state, value) {
            state.isDrawerOpen = value;
        },
        setStatusFilter: function(state, value) {
            state.statusFilter = value;
        },
        setPlatformFilter: function(state, value) {
            state.platformFilter = value;
        },
    };

    countlyPushNotification.main = {};
    countlyPushNotification.main.getVuexModule = function() {
        var getters = {
            isLoadingTable: function(state) {
                return state.isLoadingTable;
            },
        };
        return countlyVue.vuex.Module("countlyPushNotificationMain", {
            state: getMainInitialState,
            actions: mainActions,
            mutations: mainMutations,
            getters: getters,
            submodules: [countlyVue.vuex.FetchMixin(), pushTableResource]
        });
    };

    var getDashboardInitialState = function() {
        var enabledUsers = {};
        enabledUsers[PlatformEnum.ALL] = 0;
        enabledUsers[PlatformEnum.IOS] = 0;
        enabledUsers[PlatformEnum.ANDROID] = 0;

        var totalActions = {};
        totalActions[TypeEnum.ONE_TIME] = {};
        totalActions[TypeEnum.ONE_TIME][PlatformEnum.IOS] = 0;
        totalActions[TypeEnum.ONE_TIME][PlatformEnum.ANDROID] = 0;
        totalActions[TypeEnum.ONE_TIME][PlatformEnum.ALL] = 0;
        totalActions[TypeEnum.AUTOMATIC] = {};
        totalActions[TypeEnum.AUTOMATIC][PlatformEnum.IOS] = 0;
        totalActions[TypeEnum.AUTOMATIC][PlatformEnum.ANDROID] = 0;
        totalActions[TypeEnum.AUTOMATIC][PlatformEnum.ALL] = 0;
        totalActions[TypeEnum.TRANSACTIONAL] = {};
        totalActions[TypeEnum.TRANSACTIONAL][PlatformEnum.IOS] = 0;
        totalActions[TypeEnum.TRANSACTIONAL][PlatformEnum.ANDROID] = 0;
        totalActions[TypeEnum.TRANSACTIONAL][PlatformEnum.ALL] = 0;

        var totalSent = {};
        totalSent[TypeEnum.ONE_TIME] = {};
        totalSent[TypeEnum.ONE_TIME][PlatformEnum.IOS] = 0;
        totalSent[TypeEnum.ONE_TIME][PlatformEnum.ANDROID] = 0;
        totalSent[TypeEnum.ONE_TIME][PlatformEnum.ALL] = 0;
        totalSent[TypeEnum.AUTOMATIC] = {};
        totalSent[TypeEnum.AUTOMATIC][PlatformEnum.IOS] = 0;
        totalSent[TypeEnum.AUTOMATIC][PlatformEnum.ANDROID] = 0;
        totalSent[TypeEnum.AUTOMATIC][PlatformEnum.ALL] = 0;
        totalSent[TypeEnum.TRANSACTIONAL] = {};
        totalSent[TypeEnum.TRANSACTIONAL][PlatformEnum.IOS] = 0;
        totalSent[TypeEnum.TRANSACTIONAL][PlatformEnum.ANDROID] = 0;
        totalSent[TypeEnum.TRANSACTIONAL][PlatformEnum.ALL] = 0;

        var series = {};
        series[TypeEnum.ONE_TIME] = {
            monthly: [{data: [], label: actionsPerformedLabel}, {data: [], label: messagesSentLabel}],
            weekly: [{data: [], label: actionsPerformedLabel}, {data: [], label: messagesSentLabel}]
        };
        series[TypeEnum.AUTOMATIC] = {
            daily: [{data: [], label: actionsPerformedLabel}, {data: [], label: messagesSentLabel}]
        };
        series[TypeEnum.TRANSACTIONAL] = {
            daily: [{data: [], label: actionsPerformedLabel}, {data: [], label: messagesSentLabel}]
        };
        var periods = {};
        periods[TypeEnum.ONE_TIME] = {
            weekly: [],
            monthy: [],
        };
        periods[TypeEnum.AUTOMATIC] = {
            daily: [],
        };
        periods[TypeEnum.TRANSACTIONAL] = {
            daily: []
        };

        return {
            series: series,
            periods: periods,
            totalAppUsers: 0,
            enabledUsers: enabledUsers,
            totalActions: totalActions,
            totalSent: totalSent,
            isFetched: false
        };
    };

    var dashboardActions = {
        fetchDashboard: function(context, shouldRefresh) {
            if (context.state.isFetched && !shouldRefresh) {
                return;
            }
            if (context.state.countlyFetch.isLoading) {
                return;
            }
            context.dispatch('onFetchInit', {useLoader: true});
            countlyPushNotification.service.fetchDashboard()
                .then(function(response) {
                    context.commit('setDashboard', response);
                    context.dispatch('onFetchSuccess', {useLoader: true});
                    context.commit('setIsFetched', true);
                }).catch(function(error) {
                    context.dispatch('onFetchError', {error: error, useLoader: true});
                    console.error(error);
                });
        },
    };

    var dashboardMutations = {
        setDashboard: function(state, value) {
            value.isFetched = state.isFetched;
            Object.assign(state, value);
        },
        setIsFetched: function(state, value) {
            state.isFetched = value;
        }
    };

    countlyPushNotification.dashboard = {};
    countlyPushNotification.dashboard.getVuexModule = function() {
        return countlyVue.vuex.Module("countlyPushNotificationDashboard", {
            state: getDashboardInitialState,
            actions: dashboardActions,
            mutations: dashboardMutations,
            submodules: [countlyVue.vuex.FetchMixin()],
            destroy: false,
        });
    };
}(window.countlyPushNotification = window.countlyPushNotification || {}));