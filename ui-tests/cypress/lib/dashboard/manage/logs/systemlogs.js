import {
    systemLogsPageElements,
    systemLogsDataTableElements
} from "../../../../support/elements/dashboard/manage/logs/systemlogs";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: systemLogsPageElements.PAGE_TITLE,
        labelText: "Audit Logs"
    });

    cy.verifyElement({
        element: systemLogsPageElements.TAB_SERVER_LOGS,
        elementText: "Server Logs"
    });

    cy.verifyElement({
        element: systemLogsPageElements.TAB_AUDIT_LOGS,
        elementText: "Audit Logs"
    });

    cy.verifyElement({
        element: systemLogsDataTableElements().FILTER_DATE_PICKER,
    });

    cy.verifyElement({
        element: systemLogsDataTableElements().ACTION_TYPE_SELECT,
    });

    cy.verifyElement({
        element: systemLogsDataTableElements().USER_SELECT,
    });

    cy.verifyElement({
        element: systemLogsDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: systemLogsDataTableElements().TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        labelElement: systemLogsDataTableElements().COLUMN_NAME_TIME_LABEL,
        labelText: "Time",
        element: systemLogsDataTableElements().COLUMN_NAME_TIME_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: systemLogsDataTableElements().COLUMN_NAME_USER_LABEL,
        labelText: "User",
        element: systemLogsDataTableElements().COLUMN_NAME_USER_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: systemLogsDataTableElements().COLUMN_NAME_IP_ADDRESS_LABEL,
        labelText: "IP Address",
        element: systemLogsDataTableElements().COLUMN_NAME_IP_ADDRESS_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: systemLogsDataTableElements().COLUMN_NAME_ACTION_LABEL,
        labelText: "Action",
    });
};

const verifyPageElements = () => {

    verifyStaticElementsOfPage();

    verifySystemLogsDataTable({
        shouldNotEqual: true,
    });
};

const verifySystemLogsDataTable = ({
    index = 0,
    shouldNotEqual = false,
    time = null,
    user = null,
    ipAddress = null,
    action = null
}) => {

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: systemLogsDataTableElements(index).TIME,
        elementText: time,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: systemLogsDataTableElements(index).USER,
        elementText: user,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: systemLogsDataTableElements(index).IP_ADDRESS,
        elementText: ipAddress,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: systemLogsDataTableElements(index).ACTION_NAME,
        elementText: action,
    });

    cy.clickElement(systemLogsDataTableElements(index).TIME);

    cy.verifyElement({
        element: systemLogsDataTableElements(index).EXPAND_ROW,
        elementText: "The following data was changed",
    });
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
    verifyPageElements,
    verifySystemLogsDataTable,
    clickServerLogsTab,
    clickAuditLogsTab
};