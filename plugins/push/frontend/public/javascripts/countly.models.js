/*global countlyVue,CV,countlyCommon,Promise,moment,_,countlyGlobalLang,CountlyHelpers,countlyEventsOverview,countlyPushNotificationApprover,countlyGlobal*/
(function(countlyPushNotification) {

    var messagesSentLabel = CV.i18n('push-notification.sent-serie-name');
    var actionsPerformedLabel = CV.i18n('push-notification.actions-performed-serie-name');
    var DEBOUNCE_TIME_IN_MS = 250;
    var MB_TO_BYTES_RATIO = 1000000;
    var DAY_TO_MS_RATIO = 86400 * 1000;
    var HOUR_TO_MS_RATIO = 3600000;

    var DEFAULT_LOCALIZATION_VALUE = 'default';
    var DEFAULT_LOCALIZATION_LABEL = 'Default';
    var USER_PROPERTY_SUBSTITUE_CHAR = '\u200B';

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
        ALL: "all",
        SENT: "sent",
        SENDING: "sending",
        DRAFT: "draft",
        NOT_APPROVED: "notApproved",
        ABORTED: "aborted",
        FAILED: "failed",
        STOPPED: "stopped",
        SCHEDULED: "scheduled"
    });
    var UserEventEnum = Object.freeze({
        RESEND: 'resend',
        DUPLICATE: 'duplicate',
        DELETE: 'delete',
        REJECT: 'reject',
        APPROVE: 'approve'
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

    var StatusFinderHelper = {
        STATUS_SHIFT_OPERATOR_ENUM: {
            NotCreated: 0,			// 0
            Created: 1 << 0,		// 1
            Scheduled: 1 << 1,		// 2
            Sending: 1 << 2,		// 4
            Done: 1 << 3,		// 8
            Error: 1 << 4,		// 16
            Success: 1 << 5,		// 32
            Aborted: 1 << 10,	// 1024
            Deleted: 1 << 11,	// 2048
        },
        isSending: function(status) {
            return (status & this.STATUS_SHIFT_OPERATOR_ENUM.Sending) > 0;
        },
        isInitial: function(status) {
            return status === this.STATUS_SHIFT_OPERATOR_ENUM.NotCreated;
        },
        isCreated: function(status) {
            return (status & this.STATUS_SHIFT_OPERATOR_ENUM.Created) > 0;
        },
        isScheduled: function(status) {
            return (status & this.STATUS_SHIFT_OPERATOR_ENUM.Scheduled) > 0;
        },
        isAborted: function(status) {
            return (status & this.STATUS_SHIFT_OPERATOR_ENUM.Aborted) > 0;
        },
        isDone: function(status) {
            return (status & this.STATUS_SHIFT_OPERATOR_ENUM.Done) > 0;
        },
        isNotApproved: function(dto) {
            if (countlyPushNotification.service.isPushNotificationApproverPluginEnabled()) {
                return dto.creator && !dto.approver && !(dto.result.status & 8);
            }
            return false;
        }
    };

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
        hasNoUsersToSendPushNotification: function(pushNotificationDto) {
            return pushNotificationDto.build.total === 0;
        },
        isNoPushCredentialsError: function(error) {
            return error.message === 'No push credentials';
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
            return result;
        },
        convertMSToDaysAndHours: function(dateTimeInMs) {
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
        }
    };

    countlyPushNotification.mapper = {
        incoming: {
            getUserPropertyElement: function(index, userProperty) {
                var newElement = document.createElement("span");
                newElement.setAttribute("id", "id-" + index);
                newElement.setAttribute("contentEditable", false);
                newElement.setAttribute("data-user-property-label", userProperty.k);
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
            buildMessageText: function(message, userPropertiesDto) {
                if (!message || !userPropertiesDto) {
                    return message || "";
                }
                var self = this;
                var messageInHTMLString = this.decodeMessage(message);
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
                        var newIndex = buildMessageLength + addedStringLength;
                        messageInHTMLString = self.insertUserPropertyAtIndex(messageInHTMLString, newIndex, userPropertyStringElement);
                        buildMessageLength += userPropertyStringElement.length + addedStringLength;
                    }
                    previousIndex = currentUserPropertyIndex;
                });
                return messageInHTMLString;
            },
            mapType: function(dto) {
                if (dto.tx === false && dto.auto === true) {
                    return TypeEnum.AUTOMATIC;
                }
                if (dto.tx === true && dto.auto === false) {
                    return TypeEnum.TRANSACTIONAL;
                }
                return TypeEnum.ONE_TIME;
            },
            mapStatus: function(dto) {
                var status = dto.result.status;
                var error = dto.result.error;

                if (StatusFinderHelper.isSending(status)) {
                    if (error) {
                        return {value: 'sending-errors', label: CV.i18n('push-notification.status-sending-errors')};
                    }
                    else {
                        return {value: StatusEnum.SENDING, label: CV.i18n('push-notification.status-sending')};
                    }
                }
                else if (StatusFinderHelper.isAborted(status)) {
                    return {value: StatusEnum.ABORTED, label: CV.i18n('push-notification.status-aborted')};
                }
                else if (StatusFinderHelper.isDone(status)) {
                    if (error) {
                        return {value: 'sent-errors', label: CV.i18n('push-notification.status-sent-errors')};
                    }
                    else {
                        return {value: StatusEnum.SENT, label: CV.i18n('push-notification.status-sent')};
                    }
                }
                else if (StatusFinderHelper.isScheduled(status)) {
                    return {value: StatusEnum.SCHEDULED, label: CV.i18n('push-notification.status-scheduled')};
                }
                else if (StatusFinderHelper.isNotApproved(dto)) {
                    return {value: StatusEnum.NOT_APPROVED, label: CV.i18n('push-notification.status-not-approved')};
                }
                else if (StatusFinderHelper.isCreated(status)) {
                    return {value: 'created', label: CV.i18n('push-notification.status-created')};
                }
                else if (StatusFinderHelper.isInitial(status)) {
                    return {value: 'initial', label: CV.i18n('push-notification.status-initial')};
                }
                else {
                    return {value: status, label: status};
                }
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
                        allPlatformItems.push({label: CV.i18n("push-notification.platform-filter-ios"), value: PlatformEnum.IOS});
                    }
                    if (currentPlatformItem === PlatformDtoEnum.ANDROID) {
                        allPlatformItems.push({label: CV.i18n("push-notification.platform-filter-android"), value: PlatformEnum.ANDROID});
                    }
                    return allPlatformItems;
                }, []);
            },
            mapRows: function(dto) {
                var self = this;
                var rowsModel = [];
                dto.aaData.forEach(function(pushNotificationDtoItem, index) {
                    rowsModel[index] = {
                        _id: pushNotificationDtoItem._id,
                        name: pushNotificationDtoItem.messagePerLocale["default|t"] || "-",
                        status: self.mapStatus(pushNotificationDtoItem),
                        createdDateTime: {
                            date: moment(pushNotificationDtoItem.created).format("MMMM Do YYYY"),
                            time: moment(pushNotificationDtoItem.created).format("h:mm:ss a")
                        },
                        sentDateTime: {
                            date: moment(pushNotificationDtoItem.date).format("MMMM Do YYYY"),
                            time: moment(pushNotificationDtoItem.date).format("h:mm:ss a")
                        },
                        sent: pushNotificationDtoItem.result.sent,
                        actioned: pushNotificationDtoItem.result.actioned || 0,
                        createdBy: pushNotificationDtoItem.creator,
                        platforms: self.mapPlatforms(pushNotificationDtoItem.platforms),
                        content: pushNotificationDtoItem.messagePerLocale.default,
                    };
                });
                return rowsModel;
            },
            mapTargeting: function(dto) {
                if (dto.cohorts && dto.cohorts.length || dto.geos && dto.geos.length) {
                    return TargetingEnum.SEGMENTED;
                }
                return TargetingEnum.ALL;
            },
            mapEndDate: function(dto) {
                return dto.autoEnd ? moment(dto.autoEnd).format("MMMM Do, YYYY, H:mm") : "Never";
            },
            mapStartDateType: function(dto) {
                return dto.date ? SendEnum.LATER : SendEnum.NOW;
            },
            mapAudienceSelection: function(dto) {
                return dto.delayed ? AudienceSelectionEnum.BEFORE : AudienceSelectionEnum.NOW;
            },
            mapErrors: function(dto) {
                //TODO-LA: map push notification message errors;
                return {codes: dto.result.errorCodes, messages: dto.result.error};
            },
            mapMedia: function(dto) {
                var result = {};
                if (dto.media) {
                    result[PlatformEnum.ALL] = {url: dto.media, type: MediaTypeEnum.IMAGE};
                }
                //TODO-LA:map media for specific platforms when the server starts supporting them.
                return result;
            },
            mapEvents: function(eventsList) {
                return eventsList.map(function(event) {
                    return {label: event, value: event};
                });
            },
            mapTrigger: function(dto) {
                if (dto.autoOnEntry === 'events') {
                    return TriggerEnum.EVENT;
                }
                if (dto.autoOnEntry) {
                    return TriggerEnum.COHORT_ENTRY;
                }
                if (!dto.autoOnEntry) {
                    return TriggerEnum.COHORT_EXIT;
                }
            },
            mapTriggerNotMet: function(dto) {
                return dto.autoCancelTrigger ? TriggerNotMetEnum.CANCEL_ON_EXIT : TriggerNotMetEnum.SEND_ANYWAY;
            },
            mapDeliveryDateCalculation: function(dto) {
                return dto.actualDates ? DeliveryDateCalculationEnum.EVENT_DEVICE_DATE : DeliveryDateCalculationEnum.EVENT_SERVER_DATE;
            },
            mapMessageLocalizationButtons: function(localization, dto) {
                var buttons = [];
                if (dto.messagePerLocale[localization + '|0|t'] || dto.messagePerLocale[localization + '|0|l']) {
                    buttons.push({label: dto.messagePerLocale[localization + "|0|t"], url: dto.messagePerLocale[localization + "|0|l"]});
                }
                if (dto.messagePerLocale[localization + '|1|t'] || dto.messagePerLocale[localization + '|1|l']) {
                    buttons.push({label: dto.messagePerLocale[localization + "|0|t"], url: dto.messagePerLocale[localization + "|0|l"]});
                }
                return buttons;
            },
            mapMessageLocalization: function(localization, dto) {
                return {
                    title: this.buildMessageText(dto.messagePerLocale[localization + '|t'], dto.messagePerLocale[localization + "|tp"]),
                    content: this.buildMessageText(dto.messagePerLocale[localization], dto.messagePerLocale[localization + "|p"]),
                    media: this.mapMedia(dto),
                    mediaMime: dto.mediaMime,
                    onClickUrl: dto.url,
                    numberOfButtons: dto.buttons,
                    buttons: this.mapMessageLocalizationButtons(localization, dto)
                };
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
                result[PlatformEnum.ANDROID] = parseInt(dto.enabled.a + dto.enabled.h);
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
            mapMainDtoToModel: function(allPushNotificationsDto, dashboardDto, type) {
                return {
                    rows: this.mapRows(allPushNotificationsDto),
                    series: this.mapSeries(dashboardDto, type),
                    periods: this.mapPeriods(dashboardDto, type),
                    totalAppUsers: parseInt(dashboardDto.users),
                    enabledUsers: this.mapEnabledUsers(dashboardDto),
                    totalActions: this.mapTotalActions(dashboardDto),
                    totalSent: this.mapTotalSent(dashboardDto)
                };
            },
            mapDtoDtoBaseModel: function(dto) {
                var localizations = this.mapLocalizations(dto);
                return {
                    id: dto._id,
                    status: this.mapStatus(dto),
                    createdDateTime: {
                        date: moment(dto.created).valueOf(),
                        time: moment(dto.created).format("H:mm")
                    },
                    name: dto.messagePerLocale[DEFAULT_LOCALIZATION_VALUE + '|t'] || "-", //NOTE-LA: old api does not support push notification name, instead use the message title for now.
                    sent: dto.result.sent,
                    actioned: dto.result.actioned,
                    failed: dto.result.errors,
                    processed: dto.result.processed,
                    total: dto.result.total,
                    createdBy: dto.creator,
                    platforms: this.mapPlatforms(dto.platforms),
                    localizations: localizations,
                    message: this.mapMessageLocalizationsList(localizations, dto),
                    errors: this.mapErrors(dto),
                    sound: dto.sound,
                    cohorts: dto.cohorts || dto.autoCohorts || [],
                    locations: dto.geos || [],
                    expiration: countlyPushNotification.helper.convertMSToDaysAndHours(dto.expiration),
                    timezone: dto.tz ? TimezoneEnum.SAME : TimezoneEnum.DEVICE,
                    delivery: {
                        type: this.mapStartDateType(dto),
                        startDate: moment(dto.date).format("MMMM Do, YYYY, H:mm"),
                        endDate: this.mapEndDate(dto),
                    }
                };
            },
            mapDtoToOneTimeModel: function(dto) {
                var oneTimeModel = this.mapDtoDtoBaseModel(dto);
                oneTimeModel.targeting = this.mapTargeting(dto);
                oneTimeModel.type = TypeEnum.ONE_TIME;
                oneTimeModel.audienceSelection = this.mapAudienceSelection(dto);
                return oneTimeModel;
            },
            mapDtoToAutomaticModel: function(dto) {
                var automaticModel = this.mapDtoDtoBaseModel(dto);
                automaticModel.type = TypeEnum.AUTOMATIC;
                automaticModel.audienceSelection = this.mapAudienceSelection(dto);
                automaticModel.automatic = {
                    deliveryMethod: dto.autoDelay ? DeliveryMethodEnum.DELAYED : DeliveryMethodEnum.IMMEDIATELY,
                    deliveryDateCalculation: this.mapDeliveryDateCalculation(dto),
                    trigger: this.mapTrigger(dto),
                    triggerNotMet: this.mapTriggerNotMet(dto),
                    events: dto.autoEvents || [],
                    capping: Boolean(dto.autoCapMessages) && Boolean(dto.autoCapSleep),
                };
                if (automaticModel.automatic.deliveryMethod === DeliveryMethodEnum.DELAYED) {
                    automaticModel.automatic.delayed = countlyPushNotification.helper.convertMSToDaysAndHours(dto.autoDelay);
                }
                if (automaticModel.automatic.capping) {
                    automaticModel.automatic.maximumMessagesPerUser = dto.autoCapMessages,
                    automaticModel.automatic.minimumTimeBetweenMessages = countlyPushNotification.helper.convertMSToDaysAndHours(dto.autoCapSleep);
                }
                return automaticModel;
            },
            mapDtoToTransactionalModel: function(dto) {
                var transactionalModel = this.mapDtoDtoBaseModel(dto);
                transactionalModel.type = TypeEnum.TRANSACTIONAL;
                transactionalModel.automatic = {
                    capping: Boolean(dto.autoCapMessages) && Boolean(dto.autoCapSleep)
                };
                if (transactionalModel.automatic.capping) {
                    transactionalModel.automatic.maximumMessagesPerUser = dto.autoCapMessages,
                    transactionalModel.automatic.minimumTimeBetweenMessages = countlyPushNotification.helper.convertMSToDaysAndHours(dto.autoCapSleep);
                }
                return transactionalModel;
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
                var typeAndFileExtension = metadataDto['content-type'].split('/');
                return {
                    type: typeAndFileExtension[0],
                    extension: typeAndFileExtension[1],
                    size: metadataDto['content-length'] / MB_TO_BYTES_RATIO,
                };
            },
            mapLocalizationByKey: function(localizationKey) {
                return { label: countlyGlobalLang.languages[localizationKey].englishName, value: localizationKey};
            },
            hasAnyLocales: function(pushNotificationDto) {
                if (pushNotificationDto.build) {
                    return Object.keys(pushNotificationDto.build.count).some(function(localeKey) {
                        return Boolean(countlyGlobalLang.languages[localeKey]);
                    });
                }
                return false;
            },
            mapLocalizations: function(pushNotificationDto) {
                var self = this;
                if (!this.hasAnyLocales(pushNotificationDto)) {
                    return [countlyPushNotification.helper.getDefaultLocalization()];
                }
                var result = Object.keys(pushNotificationDto.build.count).map(function(localKey) {
                    var localizationItem = self.mapLocalizationByKey(localKey);
                    localizationItem.count = pushNotificationDto.build.count[localKey];
                    localizationItem.percentage = CountlyHelpers.formatPercentage(pushNotificationDto.build.count[localKey] / pushNotificationDto.build.total);
                    return localizationItem;
                });
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
                        keyId: dto[PlatformDtoEnum.IOS].fileType === IOSAuthConfigTypeEnum.P8 ? dto[PlatformDtoEnum.IOS].fileType : '',
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
            replaceUserProperties: function(localizedMessage, container) {
                var element = document.createElement('div');
                element.innerHTML = localizedMessage[container];
                Object.keys(localizedMessage.properties[container]).forEach(function(propertyId) {
                    var userPropElement = element.querySelector("#id-" + propertyId);
                    element.replaceChild(document.createTextNode(USER_PROPERTY_SUBSTITUE_CHAR), userPropElement);
                });
                return element.innerHTML;
            },
            getUserPropertiesIndices: function(localizedMessage, container) {
                var indices = [];
                var element = document.createElement('div');
                element.innerHTML = this.replaceUserProperties(localizedMessage, container);
                var substitutedUserPropertyRegexp = new RegExp(USER_PROPERTY_SUBSTITUE_CHAR, 'g');
                var match = substitutedUserPropertyRegexp.exec(element.textContent);
                var userPropertyIndexCounter = 0;
                while (match) {
                    indices.push(match.index - userPropertyIndexCounter);
                    userPropertyIndexCounter += 1;
                    match = substitutedUserPropertyRegexp.exec(element.textContent);
                }
                return indices;
            },
            hasUserProperties: function(localizedMessage, container) {
                return localizedMessage.properties && localizedMessage.properties[container];
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
            mapType: function(type) {
                if (type === TypeEnum.AUTOMATIC) {
                    return {tx: false, auto: true};
                }
                if (type === TypeEnum.TRANSACTIONAL) {
                    return {tx: true, auto: false};
                }
                return {tx: false, auto: false};
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
            mapLocalizations: function(localizations, totalAppUsers) {
                return localizations.map(function(localizationModel) {
                    return {
                        value: localizationModel.value,
                        title: localizationModel.label,
                        count: localizationModel.value === DEFAULT_LOCALIZATION_VALUE ? totalAppUsers : localizationModel.count,
                        percent: localizationModel.percentage
                    };
                });
            },
            mapUserProperties: function(localizedMessage, container) {
                var userPropertyDto = {};
                if (this.hasUserProperties(localizedMessage, container)) {
                    var indices = this.getUserPropertiesIndices(localizedMessage, container);
                    var userPropertyIds = this.getUserPropertiesIds(localizedMessage, container);
                    userPropertyIds.forEach(function(userPropertyId, index) {
                        userPropertyDto[indices[index]] = {
                            f: localizedMessage.properties[container][userPropertyId].fallback,
                            c: localizedMessage.properties[container][userPropertyId].isUppercase,
                            k: localizedMessage.properties[container][userPropertyId].value
                        };
                    });
                }
                return userPropertyDto;
            },
            mapButtons: function(localizationKey, localizedMessage) {
                var result = {};
                localizedMessage.buttons.forEach(function(localizedButton, index) {
                    if (localizedButton.label) {
                        result[localizationKey + "|" + index + "|t"] = localizedButton.label;
                    }
                    if (localizedButton.url) {
                        result[localizationKey + "|" + index + "|l"] = localizedButton.url;
                    }
                });
                return result;
            },
            mapMessageLocalization: function(pushNotificationModel) {
                var self = this;
                var messagePerLocale = {};
                Object.keys(pushNotificationModel.message).forEach(function(localizationKey) {
                    messagePerLocale[localizationKey] = self.getMessageText(pushNotificationModel.message[localizationKey], 'content');
                    messagePerLocale[localizationKey + '|t'] = self.getMessageText(pushNotificationModel.message[localizationKey], 'title');
                    messagePerLocale[localizationKey + '|p'] = self.mapUserProperties(pushNotificationModel.message[localizationKey], 'content');
                    messagePerLocale[localizationKey + '|tp'] = self.mapUserProperties(pushNotificationModel.message[localizationKey], 'title');
                    Object.assign(messagePerLocale, self.mapButtons(localizationKey, pushNotificationModel.message[localizationKey]));
                });
                return messagePerLocale;
            },
            mapModelToBaseDto: function(pushNotificationModel) {
                var typeDto = this.mapType(pushNotificationModel.type);
                var expirationInMS = countlyPushNotification.helper.convertDateTimeToMS({
                    days: pushNotificationModel.expiration.days,
                    hours: pushNotificationModel.expiration.hours
                });
                var resultDto = {
                    apps: [countlyCommon.ACTIVE_APP_ID],
                    platforms: this.mapPlatforms(pushNotificationModel.platforms),
                    cohorts: [].concat(pushNotificationModel.cohorts),
                    geos: [].concat(pushNotificationModel.locations),
                    delayed: pushNotificationModel.audienceSelection === AudienceSelectionEnum.BEFORE,
                    expiration: expirationInMS,
                    tx: typeDto.tx,
                    auto: typeDto.auto,
                    test: false,
                    source: 'dash',
                    type: 'message'
                };

                if (pushNotificationModel.delivery.type === SendEnum.LATER) {
                    resultDto.date = new Date(pushNotificationModel.delivery.startDate);
                }
                if (pushNotificationModel.queryFilter && pushNotificationModel.type === TypeEnum.ONE_TIME) {
                    resultDto.userConditions = pushNotificationModel.queryFilter;
                }
                return resultDto;
            },
            mapModelToOneTimeDto: function(pushNotificationModel, options) {
                var dto = this.mapModelToBaseDto(pushNotificationModel);
                if (pushNotificationModel._id) {
                    dto._id = pushNotificationModel._id;
                }
                dto.messagePerLocale = this.mapMessageLocalization(pushNotificationModel);
                dto.locales = this.mapLocalizations(options.localizations, options.totalAppUsers);
                if (dto.date) {
                    dto.tz = pushNotificationModel.timezone === TimezoneEnum.SAME ? new Date().getTimezoneOffset() : false;
                }
                dto.buttons = pushNotificationModel.message.default.buttons.length;
                dto.autoOnEntry = false;
                dto.autoCancelTrigger = false;
                dto.autoCohorts = [];
                dto.autoEvents = [];
                dto.actualDates = false;
                dto.sound = "default"; //NOTE-LA: until the specific platform settings are supported use default sound
                return dto;
            },
            mapTrigger: function(model) {
                if (model.automatic.trigger === TriggerEnum.COHORT_ENTRY) {
                    return true;
                }
                if (model.automatic.trigger === TriggerEnum.COHORT_EXIT) {
                    return false;
                }
                if (model.automatic.trigger === TriggerEnum.EVENT) {
                    return 'events';
                }
            },
            mapModelToAutomaticDto: function(pushNotificationModel, options) {
                var dto = this.mapModelToBaseDto(pushNotificationModel);
                if (pushNotificationModel._id) {
                    dto._id = pushNotificationModel._id;
                }
                dto.messagePerLocale = this.mapMessageLocalization(pushNotificationModel);
                dto.locales = this.mapLocalizations(options.localizations, options.totalAppUsers);
                dto.cohorts = [];
                dto.autoCohorts = pushNotificationModel.cohorts;
                dto.autoOnEntry = this.mapTrigger(pushNotificationModel);
                dto.autoCancelTrigger = pushNotificationModel.automatic.triggerNotMet === TriggerNotMetEnum.CANCEL_ON_EXIT;
                dto.autoEvents = pushNotificationModel.automatic.events;
                dto.buttons = pushNotificationModel.message.default.buttons.length;
                if (dto.date) {
                    dto.tz = pushNotificationModel.timezone === TimezoneEnum.SAME ? new Date().getTimezoneOffset() : false;
                }
                if (pushNotificationModel.delivery.isEndDateEnabled) {
                    dto.autoEnd = new Date(pushNotificationModel.delivery.endDate);
                }
                if (pushNotificationModel.automatic.deliveryMethod) {
                    var deliveryDateTime = {
                        days: pushNotificationModel.automatic.delayed.days,
                        hours: pushNotificationModel.automatic.delayed.hours
                    };
                    dto.autoDelay = countlyPushNotification.helper.convertDateTimeToMS(deliveryDateTime);
                }
                if (pushNotificationModel.automatic.capping) {
                    dto.autoCapMessages = parseInt(pushNotificationModel.automatic.maximumMessagesPerUser, 10);
                    var cappingDateTime = {
                        days: pushNotificationModel.automatic.minimumTimeBetweenMessages.days,
                        hours: pushNotificationModel.automatic.minimumTimeBetweenMessages.hours
                    };
                    dto.autoCapSleep = countlyPushNotification.helper.convertDateTimeToMS(cappingDateTime);
                }
                dto.actualDates = pushNotificationModel.automatic.deliveryDateCalculation === DeliveryDateCalculationEnum.EVENT_DEVICE_DATE;
                dto.sound = "default"; //NOTE-LA: until the specific platform settings are supported use default sound
                return dto;
            },
            mapModelToTransactionalDto: function(pushNotificationModel, options) {
                var dto = this.mapModelToBaseDto(pushNotificationModel);
                if (pushNotificationModel._id) {
                    dto._id = pushNotificationModel._id;
                }
                dto.messagePerLocale = this.mapMessageLocalization(pushNotificationModel);
                dto.locales = this.mapLocalizations(options.localizations, options.totalAppUsers);
                dto.buttons = pushNotificationModel.message.default.buttons.length;
                dto.autoOnEntry = false;
                dto.autoCancelTrigger = false;
                dto.autoCohorts = [];
                dto.autoEvents = [];
                if (pushNotificationModel.automatic.capping) {
                    dto.autoCapMessages = parseInt(pushNotificationModel.automatic.maximumMessagesPerUser, 10);
                    var cappingDateTime = {
                        days: pushNotificationModel.automatic.minimumTimeBetweenMessages.days,
                        hours: pushNotificationModel.automatic.minimumTimeBetweenMessages.hours
                    };
                    dto.autoCapSleep = countlyPushNotification.helper.convertDateTimeToMS(cappingDateTime);
                }
                dto.actualDates = false;
                dto.sound = "default"; //NOTE-LA: until the specific platform settings are supported use default sound
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
                throw Error('Unknown push notification type');
            },
            mapIOSAppLevelConfig: function(model) {
                var iosConfigModel = model[PlatformEnum.IOS];
                if (iosConfigModel) {
                    var result = {
                        _id: iosConfigModel._id || "",
                        type: iosConfigModel.authType === IOSAuthConfigTypeEnum.P8 ? 'apn_token' : 'apn_universal',
                        key: iosConfigModel.authType === IOSAuthConfigTypeEnum.P8 ? iosConfigModel.keyId : 'team',
                        bundle: iosConfigModel.bundleId || "",
                        fileType: iosConfigModel.authType
                    };
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
                    return {
                        _id: model[PlatformEnum.ANDROID]._id || "",
                        key: model[PlatformEnum.ANDROID].firebaseKey,
                        type: model[PlatformEnum.ANDROID].type
                    };
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
        UserEventEnum: UserEventEnum,
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
        platformOptions: platformOptions,
        startDateOptions: startDateOptions,
        audienceSelectionOptions: audienceSelectionOptions,
        targetingOptions: targetingOptions,
        triggerOptions: triggerOptions,
        triggerNotMetOptions: triggerNotMetOptions,
        deliveryDateCalculationOptions: deliveryDateCalculationOptions,
        deliveryMethodOptions: deliveryMethodOptions,
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
                return {auto: true, tx: false};
            }
            if (type === this.TypeEnum.TRANSACTIONAL) {
                return {auto: false, tx: true};
            }
            return { auto: false, tx: false};
        },
        fetchAll: function(type) {
            var self = this;
            return new Promise(function(resolve, reject) {
                Promise.all([self.fetchByType(type), self.fetchDashboard(type)])
                    .then(function(responses) {
                        resolve(countlyPushNotification.mapper.incoming.mapMainDtoToModel(responses[0], responses[1], type));
                    }).catch(function(error) {
                        reject(error);
                    });
            });
        },
        fetchByType: function(type) {
            var data = {
                app_id: countlyCommon.ACTIVE_APP_ID,
            };
            Object.assign(data, this.getTypeUrlParameter(type));
            return CV.$.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.r + "/pushes/all",
                data: data,
                dataType: "json"
            }, {disableAutoCatch: true});
        },
        fetchById: function(id) {
            return CV.$.ajax({
                type: "GET",
                url: window.countlyCommon.API_URL + "/i/pushes/message",
                data: {
                    args: JSON.stringify({_id: id, apps: [countlyCommon.ACTIVE_APP_ID]})
                },
                dataType: "json"
            }, {disableAutoCatch: true});
        },
        fetchDashboard: function() {
            var data = {
                app_id: countlyCommon.ACTIVE_APP_ID,
            };
            return CV.$.ajax({
                type: "GET",
                url: window.countlyCommon.API_URL + '/i/pushes/dashboard',
                data: data,
                dataType: "json"
            }, {disableAutoCatch: true});
        },
        deleteById: function(id) {
            var data = {
                app_id: countlyCommon.ACTIVE_APP_ID,
                _id: id
            };
            return CV.$.ajax({
                method: 'GET',
                url: window.countlyCommon.API_URL + '/i/pushes/delete',
                data: data,
                dataType: "json"
            }, {disableAutoCatch: true});
        },
        fetchMediaMetadata: function(url) {
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    method: 'GET',
                    url: window.countlyCommon.API_URL + '/i/pushes/mime?url=' + url,
                    success: function(data) {
                        resolve(countlyPushNotification.mapper.incoming.mapMediaMetadata(data.headers));
                    },
                    error: function(error) {
                        reject(error);
                    }
                }, {disableAutoCatch: true});
            });
        },
        fetchMediaMetadataWithDebounce: _.debounce(function(url, resolveCallback, rejectCallback) {
            this.fetchMediaMetadata(url).then(resolveCallback).catch(rejectCallback);
        }, DEBOUNCE_TIME_IN_MS),
        prepare: function(pushNotificationModel) {
            var result = countlyPushNotification.mapper.outgoing.mapModelToBaseDto(pushNotificationModel);
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    type: "POST",
                    url: window.countlyCommon.API_URL + '/i/pushes/prepare',
                    data: {
                        args: JSON.stringify(result)
                    },
                    dataType: "json",
                    success: function(response) {
                        if (countlyPushNotification.helper.hasNoUsersToSendPushNotification(response)) {
                            reject(new Error('No users were found from selected configuration'));
                        }
                        else if (response.error) {
                            reject(new Error(response.error));
                        }
                        else {
                            var localizations = countlyPushNotification.mapper.incoming.mapLocalizations(response);
                            resolve({localizations: localizations, total: response.build.total, _id: response._id});
                        }
                    },
                    error: function(error) {
                        reject(error);
                    }
                }, {disableAutoCatch: true});
            });
        },
        save: function(pushNotificationModel, options) {
            var dto = countlyPushNotification.mapper.outgoing.mapModelToDto(pushNotificationModel, options);
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    type: "POST",
                    url: window.countlyCommon.API_URL + '/i/pushes/create',
                    data: {
                        args: JSON.stringify(dto)
                    },
                    dataType: "json",
                    success: function(response) {
                        if (response.error) {
                            reject(new Error(response.error));
                        }
                        else {
                            resolve();
                        }
                    },
                    error: function(error) {
                        reject(error);
                    }
                }, {disableAutoCatch: true});
            });
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
        approve: function(messageId) {
            if (!this.isPushNotificationApproverPluginEnabled()) {
                throw new Error('Push approver plugin is not enabled');
            }
            return countlyPushNotificationApprover.service.approve(messageId);
        }
    };

    var getDetailsInitialState = function() {
        return {
            pushNotification: {
                message: {
                    default: {
                        buttons: [],
                        media: countlyPushNotification.helper.getMessageMediaInitialState()
                    }
                },
                platforms: [],
                processed: 0,
                sent: 0,
                total: 0,
                errors: {},
                actioned: {},
                cohorts: [],
                locations: [],
                events: [],
                status: {}
            },
            platformFilter: PlatformEnum.ALL,
            localFilter: "default"
        };
    };

    var detailsActions = {
        fetchById: function(context, id) {
            context.dispatch('onFetchInit', {useLoader: true});
            countlyPushNotification.service.fetchById(id)
                .then(function(response) {
                    var model = countlyPushNotification.mapper.incoming.mapDtoToModel(response);
                    Promise.all(
                        [countlyPushNotification.service.fetchCohorts(model.cohorts, false),
                            countlyPushNotification.service.fetchLocations(model.locations, false)]
                    ).then(function(responses) {
                        model.cohorts = responses[0];
                        model.locations = responses[1];
                        context.commit('setPushNotification', model);
                        context.dispatch('onFetchSuccess', {useLoader: true});
                    }).catch(function(error) {
                        context.dispatch('onFetchError', {error: error, useLoader: true});
                    });
                }).catch(function(error) {
                    context.dispatch('onFetchError', {error: error, useLoader: true});
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
            selectedPushNotificationType: countlyPushNotification.service.TypeEnum.ONE_TIME,
            series: {
                monthly: [{data: [], label: actionsPerformedLabel}, {data: [], label: messagesSentLabel}],
                weekly: [{data: [], label: actionsPerformedLabel}, {data: [], label: messagesSentLabel}]
            },
            rows: [],
            periods: {monthly: [], weekly: []},
            totalAppUsers: 0,
            enabledUsers: enabledUsers,
            totalActions: totalActions,
            totalSent: totalSent,
            statusFilter: countlyPushNotification.service.StatusEnum.ALL,
            platformFilter: countlyPushNotification.service.PlatformEnum.ALL,
            totalPushMessagesSent: 0,
            totalUserActionsPerformed: 0,
        };
    };

    var mainActions = {
        fetchAll: function(context, useLoader) {
            context.dispatch('onFetchInit', {useLoader: useLoader});
            countlyPushNotification.service.fetchAll(context.state.selectedPushNotificationType)
                .then(function(response) {
                    context.commit('setPushNotifications', response);
                    context.dispatch('onFetchSuccess', {useLoader: useLoader});
                }).catch(function(error) {
                    context.dispatch('onFetchError', {error: error, useLoader: useLoader});
                });
        },
        onDelete: function(context, id) {
            context.dispatch('onFetchInit', {useLoader: true});
            countlyPushNotification.service.deleteById(id)
                .then(function() {
                    context.dispatch('fetchAll');
                    context.dispatch('onFetchSuccess', {useLoader: true});
                }).catch(function(error) {
                    context.dispatch('onFetchError', {error: error, useLoader: true});
                });
        },
        // eslint-disable-next-line no-unused-vars
        onDuplicate: function(context, id) {
            //TODO: open create push notification drawer
        },
        // eslint-disable-next-line no-unused-vars
        onResend: function(context, id) {
            //TODO: resend push notification
        },
        onSetPushNotificationType: function(context, value) {
            context.commit('setPushNotificationType', value);
            context.commit('resetPushNotifications');
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
            state.series = countlyPushNotification.helper.getInitialSeriesStateByType(state.selectedPushNotificationType);
            state.rows = [];
            state.periods = countlyPushNotification.helper.getInitialPeriodsStateByType(state.selectedPushNotificationType);
        },
        setPushNotifications: function(state, value) {
            Object.assign(state, value);
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