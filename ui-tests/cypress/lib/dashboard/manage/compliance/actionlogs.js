import complianceExportPurgePageElements from "../../../../support/elements/dashboard/manage/compliance/actionlogs";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: complianceExportPurgePageElements.PAGE_TITLE,
        labelText: "Compliance Hub",
    });

    cy.verifyElement({
        labelElement: complianceExportPurgePageElements.EXPORT_PURGE_HISTORY_FOR_LABEL,
        labelText: "Export/Purge History for",
        element: complianceExportPurgePageElements.EXPORT_PURGE_HISTORY_FILTER_SELECT,
        elementText: "All",
    });

    cy.verifyElement({
        element: complianceExportPurgePageElements.FILTER_DATE_PICKER,
    });

    cy.verifyElement({
        element: complianceExportPurgePageElements.EXPORT_PURGE_HISTORY_TABLE_EXPORT_BUTTON,
    });

    cy.verifyElement({
        element: complianceExportPurgePageElements.EXPORT_PURGE_HISTORY_TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        element: complianceExportPurgePageElements.TAB_METRICS,
        elementText: "Metrics",
    });

    cy.verifyElement({
        element: complianceExportPurgePageElements.TAB_USERS,
        elementText: "Users",
    });

    cy.verifyElement({
        element: complianceExportPurgePageElements.TAB_CONSENT_HISTORY,
        elementText: "Consent History",
    });

    cy.verifyElement({
        element: complianceExportPurgePageElements.TAB_EXPORT_PURGE_HISTORY,
        elementText: "Export/Purge History",
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: complianceExportPurgePageElements.EXPORT_PURGE_HISTORY_EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: complianceExportPurgePageElements.EXPORT_PURGE_HISTORY_EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: complianceExportPurgePageElements.EXPORT_PURGE_HISTORY_EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });
};

const clickMetricsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(complianceExportPurgePageElements.TAB_METRICS);
};

const clickUsersTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(complianceExportPurgePageElements.TAB_USERS);
};

const clickConsentHistoryTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(complianceExportPurgePageElements.TAB_CONSENT_HISTORY);
};

const clickExportPurgeHistoryTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(complianceExportPurgePageElements.TAB_EXPORT_PURGE_HISTORY);
};

module.exports = {
    verifyEmptyPageElements,
    clickMetricsTab,
    clickUsersTab,
    clickConsentHistoryTab,
    clickExportPurgeHistoryTab
};