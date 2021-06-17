/*global $, moment, countlyVue, app, countlyLogger */
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
        },
        template: "<div>{{date}}<p class='text-small'>{{time}}</p></div>"
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
                    flagBg: 'margin-top:2px; margin-right:6px; background-image: url(images/flags/' + flag + '.png);'
                };
            },
        },
        template: '<div><p>{{log.deviceInfo}} <pre class="oval"></pre> {{log.version}}</p><p class="text-small">ID {{log.id}}</p>{{log.sdkInfo}}<span :class="log.flagCss" :style="log.flagBg"></span><span class="oval"></span>{{log.country}}{{log.city}}</div>'
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
        },
        template: "<pre>{{logInfo}}</pre>"
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
                collectionInfo: '',
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
            }
        },
        mixins: [
            countlyVue.mixins.i18n,
            countlyVue.container.dataMixin({
                'externalFilters': '/manage/logger'
            })
        ],
        methods: {
            getTitleTooltip: function() {
                return this.i18n('logger.description');
            },
            getRefreshTooltip: function() {
                return this.i18n('logger.auto-refresh-help');
            },
            stopAutoRefresh: function() {
                this.autoRefresh = false;
            },
            fetchRequestLogs: function() {
                var vm = this;
                countlyLogger.getRequestLogs()
                    .then(function(data) {
                        vm.logsData = filterLogs(data.logs || data, vm.loggerFilter);
                    });
            },
            refresh: function() {
                if (this.autoRefresh) {
                    this.fetchRequestLogs();
                }
            },
            sync: function() {
                this.fetchRequestLogs();
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

        app.addSubMenu("management", { code: "logger", url: "#/manage/logger", text: "logger.title", priority: 60 });
    });
})();
