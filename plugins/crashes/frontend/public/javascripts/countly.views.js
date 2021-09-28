/* eslint-disable no-unreachable */
/* globals app, countlyDrillMeta, countlyQueryBuilder, CountlyHelpers, countlyCrashSymbols, Promise, countlyCommon, countlyGlobal, countlyCrashes, countlyVue, moment, hljs, jQuery, countlyDeviceList, CV */

(function() {
    var groupId, crashId;

    var CrashStatisticsTabLabelView = countlyVue.views.create({
        props: {
            title: {type: String},
            tooltip: {type: String},
            data: {type: Object},
            negateTrend: {type: Boolean, default: false}
        },
        computed: {
            colorClass: function() {
                if (typeof this.$props.data !== "undefined" && this.$props.data.trend === "n") {
                    return "neutral";
                }
                else {
                    return (typeof this.$props.data !== "undefined" && (this.$props.negateTrend ^ this.$props.data.trend === "u") ? "up" : "down");
                }
            },
            iconClass: function() {
                if (typeof this.$props.data !== "undefined" && this.$props.data.trend === "n") {
                    return "minus-round";
                }
                else {
                    return ((typeof this.$props.data !== "undefined" && this.$props.data.trend === "u") ? "arrow-up-c" : "arrow-down-c");
                }

            }
        },
        template: countlyVue.T("/crashes/templates/tab-label.html")
    });

    var CrashBadgeView = countlyVue.views.create({
        props: {
            type: {type: String, default: "info"},
        },
        template: '<span class="bu-tag text-uppercase crash-badge" :class="\'crash-badge--\' + $props.type"><slot></slot></span>'
    });

    var CrashOverviewView = countlyVue.views.create({
        template: "#crashes-overview",
        components: {"crash-tab-label": CrashStatisticsTabLabelView, "crash-badge": CrashBadgeView},
        data: function() {
            var filterProperties = [
                new countlyQueryBuilder.Property({
                    id: "nonfatal",
                    name: "Fatality",
                    type: countlyQueryBuilder.PropertyType.LIST,
                    group: "Main",
                    getValueList: function() {
                        return [
                            {name: "Fatal", value: false},
                            {name: "Non-fatal", value: true}
                        ];
                    }
                }),
                new countlyQueryBuilder.Property({
                    id: "is_hidden",
                    name: "Visibility",
                    type: countlyQueryBuilder.PropertyType.LIST,
                    group: "Main",
                    getValueList: function() {
                        return [
                            {name: "Hidden", value: true},
                            {name: "Shown", value: false}
                        ];
                    }
                }),
                new countlyQueryBuilder.Property({
                    id: "is_new",
                    name: "Viewed",
                    type: countlyQueryBuilder.PropertyType.LIST,
                    group: "Main",
                    getValueList: function() {
                        return [
                            {name: jQuery.i18n.prop("drill.opr.is-set-true"), value: false},
                            {name: jQuery.i18n.prop("drill.opr.is-set-false"), value: true}
                        ];
                    }
                }),
                new countlyQueryBuilder.Property({
                    id: "is_renewed",
                    name: "Reoccured",
                    type: countlyQueryBuilder.PropertyType.LIST,
                    group: "Main",
                    getValueList: function() {
                        return [
                            {name: jQuery.i18n.prop("drill.opr.is-set-true"), value: true},
                            {name: jQuery.i18n.prop("drill.opr.is-set-false"), value: false}
                        ];
                    }
                }),
                new countlyQueryBuilder.Property({
                    id: "is_resolved",
                    name: "Resolved",
                    type: countlyQueryBuilder.PropertyType.LIST,
                    group: "Main",
                    getValueList: function() {
                        return [
                            {name: jQuery.i18n.prop("drill.opr.is-set-true"), value: true},
                            {name: jQuery.i18n.prop("drill.opr.is-set-false"), value: false}
                        ];
                    }
                }),
                new countlyQueryBuilder.Property({
                    id: "is_resolving",
                    name: "Resolving",
                    type: countlyQueryBuilder.PropertyType.LIST,
                    group: "Main",
                    getValueList: function() {
                        return [
                            {name: jQuery.i18n.prop("drill.opr.is-set-true"), value: true},
                            {name: jQuery.i18n.prop("drill.opr.is-set-false"), value: false}
                        ];
                    }
                }),
                new countlyQueryBuilder.Property({
                    id: "error",
                    name: "Crash",
                    type: countlyQueryBuilder.PropertyType.STRING,
                    group: "Detail",
                }),
                new countlyQueryBuilder.Property({
                    id: "users",
                    name: "Affected Users",
                    type: countlyQueryBuilder.PropertyType.NUMBER,
                    group: "Detail",
                }),
                new countlyQueryBuilder.Property({
                    id: "reports",
                    name: "Occurances",
                    type: countlyQueryBuilder.PropertyType.NUMBER,
                    group: "Detail",
                }),
                new countlyQueryBuilder.Property({
                    id: "device",
                    name: "Device",
                    type: countlyQueryBuilder.PropertyType.STRING,
                    group: "Detail",
                }),
                new countlyQueryBuilder.Property({
                    id: "resolution",
                    name: "Resolution",
                    type: countlyQueryBuilder.PropertyType.STRING,
                    group: "Detail",
                }),
                new countlyQueryBuilder.Property({
                    id: "startTs",
                    name: "First Seen On",
                    type: countlyQueryBuilder.PropertyType.DATE,
                    group: "Detail",
                }),
                new countlyQueryBuilder.Property({
                    id: "lastTs",
                    name: "Last Seen On",
                    type: countlyQueryBuilder.PropertyType.DATE,
                    group: "Detail",
                }),
                new countlyQueryBuilder.Property({
                    id: "background",
                    name: "Background",
                    type: countlyQueryBuilder.PropertyType.LIST,
                    group: "Detail",
                    getValueList: function() {
                        return [
                            {name: jQuery.i18n.prop("drill.opr.is-set-true"), value: "yes"},
                            {name: jQuery.i18n.prop("drill.opr.is-set-false"), value: "no"}
                        ];
                    }
                }),
                new countlyQueryBuilder.Property({
                    id: "online",
                    name: "Online",
                    type: countlyQueryBuilder.PropertyType.LIST,
                    group: "Detail",
                    getValueList: function() {
                        return [
                            {name: jQuery.i18n.prop("drill.opr.is-set-true"), value: "yes"},
                            {name: jQuery.i18n.prop("drill.opr.is-set-false"), value: "no"}
                        ];
                    }
                }),
                new countlyQueryBuilder.Property({
                    id: "root",
                    name: "Rooted",
                    type: countlyQueryBuilder.PropertyType.LIST,
                    group: "Detail",
                    getValueList: function() {
                        return [
                            {name: jQuery.i18n.prop("drill.opr.is-set-true"), value: "yes"},
                            {name: jQuery.i18n.prop("drill.opr.is-set-false"), value: "no"}
                        ];
                    }
                }),
                new countlyQueryBuilder.Property({
                    id: "signal",
                    name: "Signal",
                    type: countlyQueryBuilder.PropertyType.LIST,
                    group: "Detail",
                    getValueList: function() {
                        return [
                            {name: jQuery.i18n.prop("drill.opr.is-set-true"), value: "yes"},
                            {name: jQuery.i18n.prop("drill.opr.is-set-false"), value: "no"}
                        ];
                    }
                }),
                new countlyQueryBuilder.Property({
                    id: "muted",
                    name: "Muted",
                    type: countlyQueryBuilder.PropertyType.LIST,
                    group: "Detail",
                    getValueList: function() {
                        return [
                            {name: jQuery.i18n.prop("drill.opr.is-set-true"), value: "yes"},
                            {name: jQuery.i18n.prop("drill.opr.is-set-false"), value: "no"}
                        ];
                    }
                }),
                new countlyQueryBuilder.Property({
                    id: "os_version",
                    name: "Platform Version",
                    type: countlyQueryBuilder.PropertyType.STRING,
                    group: "Detail",
                }),
                new countlyQueryBuilder.Property({
                    id: "bat.max",
                    name: "Battery Max",
                    type: countlyQueryBuilder.PropertyType.NUMBER,
                    group: "Detail",
                }),
                new countlyQueryBuilder.Property({
                    id: "bat.min",
                    name: "Battery Min",
                    type: countlyQueryBuilder.PropertyType.NUMBER,
                    group: "Detail",
                }),
                new countlyQueryBuilder.Property({
                    id: "disk.max",
                    name: "Disk Max",
                    type: countlyQueryBuilder.PropertyType.NUMBER,
                    group: "Detail",
                }),
                new countlyQueryBuilder.Property({
                    id: "disk.min",
                    name: "Disk Min",
                    type: countlyQueryBuilder.PropertyType.NUMBER,
                    group: "Detail",
                }),
                new countlyQueryBuilder.Property({
                    id: "ram.max",
                    name: "RAM Max",
                    type: countlyQueryBuilder.PropertyType.NUMBER,
                    group: "Detail",
                }),
                new countlyQueryBuilder.Property({
                    id: "ram.min",
                    name: "RAM Min",
                    type: countlyQueryBuilder.PropertyType.NUMBER,
                    group: "Detail",
                }),
                new countlyQueryBuilder.Property({
                    id: "run.max",
                    name: "Running Max",
                    type: countlyQueryBuilder.PropertyType.NUMBER,
                    group: "Detail",
                }),
                new countlyQueryBuilder.Property({
                    id: "run.min",
                    name: "Running Min",
                    type: countlyQueryBuilder.PropertyType.NUMBER,
                    group: "Detail",
                }),
            ];

            if (typeof countlyDrillMeta !== "undefined") {
                var crashMeta = countlyDrillMeta.getContext("[CLY]_crash");
                var getFilterValues = function(segmentationKey) {
                    return function() {
                        return crashMeta.getFilterValues("sg." + segmentationKey).map(function(value) {
                            var name = (segmentationKey === "orientation") ? jQuery.i18n.prop("crashes.filter." + segmentationKey + "." + value) : value;
                            return {name: name, value: value};
                        });
                    };
                };

                crashMeta.initialize().then(function() {
                    filterProperties.push({
                        id: "app_version",
                        name: "App Version",
                        type: countlyQueryBuilder.PropertyType.LIST,
                        group: "Detail",
                        getValueList: getFilterValues("app_version")
                    });
                    filterProperties.push({
                        id: "opengl",
                        name: "OpenGL Version",
                        type: countlyQueryBuilder.PropertyType.LIST,
                        group: "Detail",
                        getValueList: getFilterValues("opengl")
                    });
                    filterProperties.push({
                        id: "orientation",
                        name: "Orientation",
                        type: countlyQueryBuilder.PropertyType.LIST,
                        group: "Detail",
                        getValueList: getFilterValues("orientation")
                    });
                    filterProperties.push({
                        id: "os",
                        name: "Platform",
                        type: countlyQueryBuilder.PropertyType.LIST,
                        group: "Detail",
                        getValueList: getFilterValues("os")
                    });
                    filterProperties.push({
                        id: "cpu",
                        name: "CPU",
                        type: countlyQueryBuilder.PropertyType.LIST,
                        group: "Detail",
                        getValueList: getFilterValues("cpu")
                    });
                });
            }

            return {
                appId: countlyCommon.ACTIVE_APP_ID,
                currentTab: (this.$route.params && this.$route.params.tab) || "crash-groups",
                statisticsGraphTab: "total-occurances",
                selectedCrashgroups: [],
                formatDate: function(row, col, cell) {
                    return moment(cell * 1000).format("lll");
                },
                crashgroupsFilterProperties: filterProperties,
                crashgroupsFilterRules: [
                    new countlyQueryBuilder.RowRule({
                        name: "cly.crashes.no-math-ineq-for-strings",
                        selector: function(row) {
                            return row.property.type === countlyQueryBuilder.PropertyType.STRING;
                        },
                        actions: [new countlyQueryBuilder.RowAction({
                            id: "disallowOperator",
                            params: {
                                selector: function(operator) {
                                    return ["cly.>", "cly.>=", "cly.<", "cly.<="].includes(operator.id);
                                }
                            }
                        })]
                    }),
                    new countlyQueryBuilder.RowRule({
                        name: "cly.crashes.no-isset",
                        selector: function() {
                            return true;
                        },
                        actions: [new countlyQueryBuilder.RowAction({
                            id: "disallowOperator",
                            params: {
                                selector: function(operator) {
                                    return operator.id === "cly.isset";
                                }
                            }
                        })]
                    }),
                    new countlyQueryBuilder.RowRule({
                        name: "cly.crashes.no-regex",
                        selector: function(row) {
                            return row.property && row.property.id !== "error";
                        },
                        actions: [new countlyQueryBuilder.RowAction({
                            id: "disallowOperator",
                            params: {
                                selector: function(operator) {
                                    return operator.meta.regex;
                                }
                            }
                        })]
                    }),
                    new countlyQueryBuilder.RowRule({
                        name: "cly.crashes.single-val",
                        selector: function(row) {
                            return row.property && row.property.type === countlyQueryBuilder.PropertyType.LIST && row.property.getValueList && row.property.getValueList().length <= 2;
                        },
                        actions: [new countlyQueryBuilder.RowAction({
                            id: "overrideValueStrategy",
                            params: {
                                strategy: new countlyQueryBuilder.ValueStrategy({
                                    type: countlyQueryBuilder.ValueType.PREDEF,
                                    getValueList: function(row) {
                                        return row.property.getValueList();
                                    }
                                }),
                            }
                        })]
                    }),
                ]
            };
        },
        computed: {
            crashgroupsFilter: {
                set: function(newValue) {
                    return this.$store.dispatch("countlyCrashes/overview/setCrashgroupsFilter", newValue);
                },
                get: function() {
                    return this.$store.getters["countlyCrashes/overview/crashgroupsFilter"];
                }
            },
            activeFilter: {
                set: function(newValue) {
                    return this.$store.dispatch("countlyCrashes/overview/setActiveFilter", newValue);
                },
                get: function() {
                    return this.$store.getters["countlyCrashes/overview/activeFilter"];
                }
            },
            activeFilterFields: function() {
                var platforms = [{value: "all", label: "All Platforms"}];
                this.$store.getters["countlyCrashes/overview/platforms"].forEach(function(platform) {
                    platforms.push({value: platform, label: platform});
                });

                var appVersions = [{value: "all", label: "All Versions"}];
                this.$store.getters["countlyCrashes/overview/appVersions"].forEach(function(appVersion) {
                    appVersions.push({value: appVersion, label: appVersion.replace(/:/g, ".")});
                });

                return [
                    {
                        label: "Fatality",
                        key: "fatality",
                        items: [{value: "both", label: "Both"}, {value: "fatal", label: "Fatal"}, {value: "nonfatal", label: "Nonfatal"}],
                        default: "both"
                    },
                    {
                        label: "Platforms",
                        key: "platform",
                        options: platforms,
                        default: "all"
                    },
                    {
                        label: "Versions",
                        key: "version",
                        items: appVersions,
                        default: "all"
                    },
                ];
            },
            dashboardData: function() {
                return this.$store.getters["countlyCrashes/overview/dashboardData"];
            },
            chartData: function() {
                return function(metric, name) {
                    return this.$store.getters["countlyCrashes/overview/chartData"](metric, name);
                };
            },
            statistics: function() {
                return this.$store.getters["countlyCrashes/overview/statistics"];
            },
            crashgroupRows: function() {
                return this.$store.getters["countlyCrashes/overview/crashgroupRows"];
            }
        },
        methods: {
            refresh: function() {
                return this.$store.dispatch("countlyCrashes/overview/refresh");
            },
            handleRowClick: function(row) {
                window.location.href = window.location.href + "/" + row._id;
            },
            handleSelectionChange: function(selectedRows) {
                this.$data.selectedCrashgroups = selectedRows.map(function(row) {
                    return row._id;
                });
            },
            badgesFor: function(crash) {
                return countlyCrashes.generateBadges(crash);
            }
        },
        beforeCreate: function() {
            return this.$store.dispatch("countlyCrashes/overview/refresh");
        }
    });

    var getOverviewView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: CrashOverviewView,
            vuex: [{clyModel: countlyCrashes}],
            templates: [
                {
                    namespace: "crashes",
                    mapping: {
                        overview: "crashes/templates/overview.html"
                    }
                },
                "/drill/templates/query.builder.v2.html",
            ]
        });
    };

    var CrashStacktraceView = countlyVue.views.create({
        props: {
            code: {type: String, required: true}
        },
        computed: {
            hasHeaderLeft: function() {
                return !!(this.$scopedSlots["header-left"] || this.$slots["header-left"]);
            },
            hasHeaderRight: function() {
                return !!(this.$scopedSlots["header-right"] || this.$slots["header-right"]);
            },
            lineNumbers: function() {
                return Array.apply(null, Array((this.code.match(/\n/g) || []).length + 1)).map(function(_, i) {
                    return i + 1;
                }).join("\n");
            },
            highlightedCode: function() {
                return hljs.highlightAuto(jQuery("<div/>").html(this.code).text()).value;
            }
        },
        template: countlyVue.T("/crashes/templates/stacktrace.html")
    });

    var CrashgroupView = countlyVue.views.create({
        template: "#crashes-crashgroup",
        components: {"crash-stacktrace": CrashStacktraceView, "crash-badge": CrashBadgeView},
        data: function() {
            return {
                appId: countlyCommon.ACTIVE_APP_ID,
                authToken: countlyGlobal.auth_token,
                chartBy: "os_version",
                diagnosticsOrder: ["ram", "disk", "battery", "running", "sessions"],
                eventLogsEnabled: countlyGlobal.plugins.includes("crashes-event-logs"),
                eventLogsBeingGenerated: [],
                currentTab: "stacktrace",
                commentInput: "",
                commentBeingEdited: undefined,
                commentStatus: undefined,
                symbolicationEnabled: countlyGlobal.plugins.includes("crash_symbolication"),
                crashesBeingSymbolicated: [],
                beingMarked: false,
                userProfilesEnabled: countlyGlobal.plugins.includes("users"),
                jiraIntegrationEnabled: countlyGlobal.plugins.includes("crashes-jira")
            };
        },
        computed: {
            crashgroup: function() {
                return this.$store.getters["countlyCrashes/crashgroup/crashgroup"];
            },
            crashgroupName: function() {
                return this.$store.getters["countlyCrashes/crashgroup/crashgroupName"];
            },
            comments: function() {
                return ("comments" in this.crashgroup) ? this.crashgroup.comments : [];
            },
            commonMetrics: function() {
                return this.$store.getters["countlyCrashes/crashgroup/commonMetrics"];
            },
            mobileDiagnostics: function() {
                return this.$store.getters["countlyCrashes/crashgroup/mobileDiagnostics"];
            },
            mobileMetrics: function() {
                return this.$store.getters["countlyCrashes/crashgroup/mobileMetrics"];
            },
            chartData: function() {
                return this.$store.getters["countlyCrashes/crashgroup/chartData"](this.$data.chartBy);
            },
            chartByOptions: function() {
                return this.$store.getters["countlyCrashes/crashgroup/chartByOptions"];
            },
            crashes: function() {
                return this.$store.getters["countlyCrashes/crashgroup/crashes"];
            },
            badges: function() {
                return countlyCrashes.generateBadges(this.$store.getters["countlyCrashes/crashgroup/crashgroup"]);
            }
        },
        methods: {
            refresh: function() {
                return this.$store.dispatch("countlyCrashes/crashgroup/refresh");
            },
            handleCommentCommand: function(command, comment) {
                if (command === "edit-comment") {
                    this.$data.commentInput = comment.text;
                    this.$data.commentBeingEdited = comment;
                }
                else if (command === "delete-comment") {
                    this.$store.dispatch("countlyCrashes/crashgroup/deleteComment", comment._id);
                }
            },
            stopEditingComment: function() {
                this.$data.commentInput = "";
                this.$data.commentBeingEdited = undefined;
            },
            saveComment: function() {
                var self = this;
                if (typeof this.$data.commentBeingEdited !== "undefined") {
                    this.$store.dispatch("countlyCrashes/crashgroup/editComment", {comment_id: this.$data.commentBeingEdited._id, text: this.$data.commentInput})
                        .then(function() {
                            self.$data.commentBeingEdited = undefined;
                            self.$data.commentInput = "";
                        });
                }
                else {
                    this.$store.dispatch("countlyCrashes/crashgroup/addComment", this.$data.commentInput)
                        .then(function() {
                            self.$data.commentInput = "";
                        });
                }
            },
            handleRowClick: function(row) {
                this.$refs.tableData.$refs.elTable.toggleRowExpansion(row);
            },
            generateEventLogs: function(cid) {
                var self = this;
                if (this.$data.eventLogsEnabled) {
                    if (!this.$data.eventLogsBeingGenerated.includes(cid)) {
                        this.$data.eventLogsBeingGenerated.push(cid);
                        this.$store.dispatch("countlyCrashes/crashgroup/generateEventLogs", [cid])
                            .then(function() {
                                self.$forceUpdate();
                            })
                            .finally(function() {
                                self.$data.eventLogsBeingGenerated = self.$data.eventLogsBeingGenerated.filter(function(ecid) {
                                    return cid !== ecid;
                                });
                            });
                    }
                }
            },
            isEventLogBeingGeneratedFor: function(cid) {
                return this.$data.eventLogsBeingGenerated.includes(cid);
            },
            symbolicateCrash: function(crash) {
                var self = this;

                if (!this.symbolicationEnabled) {
                    return;
                }

                if (crash === "group") {
                    crash = {
                        _id: this.crashgroup.lrid,
                        os: this.crashgroup.os,
                        native_cpp: this.crashgroup.native_cpp,
                        app_version: this.crashgroup.latest_version
                    };
                }

                if (this.crashesBeingSymbolicated.indexOf(crash._id) === -1) {
                    this.crashesBeingSymbolicated.push(crash._id);
                    this.$store.dispatch("countlyCrashes/crashgroup/symbolicate", crash)
                        .then(function() {
                            self.refresh();
                        })
                        .finally(function() {
                            self.crashesBeingSymbolicated = self.crashesBeingSymbolicated.filter(function(cid) {
                                return cid !== crash._id;
                            });
                        });
                }
            },
            isCrashBeingSymbolicated: function(cid) {
                return this.crashesBeingSymbolicated.indexOf(cid) !== -1;
            },
            crashMetric: function(crash, metric) {
                var crashMetrics;

                if (metric === "build_info") {
                    crashMetrics = "App Version: " + crash.app_version;
                    if (crash.os === "iOS") {
                        crashMetrics += "\nApp Build ID: " + crash.app_build;
                    }
                }
                else if (metric === "device") {
                    crashMetrics = crash.os;
                    if (crash.os_version) {
                        crashMetrics += " " + crash.os_version;
                    }

                    if (crash.manufacture) {
                        crashMetrics += "\n" + crash.manufacture + " ";
                    }
                    else {
                        crashMetrics += "\n";
                    }

                    if (crash.device) {
                        crashMetrics += countlyDeviceList[crash.device] || crash.device;
                    }

                    if (crash.cpu) {
                        crashMetrics += " (" + crash.cpu + ")";
                    }

                    if (crash.opengl) {
                        crashMetrics += "\nOpenGL Version: " + crash.opengl;
                    }

                    if (crash.resolution) {
                        crashMetrics += "\nResolution: " + crash.resolution;
                    }

                    if ("root" in crash) {
                        crashMetrics += "\nRooted / Jailbroken: " + (crash.root ? "yes" : "no");
                    }
                }
                else if (metric === "device_state") {
                    crashMetrics = "";

                    if ("ram_current" in crash) {
                        crashMetrics = "RAM: " + crash.ram_current + "/" + crash.ram_total + " MB\n";
                    }

                    if ("disk_current" in crash) {
                        crashMetrics += "Disk: " + crash.disk_current + "/" + crash.disk_total + " MB\n";
                    }

                    if ("bat_current" in crash) {
                        crashMetrics += "Battery: " + crash.bat_current + "%\n";
                    }

                    if ("run" in crash) {
                        crashMetrics += "Run time: " + countlyCommon.timeString(crash.run / 60) + "\n";
                    }

                    if ("session" in crash) {
                        crashMetrics += "Sessions: " + crash.session + "\n";
                    }

                    crashMetrics += "Online: " + (crash.online ? "yes" : "no") + "\n";
                    crashMetrics += "Background: " + (crash.background ? "yes" : "no") + "\n";
                    crashMetrics += "Muted: " + (crash.muted ? "yes" : "no");
                }
                else if (metric === "custom") {
                    crashMetrics = Object.keys(crash.custom).map(function(customKey) {
                        return customKey + ": " + crash.custom[customKey];
                    }).join("\n");
                }

                return crashMetrics;
            },
            crashEventLog: function(cid) {
                return this.$store.getters["countlyCrashes/crashgroup/crashEventLog"](cid);
            },
            commentIsMine: function(comment) {
                return comment.author_id === countlyGlobal.member._id || countlyGlobal.member.global_admin;
            },
            markAs: function(state) {
                var self = this;
                var ajaxPromise;

                this.$refs.markDropdown.doClose();

                if (this.beingMarked) {
                    return;
                }

                if (state === "resolved") {
                    this.beingMarked = true;
                    ajaxPromise = this.$store.dispatch("countlyCrashes/crashgroup/markResolved");
                }
                else if (state === "resolving") {
                    this.beingMarked = true;
                    ajaxPromise = this.$store.dispatch("countlyCrashes/crashgroup/markResolving");
                }
                else if (state === "unresolved") {
                    this.beingMarked = true;
                    ajaxPromise = this.$store.dispatch("countlyCrashes/crashgroup/markUnresolved");
                }
                else if (state === "hidden") {
                    this.beingMarked = true;
                    ajaxPromise = this.$store.dispatch("countlyCrashes/crashgroup/hide");
                }
                else if (state === "shown") {
                    this.beingMarked = true;
                    ajaxPromise = this.$store.dispatch("countlyCrashes/crashgroup/show");
                }

                if (typeof ajaxPromise !== "undefined") {
                    ajaxPromise.finally(function() {
                        self.beingMarked = false;
                    });
                }
            },
            handleCrashgroupCommand: function(command) {
                var self = this;

                if (command === "view-user-list") {
                    var params = {
                        api_key: countlyGlobal.member.api_key,
                        app_id: countlyCommon.ACTIVE_APP_ID,
                        method: "crashes",
                        group: this.crashgroup._id,
                        userlist: true
                    };

                    window.location.hash = "/users/request/" + JSON.stringify(params);
                }
                else if (command === "delete") {
                    CountlyHelpers.confirm(jQuery.i18n.prop("crashes.confirm-delete", 1), "red", function(result) {
                        if (result) {
                            self.$store.dispatch("countlyCrashes/crashgroup/delete")
                                .then(function(data) {
                                    if (!data) {
                                        CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                                    }
                                    else {
                                        window.history.back();
                                    }
                                });
                        }
                    });
                }

            }
        },
        beforeCreate: function() {
            return this.$store.dispatch("countlyCrashes/crashgroup/initialize", groupId);
        }
    });

    var getCrashgroupView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: CrashgroupView,
            vuex: [{clyModel: countlyCrashes}],
            templates: [
                {
                    namespace: "crashes",
                    mapping: {
                        crashgroup: "crashes/templates/crashgroup.html"
                    }
                }
            ]
        });
    };

    var BinaryImagesView = countlyVue.views.create({
        template: "#crashes-binary-images",
        data: function() {
            return {
                appId: countlyCommon.ACTIVE_APP_ID,
                authToken: countlyGlobal.auth_token,
                symbolicationEnabled: countlyGlobal.plugins.includes("crash_symbolication"),
                symbols: {}
            };
        },
        computed: {
            crash: function() {
                return this.$store.getters["countlyCrashes/crash/crash"];
            },
            binaryImages: function() {
                var crash = this.$store.getters["countlyCrashes/crash/crash"];
                var binaryImages;

                if ("binary_images" in crash) {
                    try {
                        var binaryImagesMap = JSON.parse(crash.binary_images);
                        binaryImages = Object.keys(binaryImagesMap).map(function(binaryName) {
                            var binaryProps = binaryImagesMap[binaryName];

                            return {
                                name: binaryName,
                                loadAddress: binaryProps.la,
                                uuid: binaryProps.id
                            };
                        });
                    }
                    catch (err) {
                        binaryImages = [];
                    }
                }
                else {
                    binaryImages = [];
                }

                return binaryImages;
            }
        },
        methods: {
            refresh: function() {
                var promises = [];
                var self = this;

                promises.push(this.$store.dispatch("countlyCrashes/crash/refresh"));

                if (this.symbolicationEnabled) {
                    promises.push(new Promise(function(resolve, reject) {
                        countlyCrashSymbols.fetchSymbols(true)
                            .then(function(symbolIndexing) {
                                self.symbols = {};

                                var buildIdMaps = Object.values(symbolIndexing);
                                buildIdMaps.forEach(function(buildIdMap) {
                                    Object.keys(buildIdMap).forEach(function(buildId) {
                                        self.symbols[buildId] = buildIdMap[buildId];
                                    });
                                });

                                resolve(this.symbols);
                            }).catch(function(err) {
                                reject(err);
                            });
                    }));
                }

                return Promise.all(promises);
            },
            hasSymbol: function(uuid) {
                return uuid in this.symbols;
            }
        },
        beforeCreate: function() {
            return this.$store.dispatch("countlyCrashes/crash/initialize", crashId);
        },
        mixins: [countlyVue.mixins.hasDrawers("crashSymbol")]
    });

    var getBinaryImagesView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: BinaryImagesView,
            vuex: [{clyModel: countlyCrashes}],
            templates: [
                {
                    namespace: "crashes",
                    mapping: {
                        "binary-images": "crashes/templates/binary-images.html"
                    }
                }
            ]
        });
    };

    app.route("/crashes", "crashes", function() {
        this.renderWhenReady(getOverviewView());
    });

    app.route("/crashes/:group", "crashgroup", function(group) {
        groupId = group;
        this.renderWhenReady(getCrashgroupView());
    });

    app.route("/crashes/:group/binary-images/:crash", "crashgroup", function(group, crash) {
        groupId = group;
        crashId = crash;
        this.renderWhenReady(getBinaryImagesView());
    });

    var CrashesDashboardWidget = countlyVue.views.create({
        template: CV.T("/crashes/templates/crashesHomeWidget.html"),
        data: function() {
            return {
                crashesItems: []
            };
        },
        mounted: function() {
            var self = this;
            this.$store.dispatch("countlyCrashes/overview/refresh").then(function() {
                self.calculateAllData();
            });
        },
        beforeCreate: function() {
            this.module = countlyCrashes.getVuexModule();
            CV.vuex.registerGlobally(this.module);
        },
        beforeDestroy: function() {
            CV.vuex.unregister(this.module.name);
            this.module = null;
        },
        methods: {
            refresh: function() {
                var self = this;
                this.$store.dispatch("countlyCrashes/overview/refresh").then(function() {
                    self.calculateAllData();
                });
            },
            calculateAllData: function() {

                var data = this.$store.getters["countlyCrashes/overview/dashboardData"] || {};
                var blocks = [];

                var getUs = [{"name": CV.i18n('crashes.total-crashes'), "info": "", "prop": "cr", "r": true}, {"name": CV.i18n('crashes.unique'), "info": "", "prop": "cru", "r": true}, {"name": CV.i18n('crashes.total-per-session'), "info": "", "prop": "cr-session", "r": true}, {"name": CV.i18n('crashes.free-users'), "info": "", "prop": "crau", "p": true}, {"name": CV.i18n('crashes.free-sessions'), "info": "", "prop": "crses", "p": true}];


                for (var k = 0; k < getUs.length; k++) {
                    data[getUs[k].prop] = data[getUs[k].prop] || {};
                    var value = data[getUs[k].prop].total;
                    if (!getUs[k].p) {
                        value = countlyCommon.formatNumber(data[getUs[k].prop].total || 0);
                    }

                    blocks.push({
                        "name": getUs[k].name,
                        "reverse": getUs[k].r,
                        "value": value,
                        "info": getUs[k].info,
                        "trend": data[getUs[k].prop].trend,
                        "change": data[getUs[k].prop].change
                    });
                }

                this.crashesItems = blocks;
            }
        },
        computed: {

        }
    });



    countlyVue.container.registerData("/home/widgets", {
        _id: "crashes-dashboard-widget",
        label: CV.i18n('crashes.app-performance'),
        description: CV.i18n('crashes.plugin-description'),
        enabled: {"default": true}, //object. For each type set if by default enabled
        available: {"default": true}, //object. default - for all app types. For other as specified.
        placeBeforeDatePicker: false,
        order: 9,
        linkTo: {"label": CV.i18n('crashes.go-to-crashes'), "href": "#/crashes"},
        component: CrashesDashboardWidget
    });

})();

jQuery(document).ready(function() {
    if (!jQuery("#crashes-menu").length) {
        app.addMenu("improve", {code: "crashes", text: "crashes.title", icon: '<div class="logo ion-alert-circled"></div>', priority: 10});
    }

    app.addSubMenu("crashes", {code: "crash", url: "#/crashes", text: "sidebar.dashboard", priority: 10});

    if (app.configurationsView) {
        app.configurationsView.registerInput("crashes.grouping_strategy", {
            input: "el-select",
            attrs: {},
            list: [
                {value: 'error_and_file', label: CV.i18n("crashes.grouping_strategy.error_and_file")},
                {value: 'stacktrace', label: CV.i18n("crashes.grouping_strategy.stacktrace")}
            ]
        });
    }
});