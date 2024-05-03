import requestStatsPageElements from "../../../../support/elements/dashboard/manage/sdk/requestStats";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: requestStatsPageElements.PAGE_TITLE,
        labelText: "Request stats",
    });

    cy.scrollPageToTop();
    
    cy.verifyElement({
        element: requestStatsPageElements.TAB_SDK_STATS,
        elementText: "SDK Stats",
    });

    cy.verifyElement({
        element: requestStatsPageElements.TAB_REQUEST_STATS,
        elementText: "Request Stats",
    });

    cy.verifyElement({
        element: requestStatsPageElements.TAB_HEALTH_CHECK,
        elementText: "Health Check",
    });

    cy.verifyElement({
        element: requestStatsPageElements.TAB_SDK_CONFIGURATION,
        elementText: "SDK Configuration",
    });

    cy.verifyElement({
        element: requestStatsPageElements.FILTER_DATE_PICKER,
    });

    cy.verifyElement({
        labelElement: requestStatsPageElements.REQUESTS_RECEIVED_LABEL,
        labelText: "Requests Received",
        element: requestStatsPageElements.REQUESTS_RECEIVED_TREND_ICON,
    });

    cy.verifyElement({
        labelElement: requestStatsPageElements.REQUESTS_CANCELED_LABEL,
        labelText: "Requests Canceled",
        element: requestStatsPageElements.REQUESTS_CANCELED_TREND_ICON,
    });

    cy.verifyElement({
        labelElement: requestStatsPageElements.REQUESTS_QUEUED_LABEL,
        labelText: "Requests Queued",
        element: requestStatsPageElements.REQUESTS_QUEUED_TREND_ICON,
    });

    cy.scrollPageToCenter();

    cy.verifyElement({
        labelElement: requestStatsPageElements.RECEIVED_REQUEST_BREAKDOWN_BY_TYPE_AS_LABEL,
        labelText: "Received request breakdown by type as",
        element: requestStatsPageElements.RECEIVED_REQUEST_BREAKDOWN_BY_TYPE_AS_TYPE_SELECT,
        elementText: "percentage",
    });

    cy.scrollPageToBottom();

    cy.verifyElement({
        labelElement: requestStatsPageElements.CANCELED_REQUEST_BREAKDOWN_BY_REASON_AS_LABEL,
        labelText: "Canceled request breakdown by reason as",
        element: requestStatsPageElements.CANCELED_REQUEST_BREAKDOWN_BY_REASON_AS_TYPE_SELECT,
        elementText: "percentage",
    });
}

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.scrollPageToTop();

    cy.verifyElement({
        labelElement: requestStatsPageElements.REQUESTS_RECEIVED_NUMBER,
        labelText: "0",
    });

    cy.verifyElement({
        labelElement: requestStatsPageElements.REQUESTS_RECEIVED_VALUE,
        labelText: "NA",
    });

    cy.verifyElement({
        labelElement: requestStatsPageElements.REQUESTS_CANCELED_NUMBER,
        labelText: "0",
    });

    cy.verifyElement({
        labelElement: requestStatsPageElements.REQUESTS_CANCELED_VALUE,
        labelText: "NA",
    });

    cy.verifyElement({
        labelElement: requestStatsPageElements.REQUESTS_QUEUED_NUMBER,
        labelText: "0",
    });

    cy.verifyElement({
        labelElement: requestStatsPageElements.REQUESTS_QUEUED_VALUE,
        labelText: "NA",
    });

    cy.verifyElement({
        element: requestStatsPageElements.REQUESTS_EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: requestStatsPageElements.REQUESTS_EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: requestStatsPageElements.REQUESTS_EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });

    cy.scrollPageToCenter();

    cy.verifyElement({
        element: requestStatsPageElements.DELAYS_EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: requestStatsPageElements.DELAYS_EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: requestStatsPageElements.DELAYS_EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });

    cy.verifyElement({
        element: requestStatsPageElements.RECEIVED_REQUEST_EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: requestStatsPageElements.RECEIVED_REQUEST_EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: requestStatsPageElements.RECEIVED_REQUEST_EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });

    cy.scrollPageToBottom();

    cy.verifyElement({
        element: requestStatsPageElements.CANCELED_REQUEST_EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: requestStatsPageElements.CANCELED_REQUEST_EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: requestStatsPageElements.CANCELED_REQUEST_EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });
};

const clickSdkStatsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(requestStatsPageElements.TAB_SDK_STATS);
};

const clickRequestStatsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(requestStatsPageElements.TAB_REQUEST_STATS);
};

const clickHealthCheckTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(requestStatsPageElements.TAB_HEALTH_CHECK);
};

const clickSdkConfigurationTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(requestStatsPageElements.TAB_SDK_CONFIGURATION);
};

module.exports = {
    verifyEmptyPageElements,
    clickSdkStatsTab,
    clickRequestStatsTab,
    clickHealthCheckTab,
    clickSdkConfigurationTab
};