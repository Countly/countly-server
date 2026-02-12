import jQuery from 'jquery';
import _ from 'underscore';
import Vue from 'vue';
import { app } from '../../../../frontend/express/public/javascripts/countly/countly.template.js';
import { i18n, i18nM, views, vuex } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { registerData, registerTab, tabsVuex } from '../../../../frontend/express/public/javascripts/countly/vue/container.js';
import { countlyCommon } from '../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { validateRead } from '../../../../frontend/express/public/javascripts/countly/countly.auth.js';
import { getGlobalStore } from '../../../../frontend/express/public/javascripts/countly/vue/data/store.js';

import CrashOverview from './components/CrashOverview.vue';
import Crashgroup from './components/Crashgroup.vue';
import BinaryImages from './components/BinaryImages.vue';
import CrashesDashboardWidget from './components/CrashesDashboardWidget.vue';
import UserCrashes from './components/UserCrashes.vue';
import DashboardTile from './components/DashboardTile.vue';
import CustomDashboardWidget from './components/CustomDashboardWidget.vue';
import CustomDashboardDrawer from './components/CustomDashboardDrawer.vue';

import countlyCrashes from './store/index.js';

import './assets/main.scss';

var FEATURE_NAME = 'crashes';

// Register DashboardTile as global component (used across multiple templates)
Vue.component("cly-crashes-dashboard-tile", DashboardTile);

// --- Routes ---

var getOverviewView = function() {
    return new views.BackboneWrapper({
        component: CrashOverview,
        vuex: [{clyModel: countlyCrashes}],
        templates: [
            "/drill/templates/query.builder.v2.html",
        ]
    });
};

var getCrashgroupView = function(gid) {
    var vx = [{clyModel: countlyCrashes}];
    var externalVuex = tabsVuex(["crashes/external/vuex"]);
    vx = vx.concat(externalVuex);

    var view = new views.BackboneWrapper({
        component: Crashgroup,
        vuex: vx,
    });
    view.params = {groupId: gid};
    return view;
};

var getBinaryImagesView = function(gid, cid) {
    var view = new views.BackboneWrapper({
        component: BinaryImages,
        vuex: [{clyModel: countlyCrashes}],
    });
    view.params = {crashId: cid};
    return view;
};

app.route("/crashes", "crashes", function() {
    this.renderWhenReady(getOverviewView());
});

app.route("/crashes/filter/*query", "crashes", function(rawQuery) {
    var parsedQuery = null;

    try {
        parsedQuery = JSON.parse(rawQuery);
    }
    catch (err) {
        // no need to do anything, default parsedQuery is null
    }

    var view = getOverviewView();
    view.params = {
        query: parsedQuery
    };

    this.renderWhenReady(view);
});

app.route("/crashes/:group", "crashgroup", function(group) {
    this.renderWhenReady(getCrashgroupView(group));
});

app.route("/crashes/:group/binary-images/:crash", "crashgroup", function(group, crash) {
    this.renderWhenReady(getBinaryImagesView(group, crash));
});

// --- Menu ---

app.addMenu("improve", {code: "crashes", permission: FEATURE_NAME, text: "crashes.title", icon: '<div class="logo ion-alert-circled"></div>', priority: 10});
app.addSubMenu("crashes", {code: "crash", permission: FEATURE_NAME, url: "#/crashes", text: "sidebar.dashboard", priority: 10});

// --- Configurations ---

getGlobalStore().commit('countlyConfigurations/registerInput', {id: "crashes.smart_regexes", value: {input: "el-input", attrs: {type: "textarea", rows: 5}}});

getGlobalStore().commit('countlyConfigurations/registerInput', {id: "crashes.grouping_strategy", value: {
    input: "el-select",
    attrs: {},
    list: [
        {value: 'error_and_file', label: i18n("crashes.grouping_strategy.error_and_file")},
        {value: 'stacktrace', label: i18n("crashes.grouping_strategy.stacktrace")}
    ]
}});

app.addAppManagementInput("crashes", i18n("crashes.title"),
        {
            "crashes.smart_preprocessing": {input: "el-switch", attrs: {}, defaultValue: true},
            "crashes.smart_regexes": {input: "el-input", attrs: {type: "textarea", rows: 5}},
            "crashes.grouping_strategy": {
                input: "el-select",
                attrs: {},
                list: [
                    {value: 'error_and_file', label: i18n("crashes.grouping_strategy.error_and_file")},
                    {value: 'stacktrace', label: i18n("crashes.grouping_strategy.stacktrace")}
                ]
            }
        });

// --- Home Widget ---

registerData("/home/widgets", {
    _id: "crashes-dashboard-widget",
    label: i18n('crashes.crash-statistics'),
    permission: FEATURE_NAME,
    enabled: {"default": true},
    available: {"default": true},
    placeBeforeDatePicker: false,
    order: 9,
    component: CrashesDashboardWidget
});

// --- User Crashes Tab ---

registerTab("/users/tabs", {
    priority: 7,
    title: 'Crashes',
    name: 'crashes',
    permission: FEATURE_NAME,
    component: UserCrashes
});

// --- Custom Dashboard Widget ---

registerData("/custom/dashboards/widget", {
    type: "crashes",
    label: i18nM("dashboards.widget-type.crash"),
    priority: 11,
    primary: true,
    getter: function(widget) {
        return widget.widget_type === "crashes";
    },
    drawer: {
        component: CustomDashboardDrawer,
        getEmpty: function() {
            return {
                title: "",
                feature: "crashes",
                widget_type: "crashes",
                app_count: 'single',
                apps: [],
                metrics: [],
                visualization: "",
                isPluginWidget: true
            };
        },
    },
    grid: {
        component: CustomDashboardWidget
    }
});

// --- Query Builder Registration ---

jQuery(function() {
    if (window.countlyQueryBuilder) {
        var indexedProps = [
            "background",
            "cpu",
            "device",
            "muted",
            "online",
            "opengl",
            "orientation",
            "os_version",
            "resolution",
            "root",
            "signal",
        ];

        var exportOrGroup = function(rows) {
            return (rows || []).reduce(function(query, row) {
                var negateValue = row.operator.id === "cly.!=";
                var subquery = {};

                if (indexedProps.includes(row.property.id)) {
                    (Array.isArray(row.value.data)
                        ? row.value.data
                        : [row.value.data]
                    ).forEach(function(v) {
                        subquery[row.property.id + "." + v] = {
                            $exists: !negateValue,
                        };
                    });
                }
                else {
                    var op = {
                        "cly.>": "$gt",
                        "cly.>=": "$gte",
                        "cly.<": "$lt",
                        "cly.<=": "$lte",
                        "cly.=": "$in",
                        "cly.!=": "$nin",
                        "cly.contains": "$regex",
                        "cly.notcontain": "rgxntc",
                        "cly.beginswith": "rgxbw",
                        "cly.between": function(r) {
                            return {
                                $gte: r.value.data[0],
                                $lte: r.value.data[1],
                            };
                        },
                    }[row.operator.id];

                    if (typeof op === "string") {
                        subquery[row.property.id] = {};

                        if (
                            ["$in", "$nin"].includes(op) &&
                            !Array.isArray(row.value.data)
                        ) {
                            subquery[row.property.id][op] = [
                                row.value.data,
                            ];
                        }
                        else {
                            subquery[row.property.id][op] = row.value.data;
                        }
                    }
                    else if (typeof op === "function") {
                        subquery[row.property.id] = op(row);
                    }
                }

                Object.keys(subquery).forEach(function(propId) {
                    if (!(propId in query)) {
                        query[propId] = {};
                    }

                    Object.keys(subquery[propId]).forEach(function(opId) {
                        if (["$in", "$nin"].includes(opId)) {
                            if (!(opId in query[propId])) {
                                query[propId][opId] = [];
                            }

                            query[propId][opId] = query[propId][
                                opId
                            ].concat(subquery[propId][opId]);
                        }
                        else {
                            query[propId][opId] = subquery[propId][opId];
                        }
                    });
                });

                return query;
            }, {});
        };

        var importSubquery = function(query, conjunction) {
            var rawRows = [];
            conjunction = conjunction || window.countlyQueryBuilder.RowConj.AND;

            Object.keys(query).forEach(function(key) {
                if (key === "$and") {
                    rawRows = rawRows.concat(
                        _.flatten(
                            query[key].map(function(andBranch) {
                                return importSubquery(
                                    andBranch,
                                    window.countlyQueryBuilder.RowConj.AND
                                );
                            })
                        )
                    );
                    return;
                }
                if (key === "$or") {
                    rawRows = rawRows.concat(
                        _.flatten(
                            query[key].map(function(orBranch, idx) {
                                if (idx === 0) {
                                    return importSubquery(
                                        orBranch,
                                        window.countlyQueryBuilder.RowConj.AND
                                    );
                                }
                                return importSubquery(
                                    orBranch,
                                    window.countlyQueryBuilder.RowConj.OR
                                );
                            })
                        )
                    );
                    return;
                }
                var field = query[key];
                if (
                    Object.prototype.hasOwnProperty.call(field, "$gte") &&
                    Object.prototype.hasOwnProperty.call(field, "$lte")
                ) {
                    rawRows.push({
                        propertyId: key,
                        operatorId: "cly.between",
                        valueData: [field.$gte, field.$lte],
                        conjunction: conjunction,
                    });
                    delete field.$gte;
                    delete field.$lte;
                }
                Object.keys(field).forEach(function(mongoOp) {
                    var op = {
                        $gt: "cly.>",
                        $gte: "cly.>=",
                        $lt: "cly.<",
                        $lte: "cly.<=",
                        $in: "cly.=",
                        $nin: "cly.!=",
                        $exists: function(data) {
                            var dotIndex = key.indexOf(".");
                            var propertyId = key.slice(0, dotIndex);
                            var value = key.slice(dotIndex + 1, key.length);
                            return {
                                propertyId: propertyId,
                                operatorId: data ? "cly.=" : "cly.!=",
                                valueData: [
                                    value,
                                ],
                            };
                        },
                        $regex: function(data) {
                            return {
                                operatorId: "cly.contains",
                                valueData: data,
                            };
                        },
                        rgxntc: function(data) {
                            return {
                                operatorId: 'cly.notcontain',
                                valueData: data,
                            };
                        },
                        rgxbw: function(data) {
                            return {
                                operatorId: 'cly.beginswith',
                                valueData: data,
                            };
                        },
                    }[mongoOp];

                    if (op) {
                        var baseObj = {
                            propertyId: key,
                            conjunction: conjunction,
                        };

                        if (mongoOp === "$exists") {
                            var rowToPush = _.extend(
                                baseObj,
                                op(field[mongoOp])
                            );
                            var rowIndex = rawRows.findIndex(function(
                                row
                            ) {
                                return (
                                    row.propertyId === rowToPush.propertyId
                                );
                            });

                            if (rowIndex === -1) {
                                rawRows.push(rowToPush);
                            }
                            else {
                                rawRows[rowIndex].valueData.push(
                                    rowToPush.valueData[0]
                                );
                            }
                        }
                        else if (typeof op === "function") {
                            rawRows.push(
                                _.extend(baseObj, op(field[mongoOp]))
                            );
                        }
                        else {
                            rawRows.push(
                                _.extend(baseObj, {
                                    operatorId: op,
                                    valueData: field[mongoOp],
                                })
                            );
                        }
                    }
                });
            });

            return rawRows;
        };

        window.countlyQueryBuilder.registerQueryFormat("crashgroups", {
            import: function(value) {
                if (!value.query && !value.byVal) {
                    return new window.countlyQueryBuilder.FrozenQuery({});
                }

                return new window.countlyQueryBuilder.FrozenQuery({
                    rows: importSubquery(value.query).map(function(
                        row,
                        idx
                    ) {
                        row.id = idx;
                        return new window.countlyQueryBuilder.FrozenRow(row);
                    }),
                    groupByProps: value.byVal,
                });
            },
            export: function(currentQuery) {
                var rows = currentQuery.rows,
                    grouped = _.groupBy(rows, "orGroup"),
                    exportedOrGroups = [],
                    mainObject = null;

                Object.keys(grouped).forEach(function(key) {
                    if (key === window.countlyQueryBuilder.NO_GROUP) {
                        mainObject = exportOrGroup(
                            grouped[window.countlyQueryBuilder.NO_GROUP]
                        );
                    }
                    else {
                        exportedOrGroups.push({
                            $or: grouped[key].map(function(row) {
                                return exportOrGroup([row]);
                            }),
                        });
                    }
                });

                if (exportedOrGroups.length === 0) {
                    return {
                        query: mainObject || {},
                        byVal: currentQuery.groupByProps,
                    };
                }
                else if (exportedOrGroups.length === 1) {
                    return {
                        query: _.extend(
                            mainObject || {},
                            exportedOrGroups[0]
                        ),
                        byVal: currentQuery.groupByProps,
                    };
                }
                else {
                    if (mainObject) {
                        exportedOrGroups.unshift(mainObject);
                    }
                    return {
                        query: {
                            $and: exportedOrGroups,
                        },
                        byVal: currentQuery.groupByProps,
                    };
                }
            },
        });
    }
});
