/*global $, moment, countlyVue, app, countlyLogger, countlyCommon, CV, countlyGlobal */
(function() {
    var isSecondFormat = (Math.round(parseFloat(this.timestamp)) + "").length === 10;

    var formatVersion = function(version, eleminateFirstCharacter) {
        return version ? eleminateFirstCharacter ? version.substring(1).replaceAll(':', '.') : version.replaceAll(':', '.') : '';
    };

    var filterLogs = function(logs, loggerFilter) {
        return loggerFilter && loggerFilter === 'all'
            ? logs
            : logs && logs.length ? logs.filter(function(log) {
                return log.t && Object.keys(log.t).includes(loggerFilter);
            }) : [];
    };

    var ReadableDateComponent = countlyVue.components.BaseComponent.extend({
        props: ['timestamp'],
        computed: {
            date: function() {
                return isSecondFormat ?
                    moment(this.timestamp * 1000).format("MMMM Do YYYY") :
                    moment(this.timestamp).format("MMMM Do YYYY");
            },
            time: function() {
                return isSecondFormat ?
                    moment(this.timestamp * 1000).format("HH:mm:ss") :
                    moment(this.timestamp).format("HH:mm:ss");
            },
            reqId: function() {
                return this.timestamp;
            }
        },
        template: "<div class='bu-is-flex bu-is-align-items-center'><div>{{date}}<p style='color: #81868D; line-height: 16px; margin-top: 4px !important; margin-bottom: 4px !important;'>{{time}}</p><p style='color: #81868D; line-height: 16px; font-size: 12px; margin-top: 4px !important; margin-bottom: 4px !important;'>{{reqId}}</p></div></div>"
    });

    var DetailsComponent = countlyVue.components.BaseComponent.extend({
        props: ['device', 'location', 'version', 'sdk'],
        computed: {
            log: function() {
                var flag = this.location.cc ? this.location.cc.toLowerCase() : '';
                return {
                    id: this.device.id,
                    deviceInfo: (this.device.d && this.device.d !== 'undefined' ? this.device.d : '') + ' (' + (this.device.p || '') + formatVersion(this.device.pv, true) + ')',
                    version: formatVersion(this.version),
                    sdkInfo: this.sdk.name ? this.sdk.name + '' + formatVersion(this.sdk.version) : '',
                    country: this.location.cc,
                    city: this.location.cty && this.location.cty !== 'Unknown' ? ' (' + this.location.cty + ')' : '',
                    flagCss: 'flag ' + flag,
                    flagBg: 'display: inline-block; float: none; box-shadow: none; background-size: contain; background-image: url(images/flags/' + flag + '.png);',
                };
            },
        },
        template: '<div><p class="has-ellipsis" :tooltip="log.deviceInfo">{{log.deviceInfo}} <span class="oval"></span> {{log.version}} <span v-if="log.country" class="oval"></span> <span v-if="log.country" :class="log.flagCss" :style="log.flagBg"></span>{{log.country}}</p><p class="has-ellipsis" :tooltip="log.id">ID {{log.id}}</p><p class="has-ellipsis" :tooltip="log.sdkInfo">{{log.sdkInfo}}</p></div>'
    });

    var InfoComponent = countlyVue.components.BaseComponent.extend({
        props: ['info', 'filter'],
        computed: {
            logInfo: function() {
                if (this.filter === 'all') {
                    return this.info && Object.keys(this.info).length ?
                        Object.keys(this.info).join(', ') : [];
                }
                else {
                    var value = this.info[this.filter];
                    return typeof value === 'string' ? JSON.stringify(JSON.parse(value), null, 2) : JSON.stringify(value, null, 2);
                }
            },
            showCodeBlock: function() {
                return this.filter !== 'all';
            }
        },
        template: "<pre v-if='showCodeBlock'><code style='display:block; white-space:pre-wrap; background-color: #F6F6F6; overflow: scroll !important; max-height: 178px;'>{{logInfo}}</code></pre><pre v-else>{{logInfo}}</pre>"
    });

    var LoggerView = countlyVue.views.BaseView.extend({
        template: '#logger-main-view',
        data: function() {
            return {
                message: 'EVENT LOGGING VIEW',
                switch: true,
                isTablePaused: true,
                logsData: [],
                autoRefresh: false,
                isLoading: false,
                isTurnedOff: false,
                appId: countlyCommon.ACTIVE_APP_ID,
                collectionInfo: '',
                tablePersistKey: 'requestLogsTable_' + countlyCommon.ACTIVE_APP_ID,
                defaultFilters: [{
                    value: 'all',
                    label: this.i18n('logger.all')
                }, {
                    value: 'session',
                    label: this.i18n('logger.session')
                }, {
                    value: 'events',
                    label: this.i18n('logger.event')
                }, {
                    value: 'metrics',
                    label: this.i18n('logger.metric')
                }, {
                    value: 'consent',
                    label: this.i18n('logger.consent')
                }, {
                    value: 'crash',
                    label: this.i18n('logger.crashes')
                }, {
                    value: 'user_details',
                    label: this.i18n('logger.user-details')
                }],
                loggerFilter: 'all'
            };
        },
        computed: {
            filterOptions: function() {
                return this.defaultFilters.concat(this.externalFilters);
            },
            showTurnedOff: function() {
                return this.isTurnedOff;
            }
        },
        mixins: [
            countlyVue.mixins.i18n,
            countlyVue.container.dataMixin({
                'externalFilters': '/manage/logger'
            })
        ],
        methods: {
            getExportQuery: function() {
                /*var projection = {};
                this.$refs.requestLogTable.exportColumns.forEach(function(col) {
                    projection[col] = true;
                });*/
                var apiQueryData = {
                    api_key: countlyGlobal.member.api_key,
                    db: 'countly',
                    collection: 'logs' + countlyCommon.ACTIVE_APP_ID,
                    //query: this.$store.getters["countlyUsers/query"] || "{}",
                    limit: '',
                    skip: 0,
                    //projection: JSON.stringify(projection)
                };
                return apiQueryData;
            },
            getTitleTooltip: function() {
                return this.i18n('logger.description');
            },
            getRefreshTooltip: function() {
                return this.i18n('logger.auto-refresh-help');
            },
            stopAutoRefresh: function() {
                this.autoRefresh = false;
            },
            fetchRequestLogs: function(isRefreshing) {
                var vm = this;

                if (!isRefreshing) {
                    vm.isLoading = true;
                }

                countlyLogger.getRequestLogs()
                    .then(function(data) {
                        vm.isLoading = false;
                        vm.isTurnedOff = data.state === 'off';
                        vm.logsData = filterLogs(data.logs || data, vm.loggerFilter);
                    });
            },
            refresh: function() {
                if (this.autoRefresh) {
                    this.fetchRequestLogs(true);
                }
            },
            filterChange: function() {
                this.fetchRequestLogs();
            }
        },
        filters: {
            pretty: function(value) {
                return typeof value === 'string' ? JSON.stringify(JSON.parse(value), null, 2) : JSON.stringify(value, null, 2);
            }
        },
        components: {
            "logger-readable-date": ReadableDateComponent,
            "logger-details": DetailsComponent,
            "logger-info": InfoComponent,
        },
        mounted: function() {
            var self = this;
            this.fetchRequestLogs();

            countlyLogger.getCollectionInfo()
                .then(function(info) {
                    self.collectionInfo = info
                        ? self.i18n('logger.collection-description', info.max)
                        : self.i18n('logger.capped-remind');
                });
        }
    });

    var logger = new countlyVue.views.BackboneWrapper({
        component: LoggerView,
        templates: [{
            namespace: 'logger',
            mapping: {
                'main-view': '/logger/templates/logger.html',
            }
        }]
    });

    $(document).ready(function() {
        app.logger = logger;

        app.route('/manage/logger', 'logger', function() {
            var params = {};
            this.logger.params = params;
            this.renderWhenReady(this.logger);
        });

        app.addSubMenu("management", { code: "logger", permission: "logger", url: "#/manage/logger", text: "logger.title", priority: 50 });
        if (app.configurationsView) {
            app.configurationsView.registerLabel("logger.state", "logger.state");
            app.configurationsView.registerInput("logger.state", {
                input: "el-select",
                attrs: {},
                list: [
                    { value: 'on', label: CV.i18n("logger.state-on") },
                    { value: 'off', label: CV.i18n("logger.state-off") },
                    { value: 'automatic', label: CV.i18n("logger.state-automatic") }
                ]
            });
            app.configurationsView.registerLabel("logger.limit", "logger.limit");
        }
    });
})();
