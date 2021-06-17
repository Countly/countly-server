/*global countlyVue, CV, countlyCommon, Promise, moment*/
(function(countlyPushNotification) {

    var messagesSentLabel = CV.i18n('push-notification.time-chart-serie-messages-sent');
    var actionsPerformedLabel = CV.i18n('push-notification.time-chart-serie-actions-performed');

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
    };

    countlyPushNotification.helper = {
        getInitialSeriesStateByType: function(type) {
            if (type === countlyPushNotification.service.TypeEnum.ONE_TIME) {
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
            if (type === countlyPushNotification.service.TypeEnum.ONE_TIME) {
                return {
                    periods: {monthly: [], weekly: []},
                };
            }
            return {
                periods: {daily: []},
            };
        }
    };

    countlyPushNotification.service = {
        TypeEnum: {
            ONE_TIME: "oneTime",
            AUTOMATIC: "automatic",
            TRANSACTIONAL: "transactional"
        },
        PeriodEnum: {
            WEEKLY: "weekly",
            MONTHLY: "monthly",
            DAILY: "daily"
        },
        PlatformEnum: {
            ANDROID: "android",
            ALL: "all",
            IOS: "ios"
        },
        StatusEnum: {
            ALL: "all",
            SENT: "sent",
            SENDING: "sending",
            DRAFT: "draft",
            NOT_APPROVED: "notApproved",
            ABORTED: "aborted",
            FAILED: "failed",
            STOPPED: "stopped",
            SCHEDULED: "scheduled"
        },
        mapType: function(type) {
            switch (type) {
            case this.TypeEnum.AUTOMATIC: {
                return {auto: true, tx: false};
            }
            case this.TypeEnum.TRANSACTIONAL: {
                return {auto: false, tx: true};
            }
            default: {
                return { auto: false, tx: false};

            }
            }
        },
        mapStatus: function(status, error) {
            if (StatusFinderHelper.isSending(status)) {
                if (error) {
                    return {value: 'sending-errors', label: CV.i18n('push-notification.status-sending-errors')};
                }
                else {
                    return {value: this.StatusEnum.SENDING, label: CV.i18n('push-notification.status-sending')};
                }
            }
            else if (StatusFinderHelper.isAborted(status)) {
                return {value: this.StatusEnum.ABORTED, label: CV.i18n('push-notification.status-aborted')};
            }
            else if (StatusFinderHelper.isDone(status)) {
                if (error) {
                    return {value: 'sent-errors', label: CV.i18n('push-notification.status-sent-errors')};
                }
                else {
                    return {value: this.StatusEnum.SENT, label: CV.i18n('push-notification.status-sent')};
                }
            }
            else if (StatusFinderHelper.isScheduled(status)) {
                return {value: this.StatusEnum.SCHEDULED, label: CV.i18n('push-notification.status-scheduled')};
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
        mapSeriesDtoToModel: function(dto, type) {
            if (type === this.TypeEnum.ONE_TIME) {
                return {
                    monthly: [{data: dto.actions.monthly.data || [], label: actionsPerformedLabel}, {data: dto.sent.monthly.data || [], label: messagesSentLabel}],
                    weekly: [{data: dto.actions.weekly.data || [], label: actionsPerformedLabel}, {data: dto.sent.weekly.data || [], label: messagesSentLabel}],
                };
            }
            else if (type === this.TypeEnum.AUTOMATIC) {
                return {
                    daily: [{data: dto.actions_automated.daily.data || [], label: actionsPerformedLabel}, {data: dto.sent_automated.daily.data || [], label: messagesSentLabel}]
                };
            }
            else {
                return {
                    daily: [{data: dto.actions_tx.daily.data || [], label: actionsPerformedLabel}, {data: dto.sent_tx.daily.data || [], label: messagesSentLabel}]
                };
            }
        },
        mapPeriods: function(dto, type) {
            if (type === this.TypeEnum.ONE_TIME) {
                return {weekly: dto.actions.weekly.keys, monthly: dto.actions.monthly.keys};
            }
            else if (type === this.TypeEnum.AUTOMATIC) {
                return {weekly: dto.actions_automated.daily.keys};
            }
            else {
                return {weekly: dto.actions_tx.daily.keys};
            }
        },
        mapPlatforms: function(dto) {
            return dto.map(function(platformItem) {
                if (platformItem === 'i') {
                    return CV.i18n("push-notification.platform-ios");
                }
                if (platformItem === 'a') {
                    return CV.i18n("push-notification.platform-android");
                }
            });
        },
        mapRowsDtoToModel: function(dto) {
            var self = this;
            var rowsModel = [];
            dto.aaData.forEach(function(pushNotificationDtoItem, index) {
                rowsModel[index] = {
                    _id: pushNotificationDtoItem._id,
                    name: pushNotificationDtoItem.messagePerLocale["default|t"] || "-",
                    status: self.mapStatus(pushNotificationDtoItem.result.status, pushNotificationDtoItem.result.error),
                    createdDateTime: {
                        date: moment(pushNotificationDtoItem.created).format("MMMM Do YYYY"),
                        time: moment(pushNotificationDtoItem.created).format("h:mm:ss a")
                    },
                    sentDateTime: {
                        date: moment(pushNotificationDtoItem.date).format("MMMM Do YYYY"),
                        time: moment(pushNotificationDtoItem.date).format("h:mm:ss a")
                    },
                    sent: pushNotificationDtoItem.result.sent,
                    actioned: pushNotificationDtoItem.result.actioned,
                    createdBy: pushNotificationDtoItem.creator,
                    platform: self.mapPlatforms(pushNotificationDtoItem.platforms),
                    content: pushNotificationDtoItem.messagePerLocale.default,
                };
            });
            return rowsModel;
        },
        fetchAll: function(type) {
            var self = this;
            return new Promise(function(resolve, reject) {
                Promise.all([self.fetchByType(type), self.fetchDashboard(type)])
                    .then(function(responses) {
                        var rowsModel = self.mapRowsDtoToModel(responses[0]);
                        var seriesModel = self.mapSeriesDtoToModel(responses[1], type);
                        var periods = self.mapPeriods(responses[1], type);
                        var pushNotificationModel = {
                            rows: rowsModel,
                            series: seriesModel,
                            periods: periods,
                            totalAppUsers: responses[1].users,
                            enabledUsers: responses[1].enabled
                        };
                        resolve(pushNotificationModel);
                    }).catch(function(error) {
                        reject(error);
                    });
            });
        },
        fetchByType: function(type) {
            var data = {
                app_id: countlyCommon.ACTIVE_APP_ID,
            };
            Object.assign(data, this.mapType(type));
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    type: "POST",
                    url: countlyCommon.API_PARTS.data.r + "/pushes/all",
                    data: data,
                    dataType: "json"
                }).then(function(response) {
                    resolve(response);
                }).catch(function(error) {
                    reject(error);
                });
            });
        },
        fetchById: function(id) {
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.i + "/pushes/message",
                    data: {
                        args: JSON.stringify({_id: id})
                    },
                    dataType: "json"
                }).then(function(response) {
                    resolve(response);
                }).catch(function(error) {
                    reject(error);
                });
            });
        },
        fetchDashboard: function() {
            var data = {
                app_id: countlyCommon.ACTIVE_APP_ID,
            };
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    type: "GET",
                    url: window.countlyCommon.API_URL + '/i/pushes/dashboard',
                    data: data,
                    dataType: "json"
                }).then(function(response) {
                    resolve(response);
                }).catch(function(error) {
                    reject(error);
                });
            });
        },
        deleteById: function(id) {
            var data = {
                app_id: countlyCommon.ACTIVE_APP_ID,
                _id: id
            };
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    method: 'GET',
                    url: window.countlyCommon.API_URL + '/i/pushes/delete',
                    data: data,
                    dataType: "json"
                }).then(function(response) {
                    resolve(response);
                }).catch(function(error) {
                    reject(error);
                });
            });
        }
    };

    countlyPushNotification.getVuexModule = function() {

        var getInitialState = function() {
            return {
                selectedPushNotificationType: countlyPushNotification.service.TypeEnum.ONE_TIME,
                pushNotifications: {
                    series: {
                        monthly: [{data: [], label: actionsPerformedLabel}, {data: [], label: messagesSentLabel}],
                        weekly: [{data: [], label: actionsPerformedLabel}, {data: [], label: messagesSentLabel}]
                    },
                    rows: [],
                    periods: {monthly: [], weekly: []},
                    totalAppUsers: null,
                    enabledUsers: null
                },
                statusFilter: countlyPushNotification.service.StatusEnum.ALL,
                platformFilter: countlyPushNotification.service.PlatformEnum.ALL,
                isLoading: false,
                hasError: false,
                error: null,
                totalPushMessagesSent: null,
                totalUserActionsPerformed: null,
            };
        };

        var pushNotificationActions = {
            fetchAll: function(context) {
                context.dispatch('onFetchInit');
                countlyPushNotification.service.fetchAll(context.state.selectedPushNotificationType)
                    .then(function(response) {
                        context.commit('setPushNotifications', response);
                        context.dispatch('onFetchSuccess');
                    }).catch(function(error) {
                        context.dispatch('onFetchError', error);
                    });
            },
            onDeletePushNotification: function(context, id) {
                context.dispatch('onFetchInit');
                countlyPushNotification.service.deleteById(id)
                    .then(function() {
                        context.dispatch('fetchAll');
                    }).catch(function() {
                        //TODO:dispatch notification toast with error message
                    });
            },
            // eslint-disable-next-line no-unused-vars
            onDuplicatePushNotification: function(context, id) {
                //TODO: open create push notification drawer
            },
            // eslint-disable-next-line no-unused-vars
            onResendPushNotification: function(context, id) {
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
            onFetchInit: function(context) {
                context.commit('setFetchInit');
            },
            onFetchError: function(context, error) {
                context.commit('setFetchError', error);
            },
            onFetchSuccess: function(context) {
                context.commit('setFetchSuccess');
            },
        };

        var pushNotificationMutations = {
            setPushNotificationType: function(state, value) {
                state.selectedPushNotificationType = value;
            },
            resetPushNotifications: function(state) {
                state.pushNotifications = {
                    series: countlyPushNotification.helper.getInitialSeriesStateByType(state.selectedPushNotificationType),
                    rows: [],
                    periods: countlyPushNotification.helper.getInitialPeriodsStateByType(state.selectedPushNotificationType),
                };
            },
            setPushNotifications: function(state, value) {
                state.pushNotifications = value;
            },
            setStatusFilter: function(state, value) {
                state.statusFilter = value;
            },
            setPlatformFilter: function(state, value) {
                state.platformFilter = value;
            },
            setFetchInit: function(state) {
                state.isLoading = true;
                state.hasError = false;
                state.error = null;
            },
            setFetchError: function(state, error) {
                state.isLoading = false;
                state.hasError = true;
                state.error = error;
            },
            setFetchSuccess: function(state) {
                state.isLoading = false;
                state.hasError = false;
                state.error = null;
            }
        };

        return countlyVue.vuex.Module("countlyPushNotification", {
            state: getInitialState,
            actions: pushNotificationActions,
            mutations: pushNotificationMutations
        });
    };

}(window.countlyPushNotification = window.countlyPushNotification || {}));