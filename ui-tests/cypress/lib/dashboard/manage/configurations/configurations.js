import {
    configurationsPageElements,
    configurationsListBoxElements,
} from "../../../../support/elements/dashboard/manage/configurations/configurations";

const { FEATURE_TYPE, SETTINGS } = require('../../../../support/constants');

const verifyPageElements = () => {
    cy.verifyElement({
        labelElement: configurationsPageElements.PAGE_TITLE,
        labelText: "Settings",
    });

    cy.verifyElement({
        element: configurationsPageElements.SEARCH_INPUT,
        elementPlaceHolder: 'Search in settings'
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({feature: FEATURE_TYPE.CORE}).LIST_BOX_ITEM,
        labelText: "Core",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({feature: FEATURE_TYPE.API}).LIST_BOX_ITEM,
        labelText: "API",
    });

    cy.clickElement(configurationsListBoxElements({feature: FEATURE_TYPE.API}).LIST_BOX_ITEM),

    cy.verifyElement({
        labelElement: configurationsListBoxElements({feature: FEATURE_TYPE.API}).SELECTED_FEATURE_NAME,
        labelText: "API",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({feature: FEATURE_TYPE.API}).SELECTED_FEATURE_DESCRIPTION,
        labelText: "Main API settings",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.BATCH_PROCESSING.BATCH_PROCESSING}).SELECTED_FEATURE_GROUP_NAME,
        labelText: "Batch processing",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.BATCH_PROCESSING.BATCH_PROCESSING}).SELECTED_SUBFEATURE_TITLE,
        labelText: "Batch processing",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.BATCH_PROCESSING.BATCH_PROCESSING}).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Combine aggregated data writes together and commit to database with specific frequency",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({subFeature: SETTINGS.API.BATCH_PROCESSING.BATCH_PROCESSING}).SELECTED_SUBFEATURE_CHECKBOX,
        isChecked: true
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.BATCH_PROCESSING.BATCH_PERIOD}).SELECTED_SUBFEATURE_TITLE,
        labelText: "Batch write frequency",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.BATCH_PROCESSING.BATCH_PERIOD}).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "How often to commit batch writes to database (in seconds)",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({subFeature: SETTINGS.API.BATCH_PROCESSING.BATCH_PERIOD}).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "10"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.BATCH_PROCESSING.USER_MERGE_PARALEL}).SELECTED_SUBFEATURE_TITLE,
        labelText: "Count of lined up merges to be processed in paralel",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.BATCH_PROCESSING.USER_MERGE_PARALEL}).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Do not increase this number unless server is suffering from long queue of unfinished merges. As more will be processed in paralel it will increase used resources. It is highly recommended to recheck SDK implementation instead of increasing paralel processing.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({subFeature: SETTINGS.API.BATCH_PROCESSING.USER_MERGE_PARALEL}).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "1"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.CACHE_MANAGEMENT.CACHE_MANAGEMENT}).SELECTED_FEATURE_GROUP_NAME,
        labelText: "Cache management",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.CACHE_MANAGEMENT.BATCH_READ_PROCESSING}).SELECTED_SUBFEATURE_TITLE,
        labelText: "Cache reads for SDK API calls",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.CACHE_MANAGEMENT.BATCH_READ_PROCESSING}).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Some reads that happen on each SDK call can be cached for reusing",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({subFeature: SETTINGS.API.CACHE_MANAGEMENT.BATCH_READ_PROCESSING}).SELECTED_SUBFEATURE_CHECKBOX,
        isChecked: true
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.CACHE_MANAGEMENT.BATCH_READ_PERIOD}).SELECTED_SUBFEATURE_TITLE,
        labelText: "Cached reads update period",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.CACHE_MANAGEMENT.BATCH_READ_PERIOD}).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "How often should cache be updated (in seconds)",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({subFeature: SETTINGS.API.CACHE_MANAGEMENT.BATCH_READ_PERIOD}).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "60"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.CACHE_MANAGEMENT.BATCH_READ_TIME_TO_LIVE}).SELECTED_SUBFEATURE_TITLE,
        labelText: "Cached reads Time To Live",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.CACHE_MANAGEMENT.BATCH_READ_TIME_TO_LIVE}).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "How long should cache be kept if unused (in seconds)",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({subFeature: SETTINGS.API.CACHE_MANAGEMENT.BATCH_READ_TIME_TO_LIVE}).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "600"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.DATA_LIMITS.DATA_LIMITS}).SELECTED_FEATURE_GROUP_NAME,
        labelText: "Data limits",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.DATA_LIMITS.EVENT_LIMIT}).SELECTED_SUBFEATURE_TITLE,
        labelText: "Max unique event keys",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.DATA_LIMITS.EVENT_LIMIT}).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Maximum number of event keys stored in database. Increasing this number may seriously affect your server performance.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({subFeature: SETTINGS.API.DATA_LIMITS.EVENT_LIMIT}).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "500"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.DATA_LIMITS.EVENT_SEGMENTATION_LIMIT}).SELECTED_SUBFEATURE_TITLE,
        labelText: "Max segmentation in each event",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.DATA_LIMITS.EVENT_SEGMENTATION_LIMIT}).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Maximum number of segmentations per custom events. Increasing this number may affect your server performance.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({subFeature: SETTINGS.API.DATA_LIMITS.EVENT_SEGMENTATION_LIMIT}).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "100"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.DATA_LIMITS.EVENT_SEGMENTATION_VALUE_LIMIT}).SELECTED_SUBFEATURE_TITLE,
        labelText: "Max unique values in each segmentation",
    });

    cy.scrollPageToCenter();

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.DATA_LIMITS.EVENT_SEGMENTATION_VALUE_LIMIT}).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Maximum number of unique values in each segmentation. Increasing this number may affect your server performance.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({subFeature: SETTINGS.API.DATA_LIMITS.EVENT_SEGMENTATION_VALUE_LIMIT}).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "1000"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.DATA_LIMITS.METRIC_LIMIT}).SELECTED_SUBFEATURE_TITLE,
        labelText: "Metric limit",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.DATA_LIMITS.METRIC_LIMIT}).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Number of different metric values per annual period. Increasing this number may affect your server performance.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({subFeature: SETTINGS.API.DATA_LIMITS.METRIC_LIMIT}).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "1000"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.DATA_LIMITS.SESSION_DURATION_LIMIT}).SELECTED_SUBFEATURE_TITLE,
        labelText: "Maximal Session Duration",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.DATA_LIMITS.SESSION_DURATION_LIMIT}).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Maximum session duration value in seconds allowed in any request. If a request contains a session duration higher than this value, it will be capped.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({subFeature: SETTINGS.API.DATA_LIMITS.SESSION_DURATION_LIMIT}).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "86400"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.DATA_LIMITS.ARRAY_LIST_LIMIT}).SELECTED_SUBFEATURE_TITLE,
        labelText: "Max length of array-type properties",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.DATA_LIMITS.ARRAY_LIST_LIMIT}).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "If an event segment or custom user property value is an array and its length exceeds the maximum array length set in this setting, only the first n values (where n is the maximum array length) will be retained and any additional values will be discarded.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({subFeature: SETTINGS.API.DATA_LIMITS.ARRAY_LIST_LIMIT}).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "10"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.OTHER_API_SETTINGS}).SELECTED_FEATURE_GROUP_NAME,
        labelText: "Other API settings",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.SAFE}).SELECTED_SUBFEATURE_TITLE,
        labelText: "Safer API responses",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.SAFE}).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "If enabled, server will verify key parameters and respond with error or success. This increases server overhead, so use with care.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.SAFE}).SELECTED_SUBFEATURE_CHECKBOX,
        isChecked: false
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.DOMAIN}).SELECTED_SUBFEATURE_TITLE,
        labelText: "Server URL (used in outgoing emails)",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.DOMAIN}).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "This is the full qualified domain name used in outgoing emails. It should be in the form of http://SERVERNAME or https://SERVERNAME",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.DOMAIN}).SELECTED_SUBFEATURE_INPUT,
        value: "http://localhost"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.EXPORT_LIMIT}).SELECTED_SUBFEATURE_TITLE,
        labelText: "Document export limit",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.EXPORT_LIMIT}).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Amount of lines in a CSV, PDF or CSV document exported in single file",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.EXPORT_LIMIT}).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "10000"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.OFFLINE_MODE}).SELECTED_SUBFEATURE_TITLE,
        labelText: "Offline mode",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.OFFLINE_MODE}).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "When enabled, API connections are disabled for email report news, checking new SDKs, pinging external IPs, checking new blogs and making Intercom connections.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.OFFLINE_MODE}).SELECTED_SUBFEATURE_CHECKBOX,
        isChecked: false
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.REPORTS_REGENERATE_INTERVAL}).SELECTED_SUBFEATURE_TITLE,
        labelText: "Regeneration interval for reports",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.REPORTS_REGENERATE_INTERVAL}).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Minimum report regeneration interval. If a report regeneration takes longer than the selected duration, it’ll be regenerated in the next closest interval",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.REPORTS_REGENERATE_INTERVAL}).SELECTED_SUBFEATURE_SELECT,
        elementPlaceHolder: "Select",
        value: "every hour"
    });

    cy.scrollPageToBottom();

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.REQUEST_THRESHOLD}).SELECTED_SUBFEATURE_TITLE,
        labelText: "Request threshold (seconds)",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.REQUEST_THRESHOLD}).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Time before switching to report manager if a drill, funnel or other similar dashboard functionality request takes too long to complete. This should not be longer than HTTP timeout, which by default is 60 seconds or you won't get any response.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.REQUEST_THRESHOLD}).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "30"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.SYNC_PLUGINS}).SELECTED_SUBFEATURE_TITLE,
        labelText: "Sync plugin states",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.SYNC_PLUGINS}).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Toggling plugin will propagate state to all servers with same database. Enabling would propagate plugin state to all server, but also have more overhead performing plugin state checks.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.SYNC_PLUGINS}).SELECTED_SUBFEATURE_CHECKBOX,
        isChecked: false
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.SEND_TEST_EMAIL}).SELECTED_SUBFEATURE_TITLE,
        labelText: "Send a test email to me",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.SEND_TEST_EMAIL}).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "This will send an email to your email address stored in Countly.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.SEND_TEST_EMAIL}).SELECTED_SUBFEATURE_BUTTON,
        elementText: "Send"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.CITY_DATA}).SELECTED_SUBFEATURE_TITLE,
        labelText: "Track city data",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.CITY_DATA}).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Enable tracking city level data in dashboard. If disabled, city information will no longer be added or updated for users.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.CITY_DATA}).SELECTED_SUBFEATURE_CHECKBOX,
        isChecked: true
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.COUNTRY_DATA}).SELECTED_SUBFEATURE_TITLE,
        labelText: "Track country data",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.COUNTRY_DATA}).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Enable tracking country level data in dashboard. If disabled, country information will no longer be added or updated for users.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.COUNTRY_DATA}).SELECTED_SUBFEATURE_CHECKBOX,
        isChecked: true
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.SESSION_COOLDOWN}).SELECTED_SUBFEATURE_TITLE,
        labelText: "Session cooldown (seconds)",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.SESSION_COOLDOWN}).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Time between session end and start when server will extend previous session instead of new",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.SESSION_COOLDOWN}).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "15"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.TOTAL_USERS}).SELECTED_SUBFEATURE_TITLE,
        labelText: "Total users",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.TOTAL_USERS}).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "If enabled, total users API will be enabled and used to override estimated total user counts in all reports. Enabling this will provide extra overhead, so consult Countly before enabling for highly loaded servers.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.TOTAL_USERS}).SELECTED_SUBFEATURE_CHECKBOX,
        isChecked: true
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.PREVENT_DUPLICATE_REQUESTS}).SELECTED_SUBFEATURE_TITLE,
        labelText: "Prevent duplicate requests",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.PREVENT_DUPLICATE_REQUESTS}).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Stores and compares request hash to prevent duplicate requests",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.PREVENT_DUPLICATE_REQUESTS}).SELECTED_SUBFEATURE_CHECKBOX,
        isChecked: true
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.METRIC_CHANGES}).SELECTED_SUBFEATURE_TITLE,
        labelText: "Record metric changes",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.METRIC_CHANGES}).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Recording changes is required by Total users correction. Disable it if you know you won't be using Total users correction",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.METRIC_CHANGES}).SELECTED_SUBFEATURE_CHECKBOX,
        isChecked: true
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.TRIM_TRAILING_ENDING_SPACES}).SELECTED_SUBFEATURE_TITLE,
        labelText: "Trim trailing and ending spaces",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.TRIM_TRAILING_ENDING_SPACES}).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "If enabled, all trailing and ending spaces will be trimmed from all incoming data.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({subFeature: SETTINGS.API.OTHER_API_SETTINGS.TRIM_TRAILING_ENDING_SPACES}).SELECTED_SUBFEATURE_CHECKBOX,
        isChecked: false
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        labelElement: configurationsListBoxElements({feature: FEATURE_TYPE.FRONTEND}).LIST_BOX_ITEM,
        labelText: "Frontend",
    });

    cy.clickElement(configurationsListBoxElements({feature: FEATURE_TYPE.FRONTEND}).LIST_BOX_ITEM),

    cy.verifyElement({
        labelElement: configurationsListBoxElements({feature: FEATURE_TYPE.FRONTEND}).SELECTED_FEATURE_NAME,
        labelText: "Frontend",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.FRONTED.CODE }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Show Code Generator for SDK integration",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.FRONTED.CODE }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Display links for Countly Code generator under new app creation page.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.FRONTED.CODE }).SELECTED_SUBFEATURE_CHECKBOX,
        isChecked: true
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.FRONTED.COUNTLY_TRACKING }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Countly",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.FRONTED.COUNTLY_TRACKING }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "When enabled, Countly will be activated on this server to perform server-level analytics and gather user feedback to aid us in continuous product improvement. Personal user data/details or the data you process using this server will never be collected or analyzed. All data is sent exclusively to our dedicated Countly server located in Europe.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.FRONTED.COUNTLY_TRACKING }).SELECTED_SUBFEATURE_CHECKBOX,
        //isChecked: true //TODO: if empty data, it should be false
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.FRONTED.OFFLINE_MODE }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Offline mode",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.FRONTED.OFFLINE_MODE }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "When enabled, Countly doesn’t connect to Intercom to enable in app chat, Google services to enable Google maps and Countly services to track anonymized service usage.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.FRONTED.OFFLINE_MODE }).SELECTED_SUBFEATURE_CHECKBOX,
        isChecked: false
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.FRONTED.PRODUCTION }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Production mode",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.FRONTED.PRODUCTION }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Initial load of dashboard should be faster, due to smaller files and smaller file amount, but when developing a plugin, you need to regenerate them to see changes",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.FRONTED.PRODUCTION }).SELECTED_SUBFEATURE_CHECKBOX,
        isChecked: true
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.FRONTED.SESSION_TIMEOUT }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Session timeout",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.FRONTED.SESSION_TIMEOUT }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "User will be forced to logout after session timeout (in minutes) of inactivity. If you want to disable force logout, set to 0.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.FRONTED.SESSION_TIMEOUT }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "30"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.FRONTED.THEME }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Theme",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.FRONTED.THEME }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Selected theme will be available server-wide, for all apps and users",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.FRONTED.THEME }).SELECTED_SUBFEATURE_SELECT,
        elementPlaceHolder: "Select",
        value: "Default Theme"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.FRONTED.USER }).SELECTED_SUBFEATURE_TITLE,
        labelText: "User Level Configuration",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.FRONTED.USER }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Allow separate dashboard users to change these configs for their account only.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.FRONTED.USER }).SELECTED_SUBFEATURE_SELECT,
        elementPlaceHolder: "Select"
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.LOGS }).LIST_BOX_ITEM,
        labelText: "Logs",
    });

    cy.clickElement(configurationsListBoxElements({ feature: FEATURE_TYPE.LOGS }).LIST_BOX_ITEM),

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.LOGS }).SELECTED_FEATURE_NAME,
        labelText: "Logs",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.LOGS.LOGGING_FOR_SEPARATE_FEATURES.LOGGING_FOR_SEPARATE_FEATURES }).SELECTED_FEATURE_GROUP_NAME,
        labelText: "Logging for separate features",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.LOGS.LOGGING_FOR_SEPARATE_FEATURES.DEBUG }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Debug Level",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.LOGS.LOGGING_FOR_SEPARATE_FEATURES.DEBUG }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Log fine-grained informational events that are most useful to debug an application",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.LOGS.LOGGING_FOR_SEPARATE_FEATURES.DEBUG }).SELECTED_SUBFEATURE_INPUT,
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.LOGS.LOGGING_FOR_SEPARATE_FEATURES.WARNING_LEVEL }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Warning Level",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.LOGS.LOGGING_FOR_SEPARATE_FEATURES.WARNING_LEVEL }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Log potentially harmful situations",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.LOGS.LOGGING_FOR_SEPARATE_FEATURES.WARNING_LEVEL }).SELECTED_SUBFEATURE_INPUT,
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.LOGS.LOGGING_FOR_SEPARATE_FEATURES.INFO_LEVEL }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Info Level",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.LOGS.LOGGING_FOR_SEPARATE_FEATURES.INFO_LEVEL }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Log informational messages that highlight the progress of the application",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.LOGS.LOGGING_FOR_SEPARATE_FEATURES.INFO_LEVEL }).SELECTED_SUBFEATURE_INPUT,
        value: "jobs, push"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.LOGS.LOGGING_FOR_SEPARATE_FEATURES.ERROR_LEVEL }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Error Level",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.LOGS.LOGGING_FOR_SEPARATE_FEATURES.ERROR_LEVEL }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Log error events that might still allow the application to continue running",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.LOGS.LOGGING_FOR_SEPARATE_FEATURES.ERROR_LEVEL }).SELECTED_SUBFEATURE_INPUT,
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.LOGS.DEFAULT_LOG_LEVEL_FOR_THE_REST.DEFAULT_LOG_LEVEL_FOR_THE_REST }).SELECTED_FEATURE_GROUP_NAME,
        labelText: "Default Log Level for the rest",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.LOGS.DEFAULT_LOG_LEVEL_FOR_THE_REST.DEFAULT_LEVEL }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Default Level",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.LOGS.DEFAULT_LOG_LEVEL_FOR_THE_REST.DEFAULT_LEVEL }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Level of debug info of each module by default to output into log file under /log directory",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.LOGS.DEFAULT_LOG_LEVEL_FOR_THE_REST.DEFAULT_LEVEL }).SELECTED_SUBFEATURE_SELECT,
        elementPlaceHolder: "Select",
        value: "Warning Level"
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.SECURITY }).LIST_BOX_ITEM,
        labelText: "Security",
    });

    cy.clickElement(configurationsListBoxElements({ feature: FEATURE_TYPE.SECURITY }).LIST_BOX_ITEM),

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.SECURITY }).SELECTED_FEATURE_NAME,
        labelText: "Security",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.API_ADDITIONAL_HEADERS }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Additional API HTTP Response headers",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.API_ADDITIONAL_HEADERS }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Add headers for Countly to use on API responses by default (one header per new line)",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.API_ADDITIONAL_HEADERS }).SELECTED_SUBFEATURE_TEXTAREA,
        value: "X-Frame-Options:deny\nX-XSS-Protection:1; mode=block\n",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.DASHBOARD_ADDITIONAL_HEADERS }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Additional Dashboard HTTP Response headers",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.DASHBOARD_ADDITIONAL_HEADERS }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Add headers for Countly to use on Dashboard responses by default (one header per new line)",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.DASHBOARD_ADDITIONAL_HEADERS }).SELECTED_SUBFEATURE_TEXTAREA,
        value: "X-Frame-Options:deny\nX-XSS-Protection:1; mode=block\n"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.DASHBOARD_RATE_LIMIT_REQUESTS }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Dashboard Request Rate Limit",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.DASHBOARD_RATE_LIMIT_REQUESTS }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "How many requests to allow per time window?",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.DASHBOARD_RATE_LIMIT_REQUESTS }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "500"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.DASHBOARD_RATE_LIMIT_WINDOW }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Dashboard Rate Limit Time (seconds)",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.DASHBOARD_RATE_LIMIT_WINDOW }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Will start blocking if request amount is reached in this time window",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.DASHBOARD_RATE_LIMIT_WINDOW }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "60"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.LOGIN_TRIES }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Allowed login attempts",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.LOGIN_TRIES }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Account will be blocked for some time after provided number of incorrect login attempts. See below for time increments.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.LOGIN_TRIES }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "3"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.LOGIN_WAIT }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Incorrect login block time increment",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.LOGIN_WAIT }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Incremental period of time account is blocked after provided number of incorrect login attempts (in seconds)",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.LOGIN_WAIT }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "300"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PASSWORD_AUTOCOMPLATE }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Password autocomplete",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PASSWORD_AUTOCOMPLATE }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Enable or disable autocomplete on prelogin forms",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PASSWORD_AUTOCOMPLATE }).SELECTED_SUBFEATURE_CHECKBOX,
        isChecked: true
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PASSWORD_CHAR }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Password must contain an uppercase character",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PASSWORD_CHAR }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "If enabled, provided passwords must contain at least one uppercase character.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PASSWORD_CHAR }).SELECTED_SUBFEATURE_CHECKBOX,
        isChecked: true
    });

    cy.scrollPageToBottom();

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PASSWORD_EXPIRATION }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Password expiration (in days)",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PASSWORD_EXPIRATION }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Number of days after which user must reset password",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PASSWORD_EXPIRATION }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "0"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PASSWORD_MIN }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Minimum password length",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PASSWORD_MIN }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Minimum number of characters used in the password",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PASSWORD_MIN }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "8"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PASSWORD_NUMBER }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Password must contain a number",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PASSWORD_NUMBER }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "If enabled, provided passwords must contain at least one digit (e.g 0..9)",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PASSWORD_NUMBER }).SELECTED_SUBFEATURE_CHECKBOX,
        isChecked: true
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PASSWORD_ROTATION }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Password rotation",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PASSWORD_ROTATION }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Amount of previous passwords user should not be able to reuse",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PASSWORD_ROTATION }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "3"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PASSWORD_SYMBOL }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Password must contain a special symbol",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PASSWORD_SYMBOL }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "If enabled, provided passwords must contain at least one special symbol (not a number or latin character)",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PASSWORD_SYMBOL }).SELECTED_SUBFEATURE_CHECKBOX,
        isChecked: true
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.ROBOTS_TXT }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Robots.txt",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.ROBOTS_TXT }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Customize to tell search robots what is indexable and what is not",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.ROBOTS_TXT }).SELECTED_SUBFEATURE_TEXTAREA,
        value: "User-agent: *\nDisallow: /"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PROXY_HOSTNAME }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Proxy Hostname",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PROXY_HOSTNAME }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Add your proxy hostname",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PROXY_HOSTNAME }).SELECTED_SUBFEATURE_TEXTAREA,
        value: ""
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PROXY_PASSWORD }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Proxy Password",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PROXY_PASSWORD }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Add your proxy password",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PROXY_PASSWORD }).SELECTED_SUBFEATURE_TEXTAREA,
        value: ""
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PROXY_PORT }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Proxy Port",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PROXY_PORT }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Add your proxy port number",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PROXY_PORT }).SELECTED_SUBFEATURE_TEXTAREA,
        value: ""
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PROXY_TYPE }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Proxy Type",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PROXY_TYPE }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Choose your proxy type",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PROXY_TYPE }).SELECTED_SUBFEATURE_INPUT,
        value: "https"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PROXY_USERNAME }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Proxy Username",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PROXY_USERNAME }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Add your proxy username",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.SECURITY.PROXY_USERNAME }).SELECTED_SUBFEATURE_TEXTAREA,
        value: ""
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.FEATURE_MANAGEMENT }).LIST_BOX_ITEM,
        labelText: "Feature Management",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.CRASHES }).LIST_BOX_ITEM,
        labelText: "Crashes",
    });

    cy.clickElement(configurationsListBoxElements({ feature: FEATURE_TYPE.CRASHES }).LIST_BOX_ITEM),

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.CRASHES }).SELECTED_FEATURE_NAME,
        labelText: "Crashes",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.CRASHES.ACTIVATE_CUSTOM_FIELD_CLEANUP_JOB }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Activate custom field cleanup job",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.CRASHES.ACTIVATE_CUSTOM_FIELD_CLEANUP_JOB }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "This job will try to cleanup custom field from crashgroups. Do not activate this when there are a very large number of crashgroups (around 100.000 or more).",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.CRASHES.ACTIVATE_CUSTOM_FIELD_CLEANUP_JOB }).SELECTED_SUBFEATURE_CHECKBOX,
        isChecked: false
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.CRASHES.GROUPING_STRATEGY }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Crash grouping strategy",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.CRASHES.GROUPING_STRATEGY }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "How crashes should be grouped together",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.CRASHES.GROUPING_STRATEGY }).SELECTED_SUBFEATURE_SELECT,
        elementPlaceHolder: "Select",
        value: "Error and file where error happened"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.CRASHES.MAX_CUSTOM_FIELD_KEYS }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Maximum custom field keys",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.CRASHES.MAX_CUSTOM_FIELD_KEYS }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Maximum number of unique custom field keys to keep in a crashgroup. Do not set a large number for this as it will increase the size of the crashgroup data being saved.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.CRASHES.MAX_CUSTOM_FIELD_KEYS }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "100"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.CRASHES.REPORT_LIMIT }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Amount of reports displayed",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.CRASHES.REPORT_LIMIT }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Number of reports to display in each crash group's page",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.CRASHES.REPORT_LIMIT }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "100"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.CRASHES.LATEST_CRASH_UPDATE }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Latest crash update",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.CRASHES.LATEST_CRASH_UPDATE }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Update latest crash in crashgroup even when incoming crash has the same app version as latest crash",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.CRASHES.LATEST_CRASH_UPDATE }).SELECTED_SUBFEATURE_CHECKBOX,
        isChecked: false
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.CRASHES.SMART_PREPROCESSING }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Smart stack trace preprocessing",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.CRASHES.SMART_PREPROCESSING }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Merges together more groups by removing dynamic content based on heuristics",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.CRASHES.SMART_PREPROCESSING }).SELECTED_SUBFEATURE_CHECKBOX,
        isChecked: true
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.CRASHES.SMART_REGEXES }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Smart regexes to remove information from stacktrace",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.CRASHES.SMART_REGEXES }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "JavaScript regex as string without needed options, one regex per new line, (example removing contents between {} brackets: {.*?}), test: stack.replace(new RegExp(reg, \"gim\"), \"\");",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.CRASHES.SMART_REGEXES }).SELECTED_SUBFEATURE_TEXTAREA,
        value: '{.*?}\n/.*?/'
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.DASHBOARDS }).LIST_BOX_ITEM,
        labelText: "Dashboards",
    });

    cy.clickElement(configurationsListBoxElements({ feature: FEATURE_TYPE.DASHBOARDS }).LIST_BOX_ITEM),

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.DASHBOARDS }).SELECTED_FEATURE_NAME,
        labelText: "Dashboards",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.DASHBOARD.ALLOW_DASHBOARD_SHARING }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Allow Dashboard Sharing",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.DASHBOARD.ALLOW_DASHBOARD_SHARING }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Enable dashboard sharing for users to share a dashboard with other users. If set to off, a dashboard cannot be shared with others.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.DASHBOARD.ALLOW_DASHBOARD_SHARING }).SELECTED_SUBFEATURE_CHECKBOX,
        isChecked: true
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.HOOKS }).LIST_BOX_ITEM,
        labelText: "Hooks",
    });

    cy.clickElement(configurationsListBoxElements({ feature: FEATURE_TYPE.HOOKS }).LIST_BOX_ITEM),

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.HOOKS }).SELECTED_FEATURE_NAME,
        labelText: "Hooks",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.HOOKS.ACTION_BATCH_PROCESING_SIZE }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Action batch procesing size",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.HOOKS.ACTION_BATCH_PROCESING_SIZE }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "The number of actions to be processed in each batch.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.HOOKS.ACTION_BATCH_PROCESING_SIZE }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "0"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.HOOKS.ACTION_PIPELINE_INTERVAL }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Action pipeline interval",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.HOOKS.ACTION_PIPELINE_INTERVAL }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "The interval between each batch of actions.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.HOOKS.ACTION_PIPELINE_INTERVAL }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "1000"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.HOOKS.REFRESH_RULES_PERIOD }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Refresh rules period",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.HOOKS.REFRESH_RULES_PERIOD }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "The interval between each refresh of the rules.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.HOOKS.REFRESH_RULES_PERIOD }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "3000"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.HOOKS.REQUEST_LIMIT }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Request limit",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.HOOKS.REQUEST_LIMIT }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "The maximum number of requests that can be sent to the endpoint within the time window.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.HOOKS.REQUEST_LIMIT }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "0"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.HOOKS.TIME_WINDOW_FOR_REQUEST_LIMIT }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Time window for request limit",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.HOOKS.TIME_WINDOW_FOR_REQUEST_LIMIT }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "The time window for the request limit.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.HOOKS.TIME_WINDOW_FOR_REQUEST_LIMIT }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "60000"
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.INCOMING_DATA_LOGS }).LIST_BOX_ITEM,
        labelText: "Incoming Data Logs",
    });

    cy.clickElement(configurationsListBoxElements({ feature: FEATURE_TYPE.INCOMING_DATA_LOGS }).LIST_BOX_ITEM),

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.INCOMING_DATA_LOGS }).SELECTED_FEATURE_NAME,
        labelText: "Incoming Data Logs",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.INCOMING_DATA_LOGS.DATA_LOGGING_LIMIT }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Set incoming data logging limit per minute",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.INCOMING_DATA_LOGS.DATA_LOGGING_LIMIT }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Incoming data logging will turn off automatically when the number of requests logged per minute limit is reached. This will apply only when request logger state is set to \"Automatic\".",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.INCOMING_DATA_LOGS.DATA_LOGGING_LIMIT }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "1000"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.INCOMING_DATA_LOGS.DATA_LOGGING_STATE }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Set incoming data logging state",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.INCOMING_DATA_LOGS.DATA_LOGGING_STATE }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "If incoming data logging state is set to \"On\", only the last 1000 requests will be saved. When the state is set to \"Automatic\", requests will continue to be logged until the limit per minute is reached.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.INCOMING_DATA_LOGS.DATA_LOGGING_STATE }).SELECTED_SUBFEATURE_SELECT,
        elementPlaceHolder: "Select",
        value: "Automatic"

    });

    cy.scrollPageToTop();

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.PUSH_NOTIFICATIONS }).LIST_BOX_ITEM,
        labelText: "Push Notifications",
    });

    cy.clickElement(configurationsListBoxElements({ feature: FEATURE_TYPE.PUSH_NOTIFICATIONS }).LIST_BOX_ITEM),

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.PUSH_NOTIFICATIONS }).SELECTED_FEATURE_NAME,
        labelText: "Push Notifications",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.CONNECTION_FACTOR }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Time factor for exponential backoff between retries",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.CONNECTION_FACTOR }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "1000"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.CONNECTION_RETRIES }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Number of connection retries",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.CONNECTION_RETRIES }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "3"
    });

    //TODO: there is no option on ci cd, check this
    // cy.verifyElement({
    //     labelElement: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.NO_DUPLICATE }).SELECTED_SUBFEATURE_TITLE,
    //     labelText: "Ensure no duplicate notifications sent when scheduling messages",
    // });

    // cy.verifyElement({
    //     element: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.NO_DUPLICATE }).SELECTED_SUBFEATURE_CHECKBOX,
    //     isChecked: false
    // });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.DEFAULT_CONTENT_AVAILABLE }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Set content-available to 1 by default for IOS",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.DEFAULT_CONTENT_AVAILABLE }).SELECTED_SUBFEATURE_CHECKBOX,
        isChecked: false
    });

    //TODO: there is no option on ci cd, check this
    // cy.verifyElement({
    //     labelElement: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.MESSAGE_TIMEOUT }).SELECTED_SUBFEATURE_TITLE,
    //     labelText: "Timeout of a message to be send (in milliseconds)",
    // });

    // cy.verifyElement({
    //     element: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.MESSAGE_TIMEOUT }).SELECTED_SUBFEATURE_INPUT_NUMBER,
    //     attr: "aria-valuenow",
    //     attrText: "3600000"
    // });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.POOL_BYTES }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Bytes in binary stream batches",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.POOL_BYTES }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "10000"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.POOL_CONCURRENCY }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Maximum number of same type connections",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.POOL_CONCURRENCY }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "5"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.POOL_POOLS }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Maximum number of connections in total",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.POOL_POOLS }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "10"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.POOL_PUSHES }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Number of notifications in stream batches",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.POOL_PUSHES }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "400"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.PROXY_HOST }).SELECTED_SUBFEATURE_TITLE,
        labelText: "push-notification.proxy-host",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.PROXY_HOST }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Hostname or IP address of HTTP CONNECT proxy server to use for communication with APN & FCM when sending push notifications.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.PROXY_HOST }).SELECTED_SUBFEATURE_INPUT,
        value: ""
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.PROXY_PASS }).SELECTED_SUBFEATURE_TITLE,
        labelText: "push-notification.proxy-password",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.PROXY_PASS }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "(if needed) Password for proxy server HTTP Basic authentication",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.PROXY_PASS }).SELECTED_SUBFEATURE_INPUT,
        value: ""
    });

    cy.scrollPageToBottom();

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.PROXY_PORT }).SELECTED_SUBFEATURE_TITLE,
        labelText: "push-notification.proxy-port",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.PROXY_PORT }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Port number of the proxy server",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.PROXY_PORT }).SELECTED_SUBFEATURE_INPUT,
        value: ""
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.PROXY_UNAUTHORIZED }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Do NOT check proxy HTTPS certificate",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.PROXY_UNAUTHORIZED }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "(if needed) Allow self signed certificates without CA installed",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.PROXY_UNAUTHORIZED }).SELECTED_SUBFEATURE_CHECKBOX,
        isChecked: false
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.PROXY_USER }).SELECTED_SUBFEATURE_TITLE,
        labelText: "push-notification.proxy-user",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.PROXY_USER }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "(if needed) Username for proxy server HTTP Basic authentication",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.PROXY_USER }).SELECTED_SUBFEATURE_INPUT,
        value: ""
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.SEND_A_HEAD }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Send notifications scheduled up to this many ms into the future",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.PUSH_NOTIFICATIONS.SEND_A_HEAD }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "60000"
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.REMOTE_CONFIG }).LIST_BOX_ITEM,
        labelText: "Remote Config",
    });

    cy.clickElement(configurationsListBoxElements({ feature: FEATURE_TYPE.REMOTE_CONFIG }).LIST_BOX_ITEM),

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.REMOTE_CONFIG }).SELECTED_FEATURE_NAME,
        labelText: "Remote Config",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.REMOTE_CONFIG.MAXIMUM_NUMBER_OF_CONDITIONS }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Maximum number of conditions",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.REMOTE_CONFIG.MAXIMUM_NUMBER_OF_CONDITIONS }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Set maximum number of conditions that are allowed per parameter by any application",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.REMOTE_CONFIG.MAXIMUM_NUMBER_OF_CONDITIONS }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "20"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.REMOTE_CONFIG.MAXIMUM_NUMBER_OF_PARAMETERS }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Maximum number of parameters",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.REMOTE_CONFIG.MAXIMUM_NUMBER_OF_PARAMETERS }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Set maximum number of parameters that are allowed per parameter by any application",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.REMOTE_CONFIG.MAXIMUM_NUMBER_OF_PARAMETERS }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "2000"
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.EMAIL_REPORTS }).LIST_BOX_ITEM,
        labelText: "Email Reports",
    });

    cy.clickElement(configurationsListBoxElements({ feature: FEATURE_TYPE.EMAIL_REPORTS }).LIST_BOX_ITEM),

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.EMAIL_REPORTS }).SELECTED_FEATURE_NAME,
        labelText: "Email Reports",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.EMAIL_REPORTS.SECRET_KEY_FOR_UNSUBSCRIBE_LINK }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Secret key for unsubscribe link",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.EMAIL_REPORTS.SECRET_KEY_FOR_UNSUBSCRIBE_LINK }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Secret key must be 32 character for AES 256",
    });

    cy.verifyElement({
        shouldNot: true,
        element: configurationsListBoxElements({ subFeature: SETTINGS.EMAIL_REPORTS.SECRET_KEY_FOR_UNSUBSCRIBE_LINK }).SELECTED_SUBFEATURE_INPUT,
        value: null
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.SLIPPING_AWAY }).LIST_BOX_ITEM,
        labelText: "Slipping Away",
    });

    cy.clickElement(configurationsListBoxElements({ feature: FEATURE_TYPE.SLIPPING_AWAY }).LIST_BOX_ITEM),

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.SLIPPING_AWAY }).SELECTED_FEATURE_NAME,
        labelText: "Slipping Away",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SLIPPING_AWAY.FIRST_THRESHOLD }).SELECTED_SUBFEATURE_TITLE,
        labelText: "First threshold (days)",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.SLIPPING_AWAY.FIRST_THRESHOLD }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "7"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SLIPPING_AWAY.SECOND_THRESHOLD }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Second threshold (days)",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.SLIPPING_AWAY.SECOND_THRESHOLD }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "14"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SLIPPING_AWAY.THIRD_THRESHOLD }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Third threshold (days)",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.SLIPPING_AWAY.THIRD_THRESHOLD }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "30"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SLIPPING_AWAY.FOURTH_THRESHOLD }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Fourth threshold (days)",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.SLIPPING_AWAY.FOURTH_THRESHOLD }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "60"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SLIPPING_AWAY.FIFTH_THRESHOLD }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Fifth threshold (days)",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.SLIPPING_AWAY.FIFTH_THRESHOLD }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "90"
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.SOURCES }).LIST_BOX_ITEM,
        labelText: "Sources",
    });

    cy.clickElement(configurationsListBoxElements({ feature: FEATURE_TYPE.SOURCES }).LIST_BOX_ITEM),

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.SOURCES }).SELECTED_FEATURE_NAME,
        labelText: "Sources",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SOURCES.SOURCES_LENGTH_LIMIT }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Maximum character length for source name",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.SOURCES.SOURCES_LENGTH_LIMIT }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Set limit for source name length. The characters beyond the limitation value will be ignored.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.SOURCES.SOURCES_LENGTH_LIMIT }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "100"
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.AUDIT_LOGS }).LIST_BOX_ITEM,
        labelText: "Audit Logs",
    });

    cy.clickElement(configurationsListBoxElements({ feature: FEATURE_TYPE.AUDIT_LOGS }).LIST_BOX_ITEM),

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.AUDIT_LOGS }).SELECTED_FEATURE_NAME,
        labelText: "Audit Logs",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.AUDIT_LOGS.DISABLE_IP_TRACKING }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Disable IP Tracking",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.AUDIT_LOGS.DISABLE_IP_TRACKING }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Do not record IP address of actions taken by the users",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.AUDIT_LOGS.DISABLE_IP_TRACKING }).SELECTED_SUBFEATURE_CHECKBOX,
        isChecked: false
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.VIEWS }).LIST_BOX_ITEM,
        labelText: "Views",
    });

    cy.clickElement(configurationsListBoxElements({ feature: FEATURE_TYPE.VIEWS }).LIST_BOX_ITEM),

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.VIEWS }).SELECTED_FEATURE_NAME,
        labelText: "Views",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.VIEWS.VIEW_SEGMENT_LIMIT }).SELECTED_SUBFEATURE_TITLE,
        labelText: "View Segment Limit",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.VIEWS.VIEW_SEGMENT_LIMIT }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Views plugin powered by Drill, allows you to further segment (e.g. view name, domain etc) your analysis. Configure a limit for view segments.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.VIEWS.VIEW_SEGMENT_LIMIT }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "100"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.VIEWS.VIEW_SEGMENT_VALUE_LIMIT }).SELECTED_SUBFEATURE_TITLE,
        labelText: "View Segment Value Limit",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.VIEWS.VIEW_SEGMENT_VALUE_LIMIT }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Configure the value limt for view segments. Having value over 100 will most likely result in segment ommision from aggregated data as about 100 values is maximum that can be stored in agregated views segment model.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.VIEWS.VIEW_SEGMENT_VALUE_LIMIT }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "10"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.VIEWS.VIEW_LIMIT }).SELECTED_SUBFEATURE_TITLE,
        labelText: "View Limit",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.VIEWS.VIEW_LIMIT }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Configure how many different view values will be reported (all time)",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.VIEWS.VIEW_LIMIT }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "50000"
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.VIEWS.VIEW_NAME_LENGTH_LIMIT }).SELECTED_SUBFEATURE_TITLE,
        labelText: "View Name Length Limit",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.VIEWS.VIEW_NAME_LENGTH_LIMIT }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Limit view names to the provided amount of characters and not longer",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.VIEWS.VIEW_NAME_LENGTH_LIMIT }).SELECTED_SUBFEATURE_INPUT_NUMBER,
        attr: "aria-valuenow",
        attrText: "128"
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.FEEDBACK }).LIST_BOX_ITEM,
        labelText: "Feedback",
    });

    cy.clickElement(configurationsListBoxElements({ feature: FEATURE_TYPE.FEEDBACK }).LIST_BOX_ITEM),

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ feature: FEATURE_TYPE.FEEDBACK }).SELECTED_FEATURE_NAME,
        labelText: "Feedback",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.FEEDBACK.LOGO }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Logo",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.FEEDBACK.LOGO }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Add your own company or app logo to customize your survey. Please limit logo file with  PNG or  JPEG file types. Uploaded logo will be scaled to 140 x 50 pixels.",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.FEEDBACK.LOGO }).SELECTED_SUBFEATURE_UPLOAD,
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.FEEDBACK.FONT_COLOR }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Font Color",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.FEEDBACK.FONT_COLOR }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Choose the font color of the widget",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.FEEDBACK.FONT_COLOR }).SELECTED_SUBFEATURE_COLOR_PICKER,
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.FEEDBACK.MAIN_COLOR }).SELECTED_SUBFEATURE_TITLE,
        labelText: "Main Color",
    });

    cy.verifyElement({
        labelElement: configurationsListBoxElements({ subFeature: SETTINGS.FEEDBACK.MAIN_COLOR }).SELECTED_SUBFEATURE_DESCRIPTION,
        labelText: "Choose the main color of the widget",
    });

    cy.verifyElement({
        element: configurationsListBoxElements({ subFeature: SETTINGS.FEEDBACK.MAIN_COLOR }).SELECTED_SUBFEATURE_COLOR_PICKER,
    });
};

module.exports = {
    verifyPageElements
};
