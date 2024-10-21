import {
    requestStatsPageElements,
    requestStatsMetricCardElements,
    requestsEChartElements,
    delaysEChartElements,
    receivedRequestEChartElements,
    canceledRequestEChartElements
} from "../../../../support/elements/dashboard/manage/sdk/requestStats";

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
        labelElement: requestStatsMetricCardElements.REQUESTS_RECEIVED_LABEL,
        labelText: "Requests Received",
        element: requestStatsMetricCardElements.REQUESTS_RECEIVED_TREND_ICON,
    });

    cy.verifyElement({
        labelElement: requestStatsMetricCardElements.REQUESTS_CANCELED_LABEL,
        labelText: "Requests Canceled",
        element: requestStatsMetricCardElements.REQUESTS_CANCELED_TREND_ICON,
    });

    cy.verifyElement({
        labelElement: requestStatsMetricCardElements.REQUESTS_QUEUED_LABEL,
        labelText: "Requests Queued",
        element: requestStatsMetricCardElements.REQUESTS_QUEUED_TREND_ICON,
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

    verifyRequestStatsMetricCard({
        isEmpty: true
    });

    verifyRequestsEChart({
        isEmpty: true
    });

    verifyDelaysEChart({
        isEmpty: true
    });

    cy.scrollPageToBottom();

    verifyReceivedRequestEChart({
        isEmpty: true
    });

    verifyCanceledRequestEChart({
        isEmpty: true
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyRequestStatsMetricCard({
        isEmpty: false,
    });

    verifyRequestsEChart({
        isEmpty: false
    });

    cy.scrollPageToCenter();

    verifyDelaysEChart({
        isEmpty: false
    });

    cy.scrollPageToBottom();

    verifyReceivedRequestEChart({
        isEmpty: false
    });

    verifyCanceledRequestEChart({
        isEmpty: false
    });
};

const verifyRequestStatsMetricCard = ({
    isEmpty = false,
    requestsReceivedNumber = null,
    requestsReceivedPercentage = null,

    requestsCanceledNumber = null,
    requestsCanceledPercentage = null,

    requestsQueuedNumber = null,
    requestsQueuedPercentage = null

}) => {

    cy.scrollPageToTop();

    if (isEmpty) {

        cy.verifyElement({
            element: requestStatsMetricCardElements.REQUESTS_RECEIVED_NUMBER,
            elementText: "0",
        });

        cy.verifyElement({
            element: requestStatsMetricCardElements.REQUESTS_RECEIVED_PERCENTAGE,
            elementText: "NA",
        });

        cy.verifyElement({
            element: requestStatsMetricCardElements.REQUESTS_CANCELED_NUMBER,
            elementText: "0",
        });

        cy.verifyElement({
            element: requestStatsMetricCardElements.REQUESTS_CANCELED_PERCENTAGE,
            elementText: "NA",
        });

        cy.verifyElement({
            element: requestStatsMetricCardElements.REQUESTS_QUEUED_NUMBER,
            elementText: "0",
        });

        cy.verifyElement({
            element: requestStatsMetricCardElements.REQUESTS_QUEUED_PERCENTAGE,
            elementText: "NA",
        });

    } else {
        cy.verifyElement({
            shouldNot: !isEmpty,
            element: requestStatsMetricCardElements.REQUESTS_RECEIVED_NUMBER,
            elementText: requestsReceivedNumber,
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: requestStatsMetricCardElements.REQUESTS_RECEIVED_PERCENTAGE,
            elementText: requestsReceivedPercentage,
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: requestStatsMetricCardElements.REQUESTS_CANCELED_NUMBER,
            elementText: requestsCanceledNumber,
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: requestStatsMetricCardElements.REQUESTS_CANCELED_PERCENTAGE,
            elementText: requestsCanceledPercentage,
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: requestStatsMetricCardElements.REQUESTS_QUEUED_NUMBER,
            elementText: requestsQueuedNumber,
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: requestStatsMetricCardElements.REQUESTS_QUEUED_PERCENTAGE,
            elementText: requestsQueuedPercentage,
        });
    }
};

const verifyRequestsEChart = ({
    isEmpty = false,
}) => {

    cy.scrollPageToTop();

    if (isEmpty) {
        cy.verifyElement({
            element: requestsEChartElements.EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: requestsEChartElements.EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: requestsEChartElements.EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });

    } else {

        cy.verifyElement({
            element: requestsEChartElements.SELECT_REQUESTS_CHART_TYPE,
            elementPlaceHolder: "Select",
            value: "Line",
        });

        cy.verifyElement({
            element: requestsEChartElements.CHART_TYPE_ANNOTATION_BUTTON,
        });

        cy.verifyElement({
            element: requestsEChartElements.CHART_MORE_BUTTON,
        });

        cy.verifyElement({
            element: requestsEChartElements.CHART_REQUESTS,
        });

        cy.verifyElement({
            element: requestsEChartElements.RECEIVED_REQUESTS_ICON,
            labelElement: requestsEChartElements.RECEIVED_REQUESTS_LABEL,
            labelText: "Received requests",
        });

        cy.verifyElement({
            element: requestsEChartElements.CANCELED_REQUESTS_ICON,
            labelElement: requestsEChartElements.CANCELED_REQUESTS_LABEL,
            labelText: "Canceled requests",
        });

        cy.verifyElement({
            element: requestsEChartElements.QUEUED_REQUESTS_ICON,
            labelElement: requestsEChartElements.QUEUED_REQUESTS_LABEL,
            labelText: "Queued requests",
        });
    }
}

const verifyDelaysEChart = ({
    isEmpty = false,
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: delaysEChartElements.EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: delaysEChartElements.EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: delaysEChartElements.EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });

    } else {

        cy.verifyElement({
            element: delaysEChartElements.SELECT_DELAYS_CHART_TYPE,
            elementPlaceHolder: "Select",
            value: "Line",
        });

        cy.verifyElement({
            element: delaysEChartElements.CHART_TYPE_ANNOTATION_BUTTON,
        });

        cy.verifyElement({
            element: delaysEChartElements.CHART_MORE_BUTTON,
        });

        cy.verifyElement({
            element: delaysEChartElements.CHART_DELAYS,
        });

        cy.verifyElement({
            element: delaysEChartElements.MINIMUM_DELAY_ICON,
            labelElement: delaysEChartElements.MINIMUM_DELAY_LABEL,
            labelText: "Minimum Delay",
        });

        cy.verifyElement({
            element: delaysEChartElements.AVERAGE_DELAY_ICON,
            labelElement: delaysEChartElements.AVERAGE_DELAY_LABEL,
            labelText: "Average Delay",
        });

        cy.verifyElement({
            element: delaysEChartElements.MAXIMUM_DELAY_ICON,
            labelElement: delaysEChartElements.MAXIMUM_DELAY_LABEL,
            labelText: "Maximum Delay",
        });
    }
}

const verifyReceivedRequestEChart = ({
    isEmpty = false,
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: receivedRequestEChartElements.EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: receivedRequestEChartElements.EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: receivedRequestEChartElements.EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });

    } else {

        cy.verifyElement({
            element: receivedRequestEChartElements.CHART_RECEIVED_REQUESTS,
        });

        cy.verifyElement({
            element: receivedRequestEChartElements.CHART_MORE_BUTTON,
        });

        cy.verifyElement({
            element: receivedRequestEChartElements.APM_ICON,
            labelElement: receivedRequestEChartElements.APM_LABEL,
            labelText: "apm",
        });

        cy.verifyElement({
            element: receivedRequestEChartElements.BEGIN_SESSION_ICON,
            labelElement: receivedRequestEChartElements.BEGIN_SESSION_LABEL,
            labelText: "begin_session",
        });

        cy.verifyElement({
            element: receivedRequestEChartElements.CONSENT_ICON,
            labelElement: receivedRequestEChartElements.CONSENT_LABEL,
            labelText: "consent",
        });

        cy.verifyElement({
            element: receivedRequestEChartElements.CRASH_ICON,
            labelElement: receivedRequestEChartElements.CRASH_LABEL,
            labelText: "crash",
        });

        cy.verifyElement({
            element: receivedRequestEChartElements.END_SESSION_ICON,
            labelElement: receivedRequestEChartElements.END_SESSION_LABEL,
            labelText: "end_session",
        });

        cy.verifyElement({
            element: receivedRequestEChartElements.EVENTS_ICON,
            labelElement: receivedRequestEChartElements.EVENTS_LABEL,
            labelText: "events",
        });

        cy.verifyElement({
            element: receivedRequestEChartElements.SESSION_DURATION_ICON,
            labelElement: receivedRequestEChartElements.SESSION_DURATION_LABEL,
            labelText: "session_duration",
        });

        cy.verifyElement({
            element: receivedRequestEChartElements.TOKEN_SESSION_ICON,
            labelElement: receivedRequestEChartElements.TOKEN_SESSION_LABEL,
            labelText: "token_session",
        });

        cy.verifyElement({
            element: receivedRequestEChartElements.USER_DETAILS_ICON,
            labelElement: receivedRequestEChartElements.USER_DETAILS_LABEL,
            labelText: "user_details",
        });
    }
}

const verifyCanceledRequestEChart = ({
    isEmpty = false,
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: canceledRequestEChartElements.EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: canceledRequestEChartElements.EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: canceledRequestEChartElements.EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });

    } else {

        //TODO : Data is not being generated with the populator. Need to generate the data
        // cy.verifyElement({
        //     element: canceledRequestEChartElements.CHART_CANCELED_REQUESTS,
        // });

        // cy.verifyElement({
        //     element: canceledRequestEChartElements.CHART_MORE_BUTTON,
        // });
    }
}

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
    verifyFullDataPageElements,
    verifyRequestStatsMetricCard,
    verifyRequestsEChart,
    verifyDelaysEChart,
    verifyCanceledRequestEChart,
    clickSdkStatsTab,
    clickRequestStatsTab,
    clickHealthCheckTab,
    clickSdkConfigurationTab
};