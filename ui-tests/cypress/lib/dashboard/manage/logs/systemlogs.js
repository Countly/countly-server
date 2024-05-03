import systemLogsPageElements from "../../../../support/elements/dashboard/manage/logs/systemlogs";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: systemLogsPageElements.PAGE_TITLE,
        labelText: "Audit Logs"
    });

    cy.verifyElement({
        element: systemLogsPageElements.FILTER_DATE_PICKER,
    });

    cy.verifyElement({
        element: systemLogsPageElements.ACTION_TYPE_SELECT,
    });

    cy.verifyElement({
        element: systemLogsPageElements.USER_SELECT,
    });

    cy.verifyElement({
        element: systemLogsPageElements.TABLE_AUDIT_LOGS,
    });

    cy.verifyElement({
        element: systemLogsPageElements.TABLE_EXPORT_BUTTON,
    });

    cy.verifyElement({
        element: systemLogsPageElements.TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        element: systemLogsPageElements.TAB_SERVER_LOGS,
        elementText: "Server Logs"
    });

    cy.verifyElement({
        element: systemLogsPageElements.TAB_AUDIT_LOGS,
        elementText: "Audit Logs"
    });
}

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

};

const clickServerLogsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(systemLogsPageElements.TAB_SERVER_LOGS);
};

const clickAuditLogsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(systemLogsPageElements.TAB_AUDIT_LOGS);
};

module.exports = {
    verifyEmptyPageElements,
    clickServerLogsTab,
    clickAuditLogsTab
};