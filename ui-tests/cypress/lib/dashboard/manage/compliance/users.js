import complianceUsersPageElements from "../../../../support/elements/dashboard/manage/compliance/users";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: complianceUsersPageElements.PAGE_TITLE,
        labelText: "Compliance Hub",
    });

    cy.verifyElement({
        element: complianceUsersPageElements.USERS_TABLE_EXPORT_BUTTON,
    });

    cy.verifyElement({
        element: complianceUsersPageElements.USERS_TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        element: complianceUsersPageElements.TAB_METRICS,
        elementText: "Metrics",
    });

    cy.verifyElement({
        element: complianceUsersPageElements.TAB_USERS,
        elementText: "Users",
    });

    cy.verifyElement({
        element: complianceUsersPageElements.TAB_CONSENT_HISTORY,
        elementText: "Consent History",
    });

    cy.verifyElement({
        element: complianceUsersPageElements.TAB_EXPORT_PURGE_HISTORY,
        elementText: "Export/Purge History",
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: complianceUsersPageElements.USERS_EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: complianceUsersPageElements.USERS_EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: complianceUsersPageElements.USERS_EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });
};

const clickMetricsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(complianceUsersPageElements.TAB_METRICS);
};

const clickUsersTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(complianceUsersPageElements.TAB_USERS);
};

const clickConsentHistoryTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(complianceUsersPageElements.TAB_CONSENT_HISTORY);
};

const clickExportPurgeHistoryTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(complianceUsersPageElements.TAB_EXPORT_PURGE_HISTORY);
};

module.exports = {
    verifyEmptyPageElements,
    clickMetricsTab,
    clickUsersTab,
    clickConsentHistoryTab,
    clickExportPurgeHistoryTab
};