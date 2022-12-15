/*global countlyCommon,CV,countlyVue,countlyEvent,moment */
(function(countlyTimesOfDay) {

    countlyTimesOfDay.service = {
        HOURS: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
        WEEK_DAYS: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
        DateBucketEnum: {
            PREV_MONTH: "previous",
            THIS_MONTH: "current",
            LAST_THREE_MONTHS: "last_3",
            ALL_TIME: 'all',
        },
        findEventKeyByName: function(name) {
            return countlyEvent.getEvents().find(function(item) {
                return item.name === name;
            });
        },
        getEventOptions: function() {
            return countlyEvent.getEvents().map(function(event) {
                return {label: event.name, value: event.key};
            });
        },
        getDateBucketsList: function() {
            var self = this;
            return [
                {label: CV.i18n('times-of-day.previous-month'), value: self.DateBucketEnum.PREV_MONTH},
                {label: CV.i18n('times-of-day.this-month'), value: self.DateBucketEnum.THIS_MONTH},
                {label: CV.i18n('times-of-day.last-three-months'), value: self.DateBucketEnum.LAST_THREE_MONTHS},
                {label: CV.i18n('times-of-day.all-time'), value: self.DateBucketEnum.ALL_TIME}
            ];
        },
        getHoursPeriod: function(hour) {
            var nextHour = hour + 1;
            if (hour < 10) {
                if (nextHour < 10) {
                    return "0" + hour.toString() + ":00-" + "0" + nextHour.toString() + ":00";
                }
                return "0" + hour.toString() + ":00-" + nextHour.toString() + ":00";
            }
            if (hour === 23) {
                return hour.toString() + ":00-" + "00:00";
            }
            return hour.toString() + ":00-" + nextHour.toString() + ":00";
        },
        mapRows: function(weekArray) {
            var self = this;
            var rows = [];
            this.HOURS.forEach(function(hour) {
                var hoursPeriod = self.getHoursPeriod(hour);
                var row = {
                    period: hoursPeriod
                };
                self.WEEK_DAYS.forEach(function(day, dayIndex) {
                    row[day] = weekArray[dayIndex][hour];
                });
                rows.push(row);
            });
            return rows;
        },
        mapSeries: function(weekArray) {
            if (!weekArray.length) {
                return [];
            }
            var self = this;
            var series = [];
            this.WEEK_DAYS.forEach(function(_, dayIndex) {
                self.HOURS.forEach(function(hour) {
                    series.push([hour, dayIndex, weekArray[dayIndex][hour]]);
                });
            });
            return series;
        },
        findMaxSeriesValue: function(dto) {
            var maxValue = 0;
            dto.forEach(function(weekDaySerieItem) {
                weekDaySerieItem.forEach(function(hourSerieValue) {
                    if (maxValue < hourSerieValue) {
                        maxValue = hourSerieValue;
                    }
                });
            });
            return maxValue;
        },
        mapTimesOfDayDtoToModel: function(dto) {
            return {
                rows: this.mapRows(dto),
                series: this.mapSeries(dto),
                maxSeriesValue: this.findMaxSeriesValue(dto)
            };
        },
        getDateFromDateBucketValue: function(value) {
            var year = moment().year();
            var currentMonth = moment().month() + 1;
            if (value === this.DateBucketEnum.PREV_MONTH) {
                return year + ":" + (currentMonth - 1);
            }
            if (value === this.DateBucketEnum.THIS_MONTH) {
                return year + ":" + currentMonth;
            }
            if (value === this.DateBucketEnum.LAST_THREE_MONTHS) {
                return [year + ":" + currentMonth, year + ":" + (currentMonth - 1), year + ":" + (currentMonth - 2)].join(',');
            }
            if (value === this.DateBucketEnum.ALL_TIME) {
                return null;
            }
        },
        fetchAll: function(filters) {
            var self = this;
            var data = {
                app_id: countlyCommon.ACTIVE_APP_ID,
                method: 'times-of-day',
            };
            var dateString = this.getDateFromDateBucketValue(filters.dateBucketValue);
            if (filters.dateBucketValue && dateString) {
                data.date_range = dateString;
            }
            if (filters.dataType) {
                data.tod_type = filters.dataType;
            }
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_URL + "/o",
                    data: data
                }, {disableAutoCatch: true})
                    .then(function(responseDto) {
                        resolve(self.mapTimesOfDayDtoToModel(responseDto));
                    }).catch(function(error) {
                        reject(error);
                    });
            });
        }
    };

    countlyTimesOfDay.getVuexModule = function() {

        var getInitialState = function() {
            return {
                rows: [],
                series: [],
                filters: {
                    dateBucketValue: countlyTimesOfDay.service.DateBucketEnum.ALL_TIME,
                    dataType: '[CLY]_session'
                },
                maxSeriesValue: 0,
            };
        };

        var countlyTimesOfDayActions = {
            fetchAll: function(context, useLoader) {
                context.dispatch('onFetchInit', {useLoader: useLoader});
                countlyTimesOfDay.service.fetchAll(context.state.filters)
                    .then(function(response) {
                        context.commit('setTimesOfDay', response);
                        context.dispatch('onFetchSuccess', {useLoader: useLoader});
                    }).catch(function(error) {
                        context.dispatch('onFetchError', {error: error, useLoader: useLoader});
                    });
            },
            setFilters: function(context, filters) {
                context.commit('setFilters', filters);
            }
        };

        var countlyTimesOfDayMutations = {
            setTimesOfDay: function(state, value) {
                state.rows = value.rows;
                state.series = value.series;
                state.maxSeriesValue = value.maxSeriesValue;
            },
            setFilters: function(state, value) {
                state.filters = value;
            }
        };

        return countlyVue.vuex.Module("countlyTimesOfDay", {
            state: getInitialState,
            actions: countlyTimesOfDayActions,
            mutations: countlyTimesOfDayMutations,
            submodules: [countlyVue.vuex.FetchMixin()]
        });
    };

}(window.countlyTimesOfDay = window.countlyTimesOfDay || {}));