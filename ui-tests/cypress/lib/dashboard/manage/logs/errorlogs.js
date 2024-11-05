import errorLogsPageElements from "../../../../support/elements/dashboard/manage/logs/errorlogs";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: errorLogsPageElements.PAGE_TITLE,
        labelText: "Server Logs"
    });

    cy.verifyElement({
        element: errorLogsPageElements.LOG_TYPE_SELECT,
    });

    cy.verifyElement({
        element: errorLogsPageElements.DOWNLOAD_LOG_LINK,
        elementText: "Download Log"
    });

    cy.verifyElement({
        element: errorLogsPageElements.CLEAR_LOG_LINK_BUTTON,
        elementText: "Clear Log"
    });

    cy.verifyElement({
        element: errorLogsPageElements.TABLE_LOGS,
    });

    cy.verifyElement({
        element: errorLogsPageElements.TAB_SERVER_LOGS,
        elementText: "Server Logs"
    });

    cy.verifyElement({
        element: errorLogsPageElements.TAB_AUDIT_LOGS,
        elementText: "Audit Logs"
    });
};

const verifyPageElements = () => {

    verifyStaticElementsOfPage();

};

const clickServerLogsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(errorLogsPageElements.TAB_SERVER_LOGS);
};

const clickAuditLogsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(errorLogsPageElements.TAB_AUDIT_LOGS);
};

module.exports = {
    verifyPageElements,
    clickServerLogsTab,
    clickAuditLogsTab
};