import complianceHistoryPageElements from "../../../../support/elements/dashboard/manage/compliance/history";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: complianceHistoryPageElements.PAGE_TITLE,
        labelText: "Compliance Hub",
    });

    cy.verifyElement({
        labelElement: complianceHistoryPageElements.CONSENT_HISTORY_FOR_LABEL,
        labelText: "Consent History for",
        element: complianceHistoryPageElements.CONSENT_HISTORY_FILTER_SELECT,
        elementText: "All",
    });

    cy.verifyElement({
        labelElement: complianceHistoryPageElements.CONSENT_HISTORY_AND_LABEL,
        labelText: "and",
        element: complianceHistoryPageElements.CONSENT_HISTORY_METRICS_FILTER_SELECT,
        elementText: "All",
    });

    cy.verifyElement({
        element: complianceHistoryPageElements.HISTORY_TABLE_EXPORT_BUTTON,
    });

    cy.verifyElement({
        element: complianceHistoryPageElements.HISTORY_TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        element: complianceHistoryPageElements.TAB_METRICS,
        elementText: "Metrics",
    });

    cy.verifyElement({
        element: complianceHistoryPageElements.TAB_USERS,
        elementText: "Users",
    });

    cy.verifyElement({
        element: complianceHistoryPageElements.TAB_CONSENT_HISTORY,
        elementText: "Consent History",
    });

    cy.verifyElement({
        element: complianceHistoryPageElements.TAB_EXPORT_PURGE_HISTORY,
        elementText: "Export/Purge History",
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: complianceHistoryPageElements.HISTORY_EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: complianceHistoryPageElements.HISTORY_EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: complianceHistoryPageElements.HISTORY_EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });
};

const clickMetricsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(complianceHistoryPageElements.TAB_METRICS);
};

const clickUsersTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(complianceHistoryPageElements.TAB_USERS);
};

const clickConsentHistoryTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(complianceHistoryPageElements.TAB_CONSENT_HISTORY);
};

const clickExportPurgeHistoryTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(complianceHistoryPageElements.TAB_EXPORT_PURGE_HISTORY);
};

module.exports = {
    verifyEmptyPageElements,
    clickMetricsTab,
    clickUsersTab,
    clickConsentHistoryTab,
    clickExportPurgeHistoryTab
};