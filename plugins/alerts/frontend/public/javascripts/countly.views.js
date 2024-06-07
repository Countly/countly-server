/*global
    CountlyHelpers,
    countlyGlobal,
    countlyAlerts,
    jQuery,
    countlyVue,
    countlyCommon,
    app,
    countlyAuth,
    CV,
    groupsModel,
    _,
 */
(function() {
    var ALERTS_FEATURE_NAME = "alerts";

    var AlertDrawer = countlyVue.views.BaseView.extend({
        template: "#alert-drawer",
        mixins: [
            countlyVue.container.dataMixin({
                externalDataTypeOptions: "/alerts/data-type",
                externalAlertDefine: "/alerts/data-define",
            }),
        ],
        components: {},
        data: function() {
            return {
                selectedRadioButton: "specificAddress",
                newVariable: null,
                allGroups: [],
                allUserGroups: [],
                title: "",
                saveButtonLabel: "",
                apps: [""],
                allowAll: false,
                filterButton: false,
                showSubType1: true,
                showSubType2: false,
                showCondition: true,
                showConditionValue: true,
                alertDataSubType2Options: [],
                alertDataFilterKeyOptions: [],
                alertDataFilterValueOptions: [],
                alertDataFilterObject: null,
                alertDataFilterKey: null,
                alertDataFilterValue: null,

                eventTargets: [],
                metricTargets: [],
                defaultAlertDefine: {
                    events: {
                        target: [
                            { value: "count", label: "count" },
                            { value: "sum", label: "sum" },
                            { value: "duration", label: "duration" },
                            { value: "average sum", label: "average sum" },
                            {
                                value: "average duration",
                                label: "average duration",
                            },
                        ],
                    },
                    views: {
                        target: [
                            { value: "bounce rate", label: "bounce rate" },
                            {
                                value: "# of page views",
                                label: "# of page views",
                            },
                        ],
                    },
                    sessions: {
                        target: [
                            {
                                value: "average session duration",
                                label: "average session duration",
                            },
                            { value: "# of sessions", label: "# of sessions" },
                        ],
                    },
                    users: {
                        target: [
                            { value: "# of users", label: "# of users" },
                            {
                                value: "# of new users",
                                label: "# of new users",
                            },
                        ],
                    },
                    crashes: {
                        target: [
                            {
                                value: "# of crashes/errors",
                                label: "# of crashes/errors",
                            },
                            {
                                value: "non-fatal crashes/errors per session",
                                label: "non-fatal crashes/errors per session",
                            },
                            {
                                value: "fatal crashes/errors per session",
                                label: "fatal crashes/errors per session",
                            },
                            {
                                value: "new crash/error",
                                label: "new crash/error",
                            },
                        ],
                    },
                    survey: {
                        target: [
                            {
                                value: "# of survey responses",
                                label: "# of survey responses",
                            },
                            {
                                value: "new survey response",
                                label: "new survey response",
                            },
                        ],
                    },
                    nps: {
                        target: [
                            {
                                value: "# of responses",
                                label: "# of responses",
                            },
                            {
                                value: "new NPS response",
                                label: "new NPS response",
                            },
                        ],
                    },
                    rating: {
                        target: [
                            {
                                value: "# of responses",
                                label: "# of responses",
                            },
                            {
                                value: "new rating response",
                                label: "new rating response",
                            },
                        ],
                    },
                    dataPoints: {
                        target: [
                            {
                                value: "total data points",
                                label: "total data points",
                            },
                        ],
                    },
                    onlineUsers: {
                        target: [
                            {
                                value: "t",
                                label: "# of online users",
                            },
                            {
                                value: "o",
                                label: "overall record",
                            },
                            { value: "m", label: "30-day record" },
                        ],
                    },
                    cohorts: {
                        target: [
                            {
                                value: "# of users in the cohort",
                                label: "# of users in the cohort",
                            },
                        ],
                    },
                    profile_groups: {
                        target: [
                            {
                                value: "# of users in the profile group",
                                label: "# of users in the profile group",
                            },
                        ],
                    },
                    revenue: {
                        target: [
                            { value: "total revenue", label: "total revenue" },
                            {
                                value: "average revenue per user",
                                label: "average revenue per user",
                            },
                            {
                                value: "average revenue per paying user",
                                label: "average revenue per paying user",
                            },
                            {
                                value: "# of paying users",
                                label: "# of paying users",
                            },
                        ],
                    },
                },
                emailOptions: [
                    {
                        label: jQuery.i18n.map[
                            "alert.email-to-specific-address"
                        ],
                        value: "specificAddress",
                    },
                    {
                        label: jQuery.i18n.map["alert.email-to-group"],
                        value: "toGroup",
                    },
                    {
                        label: jQuery.i18n.map["alert.email-to-dont-send"],
                        value: "dontSend",
                    },
                ],
                defaultAlertVariable: {
                    condition: [
                        { label: "decreased", value: "decreased" },
                        { label: "increased", value: "increased" },
                        { label: "more", value: "more" },
                    ],
                },
                onlineUsersAlertVariable: {
                    condition: [
                        { label: "more", value: "more" },
                        { label: "less", value: "less" },
                    ],
                },
                defaultAlertTime: {
                    time: [
                        { label: "month", value: "monthly" },
                        { label: "day", value: "daily" },
                        { label: "hour", value: "hourly" },
                    ],
                },
            };
        },
        watch: {
            selectedRadioButton(newValue) {
                if (newValue === "specificAddress") {
                    this.$refs.drawerData.editedObject.allGroups = [];
                    this.$refs.drawerData.editedObject.alertBy = "email";
                }
                if (newValue === "toGroup") {
                    this.$refs.drawerData.editedObject.alertValues = [];
                    this.$refs.drawerData.editedObject.alertBy = "email";
                }
                if (newValue === "dontSend") {
                    this.$refs.drawerData.editedObject.alertValues = [];
                    this.$refs.drawerData.editedObject.allGroups = [];
                }
            },
        },
        computed: {
            isCompareTypeSelectAvailable: function() {
                const disabledMetrics = [
                    "new survey response",
                    "new NPS response",
                    "new rating response",
                    "new crash/error",
                    "o",
                    "m",
                ];
                if (this.$refs.drawerData.editedObject.alertDataType === "crashes" && (Array.isArray(this.alertDataFilterValue) && this.alertDataFilterValue.length)) {
                    return false;
                }
                if (disabledMetrics.includes(this.$refs.drawerData.editedObject.alertDataSubType)) {
                    return false;
                }
                return true;
            },
            isPeriodSelectAvailable: function() {
                const disabledMetrics = [
                    "new survey response",
                    "new NPS response",
                    "new rating response",
                    "new crash/error",
                    "o",
                    "m",
                ];
                if (this.$refs.drawerData.editedObject.alertDataType === "crashes" && (Array.isArray(this.alertDataFilterValue) && this.alertDataFilterValue.length)) {
                    return false;
                }
                if (disabledMetrics.includes(this.$refs.drawerData.editedObject.alertDataSubType)) {
                    return false;
                }
                return true;
            },
            alertTimeOptions() {
                if (
                    (this.$refs.drawerData.editedObject.alertDataType ===
                    "rating" && (Array.isArray(this.alertDataFilterValue) && this.alertDataFilterValue.length)) ||
                    (this.$refs.drawerData.editedObject.alertDataType ===
                    "events" && (this.alertDataFilterValue)) ||
                    (this.$refs.drawerData.editedObject.alertDataType ===
                    "nps" && ((typeof this.alertDataFilterValue) === "string")) ||
                    (this.$refs.drawerData.editedObject.alertDataType ===
                    "events" && this.filterButton)
                ) {
                    // The hour option is no longer available when the filter is added.
                    return this.defaultAlertTime.time.filter(
                        (periodItem) => periodItem.value !== "hourly"
                    );
                }
                else {
                    // Return all options if condition doesn't match
                    return this.defaultAlertTime.time;
                }
            },
            alertDataTypeOptions: function() {
                var alertDataTypeOptions = [
                    { label: jQuery.i18n.map["alert.Crash"], value: "crashes" },
                    {
                        label: jQuery.i18n.map["alert.Cohorts"],
                        value: "cohorts",
                    },
                    {
                        label: jQuery.i18n.map["alert.Data-points"],
                        value: "dataPoints",
                    },
                    { label: jQuery.i18n.map["alert.Event"], value: "events" },
                    { label: jQuery.i18n.map["alert.NPS"], value: "nps" },
                    {
                        label: jQuery.i18n.map["alert.Online-users"],
                        value: "onlineUsers",
                    },
                    {
                        label: jQuery.i18n.map["alert.Profile-groups"],
                        value: "profile_groups",
                    },
                    { label: jQuery.i18n.map["alert.Rating"], value: "rating" },
                    {
                        label: jQuery.i18n.map["alert.Revenue"],
                        value: "revenue",
                    },
                    {
                        label: jQuery.i18n.map["alert.Session"],
                        value: "sessions",
                    },
                    { label: jQuery.i18n.map["alert.Survey"], value: "survey" },
                    { label: jQuery.i18n.map["alert.User"], value: "users" },
                    { label: jQuery.i18n.map["alert.View"], value: "views" },
                ];
                // disable enterprise plugins if they are not available
                if (!countlyGlobal.plugins.includes("concurrent_users")) {
                    alertDataTypeOptions = alertDataTypeOptions.filter(({ value }) => value !== "onlineUsers");
                }
                if (!countlyGlobal.plugins.includes("surveys")) {
                    alertDataTypeOptions = alertDataTypeOptions.filter(({ value }) => value !== "survey" && value !== "nps");
                }
                if (!countlyGlobal.plugins.includes("revenue")) {
                    alertDataTypeOptions = alertDataTypeOptions.filter(({ value }) => value !== "revenue");
                }
                if (!countlyGlobal.plugins.includes("cohorts")) {
                    alertDataTypeOptions = alertDataTypeOptions.filter(({ value }) => value !== "cohorts" && value !== "profile_groups");
                }
                if (!countlyGlobal.plugins.includes("users")) {
                    alertDataTypeOptions = alertDataTypeOptions.filter(({ value }) => value !== "users");
                }
                return alertDataTypeOptions;
            },
            alertDefine: function() {
                var allOptions = JSON.parse(
                    JSON.stringify(this.defaultAlertDefine)
                );

                this.externalAlertDefine.forEach(function(define) {
                    allOptions = Object.assign(allOptions, define);
                });
                return allOptions;
            },

            alertDataSubTypeOptions: function() {
                var alertDataSubTypeOptions;
                if (this.$refs.drawerData.editedObject.alertDataType) {
                    alertDataSubTypeOptions =
                        this.alertDefine[
                            this.$refs.drawerData.editedObject.alertDataType
                        ].target;
                }
                return alertDataSubTypeOptions;
            },
            alertDataVariableOptions: function() {
                var alertDataVariableOptions;
                if (this.$refs.drawerData.editedObject.alertDataType === "onlineUsers") {
                    alertDataVariableOptions = this.onlineUsersAlertVariable.condition;
                }
                else {
                    alertDataVariableOptions = this.defaultAlertVariable.condition;
                }
                return alertDataVariableOptions;
            },
            elSelectKey: function() {
                var key = this.allGroups
                    .map(function(g) {
                        return g.name;
                    })
                    .join(",");

                return key;
            },
            periodTooltipReminder: function() {
                if (this.$refs.drawerData.editedObject.period === "hourly") {
                    return jQuery.i18n.map["alerts.period-select-reminder-hourly"];
                }
                else if (this.$refs.drawerData.editedObject.period === "daily") {
                    return jQuery.i18n.map["alerts.period-select-reminder-daily"];
                }
                else {
                    return;
                }
            },
        },
        props: {
            placeholder: { type: String, default: "Select" },
            controls: {
                type: Object,
            },
        },
        mounted: function() {
            var self = this;
            groupsModel.initialize().then(function() {
                var groups = _.sortBy(groupsModel.data(), "name");
                var userGroups = groups.map(function(g) {
                    return {
                        name: g.name,
                        value: g._id,
                        users: g.users,
                    };
                });
                self.allGroups = userGroups;
            });
        },
        methods: {
            subType2Label: function(obj) {
                switch (obj.alertDataType) {
                case "events":
                    return "Event";
                case "views":
                    return "View";
                case "cohorts":
                    return "Cohort";
                case "profile_groups":
                    return "Profile Group";
                case "survey":
                    return "Widget Name";
                case "nps":
                    return "Widget Name";
                case "rating":
                    return "Widget Name";
                }
            },
            showFilterButton: function(obj) {
                switch (obj.alertDataType) {
                case "events":
                    return true;
                case "crashes":
                    return true;
                case "nps":
                    return true;
                case "rating":
                    return true;
                }
            },
            getMetrics: function() {
                const formData = this.$refs.drawerData.editedObject;
                this.alertDataSubType2Options = [];
                if (formData.selectedApps === 'all') {
                    formData.alertDataType = 'dataPoints';
                    formData.alertDataSubType = 'total data points';
                }
                if (!formData.selectedApps) {
                    return;
                }
                if (formData.alertDataType === "views") {
                    countlyAlerts.getViewForApp(
                        formData.selectedApps,
                        (viewList) => {
                            this.alertDataSubType2Options = viewList.map(
                                (v) => {
                                    return { value: v.value, label: countlyCommon.unescapeHtml(v.name) };
                                }
                            );
                        }
                    );
                }
                if (formData.alertDataType === "events") {
                    countlyAlerts.getEventsForApp(
                        formData.selectedApps,
                        ({ events, segments }) => {
                            this.alertDataSubType2Options = events.map((e) => {
                                return { value: e.value, label: countlyCommon.unescapeHtml(e.name) };
                            });
                            this.alertDataFilterObject = segments;
                        }
                    );
                }
                if (formData.alertDataType === "cohorts") {
                    countlyAlerts.getCohortsForApp(
                        formData.selectedApps,
                        (data) => {
                            var filtered = data.filter(function(c) {
                                if (c.type !== "manual") {
                                    return true;
                                }
                                else {
                                    return false;
                                }
                            });
                            this.alertDataSubType2Options = filtered.map((c) => {
                                return { value: c._id, label: countlyCommon.unescapeHtml(c.name) };
                            });
                        }
                    );
                }
                if (formData.alertDataType === "profile_groups") {
                    countlyAlerts.getCohortsForApp(
                        formData.selectedApps,
                        (data) => {
                            var filtered = data.filter(function(c) {
                                if (c.type === "manual") {
                                    return true;
                                }
                                else {
                                    return false;
                                }
                            });
                            this.alertDataSubType2Options = filtered.map((c) => {
                                return { value: c._id, label: countlyCommon.unescapeHtml(c.name) };
                            });
                        }
                    );
                }
                if (formData.alertDataType === "survey") {
                    countlyAlerts.getSurveysForApp(
                        formData.selectedApps,
                        (data) => {
                            this.alertDataSubType2Options = data.map((s) => {
                                return { value: s._id, label: countlyCommon.unescapeHtml(s.name) };
                            });
                        }
                    );
                }
                if (formData.alertDataType === "nps") {
                    countlyAlerts.getNPSForApp(
                        formData.selectedApps,
                        (data) => {
                            this.alertDataSubType2Options = data.map((n) => {
                                return { value: n._id, label: countlyCommon.unescapeHtml(n.name) };
                            });
                        }
                    );
                }
                if (formData.alertDataType === "rating") {
                    countlyAlerts.getRatingForApp(
                        formData.selectedApps,
                        (data) => {
                            this.alertDataSubType2Options = data.map((r) => {
                                return {
                                    value: r._id,
                                    label: countlyCommon.unescapeHtml(r.popup_header_text),
                                };
                            });
                        }
                    );
                }
            },
            appSelected: function() {
                this.resetAlertCondition();
                this.getMetrics();
            },
            dataTypeSelected: function(val) {
                this.resetAlertCondition(1);
                this.resetAlertConditionShow();
                this.resetFilterCondition();
                this.getMetrics();
                if (val === "crashes" || val === "rating" || val === "nps") {
                    this.setFilterValueOptions();
                }

                var validDataTypesForSubType2 = [
                    "events",
                    "views",
                    "cohorts",
                    "profile_groups",
                    "survey",
                    "nps",
                    "rating",
                ];
                if (validDataTypesForSubType2.includes(val)) {
                    this.showSubType2 = true;
                }
                else {
                    this.showSubType2 = false;
                }

                if (
                    val === "dataPoint" &&
                    countlyGlobal.member.global_admin === true
                ) {
                    this.allowAll = true;
                }
                if (val === "onlineUsers") {
                    this.showSubType2 = false;
                    this.showCondition = false;
                    this.showConditionValue = false;
                }
            },
            setFilterKeyOptions: function() {
                const formData = this.$refs.drawerData.editedObject;
                if (!formData.selectedApps) {
                    return;
                }
                if (formData.alertDataType === "events") {
                    if (
                        formData.alertDataSubType2 &&
                        this.alertDataFilterObject
                    ) {
                        const options =
                            this.alertDataFilterObject[
                                formData.alertDataSubType2
                            ];
                        if (Array.isArray(options)) {
                            this.alertDataFilterKeyOptions = options
                                .filter((a) => a)
                                .map((a) => ({ label: a, value: a }));
                        }
                    }
                }
            },
            setFilterValueOptions: function() {
                const formData = this.$refs.drawerData.editedObject;
                if (!formData.selectedApps) {
                    return;
                }
                if (formData.alertDataType === "crashes") {
                    this.alertDataFilterValue = [];
                    this.alertDataFilterKey = "App Version";

                    countlyAlerts.getCrashesForFilter(
                        formData.selectedApps,
                        (data) => {
                            const app_version = Object.keys(data);
                            if (Array.isArray(app_version)) {
                                this.alertDataFilterValueOptions = app_version
                                    .filter((a) => a)
                                    .map((a) => ({
                                        label: a.replace(/:/g, "."),
                                        value: a,
                                    }));
                            }
                        }
                    );
                }
                if (formData.alertDataType === "rating") {
                    this.alertDataFilterValue = [];
                    this.alertDataFilterKey = "Rating";
                    this.alertDataFilterValueOptions = [
                        { label: "1", value: "1" },
                        { label: "2", value: "2" },
                        { label: "3", value: "3" },
                        { label: "4", value: "4" },
                        { label: "5", value: "5" },
                    ];
                }
                if (formData.alertDataType === "nps") {
                    this.alertDataFilterValue = "";
                    this.alertDataFilterKey = "NPS scale";
                    this.alertDataFilterValueOptions = [
                        { label: "detractor", value: "detractor" },
                        { label: "passive", value: "passive" },
                        { label: "promoter", value: "promoter" },
                    ];
                }
            },
            subType2Padding: function(obj) {
                if (this.showFilterButton(obj) && !this.showFilter) {
                    return "bu-pb-2";
                }
            },
            dataTypeIcons: function(dataType) {
                switch (dataType) {
                case "crashes":
                    return "cly-io-16 cly-is cly-is-crashes";
                case "cohorts":
                    return "cly-io-16 cly-io cly-io-cohorts";
                case "dataPoints":
                    return "cly-io-16 cly-is cly-is-punchcard";
                case "events":
                    return "cly-io-16 cly-is cly-is-calendar";
                case "nps":
                    return "cly-io-16 cly-is cly-is-emoji-happy";
                case "onlineUsers":
                    return "cly-io-16 cly-is cly-is-user-circle";
                case "profile_groups":
                    return "cly-io-16 cly-is cly-is-user-group";
                case "rating":
                    return "cly-io-16 cly-is cly-is-star";
                case "revenue":
                    return "cly-io-16 cly-is cly-is-currency-dollar";
                case "sessions":
                    return "cly-io-16 cly-is cly-is-clock";
                case "survey":
                    return "cly-io-16 cly-is cly-is-clipboard-list";
                case "users":
                    return "cly-io-16 cly-is cly-is-users";
                case "views":
                    return "cly-io-16 cly-is cly-is-eye";
                }
            },
            handleFilterClosing: function() {
                this.filterButton = false;
                this.resetFilterCondition();
            },
            handleAddFilterButton: function() {
                this.filterButton = true;
                this.setFilterKeyOptions();
                this.setFilterValueOptions();
            },
            resetAlertCondition: function(startFrom = 0) {
                const allFields = [
                    "alertDataType",
                    "alertDataSubType",
                    "alertDataSubType2",
                    "compareType",
                    "compareValue",
                    "period",
                    "filterKey",
                    "filterValue",
                ];
                const fieldsToReset = allFields.slice(startFrom);
                fieldsToReset.forEach(
                    (field) =>
                        (this.$refs.drawerData.editedObject[field] = null)
                );

                // Reset the background color for all input elements
                const inputs =
                    this.$refs.drawerData.$el.querySelectorAll("input");
                inputs.forEach((input) => {
                    this.resetColor(input);
                });

                // Reset the background color for all select elements
                const selects =
                    this.$refs.drawerData.$el.querySelectorAll("select");
                selects.forEach((select) => {
                    this.resetColor(select);
                });
            },
            resetAlertConditionShow: function() {
                this.showSubType1 = true;
                this.showSubType2 = false;
                this.showCondition = true;
                this.showConditionValue = true;
                this.filterButton = false;
            },
            resetFilterCondition: function() {
                this.alertDataFilterKeyOptions = [];
                this.alertDataFilterValueOptions = [];
                this.alertDataFilterKey = null;
                this.alertDataFilterValue = null;
            },

            onSubmit: function(settings) {
                settings.selectedApps = [settings.selectedApps];
                if (settings._id) {
                    var rows = this.$store.getters["countlyAlerts/table/all"];
                    for (var i = 0; i < rows.length; i++) {
                        if (
                            rows[i]._id === settings._id &&
                            (rows[i].alertDataType === "onlineUsers" ||
                                settings.alertDataType === "onlineUsers") &&
                            rows[i].alertDataType !== settings.alertDataType
                        ) {
                            if (rows[i].alertDataType !== "onlineUsers") {
                                this.$store.dispatch(
                                    "countlyAlerts/deleteAlert",
                                    rows[i]._id
                                );
                            }
                            else {
                                this.$store.dispatch(
                                    "countlyAlerts/deleteOnlineUsersAlert",
                                    rows[i]
                                );
                            }
                            settings._id = null;
                        }
                    }
                }
                const validFilter = (Array.isArray(this.alertDataFilterValue) && this.alertDataFilterValue.length)
                    || (!Array.isArray(this.alertDataFilterValue) && this.alertDataFilterValue);
                if (validFilter) {
                    settings.filterKey = this.alertDataFilterKey;
                    settings.filterValue = this.alertDataFilterValue;
                }
                else {
                    settings.filterKey = null;
                    settings.filterValue = null;
                }

                var target = settings.alertDataSubType;
                if (settings.alertDataSubType2) {
                    var subTarget = this.alertDataSubType2Options
                        .find(({value}) => value === settings.alertDataSubType2).label;
                }

                let describePeriod;
                switch (settings.period) {
                case "hourly":
                    describePeriod = "hour";
                    break;
                case "daily":
                    describePeriod = "day";
                    break;
                case "monthly":
                    describePeriod = "month";
                    break;
                }

                if (settings.period) {
                    if (subTarget) {
                        if (settings.compareType === "more") {
                            settings.compareDescribe =
                                subTarget +
                                " " +
                                target +
                                " is increased more than " +
                                settings.compareValue +
                                " in the last " +
                                describePeriod;
                        }
                        else {
                            settings.compareDescribe =
                                subTarget +
                                " " +
                                target +
                                " " +
                                settings.compareType +
                                " by " +
                                settings.compareValue +
                                " % in the last " +
                                describePeriod;
                        }
                    }
                    else if (settings.alertDataType === "onlineUsers") {
                        if (target === "# of online users") {
                            settings.compareDescribe =
                                target +
                                " is " +
                                settings.compareType +
                                " than " +
                                settings.compareValue +
                                " in the last" +
                                describePeriod;
                        }
                        else {
                            if (settings.compareType === "more") {
                                settings.compareDescribe =
                                    target +
                                    " is increased more than " +
                                    settings.compareValue +
                                    " in the last " +
                                    describePeriod;
                            }
                            else {
                                settings.compareDescribe =
                                    target +
                                    " " +
                                    settings.compareType +
                                    " by " +
                                    settings.compareValue +
                                    " % in the last " +
                                    describePeriod;
                            }
                        }
                    }
                    else {
                        if (settings.compareType === "more") {
                            settings.compareDescribe =
                                target +
                                " is increased more than " +
                                settings.compareValue +
                                " in the last " +
                                describePeriod;
                        }
                        else {
                            settings.compareDescribe =
                                target +
                                " " +
                                settings.compareType +
                                " by " +
                                settings.compareValue +
                                " % in the last " +
                                describePeriod;
                        }
                    }
                }
                else {
                    settings.compareDescribe = target;
                }

                if (settings.alertDataType === "onlineUsers") {
                    var config = {
                        app: settings.selectedApps[0],
                        app_name:
                            countlyGlobal.apps[settings.selectedApps[0]].name,
                        name: settings.alertName,
                        type: settings.alertDataSubType,
                        def: settings.compareType,
                        users: parseInt(settings.compareValue, 10),
                        minutes: parseInt(settings.compareValue2, 10),
                        email: settings.alertValues,
                        alertBy: settings.alertBy,
                        allGroups: settings.allGroups,
                        enabled: true,
                    };
                    if (settings._id) {
                        config._id = settings._id;
                    }
                    if (config.type === "t") {
                        config.condition_title = jQuery.i18n.prop(
                            "concurrent-users.condition-title",
                            config.def,
                            config.users,
                            config.minutes
                        );
                    }
                    else if (config.type === "o") {
                        config.condition_title =
                            jQuery.i18n.map[
                                "concurrent-users.alert-type.overall-title"
                            ];
                    }
                    else if (config.type === "m") {
                        config.condition_title =
                            jQuery.i18n.map[
                                "concurrent-users.alert-type.monthly-title"
                            ];
                    }

                    this.$store.dispatch(
                        "countlyAlerts/saveOnlineUsersAlert",
                        config
                    );
                    this.resetAlertConditionShow();
                    return;
                }
                this.$store.dispatch("countlyAlerts/saveAlert", settings);
                this.resetAlertConditionShow();
            },
            onClose: function($event) {
                this.$emit("close", $event);
            },
            onCopy: function(newState) {
                this.showSubType1 = true;
                this.showSubType2 = false;
                this.showCondition = false;
                this.showConditionValue = false;
                newState.selectedApps = newState.selectedApps[0];
                // this.onAppChange(newState.selectedApps, true);
                // this.alertDataSubTypeSelected(newState.alertDataSubType, true);
                //this.resetAlertCondition();
                this.getMetrics();
                this.setFilterKeyOptions();
                this.setFilterValueOptions();

                if (newState._id !== null) {
                    this.title = jQuery.i18n.map["alert.Edit_Your_Alert"];
                    this.saveButtonLabel = jQuery.i18n.map["alert.save-alert"];
                    this.filterButton = Array.isArray(newState.filterValue)
                        ? !!newState.filterValue.length
                        : !!newState.filterValue;
                    this.alertDataFilterKey = newState.filterKey;
                    this.alertDataFilterValue = newState.filterValue;

                    if (newState.alertBy === "email") {
                        if (newState?.allGroups?.length) {
                            this.selectedRadioButton = "toGroup";
                        }
                        if (newState?.alertValues?.length) {
                            this.selectedRadioButton = "specificAddress";
                        }
                    }
                    else if (newState.alertBy === "hook") {
                        this.selectedRadioButton = "dontSend";
                    }

                    return;
                }
                else {
                    this.resetAlertConditionShow();
                }
                this.title = jQuery.i18n.map["alert.Create_New_Alert"];
                this.saveButtonLabel = jQuery.i18n.map["alert.save"];
            },
            calculateWidth(value) {
                if (!value || !this.$refs?.alertDataSubTypeSelect?.$el) {
                    return;
                }
                let tmpEl = document.createElement("span");
                tmpEl.textContent = value;
                tmpEl.style.cssText = `
                    visibility: hidden;
                    position: fixed;
                    font-size: 14px;
                    font-family: Arial !important;
                    box-sizing: border-box;
                    font-weight: 600;
                    padding: 8px
                `;
                document.body.appendChild(tmpEl);
                const tempSelectWidth = tmpEl.getBoundingClientRect().width;
                tmpEl.remove();
                //this.changeColor(this.$refs.alertDataSubTypeSelect.$el); 
                return tempSelectWidth;
            },
            // Handle the change event of the element
            handleChange(element) {
                this.changeColor(element);
                if (element.nodeName !== "SELECT") {
                    return;
                }
            },
            changeColor(element) {
                // Set the background color of the element to green when a selection is made
                element.style.backgroundColor = "#E1EFFF";
                element.style.color = "#333C48";
                element.style.fontWeight = "600";
            },
            resetColor(element) {
                // Remove the inline background color style to reset to default
                element.style.backgroundColor = "";
                element.style.color = "";
            },
        },
    });

    var TableView = countlyVue.views.BaseView.extend({
        template: "#alerts-table",
        mixins: [countlyVue.mixins.auth(ALERTS_FEATURE_NAME)],
        computed: {
            tableRows: function() {
                var rows = this.$store.getters["countlyAlerts/table/all"];
                if (this.filteredApps.length > 0) {
                    var self = this;
                    rows = rows.filter(function(r) {
                        var matched = false;
                        self.filteredApps.forEach(function(a) {
                            if (r.selectedApps.indexOf(a) >= 0) {
                                matched = true;
                            }
                        });
                        return matched;
                    });
                }
                return rows;
            },
            initialized: function() {
                var result =
                    this.$store.getters["countlyAlerts/table/getInitialized"];
                return result;
            },
            rowTableRows: function() {
                var rows = this.$store.getters["countlyAlerts/table/all"];
                return rows;
            },
        },
        data: function() {
            var appsSelectorOption = [];
            for (var id in countlyGlobal.apps) {
                appsSelectorOption.push({
                    label: countlyGlobal.apps[id].name,
                    value: id,
                });
            }

            return {
                appsSelectorOption: appsSelectorOption,
                filterStatus: "all",
                filteredApps: [],
                localTableTrackedFields: ["enabled"],
                isAdmin: countlyGlobal.member.global_admin,
                deleteElement: null,
            };
        },
        props: {
            callCreateAlertDrawer: { type: Function, default: function() {} },
        },
        methods: {
            createAlert: function() {
                this.callCreateAlertDrawer();
            },
            handleAlertEditCommand: function(command, scope) {
                if (command === "edit-comment") {
                    /* eslint-disable */
                    var data = Object.assign({}, scope.row);
                    /* eslint-enable */
                    this.$parent.$parent.openDrawer("home", data);
                }
                else if (command === "delete-comment") {
                    var self = this;
                    this.deleteElement = scope.row;
                    var deleteMessage = CV.i18n(
                        "alert.delete-confirm",
                        "<b>" + this.deleteElement.alertName + "</b>"
                    );
                    CountlyHelpers.confirm(
                        deleteMessage,
                        "red",
                        function(result) {
                            if (!result) {
                                return true;
                            }
                            if (
                                self.deleteElement.alertDataType ===
                                "onlineUsers"
                            ) {
                                self.$store.dispatch(
                                    "countlyAlerts/deleteOnlineUsersAlert",
                                    {
                                        alertID: self.deleteElement._id,
                                        appid: self.deleteElement
                                            .selectedApps[0],
                                    }
                                );
                            }
                            else {
                                self.$store.dispatch(
                                    "countlyAlerts/deleteAlert",
                                    {
                                        alertID: self.deleteElement._id,
                                        appid: self.deleteElement
                                            .selectedApps[0],
                                    }
                                );
                            }
                        }
                    );
                }
            },
            updateStatus: function(scope) {
                var diff = scope.diff;
                var status = {};
                diff.forEach(function(item) {
                    status[item.key] = item.newValue;
                });
                var alertStatus = {};
                var onlineUsersAlertStatus = {};
                var rows = this.$store.getters["countlyAlerts/table/all"];
                for (var i = 0; i < rows.length; i++) {
                    if (status[rows[i]._id] !== undefined) {
                        if (rows[i].alertDataType === "onlineUsers") {
                            onlineUsersAlertStatus[rows[i]._id] =
                                status[rows[i]._id];
                        }
                        else {
                            alertStatus[rows[i]._id] = status[rows[i]._id];
                        }
                    }
                }
                var self = this;
                self.scope = scope;
                self.onlineUsersAlertStatus = onlineUsersAlertStatus;
                this.$store
                    .dispatch("countlyAlerts/table/updateStatus", alertStatus)
                    .then(function() {
                        return self.$store
                            .dispatch(
                                "countlyAlerts/table/updateOnlineusersAlertStatus",
                                self.onlineUsersAlertStatus
                            )
                            .then(function() {
                                return self.$store.dispatch(
                                    "countlyAlerts/table/fetchAll"
                                );
                            });
                    });
            },
            refresh: function() {
                // this.$store.dispatch("countlyHooks/table/fetchAll");
            },
        },
    });

    var AlertsHomeViewComponent = countlyVue.views.BaseView.extend({
        template: "#alerts-home",
        mixins: [
            countlyVue.mixins.hasDrawers("home"),
            countlyVue.mixins.auth(ALERTS_FEATURE_NAME),
        ],
        components: {
            "table-view": TableView,
            drawer: AlertDrawer,
        },
        computed: {
            countData: function() {
                var count = this.$store.getters["countlyAlerts/table/count"];
                return [
                    { label: "alert.RUNNING_ALERTS", value: count.r },
                    { label: "alert.TOTAL_ALERTS_SENT", value: count.t },
                    { label: "alert.ALERTS_SENT_TODAY", value: count.today },
                ];
            },
            shouldHideCount: function() {
                var result =
                    this.$store.getters["countlyAlerts/table/getInitialized"];
                var rows = this.$store.getters["countlyAlerts/table/all"];
                return result && rows.length === 0;
            },
            initialized: function() {
                var result =
                    this.$store.getters["countlyAlerts/table/getInitialized"];
                return result;
            },
        },
        data: function() {
            return {
                canCreate: countlyAuth.validateCreate(ALERTS_FEATURE_NAME),
            };
        },
        beforeCreate: function() {
            this.$store.dispatch("countlyAlerts/initialize");
        },
        methods: {
            createAlert: function() {
                var config = countlyAlerts.defaultDrawerConfigValue();
                this.openDrawer("home", config);
            },
        },
    });
    var alertsView = new countlyVue.views.BackboneWrapper({
        component: AlertsHomeViewComponent,
        vuex: [
            {
                clyModel: countlyAlerts,
            },
        ],
        templates: ["/alerts/templates/vue-main.html"],
    });

    alertsView.featureName = ALERTS_FEATURE_NAME;

    app.route("/manage/alerts", "alerts", function() {
        this.renderWhenReady(alertsView);
    });
    app.addMenu("management", {
        code: "alerts",
        permission: ALERTS_FEATURE_NAME,
        url: "#/manage/alerts",
        text: "alert.plugin-title",
        priority: 100,
    });
})();
