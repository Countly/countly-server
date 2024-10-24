import {
    metricsPageElements,
    consentRequestsEChartElements,
    userDataExportsEChartElements,
    userDataPurgesEChartElements
} from "../../../../support/elements/dashboard/manage/compliance/metrics";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: metricsPageElements.PAGE_TITLE,
        labelText: "Compliance Hub",
    });

    cy.verifyElement({
        labelElement: metricsPageElements.CONSENT_REQUESTS_FOR_LABEL,
        labelText: "Consent Requests for",
        element: metricsPageElements.CONSENT_REQUESTS_FILTER_SELECT,
        elementText: "Sessions",
    });

    cy.verifyElement({
        element: metricsPageElements.FILTER_DATE_PICKER,
    });

    cy.scrollPageToBottom();

    cy.verifyElement({
        labelElement: metricsPageElements.USER_DATA_EXPORTS_LABEL,
        labelText: "User data exports",
        element: userDataExportsEChartElements.USER_DATA_EXPORTS_TREND_ICON,
    });

    cy.verifyElement({
        labelElement: metricsPageElements.USER_DATA_PURGES_LABEL,
        labelText: "User data purges",
        element: userDataPurgesEChartElements.USER_DATA_PURGES_TREND_ICON,
    });

    cy.verifyElement({
        element: metricsPageElements.TAB_METRICS,
        elementText: "Metrics",
    });

    cy.verifyElement({
        element: metricsPageElements.TAB_USERS,
        elementText: "Users",
    });

    cy.verifyElement({
        element: metricsPageElements.TAB_CONSENT_HISTORY,
        elementText: "Consent History",
    });

    cy.verifyElement({
        element: metricsPageElements.TAB_EXPORT_PURGE_HISTORY,
        elementText: "Export/Purge History",
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyConsentRequestsEChart({
        isEmpty: true,
    });

    verifyUserDataExportsEChart({
        isEmpty: true,
    });

    verifyUserDataPurgesEChart({
        isEmpty: true,
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyConsentRequestsEChart({
        isEmpty: false,
    });

    verifyUserDataExportsEChart({
        isEmpty: false,
    });

    verifyUserDataPurgesEChart({
        isEmpty: false,
    });
};

const verifyConsentRequestsEChart = ({
    isEmpty = false,
    optInValue = null,
    optInPercentage = null,
    optOutValue = null,
    optOutPercentage = null,
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: consentRequestsEChartElements.EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: consentRequestsEChartElements.EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: consentRequestsEChartElements.EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });

        return;
    }

    cy.verifyElement({
        element: consentRequestsEChartElements.CHART_CONSENT_REQUESTS,
    });

    cy.verifyElement({
        element: consentRequestsEChartElements.CHART_TYPE_ANNOTATION_BUTTON,
    });

    cy.verifyElement({
        element: consentRequestsEChartElements.OPT_IN_ICON,
        labelElement: consentRequestsEChartElements.OPT_IN_LABEL,
        labelText: "Opt in",
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: consentRequestsEChartElements.OPT_IN_VALUE,
        elementText: optInValue,
    });

    cy.verifyElement({
        element: consentRequestsEChartElements.OPT_IN_TREND_ICON,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: consentRequestsEChartElements.OPT_IN_PERCENTAGE,
        elementText: optInPercentage,
    });

    cy.verifyElement({
        element: consentRequestsEChartElements.OPT_OUT_ICON,
        labelElement: consentRequestsEChartElements.OPT_OUT_LABEL,
        labelText: "Opt out",
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: consentRequestsEChartElements.OPT_OUT_VALUE,
        elementText: optOutValue,
    });

    cy.verifyElement({
        element: consentRequestsEChartElements.OPT_OUT_TREND_ICON,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: consentRequestsEChartElements.OPT_OUT_PERCENTAGE,
        elementText: optOutPercentage,
    });
};

const verifyUserDataExportsEChart = ({
    isEmpty = false,
    exportsValue = null,
    exportsPercentage = null,
}) => {
    if (isEmpty) {
        cy.verifyElement({
            element: userDataExportsEChartElements.EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: userDataExportsEChartElements.EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: userDataExportsEChartElements.EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });

        cy.verifyElement({
            labelElement: userDataExportsEChartElements.USER_DATA_EXPORTS_NUMBER,
            labelText: "0",
        });

        cy.verifyElement({
            labelElement: userDataExportsEChartElements.USER_DATA_EXPORTS_PERCENTAGE,
            labelText: "NA",
        });

        return;
    }
    //TODO: Data is not being generated with the populator. Need to generate the data
    // cy.verifyElement({
    //     element: userDataExportsEChartElements.CHART_USER_DATA_EXPORTS,
    // });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: userDataExportsEChartElements.USER_DATA_EXPORTS_NUMBER,
        elementText: exportsValue,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: userDataExportsEChartElements.USER_DATA_EXPORTS_PERCENTAGE,
        elementText: exportsPercentage,
    });
};

const verifyUserDataPurgesEChart = ({
    isEmpty = false,
    purgesValue = null,
    purgesPercentage = null,
}) => {
    if (isEmpty) {
        cy.verifyElement({
            element: userDataPurgesEChartElements.EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: userDataPurgesEChartElements.EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: userDataPurgesEChartElements.EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });

        cy.verifyElement({
            labelElement: userDataPurgesEChartElements.USER_DATA_PURGES_NUMBER,
            labelText: "0",
        });

        cy.verifyElement({
            labelElement: userDataPurgesEChartElements.USER_DATA_PURGES_PERCENTAGE,
            labelText: "NA",
        });

        return;
    }
    //TODO: Data is not being generated with the populator. Need to generate the data
    // cy.verifyElement({
    //     element: userDataPurgesEChartElements.CHART_USER_DATA_PURGES,
    // });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: userDataPurgesEChartElements.USER_DATA_PURGES_NUMBER,
        elementText: purgesValue,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: userDataPurgesEChartElements.USER_DATA_PURGES_PERCENTAGE,
        elementText: purgesPercentage,
    });
};

const clickMetricsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(metricsPageElements.TAB_METRICS);
};

const clickUsersTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(metricsPageElements.TAB_USERS);
};

const clickConsentHistoryTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(metricsPageElements.TAB_CONSENT_HISTORY);
};

const clickExportPurgeHistoryTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(metricsPageElements.TAB_EXPORT_PURGE_HISTORY);
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    verifyConsentRequestsEChart,
    verifyUserDataExportsEChart,
    verifyUserDataPurgesEChart,
    clickMetricsTab,
    clickUsersTab,
    clickConsentHistoryTab,
    clickExportPurgeHistoryTab
};