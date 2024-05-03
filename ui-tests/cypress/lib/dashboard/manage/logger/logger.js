import incomingDataLogsPageElements from "../../../../support/elements/dashboard/manage/logger/logger";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: incomingDataLogsPageElements.PAGE_TITLE,
        labelText: "Incoming Data Logs",
        tooltipElement: incomingDataLogsPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Log requests made to the write API to review and debug incoming data"
    });

    cy.verifyElement({
        labelElement: incomingDataLogsPageElements.PAGE_SUB_TITLE,
        labelText: "Only up to last 1000 incoming data logs are stored"
    });

    cy.verifyElement({
        element: incomingDataLogsPageElements.SELECT_FILTER_COMBOBOX,
    });

    cy.verifyElement({
        element: incomingDataLogsPageElements.EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: incomingDataLogsPageElements.DATATABLE_SEARCH_INPUT,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: incomingDataLogsPageElements.ENABLE_AUTO_REFRESH_TOGGLE,
        labelElement: incomingDataLogsPageElements.ENABLE_AUTO_REFRESH_LABEL,
        labelText: "Enable Auto-refresh",
        tooltipElement: incomingDataLogsPageElements.ENABLE_AUTO_REFRESH_TOOLTIP,
        tooltipText: "Automatically refresh can be adjusted through this switch"
    });

    cy.verifyElement({
        element: incomingDataLogsPageElements.EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: incomingDataLogsPageElements.EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: incomingDataLogsPageElements.EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });
};

module.exports = {
    verifyEmptyPageElements,
};