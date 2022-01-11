/*global countlyVue,CV,countlyCommon,countlySegmentation,Promise,moment,_,countlyGlobalLang,countlyEventsOverview,countlyPushNotificationApprover,countlyGlobal,CountlyHelpers*/
(function(countlyPushNotification) {

    var messagesSentLabel = CV.i18n('push-notification.sent-serie-name');
    var actionsPerformedLabel = CV.i18n('push-notification.actions-performed-serie-name');
    var DEBOUNCE_TIME_IN_MS = 250;
    var MB_TO_BYTES_RATIO = 1000000;
    var DAY_TO_MS_RATIO = 86400 * 1000;
    var HOUR_TO_MS_RATIO = 3600000;
    var ERROR_MESSAGE_REGEX = /^([ia])([0-9]+)(\+(.+))?$/;

    var DEFAULT_LOCALIZATION_VALUE = 'default';
    var DEFAULT_LOCALIZATION_LABEL = 'Default';

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
    });
    var UserCommandEnum = Object.freeze({
        RESEND: 'resend',
        DUPLICATE: 'duplicate',
        DELETE: 'delete',
        REJECT: 'reject',
        APPROVE: 'approve',
        EDIT_DRAFT: 'edit_draft',
        CREATE: 'create',
        EDIT: 'edit'
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
        EVENT: 'event',
        USER: 'user',
        CUSTOM: 'custom',
        API: 'api'
    });

    var audienceSelectionOptions = {};
    audienceSelectionOptions[AudienceSelectionEnum.NOW] = {label: "Now", value: AudienceSelectionEnum.NOW};
    audienceSelectionOptions[AudienceSelectionEnum.BEFORE] = {label: "Right before sending the message", value: AudienceSelectionEnum.BEFORE};

    var startDateOptions = {};
    startDateOptions[SendEnum.NOW] = {label: "Send now", value: SendEnum.NOW};
    startDateOptions[SendEnum.LATER] = {label: "Scheduled", value: SendEnum.LATER };

    var targetingOptions = {};
    targetingOptions[TargetingEnum.ALL] = {label: "All push-enabled users", value: TargetingEnum.ALL};
    targetingOptions[TargetingEnum.SEGMENTED] = {label: "Segmented push-enabled users", value: TargetingEnum.SEGMENTED};

    var triggerOptions = {};
    triggerOptions[TriggerEnum.COHORT_ENTRY] = {label: "Cohort(s) Entry", value: TriggerEnum.COHORT_ENTRY};
    triggerOptions[TriggerEnum.COHORT_EXIT] = {label: "Cohort(s) Exit", value: TriggerEnum.COHORT_EXIT};
    triggerOptions[TriggerEnum.EVENT] = {label: "Performed Event(s)", value: TriggerEnum.EVENT};

    var triggerNotMetOptions = {};
    triggerNotMetOptions[TriggerNotMetEnum.SEND_ANYWAY] = {label: "Send anyway", value: TriggerNotMetEnum.SEND_ANYWAY};
    triggerNotMetOptions[TriggerNotMetEnum.CANCEL_ON_EXIT] = {label: "Cancel when user exits selected cohort/s", value: TriggerNotMetEnum.CANCEL_ON_EXIT};

    var deliveryDateCalculationOptions = {};
    deliveryDateCalculationOptions[DeliveryDateCalculationEnum.EVENT_SERVER_DATE] = {label: "Relative to the date event arrived to the server", value: DeliveryDateCalculationEnum.EVENT_SERVER_DATE};
    deliveryDateCalculationOptions[DeliveryDateCalculationEnum.EVENT_DEVICE_DATE] = {label: "Relative to the date event occurred on device", value: DeliveryDateCalculationEnum.EVENT_DEVICE_DATE};

    var deliveryMethodOptions = {};
    deliveryMethodOptions[DeliveryMethodEnum.IMMEDIATELY] = {label: "Immediately", value: DeliveryMethodEnum.IMMEDIATELY};
    deliveryMethodOptions[DeliveryMethodEnum.DELAYED] = {label: "Delayed", value: DeliveryMethodEnum.DELAYED};

    var platformOptions = {};
    platformOptions[PlatformEnum.ANDROID] = {label: "Android", value: PlatformEnum.ANDROID};
    platformOptions[PlatformEnum.IOS] = {label: 'IOS', value: PlatformEnum.IOS};

    var statusOptions = {};
    statusOptions[StatusEnum.CREATED] = {label: "Created", value: StatusEnum.CREATED};
    statusOptions[StatusEnum.PENDING_APPROVAL] = {label: "Waiting for approval", value: StatusEnum.PENDING_APPROVAL};
    statusOptions[StatusEnum.DRAFT] = {label: "Draft", value: StatusEnum.DRAFT};
    statusOptions[StatusEnum.SCHEDULED] = {label: "Scheduled", value: StatusEnum.SCHEDULED};
    statusOptions[StatusEnum.SENDING] = {label: "Sending", value: StatusEnum.SENDING};
    statusOptions[StatusEnum.SENT] = {label: "Sent", value: StatusEnum.SENT};
    statusOptions[StatusEnum.STOPPED] = {label: "Stopped", value: StatusEnum.STOPPED};
    statusOptions[StatusEnum.FAILED] = {label: "Failed", value: StatusEnum.FAILED};

    var iosAuthConfigTypeOptions = {};
    iosAuthConfigTypeOptions[IOSAuthConfigTypeEnum.P8] = {label: "Key file (P8)", value: IOSAuthConfigTypeEnum.P8};
    iosAuthConfigTypeOptions[IOSAuthConfigTypeEnum.P12] = {label: "Sandbox + Production certificate (P12)", value: IOSAuthConfigTypeEnum.P12};

    var AppLevelConfigPropertyModelMap = {
        rate: 'rate',
        period: 'period',
        keyId: 'key',
        keyFile: 'file',
        authType: 'type',
        teamId: 'team',
        bundleId: 'bundle',
        passphrase: 'pass',
        firebaseKey: 'key',
        type: 'type',
        appId: 'key',
        appSecret: 'secret'
    };

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
        getInitialBaseModel: function() {
            return {
                _id: null,
                name: "",
                platforms: [PlatformEnum.ANDROID],
                audienceSelection: AudienceSelectionEnum.BEFORE,
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
                queryFilter: null,
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
            };
        },
        getInitialOneTimeModel: function() {
            var baseModel = this.getInitialBaseModel();
            baseModel.oneTime = {
                targeting: TargetingEnum.ALL,
                pastSchedule: PastScheduleEnum.SKIP,
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
                trigger: TriggerEnum.COHORT_ENTRY,
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
        replaceTagElements: function(htmlString) {
            if (htmlString) {
                return htmlString.replace(/(<([^>]+)>)/gi, "");
            }
            return htmlString;
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
        isNoPushCredentialsError: function(error) {
            if (error.responseJSON) {
                return error.responseJSON.errors && error.responseJSON.errors.some(function(message) {
                    return message === 'No push credentials in db';
                });
            }
            return false;
        },
        hasNoAndroidCredentialsError: function(error) {
            if (error.responseJSON) {
                return error.responseJSON.errors && error.responseJSON.errors.some(function(message) {
                    return message === 'No push credentials for platform a';
                });
            }
            return false;
        },
        hasNoIosCredentialsError: function(error) {
            if (error.responseJSON) {
                return error.responseJSON.errors && error.responseJSON.errors.some(function(message) {
                    return message === 'No push credentials for platform i';
                });
            }
            return false;
        },
        isNoUsersFoundError: function(error) {
            return error.message === 'No users were found from selected configuration';
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
                    hours: 0
                };
            }
            var days = parseInt(dateTimeInMs / DAY_TO_MS_RATIO, 10);
            var remainingTime = (dateTimeInMs % DAY_TO_MS_RATIO);
            var hours = parseInt(remainingTime / HOUR_TO_MS_RATIO, 10);
            return {
                days: days,
                hours: hours
            };
        },
        formatDateTime: function(dateTime, format) {
            if (dateTime === 'Never') {
                return dateTime;
            }
            if (!format) {
                format = "DD.MM.YYYY hh:mm";
            }
            return moment(dateTime).format(format);
        },
        unwrapUserProperties: function(queryFilter) {
            var result = {};
            Object.keys(queryFilter).forEach(function(filterKey) {
                var splittedKey = filterKey.split('.');
                if (splittedKey.length === 2) {
                    var keyWithoutPrefix = splittedKey[1];
                    result[keyWithoutPrefix] = queryFilter[filterKey];
                }
            });
            return result;
        },
        shouldAddFilter: function(model) {
            if (model.type === TypeEnum.ONE_TIME) {
                return model.oneTime.targeting === TargetingEnum.SEGMENTED;
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
        isInternationalizationFound: function(value) {
            return value !== CV.i18n(value);
        }
    };

    //NOTE: api object will reside temporarily in countlyPushNotification until countlyApi object is created;
    countlyPushNotification.api = {
        findById: function(id) {
            return CV.$.ajax({
                type: "GET",
                url: window.countlyCommon.API_URL + "/o/push/message/GET",
                data: {
                    _id: id,
                },
                contentType: "application/json",
            }, {disableAutoCatch: true});
        },
        findAll: function(data) {
            return CV.$.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.r + "/push/message/all",
                data: data,
                dataType: "json"
            }, {disableAutoCatch: true});
        },
        getDashboard: function(data) {
            return CV.$.ajax({
                type: "GET",
                url: window.countlyCommon.API_URL + '/o/push/dashboard',
                data: data,
                dataType: "json"
            }, {disableAutoCatch: true});
        },
        delete: function(data) {
            return CV.$.ajax({
                method: 'GET',
                url: window.countlyCommon.API_URL + '/i/push/message/remove',
                data: data,
                dataType: "json"
            }, {disableAutoCatch: true});
        },
        save: function(dto) {
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    type: "POST",
                    url: window.countlyCommon.API_URL + '/i/push/message/create',
                    data: JSON.stringify(dto),
                    contentType: "application/json",
                    success: function(response) {
                        if (response.error) {
                            reject(new Error(response.error));
                            return;
                        }
                        if (response.result.errors) {
                            reject(response.result.errors);
                            return;
                        }
                        resolve();
                    },
                    error: function() {
                        reject(new Error('Unknown error occurred.Please try again later.'));
                        //TODO:log error
                    }
                }, {disableAutoCatch: true});
            });
        },
        update: function(dto) {
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    type: "POST",
                    url: window.countlyCommon.API_URL + '/i/push/message/update',
                    data: JSON.stringify(dto),
                    contentType: "application/json",
                    success: function(response) {
                        if (response.error) {
                            reject(new Error(response.error));
                            return;
                        }
                        if (response.result.errors) {
                            reject(response.result.errors);
                            return;
                        }
                        resolve();
                    },
                    error: function() {
                        //TODO:log error
                        reject(new Error('Unknown error occurred.Please try again later.'));
                    }
                }, {disableAutoCatch: true});
            });
        },
        estimate: function(data) {
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    type: "POST",
                    url: window.countlyCommon.API_URL + '/o/push/message/estimate',
                    data: JSON.stringify(data),
                    contentType: "application/json",
                    success: function(response) {
                        if (countlyPushNotification.helper.hasNoUsersToSendPushNotification(response)) {
                            reject(new Error('No users were found from selected configuration'));
                            return;
                        }
                        if (response.error) {
                            reject(new Error('Unknown error occurred.Please try again later.'));
                            return;
                        }
                        resolve(response);
                    },
                    error: function(error) {
                        //TODO:log error
                        if (countlyPushNotification.helper.hasNoAndroidCredentialsError(error)) {
                            reject(new Error('No push notification credentials were found for Android'));
                            return;
                        }
                        if (countlyPushNotification.helper.hasNoIosCredentialsError(error)) {
                            reject(new Error('No push notification credentials were found for IOS'));
                            return;
                        }
                        if (countlyPushNotification.helper.isNoPushCredentialsError(error)) {
                            reject(new Error('No push notification credentials were found'));
                            return;
                        }
                        reject(new Error('Unknown error occurred. Please try again later.'));
                    }
                }, {disableAutoCatch: true});
            });
        },
        getMime: function(url) {
            return CV.$.ajax({
                method: 'GET',
                url: window.countlyCommon.API_URL + '/o/push/mime',
                data: {
                    url: url
                },
            }, {disableAutoCatch: true});
        },
        findAllUserProperties: function() {
            return countlySegmentation.initialize("").then(function() {
                return Promise.resolve(countlySegmentation.getFilters());
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
                    userPropertiesDto[key].l = countlyPushNotification.helper.findUserPropertyLabelByValue(userPropertiesDto[key].k, userProperties);
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
                newElement.innerText = userProperty.k + "|" + userProperty.f;
                return newElement.outerHTML;
            },
            decodeMessage: function(message) {
                var textArea = document.createElement('textarea');
                textArea.innerHTML = message;
                return textArea.value;
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
            buildMessageText: function(message, userPropertiesDto) {
                var self = this;
                if (!userPropertiesDto) {
                    return message;
                }
                if (!message) {
                    message = "";
                }
                var messageInHTMLString = message;
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
            mapSeries: function(dto, type) {
                if (type === TypeEnum.ONE_TIME) {
                    return {
                        monthly: [{data: dto.sent.monthly.data || [], label: messagesSentLabel}, {data: dto.actions.monthly.data || [], label: actionsPerformedLabel}],
                        weekly: [{data: dto.sent.weekly.data || [], label: messagesSentLabel}, {data: dto.actions.weekly.data || [], label: actionsPerformedLabel}],
                    };
                }
                else if (type === TypeEnum.AUTOMATIC) {
                    return {
                        daily: [{data: dto.sent_automated.daily.data || [], label: messagesSentLabel}, {data: dto.actions_automated.daily.data || [], label: actionsPerformedLabel}]
                    };
                }
                else {
                    return {
                        daily: [{data: dto.sent_tx.daily.data || [], label: messagesSentLabel}, {data: dto.actions_tx.daily.data || [], label: actionsPerformedLabel}]
                    };
                }
            },
            mapPeriods: function(dto, type) {
                if (type === TypeEnum.ONE_TIME) {
                    return {weekly: dto.actions.weekly.keys, monthly: dto.actions.monthly.keys};
                }
                else if (type === TypeEnum.AUTOMATIC) {
                    return {weekly: dto.actions_automated.daily.keys};
                }
                else {
                    return {weekly: dto.actions_tx.daily.keys};
                }
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
                if (dto.status === 'inactive') {
                    return statusOptions[StatusEnum.PENDING_APPROVAL];
                }
                return dto.status;
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
                        sentDateTime: {
                            date: moment(pushNotificationDtoItem.info && pushNotificationDtoItem.info.started).format("MMMM Do YYYY"),
                            time: moment(pushNotificationDtoItem.info && pushNotificationDtoItem.info.started).format("h:mm:ss a")
                        },
                        sent: pushNotificationDtoItem.result.sent || 0,
                        actioned: pushNotificationDtoItem.result.actioned || 0,
                        createdBy: pushNotificationDtoItem.info && pushNotificationDtoItem.info.createdByName || '',
                        platforms: self.mapPlatforms(pushNotificationDtoItem.platforms),
                        content: self.findDefaultLocaleItem(pushNotificationDtoItem.contents).message
                    };
                });
                return rowsModel;
            },
            mapTargeting: function(dto) {
                if (dto.filter && dto.filter.cohorts && dto.filter.cohorts.length || dto.filter.geos && dto.filter.geos.length) {
                    return TargetingEnum.SEGMENTED;
                }
                return TargetingEnum.ALL;
            },
            mapErrorWithoutCode: function(errorsDto, errorKey) {
                return {
                    code: CV.i18n('push-notification.error-code.' + errorKey),
                    codePostfix: '',
                    affectedUsers: errorsDto[errorKey],
                    description: CV.i18n('push-notification.error-code.' + errorKey + '.desc', '<a target="blank" href="https://support.count.ly/hc/en-us/articles/360037270012-Push-notifications#troubleshooting">Troubleshooting</a>'),
                };
            },
            mapErrorWithCode: function(errorsDto, errorKey) {
                var errorCodeParts = errorKey.match(ERROR_MESSAGE_REGEX);
                var platformError = errorCodeParts[1];
                var numberError = errorCodeParts[2];
                var postfixError = errorCodeParts[4];
                var result = {
                    code: CV.i18n('push-notification.error-code.' + platformError + numberError),
                    codePostfix: postfixError,
                    affectedUsers: errorsDto[errorKey],
                    description: CV.i18n('push-notification.error-code.' + errorKey + '.desc')
                };
                if (!countlyPushNotification.helper.isInternationalizationFound(result.description) && countlyPushNotification.helper.isInternationalizationFound('push-notification.error-code.' + platformError + numberError + '.desc')) {
                    result.description = CV.i18n('push-notification.error-code.' + platformError + numberError + '.desc');
                }
                return result;
            },
            mapErrors: function(dto) {
                var self = this;
                if (!dto.errors) {
                    return [];
                }
                return Object.keys(dto.errors).map(function(errorKey) {
                    var errorCodeParts = errorKey.match(ERROR_MESSAGE_REGEX);
                    if (errorCodeParts && errorCodeParts.length) {
                        return self.mapErrorWithCode(dto.errors, errorKey);
                    }
                    return self.mapErrorWithoutCode(dto.errors, errorKey);
                });
            },
            mapAndroidSettings: function(androidSettingsDto) {
                return {
                    soundFilename: androidSettingsDto && androidSettingsDto.sound || "",
                    badgeNumber: androidSettingsDto && androidSettingsDto.badge,
                    json: androidSettingsDto && androidSettingsDto.data || null,
                    userData: androidSettingsDto && androidSettingsDto.extras || [],
                    onClickURL: androidSettingsDto && androidSettingsDto.url || '',
                    mediaURL: androidSettingsDto && androidSettingsDto.media || '',
                    mediaMime: androidSettingsDto && androidSettingsDto.mediaMime || '',
                };
            },
            mapIOSSettings: function(iosSettingsDto) {
                return {
                    subtitle: "",
                    soundFilename: iosSettingsDto && iosSettingsDto.sound || "",
                    badgeNumber: iosSettingsDto && iosSettingsDto.badge,
                    json: iosSettingsDto && iosSettingsDto.data || null,
                    userData: iosSettingsDto && iosSettingsDto.extras || [],
                    onClickURL: iosSettingsDto && iosSettingsDto.url || '',
                    mediaURL: iosSettingsDto && iosSettingsDto.media || '',
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
                result[PlatformEnum.ALL].mediaURL = defaultLocale.media || "";
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
                    buttons.push({label: buttonDtoItem.title, url: buttonDtoItem.url});
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
            mapTotalActions: function(dto) {
                var result = {};
                result[TypeEnum.ONE_TIME] = dto.actions.total;
                result[TypeEnum.AUTOMATIC] = dto.actions_automated.total;
                result[TypeEnum.TRANSACTIONAL] = dto.actions_tx.total;
                return result;
            },
            mapTotalSent: function(dto) {
                var result = {};
                result[TypeEnum.ONE_TIME] = dto.sent.total;
                result[TypeEnum.AUTOMATIC] = dto.sent_automated.total;
                result[TypeEnum.TRANSACTIONAL] = dto.sent_tx.total;
                return result;
            },
            mapDashboard: function(dashboardDto, type) {
                return {
                    series: this.mapSeries(dashboardDto, type),
                    periods: this.mapPeriods(dashboardDto, type),
                    totalAppUsers: parseInt(dashboardDto.users),
                    enabledUsers: this.mapEnabledUsers(dashboardDto),
                    totalActions: this.mapTotalActions(dashboardDto),
                    totalSent: this.mapTotalSent(dashboardDto)
                };
            },
            mapDtoToBaseModel: function(dto) {
                var localizations = this.mapLocalizations(dto.info && dto.info.locales || []);
                return {
                    _id: dto._id || null,
                    status: this.mapStatus(dto),
                    createdDateTime: {
                        date: moment(dto.created).valueOf(),
                        time: moment(dto.created).format("H:mm")
                    },
                    name: dto.info && dto.info.title || "-",
                    sent: dto.result.sent,
                    actioned: dto.result.actioned,
                    failed: dto.result.errors,
                    processed: dto.result.processed,
                    total: dto.result.total,
                    createdBy: dto.info && dto.info.createdByName || '',
                    platforms: this.mapPlatforms(dto.platforms),
                    localizations: localizations,
                    message: this.mapMessageLocalizationsList(localizations, dto),
                    settings: this.mapSettings(dto),
                    messageType: dto.info && dto.info.silent ? MessageTypeEnum.SILENT : MessageTypeEnum.CONTENT,
                    error: dto.error,
                    errors: this.mapErrors(dto),
                    locations: dto.filter && dto.filter.geos || [],
                    cohorts: dto.filter && dto.filter.cohorts || [],
                    user: dto.filter && dto.filter.user,
                    drill: dto.filter && dto.filter.drill,
                    expiration: countlyPushNotification.helper.convertMSToDaysAndHours(this.findDefaultLocaleItem(dto.contents).expiration),
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
                    startDate: moment(triggerDto.start).valueOf(),
                    endDate: "Never",
                    type: dto.info && dto.info.scheduled ? SendEnum.LATER : SendEnum.NOW,
                };
                model.audienceSelection = triggerDto.delayed ? AudienceSelectionEnum.BEFORE : AudienceSelectionEnum.NOW;
                model.timezone = triggerDto.tz ? TimezoneEnum.SAME : TimezoneEnum.DEVICE;
                return model;
            },
            mapDtoToAutomaticModel: function(dto) {
                var model = this.mapDtoToBaseModel(dto);
                model.type = TypeEnum.AUTOMATIC;
                var triggerDto = dto.triggers[0];
                model.cohorts = triggerDto.cohorts || [];
                model.timezone = triggerDto.tz ? TimezoneEnum.SAME : TimezoneEnum.DEVICE;
                model.delivery = {
                    startDate: moment(triggerDto.start).valueOf(),
                    endDate: moment(triggerDto.end).valueOf() || "Never",
                    type: dto.info && dto.info.scheduled ? SendEnum.LATER : SendEnum.NOW,
                };
                model.automatic = {
                    deliveryMethod: triggerDto.delay ? DeliveryMethodEnum.DELAYED : DeliveryMethodEnum.IMMEDIATELY,
                    deliveryDateCalculation: triggerDto.actuals ? DeliveryDateCalculationEnum.EVENT_DEVICE_DATE : DeliveryDateCalculationEnum.EVENT_SERVER_DATE,
                    trigger: triggerDto.kind === 'event' ? TriggerEnum.EVENT : triggerDto.entry ? TriggerEnum.COHORT_ENTRY : TriggerEnum.COHORT_EXIT,
                    triggerNotMet: triggerDto.cancels ? TriggerNotMetEnum.CANCEL_ON_EXIT : TriggerNotMetEnum.SEND_ANYWAY,
                    cohorts: triggerDto.cohorts || [],
                    events: triggerDto.events || [],
                    capping: Boolean(triggerDto.cap) && Boolean(triggerDto.sleep),
                };
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
                    startDate: moment(triggerDto.start).valueOf(),
                    endDate: "Never",
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
                throw new Error('Unknown push notification type, ' + pushNotificationType);
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
                        keyId: dto[PlatformDtoEnum.IOS].fileType === IOSAuthConfigTypeEnum.P8 ? dto[PlatformDtoEnum.IOS].key : '',
                        keyFile: '',
                        bundleId: dto[PlatformDtoEnum.IOS].bundle,
                        authType: dto[PlatformDtoEnum.IOS].fileType === IOSAuthConfigTypeEnum.P12 ? IOSAuthConfigTypeEnum.P12 : IOSAuthConfigTypeEnum.P8,
                        passphrase: dto[PlatformDtoEnum.IOS].fileType === IOSAuthConfigTypeEnum.P12 ? dto[PlatformDtoEnum.IOS].pass : '',
                        teamId: dto[PlatformDtoEnum.IOS].fileType === IOSAuthConfigTypeEnum.P8 ? dto[PlatformDtoEnum.IOS].team : '',
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
                        appId: dto[PlatformDtoEnum.HUAWEI].appId,
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
                    var idAtribute = htmlElement.children[index].getAttributeNode('id').value;
                    var idNumber = idAtribute.split('-')[1];
                    userPropertyIds.push(idNumber);
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
            mapUserPropertyType: function(type) {
                if (type === UserPropertyTypeEnum.USER) {
                    return 'u';
                }
                if (type === UserPropertyTypeEnum.CUSTOM) {
                    return 'c';
                }
                if (type === UserPropertyTypeEnum.EVENT) {
                    return 'e';
                }
                if (type === UserPropertyTypeEnum.API) {
                    return 'a';
                }
                throw new Error('Unknown user property type:' + type);
            },
            mapUserProperties: function(localizedMessage, container) {
                var self = this;
                var userPropertyDto = {};
                var indices = this.getUserPropertiesIndices(localizedMessage, container);
                var userPropertyIds = this.getUserPropertiesIds(localizedMessage, container);
                userPropertyIds.forEach(function(userPropertyId, index) {
                    userPropertyDto[indices[index]] = {
                        f: localizedMessage.properties[container][userPropertyId].fallback,
                        c: localizedMessage.properties[container][userPropertyId].isUppercase,
                        k: localizedMessage.properties[container][userPropertyId].value,
                        t: self.mapUserPropertyType(localizedMessage.properties[container][userPropertyId].type),
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
                        buttonDto.url = localizedButton.url;
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
                    result.url = iosSettings.onClickURL;
                }
                if (model.settings[PlatformEnum.IOS].mediaURL && options.settings[PlatformEnum.IOS].isMediaURLEnabled && model.messageType === MessageTypeEnum.CONTENT) {
                    result.media = model.settings[PlatformEnum.IOS].mediaURL;
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
                    result.url = androidSettings.onClickURL;
                }
                if (model.settings[PlatformEnum.ANDROID].mediaURL && options.settings[PlatformEnum.ANDROID].isMediaURLEnabled && model.messageType === MessageTypeEnum.CONTENT) {
                    result.media = model.settings[PlatformEnum.ANDROID].mediaURL;
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
                    if (localizationKey !== DEFAULT_LOCALIZATION_VALUE) {
                        localeDto.la = localizationKey;
                    }
                    localeDto.message = self.getMessageText(pushNotificationModel.message[localizationKey], 'content');
                    localeDto.title = self.getMessageText(pushNotificationModel.message[localizationKey], 'title');
                    if (self.hasUserProperties(pushNotificationModel.message[localizationKey], 'content')) {
                        localeDto.messagePers = self.mapUserProperties(pushNotificationModel.message[localizationKey], 'content');
                    }
                    if (self.hasUserProperties(pushNotificationModel.message[localizationKey], 'title')) {
                        localeDto.titlePers = self.mapUserProperties(pushNotificationModel.message[localizationKey], 'title');
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
                    result.tz = model.timezone === TimezoneEnum.SAME;
                    result.delayed = model.audienceSelection === AudienceSelectionEnum.BEFORE;
                }
                if (model.timezone === TimezoneEnum.SAME && model.delivery.type === SendEnum.LATER) {
                    result.sctz = new Date().getTimezoneOffset();
                }
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
                if (model.type === TypeEnum.ONE_TIME && model[TypeEnum.ONE_TIME].targeting === TargetingEnum.SEGMENTED && model.cohorts.length) {
                    result.cohorts = model.cohorts;
                }
                if (model.type === TypeEnum.ONE_TIME && model[TypeEnum.ONE_TIME].targeting === TargetingEnum.SEGMENTED && model.locations.length) {
                    result.geos = model.locations;
                }
                if (model.type === TypeEnum.AUTOMATIC && options.isLocationSet && model.locations.length) {
                    result.geos = model.locations;
                }
                if (model.drill) {
                    result.drill = model.drill;
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
                    defaultLocale.media = pushNotificationModel.settings[PlatformEnum.ALL].mediaURL;
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
                        key: iosConfigModel.authType === IOSAuthConfigTypeEnum.P8 ? iosConfigModel.keyId : 'team',
                        bundle: iosConfigModel.bundleId || "",
                        fileType: iosConfigModel.authType
                    };
                    if (iosConfigModel._id) {
                        result._id = iosConfigModel._id;
                    }
                    if (iosConfigModel.hasUploadedKeyFile) {
                        result.file = iosConfigModel.keyFile;
                    }
                    if (iosConfigModel.authType === IOSAuthConfigTypeEnum.P12) {
                        result.pass = iosConfigModel.passphrase;
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
                    return {
                        _id: model[PlatformEnum.HUAWEI]._id || "",
                        key: model[PlatformEnum.HUAWEI].appId,
                        secret: model[PlatformEnum.HUAWEI].appSecret
                    };
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
            mapAppLevelConfigModelProperty: function(property) {
                return AppLevelConfigPropertyModelMap[property];
            }
        }
    };

    countlyPushNotification.service = {
        DEFAULT_LOCALIZATION_VALUE: DEFAULT_LOCALIZATION_VALUE,
        DEFAULT_LOCALIZATION_LABEL: DEFAULT_LOCALIZATION_LABEL,
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
        hasApproverBypassPermission: function() {
            return this.isPushNotificationApproverPluginEnabled && countlyGlobal.member.approver_bypass;
        },
        hasApproverPermission: function() {
            return this.isPushNotificationApproverPluginEnabled && countlyGlobal.member.approver;
        },
        getTypeUrlParameter: function(type) {
            if (type === this.TypeEnum.AUTOMATIC) {
                return {auto: true};
            }
            if (type === this.TypeEnum.TRANSACTIONAL) {
                return {api: true};
            }
            return {};
        },
        fetchCohorts: function(cohortIdsList, shouldFetchIfEmpty) {
            if (!shouldFetchIfEmpty && cohortIdsList && !cohortIdsList.length) {
                return Promise.resolve([]);
            }
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        app_id: countlyCommon.ACTIVE_APP_ID,
                        method: "get_cohorts",
                        outputFormat: "full"
                    },
                    dataType: "json",
                    success: function(response) {
                        var result = response.aaData;
                        if (cohortIdsList && cohortIdsList.length) {
                            result = response.aaData.filter(function(cohort) {
                                return cohortIdsList.some(function(cohortId) {
                                    return cohort._id === cohortId;
                                });
                            });
                        }
                        resolve(result);
                    },
                    error: function(error) {
                        reject(error);
                    }
                }, {disableAutoCatch: true});
            });
        },
        fetchLocations: function(locationIdsList, shouldFetchIfEmpty) {
            if (!shouldFetchIfEmpty && locationIdsList && !locationIdsList.length) {
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
                        var targetLocations = countlyPushNotification.mapper.incoming.mapLocationTarget(response);
                        if (locationIdsList && locationIdsList.length) {
                            targetLocations = targetLocations.filter(function(targetLocationItem) {
                                return locationIdsList.some(function(locationId) {
                                    return targetLocationItem.id === locationId;
                                });
                            });
                        }
                        resolve(targetLocations);
                    },
                    error: function(error) {
                        reject(error);
                    }
                }, {disableAutoCatch: true});
            });
        },
        fetchEvents: function() {
            return new Promise(function(resolve, reject) {
                countlyEventsOverview.service.fetchAllEvents()
                    .then(function(events) {
                        resolve(countlyPushNotification.mapper.incoming.mapEvents(events.list));
                    }).catch(function(error) {
                        reject(error);
                    });
            });
        },
        fetchAll: function(type) {
            var data = {
                app_id: countlyCommon.ACTIVE_APP_ID,
            };
            Object.assign(data, this.getTypeUrlParameter(type));
            return new Promise(function(resolve, reject) {
                countlyPushNotification.api.findAll(data)
                    .then(function(response) {
                        resolve(countlyPushNotification.mapper.incoming.mapRows(response));
                    })
                    .catch(function(error) {
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
                        var model = countlyPushNotification.mapper.incoming.mapDtoToModel(response);
                        var cohorts = [];
                        if (model.type === TypeEnum.ONE_TIME) {
                            cohorts = model.cohorts;
                        }
                        if (model.type === TypeEnum.AUTOMATIC) {
                            cohorts = model.automatic.cohorts;
                        }
                        Promise.all(
                            [countlyPushNotification.service.fetchCohorts(cohorts, false),
                                countlyPushNotification.service.fetchLocations(model.locations, false)]
                        ).then(function(responses) {
                            if (model.type === TypeEnum.ONE_TIME) {
                                model.cohorts = responses[0];
                            }
                            if (model.type === TypeEnum.AUTOMATIC) {
                                model.automatic.cohorts = responses[0];
                            }
                            model.locations = responses[1];
                            resolve(model);
                        });
                    }).catch(function(error) {
                        //TODO:log error
                        reject(error);
                    });
                });
            });
        },
        fetchDashboard: function(type) {
            var data = {
                app_id: countlyCommon.ACTIVE_APP_ID,
            };
            return new Promise(function(resolve, reject) {
                countlyPushNotification.api.getDashboard(data)
                    .then(function(response) {
                        resolve(countlyPushNotification.mapper.incoming.mapDashboard(response, type));
                    }).catch(function(error) {
                        reject(error);
                    });
            });
        },
        fetchMediaMetadata: function(url) {
            return new Promise(function(resolve, reject) {
                countlyPushNotification.api.getMime(url).then(function(response) {
                    resolve(countlyPushNotification.mapper.incoming.mapMediaMetadata(response));
                }).catch(function(error) {
                    reject(error);
                });
            });
        },
        fetchMediaMetadataWithDebounce: _.debounce(function(url, resolveCallback, rejectCallback) {
            this.fetchMediaMetadata(url).then(resolveCallback).catch(rejectCallback);
        }, DEBOUNCE_TIME_IN_MS),
        fetchUserProperties: function() {
            return countlyPushNotification.api.findAllUserProperties().catch(function() {
                //TODO:log error
                return Promise.resolve([]);
            });
        },
        estimate: function(pushNotificationModel, options) {
            return new Promise(function(resolve, reject) {
                var platformsDto = countlyPushNotification.mapper.outgoing.mapPlatforms(pushNotificationModel.platforms);
                var data = {
                    app: countlyCommon.ACTIVE_APP_ID,
                    platforms: platformsDto,
                };
                var filtersDto = countlyPushNotification.mapper.outgoing.mapFilters(pushNotificationModel, options);
                if (countlyPushNotification.helper.shouldAddFilter(pushNotificationModel) && filtersDto) {
                    data.filter = filtersDto;
                }
                countlyPushNotification.api.estimate(data).then(function(response) {
                    var localesDto = response.locales;
                    localesDto.count = response.count;
                    var localizations = countlyPushNotification.mapper.incoming.mapLocalizations(localesDto);
                    resolve({localizations: localizations, total: response.count, _id: response._id});
                }).catch(function(error) {
                    //TODO:log error
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
            try {
                var dto = countlyPushNotification.mapper.outgoing.mapModelToDto(model, options);
            }
            catch (error) {
                //TODO:log error;
                return Promise.reject(new Error('Unknown error occurred.Please try again later.'));
            }
            return countlyPushNotification.api.save(dto);
        },
        update: function(model, options) {
            try {
                var dto = countlyPushNotification.mapper.outgoing.mapModelToDto(model, options);
            }
            catch (error) {
                //TODO:log error
                return Promise.reject(new Error('Unknown error occurred.Please try again later.'));
            }
            return countlyPushNotification.api.update(dto);
        },
        resend: function(model, options) {
            try {
                var dto = countlyPushNotification.mapper.outgoing.mapModelToDto(model, options);
            }
            catch (error) {
                //TODO:log error
                return Promise.reject(new Error('Unknown error occurred.Please try again later.'));
            }
            var resendUserFilter = {message: {$nin: [model._id]}};
            if (!dto.filter) {
                dto.filter = {};
            }
            if (!dto.filter.user) {
                dto.filter.user = resendUserFilter;
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
            }
            return countlyPushNotification.api.save(dto);
        },
        approve: function(messageId) {
            if (!this.isPushNotificationApproverPluginEnabled()) {
                throw new Error('Push approver plugin is not enabled');
            }
            return countlyPushNotificationApprover.service.approve(messageId);
        },
    };

    var getDetailsInitialState = function() {
        var messageSettings = {};
        messageSettings[PlatformEnum.ALL] = {};
        messageSettings[PlatformEnum.IOS] = {};
        messageSettings[PlatformEnum.ANDROID] = {};
        return {
            pushNotification: countlyPushNotification.helper.getInitialModel(TypeEnum.ONE_TIME),
            platformFilter: PlatformEnum.ALL,
            localFilter: "default",
            userCommand: {
                type: null,
                pushNotificationId: null
            },
            isDrawerOpen: false,
        };
    };

    var detailsActions = {
        fetchById: function(context, id) {
            context.dispatch('onFetchInit', {useLoader: true});
            countlyPushNotification.service.fetchById(id)
                .then(function(model) {
                    context.commit('setPushNotification', model);
                    context.dispatch('onFetchSuccess', {useLoader: true});
                }).catch(function(error) {
                    context.dispatch('onFetchError', {error: error, useLoader: true});
                    //TODO: log error
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
                CountlyHelpers.notify({
                    title: "Push notification approver",
                    message: "Push notification has been successfully sent for approval.",
                });
            }).catch(function(error) {
                context.dispatch('onFetchError', {error: error, useLoader: false});
                CountlyHelpers.notify({
                    title: "Push notification approver error",
                    message: error.message,
                    type: "error"
                });
                //TODO: log error
            });
        },
        onSetLocalFilter: function(context, value) {
            context.commit('setLocalFilter', value);
        },
        onSetPlatformFilter: function(context, value) {
            context.commit('setPlatformFilter', value);
        },
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
        setLocalFilter: function(state, value) {
            state.localFilter = value;
        },
        setPlatformFilter: function(state, value) {
            state.platformFilter = value;
        },
    };

    var pushNotificationDetailsModule = countlyVue.vuex.Module("details", {
        state: getDetailsInitialState,
        actions: detailsActions,
        mutations: detailsMutations,
        submodules: [countlyVue.vuex.FetchMixin()]
    });

    var getMainInitialState = function() {
        var enabledUsers = {};
        enabledUsers[PlatformEnum.ALL] = 0;
        enabledUsers[PlatformEnum.IOS] = 0;
        enabledUsers[PlatformEnum.ANDROID] = 0;

        var totalActions = {};
        totalActions[TypeEnum.ONE_TIME] = 0;
        totalActions[TypeEnum.AUTOMATIC] = 0;
        totalActions[TypeEnum.TRANSACTIONAL] = 0;

        var totalSent = {};
        totalSent[TypeEnum.ONE_TIME] = 0;
        totalSent[TypeEnum.AUTOMATIC] = 0;
        totalSent[TypeEnum.TRANSACTIONAL] = 0;

        return {
            rows: [],
            dashboard: {
                series: {
                    monthly: [{data: [], label: actionsPerformedLabel}, {data: [], label: messagesSentLabel}],
                    weekly: [{data: [], label: actionsPerformedLabel}, {data: [], label: messagesSentLabel}],
                    daily: [{data: [], label: actionsPerformedLabel}, {data: [], label: messagesSentLabel}]
                },
                periods: {monthly: [], weekly: []},
                totalAppUsers: 0,
                enabledUsers: enabledUsers,
                totalActions: totalActions,
                totalSent: totalSent,
            },
            selectedPushNotificationType: countlyPushNotification.service.TypeEnum.ONE_TIME,
            statusFilter: countlyPushNotification.service.StatusEnum.ALL,
            platformFilter: countlyPushNotification.service.PlatformEnum.ALL,
            isDashboardLoading: false,
            areRowsLoading: false,
            userCommand: {
                type: null,
                pushNotificationId: null
            },
            isDrawerOpen: false,
        };
    };

    var mainActions = {
        fetchAll: function(context, useLoader) {
            if (useLoader) {
                context.dispatch('onSetAreRowsLoading', true);
            }
            countlyPushNotification.service.fetchAll(context.state.selectedPushNotificationType)
                .then(function(response) {
                    context.commit('setRows', response);
                }).catch(function() {
                    //TODO: log error
                }).finally(function() {
                    context.dispatch('onSetAreRowsLoading', false);
                });
        },
        fetchDashboard: function(context) {
            context.dispatch('onSetIsDashboardLoading', true);
            countlyPushNotification.service.fetchDashboard(context.state.selectedPushNotificationType)
                .then(function(response) {
                    context.commit('setDashboard', response);
                }).catch(function() {
                    //TODO: log error
                }).finally(function() {
                    context.dispatch('onSetIsDashboardLoading', false);
                });
        },
        onDelete: function(context, id) {
            context.dispatch('onFetchInit', {useLoader: true});
            countlyPushNotification.service.delete(id)
                .then(function() {
                    context.dispatch('fetchAll');
                    context.dispatch('onFetchSuccess', {useLoader: true});
                }).catch(function(error) {
                    //TODO: log error
                    context.dispatch('onFetchError', {error: error, useLoader: true});
                });
        },
        onApprove: function(context, id) {
            context.dispatch('onFetchInit', {useLoader: true});
            countlyPushNotification.service.approve(id).then(function() {
                context.dispatch('fetchAll', false);
                context.dispatch('onFetchSuccess', {useLoader: true});
                CountlyHelpers.notify({
                    title: "Push notification approver",
                    message: "Push notification has been successfully sent for approval.",
                });
            }).catch(function(error) {
                context.dispatch('onFetchError', {error: error, useLoader: true});
                CountlyHelpers.notify({
                    title: "Push notification approver error",
                    message: error.message,
                    type: "error"
                });
                //TODO: log error
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
        onSetIsDashboardLoading: function(context, value) {
            context.commit('setIsDashboardLoading', value);
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
        setDashboard: function(state, value) {
            state.dashboard = value;
        },
        setIsDashboardLoading: function(state, value) {
            state.isDashboardLoading = value;
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

    var pushNotificationMainModule = countlyVue.vuex.Module("main", {
        state: getMainInitialState,
        actions: mainActions,
        mutations: mainMutations,
        submodules: [countlyVue.vuex.FetchMixin()]
    });

    countlyPushNotification.getVuexModule = function() {
        return countlyVue.vuex.Module("countlyPushNotification", {
            submodules: [pushNotificationMainModule, pushNotificationDetailsModule]
        });
    };

}(window.countlyPushNotification = window.countlyPushNotification || {}));