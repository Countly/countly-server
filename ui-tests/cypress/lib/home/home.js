const homePageElements = require("../../support/elements/home/home");

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: homePageElements.PAGE_TITLE,
        labelText: "Home",
    });

    cy.verifyElement({
        element: homePageElements.BUTTON_CUSTOMIZE,
        elementText: "Customize",
    });

    cy.verifyElement({
        element: homePageElements.BUTTON_MORE,
    });

    cy.verifyElement({
        element: homePageElements.TOP_EVENTS.LABEL,
        elementText: "Top Events by Count in the last 30 days",
    });

    cy.verifyElement({
        element: homePageElements.TOP_EVENTS.GO_TO_EVENTS_LINK_ARROW,
    });

    cy.verifyElement({
        element: homePageElements.TOP_EVENTS.GO_TO_EVENTS_LINK,
        elementText: "Go to Events",
        hrefContainUrl: "#/analytics/events/overview",
    });

    cy.verifyElement({
        element: homePageElements.AUDIENCE.DATE_PICKER,
        elementText: "", //TODO 'Nov 5, 2023 - Dec 4, 2023' => Last month - Yesterday
    });

    cy.verifyElement({
        labelElement: homePageElements.AUDIENCE.LABEL,
        labelText: "Audience",
        tooltipElement: homePageElements.AUDIENCE.TOOLTIP,
        tooltipText: "Summary of all sessions your users have had in your application, in the selected time period."
    });

    cy.verifyElement({
        element: homePageElements.AUDIENCE.GO_TO_SESSIONS_LINK_ARROW,
    });

    cy.verifyElement({
        element: homePageElements.AUDIENCE.GO_TO_SESSIONS_LINK,
        elementText: "Go to Sessions",
        hrefContainUrl: "#/analytics/sessions",
    });

    cy.verifyElement({
        labelElement: homePageElements.AUDIENCE.TOTAL_SESSIONS_LABEL,
        labelText: "Total Sessions",
        tooltipElement: homePageElements.AUDIENCE.TOTAL_SESSIONS_TOOLTIP,
        tooltipText: "Total session data"
    });

    cy.verifyElement({
        labelElement: homePageElements.AUDIENCE.NEW_SESSIONS_LABEL,
        labelText: "New Sessions",
        tooltipElement: homePageElements.AUDIENCE.NEW_SESSIONS_TOOLTIP,
        tooltipText: "Number of times your application is opened by a first-time user, in the selected time period."
    });

    cy.verifyElement({
        labelElement: homePageElements.AUDIENCE.TIME_SPENT_LABEL,
        labelText: "Time Spent",
        tooltipElement: homePageElements.AUDIENCE.TIME_SPENT_TOOLTIP,
        tooltipText: "Total time spent for this period"
    });

    cy.verifyElement({
        labelElement: homePageElements.AUDIENCE.AVG_SESSION_DURATION_LABEL,
        labelText: "Avg. Session Duration",
        tooltipElement: homePageElements.AUDIENCE.AVG_SESSION_DURATION_TOOLTIP,
        tooltipText: "The average amount of time spent per session on your application. It is calculated by dividing total duration spent across sessions by the total number of sessions."
    });

    cy.verifyElement({
        labelElement: homePageElements.AUDIENCE.AVG_REQUESTS_RECEIVED_LABEL,
        labelText: "Avg. Requests Received",
        tooltipElement: homePageElements.AUDIENCE.AVG_REQUESTS_RECEIVED_TOOLTIP,
        tooltipText: "Number of write API requests Countly Server receives for each session (includes sessions, session extensions, events, etc)"
    });

    cy.verifyElement({
        element: homePageElements.AUDIENCE.CHART_TYPE_SELECT_COMBOBOX,
        elementPlaceHolder: "Select"
    });

    cy.verifyElement({
        element: homePageElements.AUDIENCE.TOTAL_SESSIONS_CHART,
    });

    cy.verifyElement({
        labelElement: homePageElements.SOURCES.LABEL,
        labelText: "Sources",
        tooltipElement: homePageElements.SOURCES.TOOLTIP,
        tooltipText: "Overview of the source of traffic to your mobile application (where the user discovered the app) or website application (how the user came to your website)."
    });

    cy.verifyElement({
        element: homePageElements.SOURCES.GO_TO_ACQUISITION_LINK_ARROW,
    });

    cy.verifyElement({
        element: homePageElements.SOURCES.GO_TO_ACQUISITION_LINK,
        elementText: "Go to Acquisition",
        hrefContainUrl: "#/analytics/acquisition",
    });

    cy.verifyElement({
        labelElement: homePageElements.VIEWS.LABEL,
        labelText: "Views",
        tooltipElement: homePageElements.VIEWS.TOOLTIP,
        tooltipText: "Overview of the data trends and metrics for the pages or screens viewed on your application, in the selected time period."
    });

    cy.verifyElement({
        element: homePageElements.VIEWS.GO_TO_VIEWS_LINK_ARROW,
    });

    cy.verifyElement({
        element: homePageElements.VIEWS.GO_TO_VIEWS_LINK,
        elementText: "Go to Views",
        hrefContainUrl: "#/analytics/views",
    });

    cy.verifyElement({
        labelElement: homePageElements.VIEWS.TOTAL_VIEWS_LABEL,
        labelText: "Total Views",
        tooltipElement: homePageElements.VIEWS.TOTAL_VIEWS_TOOLTIP,
        tooltipText: "The total number of pages viewed, in the selected time period."
    });

    cy.verifyElement({
        labelElement: homePageElements.VIEWS.UNIQUE_VIEWS_LABEL,
        labelText: "Unique Views",
        tooltipElement: homePageElements.VIEWS.UNIQUE_VIEWS_TOOLTIP,
        tooltipText: "Number of times a page is viewed in your application for the first time by users during a session, in the selected time period."
    });

    cy.verifyElement({
        labelElement: homePageElements.VIEWS.BOUNCE_RATE_LABEL,
        labelText: "Bounce Rate",
        tooltipElement: homePageElements.VIEWS.BOUNCE_RATE_TOOLTIP,
        tooltipText: "Number of users who have landed on a page without visiting other pages"
    });

    cy.verifyElement({
        element: homePageElements.VIEWS.BOUNCE_RATE_PROGRESS_BAR,
    });

    cy.verifyElement({
        labelElement: homePageElements.TECHNOLOGY().LABEL,
        labelText: "Technology",
        tooltipElement: homePageElements.TECHNOLOGY().TOOLTIP,
        tooltipText: "Overview details of your app or website traffic by your users’ technology, such as platform, device, resolution, browsers and app version."
    });

    cy.verifyElement({
        element: homePageElements.TECHNOLOGY().GO_TO_TECHNOLOGY_LINK_ARROW,
    });

    cy.verifyElement({
        element: homePageElements.TECHNOLOGY().GO_TO_TECHNOLOGY_LINK,
        elementText: "Go to Technology",
        hrefContainUrl: "#/analytics/technology/devices-and-types",
    });

    cy.verifyElement({
        labelElement: homePageElements.TECHNOLOGY().TOP_PLATFORMS_LABEL,
        labelText: "Top Platforms",
        tooltipElement: homePageElements.TECHNOLOGY().TOP_PLATFORMS_TOOLTIP,
        tooltipText: "Top 5 versions of the platforms of your users’ sessions, in the selected time period."
    });

    cy.verifyElement({
        labelElement: homePageElements.TECHNOLOGY().TOP_DEVICES_LABEL,
        labelText: "Top Devices",
        tooltipElement: homePageElements.TECHNOLOGY().TOP_DEVICES_TOOLTIP,
        tooltipText: "Top 5 devices of your users’ based on their sessions, in the selected time period."
    });

    cy.verifyElement({
        labelElement: homePageElements.TECHNOLOGY().TOP_APP_VERSIONS_LABEL,
        labelText: "Top App Versions",
        tooltipElement: homePageElements.TECHNOLOGY().TOP_APP_VERSIONS_TOOLTIP,
        tooltipText: "Top 5 App versions of your users’ based on their sessions, in the selected time period."
    });

    cy.verifyElement({
        labelElement: homePageElements.TECHNOLOGY().TOP_DEVICE_TYPES_LABEL,
        labelText: "Top Device types",
        tooltipElement: homePageElements.TECHNOLOGY().TOP_DEVICE_TYPES_TOOLTIP,
        tooltipText: "Top 5 device types of your users’ based on their sessions, in the selected time period."
    });

    cy.verifyElement({
        labelElement: homePageElements.COUNTRIES.LABEL,
        labelText: "Countries",
        tooltipElement: homePageElements.COUNTRIES.TOOLTIP,
        tooltipText: "An overview of the geographical distribution of your users and their sessions in the selected time period."
    });

    cy.verifyElement({
        element: homePageElements.COUNTRIES.GO_TO_COUNTRIES_LINK_ARROW,
    });

    cy.verifyElement({
        element: homePageElements.COUNTRIES.GO_TO_COUNTRIES_LINK,
        elementText: "Go to Countries",
        hrefContainUrl: "#/analytics/geo/countries",
    });

    cy.verifyElement({
        element: homePageElements.COUNTRIES.WORLD_MAP,
    });

    cy.verifyElement({
        element: homePageElements.COUNTRIES.TOTAL_SESSIONS_RADIO_BUTTON,
    });

    cy.verifyElement({
        element: homePageElements.COUNTRIES.TOTAL_SESSIONS_RADIO_BOX,
    });

    cy.verifyElement({
        labelElement: homePageElements.COUNTRIES.TOTAL_SESSIONS_LABEL,
        labelText: "Total Sessions",
    });

    cy.verifyElement({
        element: homePageElements.COUNTRIES.TOTAL_USERS_RADIO_BUTTON,
    });

    cy.verifyElement({
        element: homePageElements.COUNTRIES.TOTAL_USERS_RADIO_BOX,
    });

    cy.verifyElement({
        labelElement: homePageElements.COUNTRIES.TOTAL_USERS_LABEL,
        labelText: "Total Users",
    });

    // TO DO => If has data, there is no tooltip  
    // cy.verifyElement({
    //     tooltipElement: homePageElements.COUNTRIES.TOTAL_USERS_NUMBER,
    //     tooltipText: "Total (unique) value for this period is estimated and corrected using the biggest time buckets from available daily, weekly and monthly stats.Exact total counts are available for this year, month and day periods"
    // });

    cy.verifyElement({
        element: homePageElements.COUNTRIES.NEW_USERS_RADIO_BUTTON,
    });

    cy.verifyElement({
        element: homePageElements.COUNTRIES.NEW_USERS_RADIO_BOX,
    });

    cy.verifyElement({
        labelElement: homePageElements.COUNTRIES.NEW_USERS_LABEL,
        labelText: "New Users",
    });

    cy.verifyElement({
        labelElement: homePageElements.CRASH_STATISTICS.LABEL,
        labelText: "Crash Statistics",
        tooltipElement: homePageElements.CRASH_STATISTICS.TOOLTIP,
        tooltipText: "See actionable information about crashes and exceptions including which users are impacted"
    });

    cy.verifyElement({
        element: homePageElements.CRASH_STATISTICS.GO_TO_CRASHES_LINK_ARROW,
    });

    cy.verifyElement({
        element: homePageElements.CRASH_STATISTICS.GO_TO_CRASHES_LINK,
        elementText: "Go to Crashes",
        hrefContainUrl: "#/crashes",
    });

    cy.verifyElement({
        labelElement: homePageElements.CRASH_STATISTICS.TOTAL_CRASHES_LABEL,
        labelText: "Total Crashes",
        tooltipElement: homePageElements.CRASH_STATISTICS.TOTAL_CRASHES_TOOLTIP,
        tooltipText: "Total number of crashes or crash groups occurrences for the applied filter, in the selected time period."
    });

    cy.verifyElement({
        labelElement: homePageElements.CRASH_STATISTICS.UNIQUE_CRASHES_LABEL,
        labelText: "Unique Crashes",
        tooltipElement: homePageElements.CRASH_STATISTICS.UNIQUE_CRASHES_TOOLTIP,
        tooltipText: "Number of crashes (fatal or non-fatal) that occurred uniquely, in the selected time period. Only the first occurrence of the crash is recorded."
    });

    cy.verifyElement({
        tooltipElement: homePageElements.CRASH_STATISTICS.UNIQUE_CRASHES_NUMBER,
        tooltipText: "Total (unique) value for this period is estimated and corrected using the biggest time buckets from available daily, weekly and monthly stats.Exact total counts are available for this year, month and day periods"
    });

    cy.verifyElement({
        labelElement: homePageElements.CRASH_STATISTICS.CRASHES_SESSIONS_LABEL,
        labelText: "Crashes / Sessions",
        tooltipElement: homePageElements.CRASH_STATISTICS.CRASHES_SESSIONS_TOOLTIP,
        tooltipText: "Number of crashes for the applied filter occurring per session, expressed as a percentage, in the selected time period."
    });

    cy.verifyElement({
        labelElement: homePageElements.CRASH_STATISTICS.CRASH_FREE_USERS_LABEL,
        labelText: "Crash-free Users",
        tooltipElement: homePageElements.CRASH_STATISTICS.CRASH_FREE_USERS_TOOLTIP,
        tooltipText: "Number of users who have not experienced a crash for the applied filter in the selected time period, expressed as a percentage of the total number of users within that time period."
    });

    cy.verifyElement({
        labelElement: homePageElements.CRASH_STATISTICS.CRASH_FREE_SESSIONS_LABEL,
        labelText: "Crash-free Sessions",
        tooltipElement: homePageElements.CRASH_STATISTICS.CRASH_FREE_SESSIONS_TOOLTIP,
        tooltipText: "Number of sessions during which the selected crash did not occur in the selected time period, expressed as a percentage of the total number of sessions within that time period."
    });
}

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.scrollPageToTop('.main-view');

    cy.verifyElement({
        element: homePageElements.TOP_EVENTS.EMPTY_CARD_BOX,
        labelElement: homePageElements.TOP_EVENTS.EMPTY_CARD_BOX_LABEL,
        labelText: "No data",
    });

    cy.verifyElement({
        element: homePageElements.AUDIENCE.TOTAL_SESSIONS_NUMBER,
        elementText: "0",
    });

    cy.verifyElement({
        element: homePageElements.AUDIENCE.TOTAL_SESSIONS_TREND_ICON,
    });

    cy.verifyElement({
        element: homePageElements.AUDIENCE.TOTAL_SESSIONS_TREND_VALUE,
        elementText: "NA",
    });

    cy.verifyElement({
        element: homePageElements.AUDIENCE.NEW_SESSIONS_NUMBER,
        elementText: "0",
    });

    cy.verifyElement({
        element: homePageElements.AUDIENCE.NEW_SESSIONS_TREND_ICON,
    });

    cy.verifyElement({
        element: homePageElements.AUDIENCE.NEW_SESSIONS_TREND_VALUE,
        elementText: "NA",
    });

    cy.verifyElement({
        element: homePageElements.AUDIENCE.TIME_SPENT_NUMBER,
        elementText: "0.0 m",
    });

    cy.verifyElement({
        element: homePageElements.AUDIENCE.TIME_SPENT_TREND_ICON,
    });

    cy.verifyElement({
        element: homePageElements.AUDIENCE.TIME_SPENT_TREND_VALUE,
        elementText: "NA",
    });

    cy.verifyElement({
        element: homePageElements.AUDIENCE.AVG_SESSION_DURATION_NUMBER,
        elementText: "0.0 m",
    });

    cy.verifyElement({
        element: homePageElements.AUDIENCE.AVG_SESSION_DURATION_TREND_ICON,
    });

    cy.verifyElement({
        element: homePageElements.AUDIENCE.AVG_SESSION_DURATION_TREND_VALUE,
        elementText: "NA",
    });

    cy.verifyElement({
        element: homePageElements.AUDIENCE.AVG_REQUESTS_RECEIVED_NUMBER,
        elementText: "0.0",
    });

    cy.verifyElement({
        element: homePageElements.AUDIENCE.AVG_REQUESTS_RECEIVED_TREND_ICON,
    });

    cy.verifyElement({
        element: homePageElements.AUDIENCE.AVG_REQUESTS_RECEIVED_TREND_VALUE,
        elementText: "NA",
    });

    cy.scrollPageToCenter('.main-view');

    cy.verifyElement({
        element: homePageElements.SOURCES.EMPTY_CARD_BOX,
        labelElement: homePageElements.SOURCES.EMPTY_CARD_BOX_LABEL,
        labelText: "No data",
    });

    cy.verifyElement({
        element: homePageElements.VIEWS.TOTAL_VIEWS_NUMBER,
        elementText: "0",
    });

    cy.verifyElement({
        element: homePageElements.VIEWS.UNIQUE_VIEWS_NUMBER,
        elementText: "0",
    });

    cy.verifyElement({
        element: homePageElements.VIEWS.BOUNCE_RATE_NUMBER,
        elementText: "0%",
    });

    cy.scrollPageToBottom('.main-view');

    cy.verifyElement({
        element: homePageElements.COUNTRIES.TOTAL_SESSIONS_NUMBER,
        elementText: "0",
    });

    cy.verifyElement({
        element: homePageElements.COUNTRIES.TOTAL_SESSIONS_TREND_ICON,
    });

    cy.verifyElement({
        element: homePageElements.COUNTRIES.TOTAL_SESSIONS_TREND_VALUE,
        elementText: "NA",
    });

    cy.verifyElement({
        element: homePageElements.COUNTRIES.TOTAL_USERS_NUMBER,
        elementText: "~0",
    });

    cy.verifyElement({
        element: homePageElements.COUNTRIES.TOTAL_USERS_TREND_ICON,
    });

    cy.verifyElement({
        element: homePageElements.COUNTRIES.TOTAL_USERS_TREND_VALUE,
        elementText: "NA",
    });

    cy.verifyElement({
        element: homePageElements.COUNTRIES.NEW_USERS_NUMBER,
        elementText: "0",
    });

    cy.verifyElement({
        element: homePageElements.COUNTRIES.NEW_USERS_TREND_ICON,
    });

    cy.verifyElement({
        element: homePageElements.COUNTRIES.NEW_USERS_TREND_VALUE,
        elementText: "NA",
    });

    cy.verifyElement({
        element: homePageElements.CRASH_STATISTICS.TOTAL_CRASHES_NUMBER,
        elementText: "0",
    });

    cy.verifyElement({
        element: homePageElements.CRASH_STATISTICS.TOTAL_CRASHES_TREND_ICON,
    });

    cy.verifyElement({
        element: homePageElements.CRASH_STATISTICS.TOTAL_CRASHES_TREND_VALUE,
        elementText: "NA",
    });

    cy.verifyElement({
        element: homePageElements.CRASH_STATISTICS.UNIQUE_CRASHES_NUMBER,
        elementText: "~0",
    });

    cy.verifyElement({
        element: homePageElements.CRASH_STATISTICS.UNIQUE_CRASHES_TREND_ICON,
    });

    cy.verifyElement({
        element: homePageElements.CRASH_STATISTICS.UNIQUE_CRASHES_TREND_VALUE,
        elementText: "NA",
    });

    cy.verifyElement({
        element: homePageElements.CRASH_STATISTICS.CRASHES_SESSIONS_NUMBER,
        elementText: "0",
    });

    cy.verifyElement({
        element: homePageElements.CRASH_STATISTICS.CRASHES_SESSIONS_TREND_ICON,
    });

    cy.verifyElement({
        element: homePageElements.CRASH_STATISTICS.CRASH_FREE_USERS_NUMBER,
        elementText: "100.00%",
    });

    cy.verifyElement({
        element: homePageElements.CRASH_STATISTICS.CRASH_FREE_USERS_TREND_ICON,
    });

    cy.verifyElement({
        element: homePageElements.CRASH_STATISTICS.CRASH_FREE_USERS_TREND_VALUE,
        elementText: "0.0%",
    });

    cy.verifyElement({
        element: homePageElements.CRASH_STATISTICS.CRASH_FREE_SESSIONS_NUMBER,
        elementText: "100.00%",
    });

    cy.verifyElement({
        element: homePageElements.CRASH_STATISTICS.CRASH_FREE_SESSIONS_TREND_ICON,
    });

    cy.verifyElement({
        element: homePageElements.CRASH_STATISTICS.CRASH_FREE_SESSIONS_TREND_VALUE,
        elementText: "0.0%",
    });
};

const verifyFullDataPageElements = () => {
    verifyStaticElementsOfPage();

    cy.scrollPageToTop('.main-view');

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.AUDIENCE.TOTAL_SESSIONS_NUMBER,
        elementText: "0",
    });

    cy.verifyElement({
        element: homePageElements.AUDIENCE.TOTAL_SESSIONS_TREND_ICON,
    });

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.AUDIENCE.TOTAL_SESSIONS_TREND_VALUE,
        elementText: "NA",
    });

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.AUDIENCE.NEW_SESSIONS_NUMBER,
        elementText: "0",
    });

    cy.verifyElement({
        element: homePageElements.AUDIENCE.NEW_SESSIONS_TREND_ICON,
    });

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.AUDIENCE.NEW_SESSIONS_TREND_VALUE,
        elementText: "NA",
    });

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.AUDIENCE.TIME_SPENT_NUMBER,
        elementText: "0.0 m",
    });

    cy.verifyElement({
        element: homePageElements.AUDIENCE.TIME_SPENT_TREND_ICON,
    });

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.AUDIENCE.TIME_SPENT_TREND_VALUE,
        elementText: "NA",
    });

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.AUDIENCE.AVG_SESSION_DURATION_NUMBER,
        elementText: "0.0 m",
    });

    cy.verifyElement({
        element: homePageElements.AUDIENCE.AVG_SESSION_DURATION_TREND_ICON,
    });

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.AUDIENCE.AVG_SESSION_DURATION_TREND_VALUE,
        elementText: "NA",
    });

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.AUDIENCE.AVG_REQUESTS_RECEIVED_NUMBER,
        elementText: "0.0",
    });

    cy.verifyElement({
        element: homePageElements.AUDIENCE.AVG_REQUESTS_RECEIVED_TREND_ICON,
    });

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.AUDIENCE.AVG_REQUESTS_RECEIVED_TREND_VALUE,
        elementText: "NA",
    });

    cy.scrollPageToCenter('.main-view');

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.VIEWS.TOTAL_VIEWS_NUMBER,
        elementText: "0",
    });

    cy.verifyElement({
        element: homePageElements.VIEWS.UNIQUE_VIEWS_NUMBER,
    });

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.VIEWS.BOUNCE_RATE_NUMBER,
        elementText: "0%",
    });

    cy.verifyElement({
        element: homePageElements.TECHNOLOGY().TOP_PLATFORMS_DATA_BLOCK,
    });

    cy.verifyElement({
        element: homePageElements.TECHNOLOGY().TOP_PLATFORMS_DATA_BLOCK_ITEMS,
    });

    cy.verifyElement({
        element: homePageElements.TECHNOLOGY().TOP_DEVICE_DATA_BLOCK,
    });

    cy.verifyElement({
        element: homePageElements.TECHNOLOGY().TOP_DEVICE_DATA_BLOCK_ITEMS,
    });

    cy.getElement(homePageElements.TECHNOLOGY().TOP_APP_VERSIONS_LABEL).scrollIntoView();

    cy.verifyElement({
        element: homePageElements.TECHNOLOGY().TOP_APP_VERSIONS_DATA_BLOCK,
    });

    cy.verifyElement({
        element: homePageElements.TECHNOLOGY().TOP_APP_VERSIONS_DATA_BLOCK_ITEMS,
    });

    cy.verifyElement({
        element: homePageElements.TECHNOLOGY().TOP_DEVICE_TYPES_DATA_BLOCK,
    });

    cy.verifyElement({
        element: homePageElements.TECHNOLOGY().TOP_DEVICE_TYPES_DATA_BLOCK_ITEMS,
    });

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.COUNTRIES.TOTAL_SESSIONS_NUMBER,
        elementText: "0",
    });

    cy.verifyElement({
        element: homePageElements.COUNTRIES.TOTAL_SESSIONS_TREND_ICON,
    });

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.COUNTRIES.TOTAL_SESSIONS_TREND_VALUE,
        elementText: "NA",
    });

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.COUNTRIES.TOTAL_USERS_NUMBER,
        elementText: "~0",
    });

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.COUNTRIES.TOTAL_USERS_TREND_ICON,
    });

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.COUNTRIES.TOTAL_USERS_TREND_VALUE,
        elementText: "NA",
    });

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.COUNTRIES.NEW_USERS_NUMBER,
        elementText: "0",
    });

    cy.verifyElement({
        element: homePageElements.COUNTRIES.NEW_USERS_TREND_ICON,
    });

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.COUNTRIES.NEW_USERS_TREND_VALUE,
        elementText: "NA",
    });

    cy.scrollPageToBottom('.main-view');

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.CRASH_STATISTICS.TOTAL_CRASHES_NUMBER,
        elementText: "0",
    });

    cy.verifyElement({
        element: homePageElements.CRASH_STATISTICS.TOTAL_CRASHES_TREND_ICON,
    });

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.CRASH_STATISTICS.TOTAL_CRASHES_TREND_VALUE,
        elementText: "NA",
    });

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.CRASH_STATISTICS.UNIQUE_CRASHES_NUMBER,
        elementText: "~0",
    });

    cy.verifyElement({
        element: homePageElements.CRASH_STATISTICS.UNIQUE_CRASHES_TREND_ICON,
    });

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.CRASH_STATISTICS.UNIQUE_CRASHES_TREND_VALUE,
        elementText: "NA",
    });

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.CRASH_STATISTICS.CRASHES_SESSIONS_NUMBER,
        elementText: "0",
    });

    cy.verifyElement({
        element: homePageElements.CRASH_STATISTICS.CRASHES_SESSIONS_TREND_ICON,
    });

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.CRASH_STATISTICS.CRASH_FREE_USERS_NUMBER,
        elementText: "100.00%",
    });

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.CRASH_STATISTICS.CRASH_FREE_USERS_TREND_ICON,
    });

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.CRASH_STATISTICS.CRASH_FREE_USERS_TREND_VALUE,
        elementText: "0.0%",
    });

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.CRASH_STATISTICS.CRASH_FREE_SESSIONS_NUMBER,
        elementText: "100.00%",
    });

    cy.verifyElement({
        element: homePageElements.CRASH_STATISTICS.CRASH_FREE_SESSIONS_TREND_ICON,
    });

    cy.verifyElement({
        shouldNot: true, 
        element: homePageElements.CRASH_STATISTICS.CRASH_FREE_SESSIONS_TREND_VALUE,
        elementText: "0.0%",
    });
}

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements
};