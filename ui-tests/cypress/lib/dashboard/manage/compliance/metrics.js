import complianceMetricsPageElements from "../../../../support/elements/dashboard/manage/compliance/metrics";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: complianceMetricsPageElements.PAGE_TITLE,
        labelText: "Compliance Hub",
    });

    cy.verifyElement({
        labelElement: complianceMetricsPageElements.CONSENT_REQUESTS_FOR_LABEL,
        labelText: "Consent Requests for",
        element: complianceMetricsPageElements.CONSENT_REQUESTS_FILTER_SELECT,
        elementText: "Sessions",
    });

    cy.verifyElement({
        element: complianceMetricsPageElements.FILTER_DATE_PICKER,
    });

    cy.scrollPageToBottom();

    cy.verifyElement({
        labelElement: complianceMetricsPageElements.USER_DATA_EXPORTS_LABEL,
        labelText: "User data exports",
        element: complianceMetricsPageElements.USER_DATA_EXPORTS_TREND_ICON,
    });

    cy.verifyElement({
        labelElement: complianceMetricsPageElements.USER_DATA_PURGES_LABEL,
        labelText: "User data purges",
        element: complianceMetricsPageElements.USER_DATA_PURGES_TREND_ICON,
    });


    cy.verifyElement({
        element: complianceMetricsPageElements.TAB_METRICS,
        elementText: "Metrics",
    });

    cy.verifyElement({
        element: complianceMetricsPageElements.TAB_USERS,
        elementText: "Users",
    });

    cy.verifyElement({
        element: complianceMetricsPageElements.TAB_CONSENT_HISTORY,
        elementText: "Consent History",
    });

    cy.verifyElement({
        element: complianceMetricsPageElements.TAB_EXPORT_PURGE_HISTORY,
        elementText: "Export/Purge History",
    });
}

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.scrollPageToTop();

    cy.verifyElement({
        element: complianceMetricsPageElements.CONSENT_EMPTY_CHART_ICON,
    });

    cy.verifyElement({
        labelElement: complianceMetricsPageElements.CONSENT_EMPTY_CHART_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: complianceMetricsPageElements.CONSENT_EMPTY_CHART_SUBTITLE,
        labelText: "No data found",
    });

    cy.scrollPageToBottom();

    cy.verifyElement({
        labelElement: complianceMetricsPageElements.USER_DATA_EXPORTS_NUMBER,
        labelText: "0",
    });

    cy.verifyElement({
        labelElement: complianceMetricsPageElements.USER_DATA_EXPORTS_PERCENTAGE,
        labelText: "NA",
    });

    cy.verifyElement({
        labelElement: complianceMetricsPageElements.USER_DATA_PURGES_NUMBER,
        labelText: "0",
    });

    cy.verifyElement({
        labelElement: complianceMetricsPageElements.USER_DATA_PURGES_VALUE,
        labelText: "NA",
    });

    cy.verifyElement({
        element: complianceMetricsPageElements.USER_DATA_EXPORTS_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: complianceMetricsPageElements.USER_DATA_EXPORTS_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: complianceMetricsPageElements.USER_DATA_EXPORTS_TABLE_SUBTITLE,
        labelText: "No data found",
    });

    cy.verifyElement({
        element: complianceMetricsPageElements.USER_DATA_PURGES_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: complianceMetricsPageElements.USER_DATA_PURGES_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: complianceMetricsPageElements.USER_DATA_PURGES_TABLE_SUBTITLE,
        labelText: "No data found",
    });
};

const clickMetricsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(complianceMetricsPageElements.TAB_METRICS);
};

const clickUsersTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(complianceMetricsPageElements.TAB_USERS);
};

const clickConsentHistoryTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(complianceMetricsPageElements.TAB_CONSENT_HISTORY);
};

const clickExportPurgeHistoryTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(complianceMetricsPageElements.TAB_EXPORT_PURGE_HISTORY);
};

module.exports = {
    verifyEmptyPageElements,
    clickMetricsTab,
    clickUsersTab,
    clickConsentHistoryTab,
    clickExportPurgeHistoryTab
};