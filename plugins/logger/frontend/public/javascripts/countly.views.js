/*global moment, countlyVue, app, countlyLogger, countlyCommon, CV */
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
            formatExportFunction: function() {
                var tableData = this.logsData;
                var table = [];
                for (var i = 0; i < tableData.length; i++) {
                    var item = {};
                    item[CV.i18n('logger.requests').toUpperCase()] = countlyCommon.formatTimeAgoText(tableData[i].reqts).text;
                    if (tableData[i].d && tableData[i].d.p && tableData[i].d.pv) {
                        item[CV.i18n('logger.platform').toUpperCase()] = tableData[i].d.p + "(" + tableData[i].d.pv + ")";
                    }
                    if (tableData[i].v) {
                        item[CV.i18n('logger.version').toUpperCase()] = tableData[i].d.v;
                    }
                    if (tableData[i].d && tableData[i].d.id) {
                        item[CV.i18n('logger.device-id').toUpperCase()] = tableData[i].d.id;
                    }

                    if (tableData[i].l && tableData[i].l.cc && tableData[i].l.cty) {
                        item[CV.i18n('logger.location').toUpperCase()] = tableData[i].l.cc + "(" + tableData[i].l.cty + ")";
                    }

                    if (tableData[i].t && Object.keys(tableData[i].t).length) {
                        item[CV.i18n('logger.info').toUpperCase()] = Object.keys(tableData[i].t).join(', ');
                    }
                    if (tableData[i].q) {
                        try {
                            item[CV.i18n('logger.request-query').toUpperCase()] = JSON.stringify(tableData[i].q);
                        }
                        catch (err) {
                            item[CV.i18n('logger.request-header').toUpperCase()] = "-";
                        }
                    }
                    if (tableData[i].h) {
                        try {
                            var stringifiedHeader = JSON.stringify(tableData[i].h);
                            item["REQUEST HEADER"] = stringifiedHeader.replace(/&quot;/g, '"');
                        }
                        catch (err) {
                            item["REQUEST HEADER"] = "-";
                        }
                    }
                    table.push(item);
                }
                return table;

            },
            getTitleTooltip: function() {
                return this.i18n('logger.description');
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
                if (this.$refs && this.$refs.loggerAutoRefreshToggle && this.$refs.loggerAutoRefreshToggle.autoRefresh) {
                    this.fetchRequestLogs(true);
                }
            },
            filterChange: function() {
                this.fetchRequestLogs();
            },
            handleTableRowClick: function(row) {
                // Only expand row if text inside of it are not highlighted
                if (window.getSelection().toString().length === 0) {
                    this.$refs.requestLogTable.$refs.elTable.toggleRowExpansion(row);
                }
            },
            tableRowClassName: function() {
                return 'bu-is-clickable';
            },
            jsonParser: function(jsonObject) {
                try {
                    return JSON.parse(jsonObject);
                }
                catch (error) {
                    //
                }
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
})();
