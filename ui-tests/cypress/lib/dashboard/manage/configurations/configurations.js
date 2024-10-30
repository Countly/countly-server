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
        value: "https://canangun-ce.count.ly"
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


    //TODO...

};

module.exports = {
    verifyPageElements
};