import {
    actionLogsPageElements,
    actionLogsDataTableElements
} from "../../../../support/elements/dashboard/manage/compliance/actionlogs";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: actionLogsPageElements.PAGE_TITLE,
        labelText: "Compliance Hub",
    });

    cy.verifyElement({
        labelElement: actionLogsPageElements.EXPORT_PURGE_HISTORY_FOR_LABEL,
        labelText: "Export/Purge History for",
        element: actionLogsPageElements.EXPORT_PURGE_HISTORY_FILTER_SELECT,
        elementText: "All",
    });

    cy.verifyElement({
        element: actionLogsPageElements.TAB_METRICS,
        elementText: "Metrics",
    });

    cy.verifyElement({
        element: actionLogsPageElements.TAB_USERS,
        elementText: "Users",
    });

    cy.verifyElement({
        element: actionLogsPageElements.TAB_CONSENT_HISTORY,
        elementText: "Consent History",
    });

    cy.verifyElement({
        element: actionLogsPageElements.TAB_EXPORT_PURGE_HISTORY,
        elementText: "Export/Purge History",
    });

    cy.verifyElement({
        element: actionLogsPageElements.FILTER_DATE_PICKER,
    });

    cy.verifyElement({
        element: actionLogsDataTableElements().EXPORT_PURGE_HISTORY_TABLE_EXPORT_BUTTON,
    });

    cy.verifyElement({
        element: actionLogsDataTableElements().EXPORT_PURGE_HISTORY_TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        labelElement: actionLogsDataTableElements().COLUMN_NAME_USER_LABEL,
        labelText: "USER",
    });

    cy.verifyElement({
        element: actionLogsDataTableElements().COLUMN_NAME_USER_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: actionLogsDataTableElements().COLUMN_NAME_IP_ADDRESS_LABEL,
        labelText: "IP ADDRESS",
    });

    cy.verifyElement({
        element: actionLogsDataTableElements().COLUMN_NAME_IP_ADDRESS_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: actionLogsDataTableElements().COLUMN_NAME_ACTION_LABEL,
        labelText: "ACTION",
    });

    cy.verifyElement({
        element: actionLogsDataTableElements().COLUMN_NAME_ACTION_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: actionLogsDataTableElements().COLUMN_NAME_TIME_LABEL,
        labelText: "TIME",
    });

    cy.verifyElement({
        element: actionLogsDataTableElements().COLUMN_NAME_TIME_SORTABLE_ICON,
    });
}

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyActionLogsDataFromTable({
        isEmpty: true
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyActionLogsDataFromTable({
        isEmpty: false,
    });
};

const verifyActionLogsDataFromTable = ({
    index = 0,
    isEmpty = false,
    user = null,
    ipAddress = null,
    action = null,
    time = null
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: actionLogsDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: actionLogsDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: actionLogsDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: actionLogsDataTableElements(index).USER,
        labelText: user,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: actionLogsDataTableElements(index).IP_ADDRESS,
        labelText: ipAddress,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: actionLogsDataTableElements(index).ACTION,
        labelText: action,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: actionLogsDataTableElements(index).TIME,
        labelText: time,
    });
}

const clickMetricsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(actionLogsPageElements.TAB_METRICS);
};

const clickUsersTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(actionLogsPageElements.TAB_USERS);
};

const clickConsentHistoryTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(actionLogsPageElements.TAB_CONSENT_HISTORY);
};

const clickExportPurgeHistoryTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(actionLogsPageElements.TAB_EXPORT_PURGE_HISTORY);
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    verifyActionLogsDataFromTable,
    clickMetricsTab,
    clickUsersTab,
    clickConsentHistoryTab,
    clickExportPurgeHistoryTab
};