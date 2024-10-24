import {
    healthCheckPageElements,
    healthCheckMetricCardElements,
    hcsEChartElements,
    statusCodesEChartElements,
    errorMessagesEChartElements
} from "../../../../support/elements/dashboard/manage/sdk/healthCheck";


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
        labelElement: healthCheckMetricCardElements.HEALTH_CHECK_RECEIVED_LABEL,
        labelText: "Health Checks Received",
        element: healthCheckMetricCardElements.HEALTH_CHECK_RECEIVED_RECEIVED_TREND_ICON,
    });

    cy.verifyElement({
        labelElement: healthCheckMetricCardElements.SDK_ERROR_LOGS_LABEL,
        labelText: "SDK Error Logs",
        element: healthCheckMetricCardElements.SDK_ERROR_LOGS_TREND_ICON,
    });

    cy.verifyElement({
        labelElement: healthCheckMetricCardElements.SDK_WARN_LOGS_LABEL,
        labelText: "SDK Warn Logs",
        element: healthCheckMetricCardElements.SDK_WARN_LOGS_TREND_ICON,
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

    verifyHealthCheckMetricCard({
        isEmpty: true,
    });

    cy.scrollPageToCenter();

    verifyHcsEChart({
        isEmpty: true,
    });

    cy.scrollPageToBottom();

    verifyStatusCodesEChart({
        isEmpty: true,
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    cy.scrollPageToTop();

    verifyHealthCheckMetricCard({
        isEmpty: false,
    });

    cy.scrollPageToCenter();

    verifyHcsEChart({
        isEmpty: false,
    });

    cy.scrollPageToBottom();

    verifyStatusCodesEChart({
        isEmpty: false,
    });
};

const verifyHealthCheckMetricCard = ({
    isEmpty = false,
    healthCheckReceivedNumber = null,
    healthCheckReceivedPercentage = null,
    sdkErrorLogsNumber = null,
    sdkErrorLogsPercentage = null,
    sdkWarnLogsNumber = null,
    sdkWarnLogsPercentage = null
}) => {

    if (isEmpty) {
        cy.verifyElement({
            labelElement: healthCheckMetricCardElements.HEALTH_CHECK_RECEIVED_RECEIVED_NUMBER,
            labelText: "0",
        });

        cy.verifyElement({
            labelElement: healthCheckMetricCardElements.HEALTH_CHECK_RECEIVED_RECEIVED_PERCENTAGE,
            labelText: "NA",
        });

        cy.verifyElement({
            labelElement: healthCheckMetricCardElements.SDK_ERROR_LOGS_NUMBER,
            labelText: "0",
        });

        cy.verifyElement({
            labelElement: healthCheckMetricCardElements.SDK_ERROR_LOGS_PERCENTAGE,
            labelText: "NA",
        });

        cy.verifyElement({
            labelElement: healthCheckMetricCardElements.SDK_WARN_LOGS_NUMBER,
            labelText: "0",
        });

        cy.verifyElement({
            labelElement: healthCheckMetricCardElements.SDK_WARN_LOGS_PERCENTAGE,
            labelText: "NA",
        });

        return;
    }

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: healthCheckMetricCardElements.HEALTH_CHECK_RECEIVED_RECEIVED_NUMBER,
        elementText: healthCheckReceivedNumber,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: healthCheckMetricCardElements.HEALTH_CHECK_RECEIVED_RECEIVED_PERCENTAGE,
        elementText: healthCheckReceivedPercentage,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: healthCheckMetricCardElements.SDK_ERROR_LOGS_NUMBER,
        elementText: sdkErrorLogsNumber,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: healthCheckMetricCardElements.SDK_ERROR_LOGS_PERCENTAGE,
        elementText: sdkErrorLogsPercentage,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: healthCheckMetricCardElements.SDK_WARN_LOGS_NUMBER,
        elementText: sdkWarnLogsNumber,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: healthCheckMetricCardElements.SDK_WARN_LOGS_PERCENTAGE,
        elementText: sdkWarnLogsPercentage,
    });
};

const verifyHcsEChart = ({
    isEmpty = false,
}) => {
    if (isEmpty) {
        cy.verifyElement({
            element: hcsEChartElements.EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: hcsEChartElements.EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: hcsEChartElements.EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });

        return;
    }

    cy.verifyElement({
        element: hcsEChartElements.SELECT_HCS_CHART_TYPE,
    });

    cy.verifyElement({
        element: hcsEChartElements.CHART_HCS,
    });

    cy.verifyElement({
        element: hcsEChartElements.CHART_TYPE_ANNOTATION_BUTTON,
    });

    cy.verifyElement({
        element: hcsEChartElements.CHART_MORE_BUTTON,
    });

    cy.verifyElement({
        element: hcsEChartElements.RECEIVED_HEALTH_CHECKS_ICON,
        labelElement: hcsEChartElements.RECEIVED_HEALTH_CHECKS_LABEL,
        labelText: "Received Health Checks"
    });

    cy.verifyElement({
        element: hcsEChartElements.ERROR_LOGS_ICON,
        labelElement: hcsEChartElements.ERROR_LOGS_LABEL,
        labelText: "Error Logs"
    });

    cy.verifyElement({
        element: hcsEChartElements.WARNING_LOGS_ICON,
        labelElement: hcsEChartElements.WARNING_LOGS_LABEL,
        labelText: "Warning Logs"
    });
};

const verifyStatusCodesEChart = ({
    isEmpty = false,
}) => {
    if (isEmpty) {
        cy.verifyElement({
            element: statusCodesEChartElements.EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: statusCodesEChartElements.EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: statusCodesEChartElements.EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });

        return;
    }

    cy.verifyElement({
        element: statusCodesEChartElements.CHART_STATUS_CODES,
    });

    cy.verifyElement({
        element: statusCodesEChartElements.CHART_MORE_BUTTON,
    });

    cy.verifyElement({
        element: statusCodesEChartElements.STATUS_CODE_MIN_1_ICON,
        labelElement: statusCodesEChartElements.STATUS_CODE_MIN_1_LABEL,
        labelText: "-1"
    });
};

const verifyErrorMessagesEChart = ({
    isEmpty = false,
}) => {
    if (isEmpty) {
        cy.verifyElement({
            element: errorMessagesEChartElements.EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: errorMessagesEChartElements.EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: errorMessagesEChartElements.EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });

        return;
    }

    cy.verifyElement({
        element: errorMessagesEChartElements.CHART_ERROR_MESSAGES,
    });

    cy.verifyElement({
        element: errorMessagesEChartElements.CHART_MORE_BUTTON,
    });

    cy.verifyElement({
        element: errorMessagesEChartElements.APP_DOES_NOT_EXIST_ICON,
        labelElement: errorMessagesEChartElements.APP_DOES_NOT_EXIST_LABEL,
        labelText: "App does not exist"
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
    verifyFullDataPageElements,
    verifyHealthCheckMetricCard,
    verifyHcsEChart,
    verifyStatusCodesEChart,
    verifyErrorMessagesEChart,
    clickSdkStatsTab,
    clickRequestStatsTab,
    clickHealthCheckTab,
    clickSdkConfigurationTab
};