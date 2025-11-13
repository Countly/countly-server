/*global app, countlyVue, countlySDK, CV, countlyCommon, CountlyHelpers*/
(function() {
    var enable_logs = false;
    var SC_VER = 2; // check/update sdk/api/api.js for this
    // Initial SDKs that supported tracking and networking options
    var v0_android = "22.09.4";
    var v0_ios = "23.02.2";
    // Initial SDKs that supported all options except SC
    var v1_android = "25.4.0";
    var v1_ios = "25.4.0";
    var v1_web = "25.4.0";
    // Initial SDKs that support all + backoff mechanism. (bridge push vs no push is not branched yet so keeping them together)
    var v2_android = "25.4.1";
    var v2_ios = "25.4.2";
    var v2_web = "25.4.1";
    var v2_flutter = "25.4.1";
    var v2_react_native = "25.4.0";
    // dart sdk placeholder version to indicate experimental support
    var v0_dart = "25.0.0";
    // Supporting SDK Versions for the SC options
    var supportedSDKVersion = {
        tracking: { android: v0_android, ios: v0_ios, web: v1_web, flutter: v2_flutter, react_native: v2_react_native },
        networking: { android: v0_android, ios: v0_ios, web: v1_web, flutter: v2_flutter, react_native: v2_react_native },
        crt: { android: v1_android, ios: v1_ios, web: v1_web, flutter: v2_flutter, react_native: v2_react_native },
        vt: { android: v1_android, ios: v1_ios, web: v1_web, flutter: v2_flutter, react_native: v2_react_native },
        st: { android: v1_android, ios: v1_ios, web: v1_web, flutter: v2_flutter, react_native: v2_react_native },
        cet: { android: v1_android, ios: v1_ios, web: v1_web, flutter: v2_flutter, react_native: v2_react_native },
        ecz: { android: v1_android, ios: v1_ios, web: v1_web, flutter: v2_flutter, react_native: v2_react_native },
        cr: { android: v1_android, ios: v1_ios, web: v1_web, flutter: v2_flutter, react_native: v2_react_native },
        sui: { android: v1_android, ios: v1_ios, web: v1_web, flutter: v2_flutter, react_native: v2_react_native },
        eqs: { android: v1_android, ios: v1_ios, web: v1_web, flutter: v2_flutter, react_native: v2_react_native },
        rqs: { android: v1_android, ios: v1_ios, web: v1_web, flutter: v2_flutter, react_native: v2_react_native },
        czi: { android: v1_android, ios: v1_ios, web: v1_web, flutter: v2_flutter, react_native: v2_react_native },
        dort: { android: v1_android, ios: v1_ios, web: v1_web, flutter: v2_flutter, react_native: v2_react_native },
        scui: { android: v1_android, ios: v1_ios, web: v1_web, flutter: v2_flutter, react_native: v2_react_native },
        lkl: { android: v1_android, ios: v1_ios, web: v1_web, flutter: v2_flutter, react_native: v2_react_native },
        lvs: { android: v1_android, ios: v1_ios, web: v1_web, flutter: v2_flutter, react_native: v2_react_native },
        lsv: { android: v1_android, ios: v1_ios, web: v1_web, flutter: v2_flutter, react_native: v2_react_native },
        lbc: { android: v1_android, ios: v1_ios, web: v1_web, flutter: v2_flutter, react_native: v2_react_native },
        ltlpt: { android: v1_android, ios: v1_ios, web: v1_web, flutter: v2_flutter, react_native: v2_react_native },
        ltl: { android: v1_android, ios: v1_ios, web: v1_web, flutter: v2_flutter, react_native: v2_react_native },
        lt: { android: v1_android, ios: v1_ios, web: v1_web, flutter: v2_flutter, react_native: v2_react_native },
        rcz: { android: v1_android, ios: v1_ios, web: v1_web, flutter: v2_flutter, react_native: v2_react_native },
        bom_preset: { android: v2_android, ios: v2_ios, web: v2_web, flutter: v2_flutter, react_native: v2_react_native },
        bom: { android: v2_android, ios: v2_ios, web: v2_web, flutter: v2_flutter, react_native: v2_react_native },
        bom_at: { android: v2_android, ios: v2_ios, web: v2_web, flutter: v2_flutter, react_native: v2_react_native },
        bom_rqp: { android: v2_android, ios: v2_ios, web: v2_web, flutter: v2_flutter, react_native: v2_react_native },
        bom_ra: { android: v2_android, ios: v2_ios, web: v2_web, flutter: v2_flutter, react_native: v2_react_native },
        bom_d: { android: v2_android, ios: v2_ios, web: v2_web, flutter: v2_flutter, react_native: v2_react_native },
        upcl: { dart: v0_dart },
        filter_preset: { dart: v0_dart },
        eb: { dart: v0_dart },
        upb: { dart: v0_dart },
        sb: { dart: v0_dart },
        esb: { dart: v0_dart },
        ew: { dart: v0_dart },
        upw: { dart: v0_dart },
        sw: { dart: v0_dart },
        esw: { dart: v0_dart }
    };

    var nonJSONExperimentalKeys = ['eb', 'upb', 'sb', 'ew', 'upw', 'sw'];
    var jsonExperimentalKeys = ['esb', 'esw'];
    var shouldShowExperimental = true;
    var experimentalKeys = ['upcl', 'filter_preset'].concat(nonJSONExperimentalKeys, jsonExperimentalKeys);

    var FEATURE_NAME = "sdk";
    var SDK = countlyVue.views.create({
        template: CV.T('/sdk/templates/sdk-main.html'),
        mixins: [
            countlyVue.container.tabsMixin({
                "sdkTabs": "/manage/sdk"
            })
        ].concat(countlyVue.container.mixins(["/manage/sdk"])),
        data: function() {
            return {
                selectedTab: (this.$route.params && this.$route.params.tab) || "stats"
            };
        },
        computed: {
            tabs: function() {
                return this.sdkTabs;
            }
        }
    });
    var log = function() {
        if (enable_logs) {
            // eslint-disable-next-line no-console
            if (typeof console !== "undefined" && console.log) {
                // eslint-disable-next-line no-console
                console.log.apply(console, arguments);
            }
        }
    };
    var getSDKMainView = function() {
        var tabsVuex = countlyVue.container.tabsVuex(["/manage/sdk"]);
        return new countlyVue.views.BackboneWrapper({
            component: SDK,
            vuex: tabsVuex,
            templates: []
        });
    };

    app.route("/manage/sdk", "sdk-tab", function() {
        var ViewWrapper = getSDKMainView();
        var params = {};
        ViewWrapper.params = params;
        this.renderWhenReady(ViewWrapper);
    });

    app.route("/manage/sdk/*tab", "sdk-tab", function(tab) {
        var ViewWrapper = getSDKMainView();
        var params = {
            tab: tab
        };
        ViewWrapper.params = params;
        this.renderWhenReady(ViewWrapper);
    });
    app.addSubMenu("management", {code: "sdk", permission: FEATURE_NAME, url: "#/manage/sdk", text: "SDK Manager", priority: 50, tabsPath: "/manage/sdk"});

    var SDKConfigurationView = countlyVue.views.create({
        template: CV.T('/sdk/templates/config.html'),
        created: function() {
            var self = this;
            Promise.all([
                this.$store.dispatch("countlySDK/initialize"),
                this.$store.dispatch("countlySDK/initializeEnforcement"),
                this.$store.dispatch("countlySDK/fetchSDKStats") // fetch sdk version data for tooltips
            ]).then(function() {
                log("SDK:init:complete", { params: self.$store.getters["countlySDK/sdk/all"], enforcement: self.$store.getters["countlySDK/sdk/enforcement"] });
                self.$store.dispatch("countlySDK/sdk/setTableLoading", false);
            });
        },
        computed: {
            getData: function() {
                var params = this.$store.getters["countlySDK/sdk/all"];
                var enforcement = this.$store.getters["countlySDK/sdk/enforcement"];
                var data = params || {};
                var enforceData = enforcement || {};
                for (var key in this.configs) {
                    if (this.diff.indexOf(key) === -1) {
                        var stored = typeof data[key] !== "undefined" ? data[key] : this.configs[key].default;
                        // format experimental fields for UI
                        if (nonJSONExperimentalKeys.indexOf(key) !== -1) {
                            if (Array.isArray(stored)) {
                                this.configs[key].value = this.arrayToCsv(stored);
                            }
                            else if (typeof stored === 'string') {
                                this.configs[key].value = stored;
                            }
                            else {
                                this.configs[key].value = '';
                            }
                        }
                        else if (jsonExperimentalKeys.indexOf(key) !== -1) {
                            if (typeof stored === 'object') {
                                try {
                                    this.configs[key].value = JSON.stringify(stored, null, 2);
                                }
                                catch (ex) {
                                    this.configs[key].value = '{}';
                                }
                            }
                            else if (typeof stored === 'string') {
                                this.configs[key].value = stored;
                            }
                            else {
                                this.configs[key].value = '{}';
                            }
                        }
                        else {
                            this.configs[key].value = stored;
                        }
                        this.configs[key].enforced = !!enforceData[key];
                    }
                }
                if (this.diff.indexOf('filter_preset') === -1 && typeof data.filter_preset === 'undefined') {
                    var hasBlacklist = (data.eb && data.eb.length) || (data.upb && data.upb.length) || (data.sb && data.sb.length) || (data.esb && Object.keys(data.esb || {}).length);
                    var hasWhitelist = (data.ew && data.ew.length) || (data.upw && data.upw.length) || (data.sw && data.sw.length) || (data.esw && Object.keys(data.esw || {}).length);
                    if (hasBlacklist && !hasWhitelist) {
                        this.configs.filter_preset.value = 'Blacklisting';
                    }
                    else if (hasWhitelist && !hasBlacklist) {
                        this.configs.filter_preset.value = 'Whitelisting';
                    }
                    else {
                        this.configs.filter_preset.value = this.configs.filter_preset.default;
                    }
                }

                return this.configs;
            },
            isTableLoading: function() {
                return this.$store.getters["countlySDK/sdk/isTableLoading"];
            },
            showExperimental: function() {
                return shouldShowExperimental;
            }
        },
        data: function() {
            return {
                groups: {
                    global: {
                        label: "Global Controls",
                        list: ["tracking", "networking"]
                    },
                    features: {
                        label: "SDK Features",
                        list: ["crt", "vt", "st", "cet", "lt", "ecz", "cr", "rcz"]
                    },
                    settings: {
                        label: "SDK Settings",
                        list: ["sui", "eqs", "rqs", "czi", "dort", "scui"]
                    },
                    backoff: {
                        label: "Backoff Settings",
                        list: ["bom_preset", "bom", "bom_at", "bom_rqp", "bom_ra", "bom_d"]
                    },
                    limits: {
                        label: "SDK Limits",
                        list: ["lkl", "lvs", "lsv", "lbc", "ltlpt", "ltl"]
                    },
                    experimental: {
                        label: "Experimental",
                        list: ["upcl", "filter_preset", "eb", "upb", "sb", "esb", "ew", "upw", "sw", "esw"]
                    },
                },
                configs: {
                    tracking: {
                        type: "switch",
                        name: "Allow Tracking",
                        description: "Enable or disable any tracking (gathering) of data in the SDK",
                        default: true,
                        enforced: false,
                        value: null
                    },
                    networking: {
                        type: "switch",
                        name: "Allow Networking",
                        description: "Enable or disable all networking calls from SDK except SDK behavior call. Does not effect tracking of data",
                        default: true,
                        enforced: false,
                        value: null
                    },
                    crt: {
                        type: "switch",
                        name: "Allow Crash Tracking",
                        description: "Enable or disable tracking of crashes",
                        default: true,
                        enforced: false,
                        value: null
                    },
                    vt: {
                        type: "switch",
                        name: "Allow View Tracking",
                        description: "Enable or disable tracking of views",
                        default: true,
                        enforced: false,
                        value: null
                    },
                    st: {
                        type: "switch",
                        name: "Allow Session Tracking",
                        description: "Enable or disable tracking of sessions",
                        default: true,
                        enforced: false,
                        value: null
                    },
                    sui: {
                        type: "number",
                        name: "Session Update Interval",
                        description: "How often to send session update information to server in seconds",
                        default: 60,
                        enforced: false,
                        value: null
                    },
                    cet: {
                        type: "switch",
                        name: "Allow Custom Event Tracking",
                        description: "Enable or disable tracking of custom events",
                        default: true,
                        enforced: false,
                        value: null
                    },
                    lt: {
                        type: "switch",
                        name: "Allow Location Tracking",
                        description: "Enable or disable tracking of location",
                        default: true,
                        enforced: false,
                        value: null
                    },
                    ecz: {
                        type: "switch",
                        name: "Enable Content Zone",
                        description: "Enable or disable listening to Journey related contents",
                        default: false,
                        enforced: false,
                        value: null
                    },
                    cr: {
                        type: "switch",
                        name: "Require Consent",
                        description: "Enable or disable requiring consent for tracking",
                        default: false,
                        enforced: false,
                        value: null
                    },
                    rqs: {
                        type: "number",
                        name: "Request Queue Size",
                        description: "How many requests to store in queue, if SDK cannot connect to server",
                        default: 1000,
                        enforced: false,
                        value: null
                    },
                    eqs: {
                        type: "number",
                        name: "Event Queue Size",
                        description: "How many events to store in queue before they would be batched and sent to server",
                        default: 100,
                        enforced: false,
                        value: null
                    },
                    czi: {
                        type: "number",
                        name: "Content Zone Interval",
                        description: "How often to check for new Journey content in seconds (min: 15)",
                        default: 30,
                        enforced: false,
                        value: null
                    },
                    dort: {
                        type: "number",
                        name: "Request Drop Age",
                        description: "Provide time in hours after which an old request should be dropped if they are not sent to server (0 = disabled)",
                        default: 0,
                        enforced: false,
                        value: null
                    },
                    lkl: {
                        type: "number",
                        name: "Max Key Length",
                        description: "Maximum length of Event and segment keys (including name)",
                        default: 128,
                        enforced: false,
                        value: null
                    },
                    lvs: {
                        type: "number",
                        name: "Max Value Size",
                        description: "Maximum length of an Event's segment value",
                        default: 256,
                        enforced: false,
                        value: null
                    },
                    lsv: {
                        type: "number",
                        name: "Max Number of Segments",
                        description: "Maximum amount of segmentation key/value pairs per Event",
                        default: 100,
                        enforced: false,
                        value: null
                    },
                    lbc: {
                        type: "number",
                        name: "Max Breadcrumb Count",
                        description: "Maximum breadcrumb count that can be provided by the developer",
                        default: 100,
                        enforced: false,
                        value: null
                    },
                    ltlpt: {
                        type: "number",
                        name: "Max Trace Line Per Thread",
                        description: "Maximum stack trace lines that would be recorded per thread",
                        default: 30,
                        enforced: false,
                        value: null
                    },
                    ltl: {
                        type: "number",
                        name: "Max Trace Length Per Line",
                        description: "Maximum length of a stack trace line to be recorded",
                        default: 200,
                        enforced: false,
                        value: null
                    },
                    scui: {
                        type: "number",
                        name: "SDK Behavior Update Interval",
                        description: "How often to check for new behavior settings in hours",
                        default: 4,
                        enforced: false,
                        value: null
                    },
                    rcz: {
                        type: "switch",
                        name: "Allow Refresh Content Zone",
                        description: "Enable or disable refreshing Journey content",
                        default: true,
                        enforced: false,
                        value: null
                    },
                    bom_preset: {
                        type: "preset",
                        name: "Backoff Preset",
                        description: "Choose a preset for backoff settings or customize manually",
                        default: "Default",
                        enforced: false,
                        value: null,
                        presets: [
                            {
                                name: "Default",
                                values: { bom: true, bom_at: 10, bom_rqp: 50, bom_ra: 24, bom_d: 60 }
                            },
                            {
                                name: "Aggressive",
                                values: { bom: true, bom_at: 5, bom_rqp: 80, bom_ra: 12, bom_d: 30 }
                            },
                            {
                                name: "Relaxed",
                                values: { bom: true, bom_at: 20, bom_rqp: 20, bom_ra: 48, bom_d: 120 }
                            },
                            {
                                name: "Custom",
                            }
                        ]
                    },
                    bom: {
                        type: "switch",
                        name: "Enable Backoff Mechanism",
                        description: "Enable or disable backoff mechanism for requests",
                        default: true,
                        enforced: false,
                        value: null
                    },
                    bom_at: {
                        type: "number",
                        name: "Backoff Timeout Limit",
                        description: "Maximum server delay acceptable before backoff mechanism can kick in",
                        default: 10,
                        enforced: false,
                        value: null
                    },
                    bom_rqp: {
                        type: "number",
                        name: "Backoff Requests Queue Percentage",
                        description: "Percentage of fullness that is acceptable for backoff mechanism to work",
                        default: 50,
                        enforced: false,
                        value: null
                    },
                    bom_ra: {
                        type: "number",
                        name: "Backoff Requests Age",
                        description: "Maximum amount of request age(in hours) that is allowed in backoff",
                        default: 24,
                        enforced: false,
                        value: null
                    },
                    bom_d: {
                        type: "number",
                        name: "Backoff Delay",
                        description: "Delay in seconds that would be applied to requests in backoff",
                        default: 60,
                        enforced: false,
                        value: null
                    },
                    upcl: {
                        type: "number",
                        name: "User Property Cache",
                        description: "How many user property to store in cache before they would be batched and sent to server",
                        default: 100,
                        enforced: false,
                        value: null
                    },
                    filter_preset: {
                        type: "preset",
                        name: "Filtering Preset",
                        description: "Choose whether to use Blacklisting or Whitelisting presets for filtering",
                        default: "Blacklisting",
                        enforced: false,
                        value: null,
                        presets: [
                            { name: "Blacklisting" },
                            { name: "Whitelisting" },
                        ]
                    },
                    eb: {
                        type: "text",
                        name: "Event Blacklist",
                        description: "CSV* list of custom event keys to blacklist in SDK<br>* Use double quotes for values with commas",
                        default: "",
                        enforced: false,
                        value: null,
                        attrs: { type: 'textarea', rows: 4, placeholder: 'event1,event2 or "event3"' }
                    },
                    upb: {
                        type: "text",
                        name: "User Property Blacklist",
                        description: "CSV* list of user property keys to blacklist in SDK<br>* Use double quotes for values with commas",
                        default: "",
                        enforced: false,
                        value: null,
                        attrs: { type: 'textarea', rows: 4, placeholder: 'prop1,prop2 or "prop3"' }
                    },
                    sb: {
                        type: "text",
                        name: "Segmentation Blacklist",
                        description: "CSV* list of segmentation keys to blacklist in SDK<br>* Use double quotes for values with commas",
                        default: "",
                        enforced: false,
                        value: null,
                        attrs: { type: 'textarea', rows: 4, placeholder: 'key1,key2 or "key3"' }
                    },
                    esb: {
                        type: "text",
                        name: "Event Segmentation Blacklist",
                        description: "Arrays of segmentation keys to blacklist for specific events<br> Example: { \"event1\": [\"seg1\", \"seg2\"] }",
                        default: "{}",
                        enforced: false,
                        value: null,
                        attrs: { type: 'textarea', rows: 6, placeholder: '{"event1": ["seg1","seg2"]}' }
                    },
                    ew: {
                        type: "text",
                        name: "Event Whitelist",
                        description: "CSV* list of custom event keys to whitelist in SDK<br>* Use double quotes for values with commas",
                        default: "",
                        enforced: false,
                        value: null,
                        attrs: { type: 'textarea', rows: 4, placeholder: 'event1,event2 or "event3"' }
                    },
                    upw: {
                        type: "text",
                        name: "User Property Whitelist",
                        description: "CSV* list of user property keys to whitelist in SDK<br>* Use double quotes for values with commas",
                        default: "",
                        enforced: false,
                        value: null,
                        attrs: { type: 'textarea', rows: 4, placeholder: 'prop1,prop2 or "prop3"' }
                    },
                    sw: {
                        type: "text",
                        name: "Segmentation Whitelist",
                        description: "CSV* list of segmentation keys to whitelist in SDK<br>* Use double quotes for values with commas",
                        default: "",
                        enforced: false,
                        value: null,
                        attrs: { type: 'textarea', rows: 4, placeholder: 'key1,key2 or "key3"' }
                    },
                    esw: {
                        type: "text",
                        name: "Event Segmentation Whitelist",
                        description: "Arrays of segmentation keys to whitelist for specific events<br> Example: { \"event1\": [\"seg1\", \"seg2\"] }",
                        default: "{}",
                        enforced: false,
                        value: null,
                        attrs: { type: 'textarea', rows: 6, placeholder: '{"event1": ["seg1","seg2"]}' }
                    }
                },
                diff: [],
                validationErrors: {},
                isSaving: true,
                description: "Not all SDKs and SDK versions yet support this feature. Refer to respective SDK documentation for more information"
            };
        },
        mounted: function() {
            var self = this;
            this.$nextTick(function() {
                self.checkSdkSupport(0);
                self.isJSONInputValid('esb');
                self.isJSONInputValid('esw');
            });
        },
        methods: {
            /**
             * returns whether a given key should be shown in the UI
             * @param {string} key - Config key to check
             * @returns {boolean} - True if should be shown, false otherwise
             */
            shouldShowKey: function(key) {
                if (!this.getData || !this.getData[key]) {
                    return false;
                }
                if (!shouldShowExperimental && experimentalKeys.indexOf(key) !== -1) {
                    return false;
                }
                if (key === 'filter_preset') {
                    return true;
                }
                var blacklistKeys = ['eb', 'upb', 'sb', 'esb'];
                var whitelistKeys = ['ew', 'upw', 'sw', 'esw'];
                if (blacklistKeys.indexOf(key) !== -1) {
                    return (this.getData.filter_preset && (this.getData.filter_preset.value === 'Blacklisting'));
                }
                if (whitelistKeys.indexOf(key) !== -1) {
                    return (this.getData.filter_preset && (this.getData.filter_preset.value === 'Whitelisting'));
                }
                return (blacklistKeys.concat(whitelistKeys).indexOf(key) === -1);
            },

            /**
             * normalized value retrieval (uses explicit value or default)
             * @param {string} key - Config key to get value for
             * @returns {*} - Normalized value (explicit or default)
             */
            valueFor: function(key) {
                if (!this.getData || !this.getData[key]) {
                    return undefined;
                }
                // prefer explicit value if not null/undefined
                var val = this.getData[key].value;
                if (typeof val !== 'undefined' && val !== null) {
                    return val;
                }
                return this.getData[key].default;
            },

            /**
             * Generate slug/test-id from display name or fallback key
             * @param {string} key - Config key to get slug for
             * @returns {string} - Slugified version of the display name or key
             */
            slugFor: function(key) {
                if (!this.getData || !this.getData[key]) {
                    return key;
                }
                var name = this.getData[key].name || key;
                return name.toLowerCase().replaceAll(' ', '-');
            },

            onChange: function(key, value) {
                log("SDK:onChange", { key: key, value: value, diffLength: this.diff.length });
                this.configs[key].value = value;
                if (key.startsWith("bom")) {
                    this.getData.bom_preset.value = "Custom";
                    if (this.diff.indexOf("bom_preset") === -1) {
                        this.diff.push("bom_preset");
                    }
                }
                if (jsonExperimentalKeys.indexOf(key) !== -1) {
                    this.isJSONInputValid(key);
                }
                if (this.diff.indexOf(key) === -1) {
                    this.diff.push(key);
                }
                else {
                    var params = this.$store.getters["countlySDK/sdk/all"];
                    var data = params || {};
                    if (typeof data[key] !== "undefined") {
                        if (data[key] === value) {
                            this.diff.splice(this.diff.indexOf(key), 1);
                        }
                    }
                    else if (this.configs[key].default === value) {
                        this.diff.splice(this.diff.indexOf(key), 1);
                    }
                }
            },

            /**
            * Quoted CSV to array parser
            * @param {String} str - CSV string
            * @returns {Array} - Array of parsed values
            */
            csvToArray: function(str) {
                if (typeof str !== 'string') {
                    return [];
                }
                var re = /(?:\s*("(?:[^"]|"")*"|[^,]*?)\s*)(?:,|$)/g;
                return Array.from(str.matchAll(re))
                    .map(function(m) {
                        var val = m[1];
                        if (!val) {
                            return null;
                        }
                        if (val.charAt(0) === '"' && val.charAt(val.length - 1) === '"') {
                            val = val.slice(1, -1).replace(/""/g, '"');
                        }
                        else {
                            val = val.trim();
                        }
                        return val.length ? val : null;
                    })
                    .filter(function(v) {
                        return v !== null;
                    });
            },

            /**
             * Convert an array to a CSV string
             * @param {Array} arr - Array of values
             * @returns {String} - CSV string
             */
            arrayToCsv: function(arr) {
                if (!Array.isArray(arr)) {
                    return '';
                }
                return arr.filter(function(e) {
                    return e !== null;
                }).map(function(e) {
                    e = String(e);
                    // quote if contains comma, quote, newline or carriage return, or starts/ends with whitespace
                    if (/[,"\n\r]/.test(e) || /^\s|\s$/.test(e)) {
                        return '"' + e.replace(/"/g, '""') + '"';
                    }
                    return e;
                }).join(',');
            },

            /**
             * Validate a string input and set validationErrors accordingly
             * @param {String} key - Config key to validate
             * @returns {Boolean} - True if valid, false otherwise
             */
            isJSONInputValid: function(key) {
                if (!key) {
                    return true;
                }
                var val = this.configs[key].value;
                if (typeof val === 'string') {
                    try {
                        JSON.parse(val);
                        this.validationErrors[key] = '';
                        return true;
                    }
                    catch (ex) {
                        this.validationErrors[key] = ex.message || 'Invalid JSON';
                        return false;
                    }
                }
                else if (typeof val === 'object') { // already parsed
                    this.validationErrors[key] = '';
                    return true;
                }
                else {
                    this.validationErrors[key] = 'Invalid JSON';
                    return false;
                }
            },
            downloadConfig: function() {
                log("SDK:downloadConfig:start");
                var params = this.$store.getters["countlySDK/sdk/all"] || {};
                // we change bom_rqp to decimal percentage for sdk
                if (typeof params.bom_rqp !== "undefined") {
                    params.bom_rqp = params.bom_rqp / 100;
                }
                for (var key in params) {
                    if (this.configs[key] && this.configs[key].type === "preset") {
                        // remove presets from params
                        delete params[key];
                    }
                    if (this.configs[key] && this.configs[key].enforced === false) {
                        delete params[key];
                    }
                }

                var data = {};
                data.v = SC_VER;
                data.t = Date.now();
                data.c = params;
                var configData = JSON.stringify(data, null, 2);
                log("SDK:downloadConfig:payloadSize", configData.length);
                var blob = new Blob([configData], { type: 'application/json' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'sdk-config.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            },
            onPresetChange(key, preset) {
                log("SDK:onPresetChange", { key: key, preset: preset && preset.name });
                this.getData[key].value = preset.name;
                if (this.diff.indexOf(key) === -1) {
                    this.diff.push(key);
                }

                if (preset.values) {
                    Object.keys(preset.values).forEach(param => {
                        this.configs[param].value = preset.values[param];
                        if (this.diff.indexOf(param) === -1) {
                            this.diff.push(param);
                        }
                    });
                }
                if (key === 'filter_preset') {
                    if (preset.name === 'Blacklisting') {
                        ['ew', 'upw', 'sw', 'esw'].forEach(function(k) {
                            if (this.configs[k]) {
                                this.configs[k].enforced = false;
                                if (this.diff.indexOf(k) === -1) {
                                    this.diff.push(k);
                                }
                            }
                        }, this);
                    }
                    else if (preset.name === 'Whitelisting') {
                        ['eb', 'upb', 'sb', 'esb'].forEach(function(k) {
                            if (this.configs[k]) {
                                this.configs[k].enforced = false;
                                if (this.diff.indexOf(k) === -1) {
                                    this.diff.push(k);
                                }
                            }
                        }, this);
                    }
                }
            },
            enforce(key) {
                if (key && !this.configs[key]) {
                    key = null; // if key is not valid, enforce all
                }
                var helper_msg = "You are about to apply all current settings. This will override these settings in your SDK. Do you want to continue?";
                var helper_title = "Apply all current settings?";
                if (key) {
                    helper_msg = "You are about to apply the current setting. This will override this setting in your SDK. Do you want to continue?";
                    helper_title = "Apply current setting?";
                }
                var self = this;
                log(`enforce:[${key}]`);

                CountlyHelpers.confirm(helper_msg, "green", function(result) {
                    if (!result) {
                        return true;
                    }
                    var enforcement = Object.assign({}, self.$store.getters["countlySDK/sdk/enforcement"]);
                    if (key) {
                        log(`enforcing key ${key}`);
                        self.diff.push(key);
                        self.configs[key].enforced = true;
                        enforcement[key] = true;
                    }
                    else {
                        for (var k in self.configs) {
                            log(`enforcing all ${k}`);
                            if (self.diff.indexOf(k) === -1) {
                                self.diff.push(k);
                                self.configs[k].enforced = true;
                                enforcement[k] = true;
                            }
                        }
                    }
                    self.save(enforcement);
                },
                ["Cancel", "Apply to SDKs"],
                { title: helper_title }
                );
            },
            reverseEnforce: function(key) {
                if (key && !this.configs[key]) {
                    return;
                }
                var helper_msg = "SDKs will use their default or developer set behavior (if any). Are you sure you want to remove this setting?";
                var helper_title = "Remove from SDKs";
                var self = this;
                CountlyHelpers.confirm(helper_msg, "red", function(result) {
                    if (!result) {
                        return true;
                    }
                    if (key) {
                        self.configs[key].enforced = false;

                        var enforcement = Object.assign({}, self.$store.getters["countlySDK/sdk/enforcement"]);

                        log(`reversing enforce key ${key}`);
                        enforcement[key] = false;
                        self.$store.dispatch("countlySDK/sdk/updateEnforcement", enforcement).then(function() {
                            log("SDK:reverseEnforce:dispatched", { key: key });
                            self.$store.dispatch("countlySDK/initializeEnforcement");
                        }).catch(function(err) {
                            log("SDK:reverseEnforce:error", err);
                        });
                    }
                },
                ["Cancel", "Remove from SDKs"],
                { title: helper_title }
                );
            },
            resetSDKConfiguration: function() {
                var helper_msg = "You are about to reset all your SDK behavior settings values to their default state. Do you want to continue?";
                var helper_title = "Reset Behavior?";
                var self = this;

                CountlyHelpers.confirm(helper_msg, "red", function(result) {
                    if (!result) {
                        return true;
                    }

                    var params = self.$store.getters["countlySDK/sdk/all"];
                    var data = params || {};

                    log("SDK:reset:start", { currentParams: data });

                    for (var key in self.configs) {
                        var current = self.configs[key].value;
                        var def = self.configs[key].default;

                        // Reset only if not already default
                        if (current !== def) {
                            self.configs[key].value = def;

                            if (self.diff.indexOf(key) === -1) {
                                self.diff.push(key);
                            }

                            // Clean up diff if value matches SDK or default
                            if (typeof data[key] !== "undefined") {
                                if (data[key] === def) {
                                    self.diff.splice(
                                        self.diff.indexOf(key),
                                        1
                                    );
                                }
                            }
                            else if (def === self.configs[key].default) {
                                self.diff.splice(self.diff.indexOf(key), 1);
                            }
                        }
                    }
                    if (self.diff.length !== 0) {
                        try {
                            if (typeof self.configs.esb.value === 'string') {
                                JSON.parse(self.configs.esb.value || '{}');
                            }
                            if (typeof self.configs.esw.value === 'string') {
                                JSON.parse(self.configs.esw.value || '{}');
                            }
                        }
                        catch (ex) {
                            CountlyHelpers.notify({ message: ex.message || 'Invalid experimental configuration', sticky: false, type: 'error' });
                            return;
                        }
                        var changedKeys = self.diff.slice();
                        log("SDK:reset:changedKeys", changedKeys);
                        self.save();
                    }
                },
                ["Cancel", "Reset to default"],
                { title: helper_title }
                );
            },
            save: function(enforcement) {
                if (this.validationErrors && Object.keys(this.validationErrors).some(function(k) {
                    return !!this.validationErrors[k];
                }, this)) {
                    CountlyHelpers.notify({ message: 'Please fix format errors before saving', sticky: false, type: 'error' });
                    return;
                }
                var params = this.$store.getters["countlySDK/sdk/all"];
                log("SDK:save:start", { enforcement: enforcement, params: params, diff: this.diff.slice() });
                var data = params || {};
                for (var i = 0; i < this.diff.length; i++) {
                    var dkey = this.diff[i];
                    var val = this.configs[dkey].value;
                    if (nonJSONExperimentalKeys.indexOf(dkey) !== -1) {
                        if (typeof val === 'string') {
                            var arr = this.csvToArray(val);
                            data[dkey] = arr;
                        }
                        else if (Array.isArray(val)) {
                            data[dkey] = val;
                        }
                        else {
                            data[dkey] = [];
                        }
                    }
                    else if (jsonExperimentalKeys.indexOf(dkey) !== -1) {
                        if (typeof val === 'string') {
                            try {
                                data[dkey] = JSON.parse(val || '{}');
                            }
                            catch (ex) {
                                CountlyHelpers.notify({ message: (dkey === 'esb' ? 'Event Segmentation Blacklist' : 'Event Segmentation Whitelist') + ' contains invalid JSON', sticky: false, type: 'error' });
                                return;
                            }
                        }
                        else if (typeof val === 'object') {
                            data[dkey] = val;
                        }
                        else {
                            data[dkey] = {};
                        }
                    }
                    else {
                        data[dkey] = val;
                    }
                    log("SDK:save:field", { key: dkey, value: data[dkey] });
                    this.configs[dkey].enforced = true;
                }
                if (this.diff.indexOf('filter_preset') !== -1) {
                    var presetValue = this.configs.filter_preset.value;

                    if (!enforcement) {
                        enforcement = {};
                        for (var ek in this.configs) {
                            enforcement[ek] = !!this.configs[ek].enforced;
                        }
                    }

                    if (presetValue === 'Blacklisting') {
                        ['ew', 'upw', 'sw', 'esw'].forEach(function(k) {
                            enforcement[k] = false;
                            if (this.configs[k]) {
                                this.configs[k].enforced = false;
                            }
                        }, this);
                    }
                    else if (presetValue === 'Whitelisting') {
                        ['eb', 'upb', 'sb', 'esb'].forEach(function(k) {
                            enforcement[k] = false;
                            if (this.configs[k]) {
                                this.configs[k].enforced = false;
                            }
                        }, this);
                    }
                }
                if (!enforcement) {
                    enforcement = {};
                    for (var key in this.configs) {
                        enforcement[key] = this.configs[key].enforced;
                    }
                }
                this.diff = [];
                var self = this;
                this.$store.dispatch("countlySDK/sdk/updateEnforcement", enforcement).then(() => {
                    self.$store.dispatch("countlySDK/initializeEnforcement");
                    log("SDK:updateEnforcement:dispatched", enforcement);
                }).catch(function(err) {
                    log("SDK:updateEnforcement:error", err);
                });
                this.$store.dispatch("countlySDK/sdk/update", data).then(function() {
                    self.$store.dispatch("countlySDK/initialize");
                    log("SDK:save:success", { data: data, enforcement: enforcement });
                }).catch(function(err) {
                    log("SDK:save:error", err);
                });
            },
            unpatch: function() {
                this.diff = [];
                var params = this.$store.getters["countlySDK/sdk/all"];
                log("unpatch", params);
                var data = params || {};
                for (var key in this.configs) {
                    var stored = typeof data[key] !== "undefined" ? data[key] : this.configs[key].default;
                    if (nonJSONExperimentalKeys.indexOf(key) !== -1) {
                        if (Array.isArray(stored)) {
                            this.configs[key].value = this.arrayToCsv(stored);
                        }
                        else if (typeof stored === 'string') {
                            this.configs[key].value = stored;
                        }
                        else {
                            this.configs[key].value = '';
                        }
                    }
                    else if (jsonExperimentalKeys.indexOf(key) !== -1) {
                        if (typeof stored === 'object') {
                            try {
                                this.configs[key].value = JSON.stringify(stored, null, 2);
                            }
                            catch (ex) {
                                this.configs[key].value = '{}';
                            }
                        }
                        else if (typeof stored === 'string') {
                            this.configs[key].value = stored;
                        }
                        else {
                            this.configs[key].value = '{}';
                        }
                        this.isJSONInputValid(key); // re-validate after discarding changes
                    }
                    else {
                        this.configs[key].value = stored;
                    }
                }
            },
            semverToNumber: function(version) {
                // log("semverToNumber", version);
                if (typeof version !== 'string') {
                    return -1;
                }

                version = version.split("-")[0];
                var letterIndex = version.search(/[a-zA-Z]/);
                if (letterIndex !== -1) {
                    version = version.substring(0, letterIndex);
                }

                const semverRegex = /^(\d+)\.(\d+)\.(\d+)$/;
                const match = version.match(semverRegex);

                if (!match) {
                    return -1;
                }

                const major = parseInt(match[1], 10);
                const minor = parseInt(match[2], 10);
                const patch = parseInt(match[3], 10);

                return major * 1000000 + minor * 1000 + patch;
            },
            compareVersions: function(context, a, b, text) {
                // log("compareVersions", context, a, b, text);
                if (!a) {
                    return;
                }

                const aValue = this.semverToNumber(a);
                const bValue = this.semverToNumber(b);

                if (aValue === -1 || bValue === -1) {
                    context.unsupportedList.push(text);
                    return;
                }

                if (aValue >= bValue) {
                    context.supportLevel += 1;
                }
                else {
                    context.unsupportedList.push(text);
                }
            },
            checkSdkSupport: function(retryCount) {
                log("checkSdkSupport");
                for (var key in this.configs) {
                    this.configs[key].experimental = false;
                    this.configs[key].tooltipMessage = "No SDK data present. Please use the latest versions of Android, Web, iOS, Flutter or RN SDKs to use this option.";
                    if (key === 'upcl' || key === 'eb' || key === 'upb' || key === 'sb' || key === 'esb' || key === 'ew' || key === 'upw' || key === 'sw' || key === 'esw' || key === 'filter_preset') {
                        this.configs[key].experimental = true;
                        this.configs[key].tooltipMessage = "This is an experimental option. SDK support for this option may be limited or unavailable.";
                    }
                    this.configs[key].tooltipClass = 'tooltip-neutral';
                }

                if (!this.$store.state.countlySDK ||
                    !this.$store.state.countlySDK.stats ||
                    !this.$store.state.countlySDK.stats.sdk ||
                    !this.$store.state.countlySDK.stats.sdk.versions ||
                    this.$store.state.countlySDK.stats.sdk.versions.length === 0) {
                    log("SDK data not yet available, retrying. countlySDK:[" + JSON.stringify(this.$store.state.countlySDK) + "]");
                    setTimeout(() => {
                        retryCount = (retryCount || 0) + 1;
                        if (retryCount > 10) {
                            log("Max retries reached, giving up.");
                            return;
                        }
                        this.checkSdkSupport(retryCount);
                    }, 1000);
                    return;
                }

                log("SDK data available, processing:[" + JSON.stringify(this.$store.state.countlySDK.stats.sdk.versions) + "]");
                const availableData = this.$store.state.countlySDK.stats.sdk.versions;
                const latestVersions = availableData.reduce((acc, sdk) => {
                    if (!sdk.data || sdk.data.length === 0) {
                        return acc;
                    }
                    acc[sdk.label] = sdk.data[0].sdk_version;
                    for (var i = 1; i < sdk.data.length; i++) {
                        if (this.semverToNumber(acc[sdk.label]) < this.semverToNumber(sdk.data[i].sdk_version)) {
                            acc[sdk.label] = sdk.data[i].sdk_version;
                        }
                    }
                    return acc;
                }, {});

                const platforms = [
                    { label: 'javascript_native_web', configKey: 'web', name: 'Web SDK' },
                    { label: 'java-native-android', configKey: 'android', name: 'Android SDK' },
                    { label: 'objc-native-ios', configKey: 'ios', name: 'iOS SDK' },
                    { label: 'dart-flutterb-android', configKey: 'flutter', name: 'Flutter SDK' },
                    { label: 'dart-flutterbnp-android', configKey: 'flutter', name: 'Flutter SDK' },
                    { label: 'dart-flutterb-web', configKey: 'flutter', name: 'Flutter SDK' },
                    { label: 'dart-flutterb-ios', configKey: 'flutter', name: 'Flutter SDK' },
                    { label: 'dart-flutterbnp-ios', configKey: 'flutter', name: 'Flutter SDK' },
                    { label: 'js-rnb-android', configKey: 'react_native', name: 'React Native SDK' },
                    { label: 'js-rnbnp-android', configKey: 'react_native', name: 'React Native SDK' },
                    { label: 'js-rnb-ios', configKey: 'react_native', name: 'React Native SDK' },
                    { label: 'js-rnbnp-ios', configKey: 'react_native', name: 'React Native SDK' },
                    { label: 'dart-native', configKey: 'dart', name: 'Dart SDK' } // TODO: this might change if naming changes
                ];

                const uniqueLabels = new Set();
                platforms.forEach(p => {
                    if (latestVersions[p.label]) {
                        uniqueLabels.add(p.label);
                    }
                });
                let viableSDKCount = uniqueLabels.size;

                const configKeyList = Object.keys(this.configs);
                configKeyList.forEach(configKey => {
                    const configSupportedVersions = supportedSDKVersion[configKey];
                    if (!configSupportedVersions) {
                        return;
                    }
                    var context = { supportLevel: 0, unsupportedList: [] };
                    platforms.forEach(p => {
                        this.compareVersions(context, latestVersions[p.label], configSupportedVersions[p.configKey], p.name);
                    });
                    if (viableSDKCount > 0 && context.supportLevel === viableSDKCount) {
                        this.configs[configKey].tooltipMessage = 'You are using SDKs that support this option.';
                        this.configs[configKey].tooltipClass = 'tooltip-success';
                    }
                    else if (context.unsupportedList.length > 0) { // some/all wrong version
                        this.configs[configKey].tooltipMessage = 'Some SDKs you use do not support this option: ' + context.unsupportedList.join(', ') + '. Try upgrading to the latest version.';
                        this.configs[configKey].tooltipClass = 'tooltip-warning';
                    }
                    else { // none supported
                        this.configs[configKey].tooltipMessage = 'None of the SDKs you use support this option. Please use the latest versions of Android, Web, iOS, Flutter or RN SDKs to use this option.';
                        this.configs[configKey].tooltipClass = 'tooltip-danger';
                    }
                });
                this.$forceUpdate();
            }
        }
    });
    countlyVue.container.registerTab("/manage/sdk", {
        priority: 2,
        route: "#/manage/sdk/configurations",
        component: SDKConfigurationView,
        title: "SDK Behavior Settings",
        name: "configurations",
        permission: FEATURE_NAME,
        vuex: [
            {
                clyModel: countlySDK
            }
        ]
    });

    var SDKStatsView = countlyVue.views.create({
        template: CV.T("/sdk/templates/stats.html"),
        data: function() {
            return {
                scrollCards: {
                    vuescroll: {},
                    scrollPanel: {
                        initialScrollX: false,
                    },
                    rail: {
                        gutterOfSide: "0px"
                    },
                    bar: {
                        background: "#A7AEB8",
                        size: "6px",
                        specifyBorderRadius: "3px",
                        keepShow: false
                    }
                },
                breakdownScrollOps: {
                    vuescroll: {},
                    scrollPanel: {
                        initialScrollX: false,
                    },
                    rail: {
                        gutterOfSide: "1px",
                        gutterOfEnds: "15px"
                    },
                    bar: {
                        background: "#A7AEB8",
                        size: "6px",
                        specifyBorderRadius: "3px",
                        keepShow: true
                    }
                },
                dynamicTab: "sdk-table",
                sdkTabs: [
                    {
                        title: "SDKs",
                        name: "sdk-table",
                        component: countlyVue.views.create({
                            template: CV.T("/sdk/templates/sdk_table.html"),
                            computed: {
                                sdk: function() {
                                    return this.$store.state.countlySDK.stats.sdk;
                                },
                                sdkRows: function() {
                                    return this.sdk.chartData;
                                },
                                isLoading: function() {
                                    return this.$store.state.countlySDK.stats.isLoading;
                                }
                            },
                            methods: {
                                numberFormatter: function(row, col, value) {
                                    return countlyCommon.formatNumber(value, 0);
                                }
                            }
                        })
                    },
                    {
                        title: "SDK Versions",
                        name: "version-table",
                        component: countlyVue.views.create({
                            template: CV.T("/sdk/templates/version_table.html"),
                            data: function() {
                                return {
                                    versions: [],
                                    versionDetail: []
                                };
                            },
                            computed: {
                                isLoading: function() {
                                    return this.$store.state.countlySDK.stats.isLoading;
                                },
                                sdk: function() {
                                    return this.$store.state.countlySDK.stats.sdk;
                                },
                                selectedSDK: {
                                    set: function(value) {
                                        this.$store.dispatch('countlySDK/onSetSelectedSDK', value);
                                    },
                                    get: function() {
                                        return this.$store.state.countlySDK.stats.selectedSDK;
                                    }
                                }
                            },
                            watch: {
                                selectedSDK: function(newValue) {
                                    this.calculateVersions(newValue);
                                },
                                versions: function() {
                                    this.calculateVersionsDetail();
                                }
                            },
                            methods: {
                                calculateVersions: function(newValue) {
                                    if (newValue) {
                                        this.$store.dispatch('countlySDK/onSetSelectedSDK', newValue);
                                    }
                                    else {
                                        this.selectedSDK = this.sdk.versions[0].label;
                                        this.$store.dispatch('countlySDK/onSetSelectedSDK', this.selectedSDK);
                                    }

                                    var tempVersions = [];
                                    for (var k = 0; k < this.sdk.versions.length; k++) {
                                        tempVersions.push({"value": this.sdk.versions[k].label, "name": this.sdk.versions[k].label});
                                    }

                                    this.versions = tempVersions;
                                },
                                calculateVersionsDetail: function() {
                                    var versionDetail = [];

                                    for (var k = 0; k < this.sdk.versions.length; k++) {
                                        if (this.sdk.versions[k].label === this.selectedSDK) {
                                            versionDetail = this.sdk.versions[k].data || [];
                                        }
                                    }
                                    this.versionDetail = versionDetail;
                                },
                                numberFormatter: function(row, col, value) {
                                    return countlyCommon.formatNumber(value, 0);
                                }
                            },
                            mounted: function() {
                                this.calculateVersions();
                                this.calculateVersionsDetail();
                            }
                        })
                    }
                ],
                versions: []
            };
        },
        mounted: function() {
            this.$store.dispatch('countlySDK/fetchSDKStats');
        },
        methods: {
            refresh: function() {
                this.$store.dispatch('countlySDK/fetchSDKStats');
            },
            handleCardsScroll: function() {
                if (this.$refs && this.$refs.bottomSlider) {
                    var pos1 = this.$refs.topSlider.getPosition();
                    pos1 = pos1.scrollLeft;
                    this.$refs.bottomSlider.scrollTo({x: pos1}, 0);
                }
            },
            handleBottomScroll: function() {
                if (this.$refs && this.$refs.topSlider) {
                    var pos1 = this.$refs.bottomSlider.getPosition();
                    pos1 = pos1.scrollLeft;
                    this.$refs.topSlider.scrollTo({x: pos1}, 0);
                }
            }
        },
        watch: {
            selectedSDK: function(newValue) {
                if (newValue) {
                    this.$store.dispatch('countlySDK/onSetSelectedSDK', newValue);
                }
                else {
                    this.selectedSDK = this.$store.state.countlySDK.stats.sdk.versions[0].label;
                    this.$store.dispatch('countlySDK/onSetSelectedSDK', this.selectedSDK);
                }
                var tempVersions = [];
                for (var k = 0; k < this.$store.state.countlySDK.stats.sdk.versions.length; k++) {
                    tempVersions.push({"value": this.$store.state.countlySDK.stats.sdk.versions[k].label, "name": this.$store.state.countlySDK.stats.sdk.versions[k].label});
                }
                this.versions = tempVersions;
            }
        },
        computed: {
            chooseDisplay: function() {
                return [{"value": "percentage", "name": "percentage"}, {"value": "value", "name": "values"}];
            },
            selectedProperty: {
                set: function(value) {
                    this.$store.dispatch('countlySDK/onSetSelectedProperty', value);
                },
                get: function() {
                    return this.$store.state.countlySDK.stats.selectedProperty;
                }
            },
            selectedDisplay: {
                set: function(value) {
                    this.$store.dispatch('countlySDK/onSetSelectedDisplay', value);
                },
                get: function() {
                    return this.$store.state.countlySDK.stats.selectedDisplay;
                }
            },
            selectedSDK: {
                set: function(value) {
                    this.$store.dispatch('countlySDK/onSetSelectedSDK', value);
                },
                get: function() {
                    return this.$store.state.countlySDK.stats.selectedSDK;
                }
            },
            graphColors: function() {
                return ["#017AFF", "#39C0C8", "#F5C900", "#6C47FF", "#017AFF"];
            },
            stats: function() {
                return this.$store.state.countlySDK.stats;
            },
            sdk: function() {
                return this.stats.sdk;
            },
            lineOptions: function() {
                return this.stats.chartData;
            },
            lineLegend: function() {
                return this.stats.legendData;
            },
            chooseProperties: function() {
                return [{"value": "t", "name": CV.i18n('common.table.total-sessions')}, {"value": "u", "name": CV.i18n('common.table.total-users')}, {"value": "n", "name": CV.i18n('common.table.new-users')}];
            },
            sdkItems: function() {
                var display = [];
                var property = this.$store.state.countlySDK.stats.selectedProperty;
                var data = this.sdk.chartData || [];

                for (var k = 0; k < data.length; k++) {
                    var percent = Math.round((data[k][property] || 0) * 1000 / (this.sdk.totals[property] || 1)) / 10;
                    display.push({
                        "name": data[k].sdks,
                        "value": countlyCommon.getShortNumber(data[k][property] || 0),
                        "percent": percent,
                        "percentText": percent + "% " + CV.i18n('common.of-total'),
                        "info": CV.i18n('common.info'),
                        "color": this.graphColors[k]
                    });
                }

                display.sort(function(a, b) {
                    return parseFloat(b.percent) - parseFloat(a.percent);
                });

                display = display.slice(0, 12);

                return display;
            },
            sdkVersions: function() {
                var property = this.$store.state.countlySDK.stats.selectedProperty;
                var returnData = [];
                var sdks = this.sdk.versions || [];

                for (var z = 0; z < sdks.length; z++) {
                    var display = [];
                    var data = sdks[z].data;
                    for (var k = 0; k < data.length; k++) {
                        var percent = Math.round((data[k][property] || 0) * 1000 / (sdks[z][property] || 1)) / 10;
                        display.push({
                            "name": data[k].sdk_version,
                            "description": countlyCommon.getShortNumber(data[k][property] || 0),
                            "percent": percent,
                            "bar": [{
                                percentage: percent,
                                color: this.graphColors[z]
                            }]
                        });
                    }
                    returnData.push({"values": display, "label": sdks[z].label, itemCn: display.length});
                }

                var orderedDataArray = [];

                for (var i = 0; i < this.sdkItems.length; i++) {
                    for (var j = 0; j < returnData.length; j++) {
                        if (this.sdkItems[i].name === returnData[j].label) {
                            orderedDataArray.push(returnData[j]);
                        }
                    }
                }

                return orderedDataArray;
            },
            sdkRows: function() {
                return this.sdk.chartData;
            },
            isLoading: function() {
                return this.$store.state.countlySDK.stats.isLoading;
            },
            tabs: function() {
                return this.sdkTabs;
            },
            topDropdown: function() {
                if (this.externalLinks && Array.isArray(this.externalLinks) && this.externalLinks.length > 0) {
                    return this.externalLinks;
                }
                else {
                    return null;
                }
            }
        },
        mixins: [
            countlyVue.container.dataMixin({
                'externalLinks': '/analytics/sdk/links'
            })
        ],

    });
    countlyVue.container.registerTab("/manage/sdk", {
        priority: 1,
        route: "#/manage/sdk/stats",
        component: SDKStatsView,
        title: "SDK Stats",
        name: "stats",
        permission: FEATURE_NAME,
        vuex: []
    });

    var SDKReqStatsView = countlyVue.views.create({
        template: CV.T("/sdk/templates/request_stats.html"),
        data: function() {
            return {

            };
        },
        mounted: function() {
            this.$store.dispatch('countlySDK/fetchSDKStats');
        },
        methods: {
            refresh: function() {
                this.$store.dispatch('countlySDK/fetchSDKStats');
            },
        },
        computed: {
            chooseDisplay: function() {
                return [{"value": "percentage", "name": "percentage"}, {"value": "value", "name": "values"}];
            },
            selectedDisplay: {
                set: function(value) {
                    this.$store.dispatch('countlySDK/onSetSelectedDisplay', value);
                },
                get: function() {
                    return this.$store.state.countlySDK.stats.selectedDisplay;
                }
            },
            graphColors: function() {
                return ["#017AFF", "#39C0C8", "#F5C900", "#6C47FF", "#017AFF"];
            },
            stats: function() {
                return this.$store.state.countlySDK.stats;
            },
            lineOptionsRequests: function() {
                return this.stats.requestChartData;
            },
            lineOptionsDelays: function() {
                return this.stats.delayChartData;
            },
            lineOptionsReceived: function() {
                return this.stats.receivedChartData;
            },
            lineOptionsCanceled: function() {
                return this.stats.canceledChartData;
            },
            totals: function() {
                return this.stats.requestTotals;
            },
            delays: function() {
                return this.stats.delayTotals;
            },
            isLoading: function() {
                return this.$store.state.countlySDK.stats.isLoading;
            }
        }
    });
    countlyVue.container.registerTab("/manage/sdk", {
        priority: 1,
        route: "#/manage/sdk/request_stats",
        component: SDKReqStatsView,
        title: "Request Stats",
        name: "request_stats",
        permission: FEATURE_NAME,
        vuex: []
    });

    var SDKHealthCheckView = countlyVue.views.create({
        template: CV.T("/sdk/templates/health_checks.html"),
        data: function() {
            return {

            };
        },
        mounted: function() {
            this.$store.dispatch('countlySDK/fetchSDKStats');
        },
        methods: {
            refresh: function() {
                this.$store.dispatch('countlySDK/fetchSDKStats');
            },
        },
        computed: {
            chooseDisplay: function() {
                return [{"value": "percentage", "name": "percentage"}, {"value": "value", "name": "values"}];
            },
            selectedDisplay: {
                set: function(value) {
                    this.$store.dispatch('countlySDK/onSetSelectedDisplay', value);
                },
                get: function() {
                    return this.$store.state.countlySDK.stats.selectedDisplay;
                }
            },
            graphColors: function() {
                return ["#017AFF", "#39C0C8", "#F5C900", "#6C47FF", "#017AFF"];
            },
            stats: function() {
                return this.$store.state.countlySDK.stats;
            },
            lineOptionsHCs: function() {
                return this.stats.healthCheckChartData;
            },
            lineOptionsStatusCodes: function() {
                return this.stats.statusCodesChartData;
            },
            lineOptionsErrorMessages: function() {
                return this.stats.errorMessagesChartData;
            },
            totals: function() {
                return this.stats.HCTotals;
            },
            isLoading: function() {
                return this.$store.state.countlySDK.stats.isLoading;
            }
        }
    });
    countlyVue.container.registerTab("/manage/sdk", {
        priority: 1,
        route: "#/manage/sdk/health_check",
        component: SDKHealthCheckView,
        title: "Health Check",
        name: "health_check",
        permission: FEATURE_NAME,
        vuex: []
    });

})();