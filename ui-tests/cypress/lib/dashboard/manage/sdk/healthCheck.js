import healthCheckPageElements from "../../../../support/elements/dashboard/manage/sdk/healthCheck";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: healthCheckPageElements.PAGE_TITLE,
        labelText: "Health Checks",
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: healthCheckPageElements.TAB_SDK_STATS,
        elementText: "SDK Stats",
    });

    cy.verifyElement({
        element: healthCheckPageElements.TAB_REQUEST_STATS,
        elementText: "Request Stats",
    });

    cy.verifyElement({
        element: healthCheckPageElements.TAB_HEALTH_CHECK,
        elementText: "Health Check",
    });

    cy.verifyElement({
        element: healthCheckPageElements.TAB_SDK_CONFIGURATION,
        elementText: "SDK Configuration",
    });

    cy.verifyElement({
        element: healthCheckPageElements.FILTER_DATE_PICKER,
    });

    cy.verifyElement({
        labelElement: healthCheckPageElements.HEALTH_CHECK_RECEIVED_LABEL,
        labelText: "Health Checks Received",
        element: healthCheckPageElements.HEALTH_CHECK_RECEIVED_RECEIVED_TREND_ICON,
    });

    cy.verifyElement({
        labelElement: healthCheckPageElements.SDK_ERROR_LOGS_LABEL,
        labelText: "SDK Error Logs",
        element: healthCheckPageElements.SDK_ERROR_LOGS_TREND_ICON,
    });

    cy.verifyElement({
        labelElement: healthCheckPageElements.SDK_WARN_LOGS_LABEL,
        labelText: "SDK Warn Logs",
        element: healthCheckPageElements.SDK_WARN_LOGS_TREND_ICON,
    });

    cy.scrollPageToCenter();

    cy.verifyElement({
        labelElement: healthCheckPageElements.HEALTH_CHECK_BREAKDOWN_BY_STATUS_AS_LABEL,
        labelText: "Health check breakdown by status as",
        element: healthCheckPageElements.HEALTH_CHECK_BREAKDOWN_BY_STATUS_AS_TYPE_SELECT,
        elementText: "percentage",
    });

    cy.scrollPageToBottom();

    cy.verifyElement({
        labelElement: healthCheckPageElements.HEALTH_CHECK_BREAKDOWN_BY_ERRORS_AS_LABEL,
        labelText: "Health check breakdown by errors as",
        element: healthCheckPageElements.HEALTH_CHECK_BREAKDOWN_BY_ERRORS_AS_TYPE_SELECT,
        elementText: "percentage",
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.scrollPageToTop();

    cy.verifyElement({
        labelElement: healthCheckPageElements.HEALTH_CHECK_RECEIVED_RECEIVED_NUMBER,
        labelText: "0",
    });

    cy.verifyElement({
        labelElement: healthCheckPageElements.HEALTH_CHECK_RECEIVED_RECEIVED_VALUE,
        labelText: "NA",
    });

    cy.verifyElement({
        labelElement: healthCheckPageElements.SDK_ERROR_LOGS_NUMBER,
        labelText: "0",
    });

    cy.verifyElement({
        labelElement: healthCheckPageElements.SDK_ERROR_LOGS_VALUE,
        labelText: "NA",
    });

    cy.verifyElement({
        labelElement: healthCheckPageElements.SDK_WARN_LOGS_NUMBER,
        labelText: "0",
    });

    cy.verifyElement({
        labelElement: healthCheckPageElements.SDK_WARN_LOGS_VALUE,
        labelText: "NA",
    });

    cy.verifyElement({
        element: healthCheckPageElements.HEALTH_CHECK_EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: healthCheckPageElements.HEALTH_CHECK_EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: healthCheckPageElements.HEALTH_CHECK_EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });

    cy.scrollPageToCenter();

    cy.verifyElement({
        element: healthCheckPageElements.STATUS_EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: healthCheckPageElements.STATUS_EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: healthCheckPageElements.STATUS_EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });

    cy.scrollPageToBottom();

    cy.verifyElement({
        element: healthCheckPageElements.ERROR_MESSAGES_EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: healthCheckPageElements.ERROR_MESSAGES_EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: healthCheckPageElements.ERROR_MESSAGES_EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });
};

const clickSdkStatsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(healthCheckPageElements.TAB_SDK_STATS);
};

const clickRequestStatsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(healthCheckPageElements.TAB_REQUEST_STATS);
};

const clickHealthCheckTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(healthCheckPageElements.TAB_HEALTH_CHECK);
};

const clickSdkConfigurationTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(healthCheckPageElements.TAB_SDK_CONFIGURATION);
};

module.exports = {
    verifyEmptyPageElements,
    clickSdkStatsTab,
    clickRequestStatsTab,
    clickHealthCheckTab,
    clickSdkConfigurationTab
};