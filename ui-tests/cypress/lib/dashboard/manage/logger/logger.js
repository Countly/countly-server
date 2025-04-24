import {
    loggerPageElements,
    logsDataTableElements
} from "../../../../support/elements/dashboard/manage/logger/logger";

const verifyStaticElementsOfPage = (isEnabled) => {
    cy.verifyElement({
        labelElement: loggerPageElements.PAGE_TITLE,
        labelText: "Incoming Data Logs",
        tooltipElement: loggerPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Logs requests made to the write API to review and debug incoming data."
    });

    cy.verifyElement({
        labelElement: loggerPageElements.PAGE_SUB_TITLE,
        labelText: "Only up to last 1000 incoming data logs are stored"
    });

    if (isEnabled) {
        cy.verifyElement({
            labelElement: loggerPageElements.AUTO_REFRESH_IS_LABEL,
            labelText: "Auto-refresh is",
            element: loggerPageElements.ENABLED_LABEL,
            elementText: "Enabled",
            tooltipElement: loggerPageElements.AUTO_REFRESH_IS_ENABLED_TOOLTIP,
            tooltipText: "Automatic refresh can be adjusted through this switch.",
        });

        cy.verifyElement({
            element: loggerPageElements.STOP_AUTO_REFRESH_BUTTON,
            elementText: "Stop Auto-refresh",
        });
    }
    else {
        cy.verifyElement({
            element: loggerPageElements.ENABLE_AUTO_REFRESH_TOGGLE,
            labelElement: loggerPageElements.ENABLE_AUTO_REFRESH_LABEL,
            labelText: "Enable Auto-refresh",
            tooltipElement: loggerPageElements.ENABLE_AUTO_REFRESH_TOOLTIP,
            tooltipText: "Automatic refresh can be adjusted through this switch."
        });
    }

    cy.verifyElement({
        element: logsDataTableElements().SELECT_FILTER_COMBOBOX,
    });

    cy.verifyElement({
        element: logsDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: logsDataTableElements().DATATABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        labelElement: logsDataTableElements().COLUMN_NAME_REQUEST_RECEIVED_LABEL,
        labelText: "Request Received",
    });

    cy.verifyElement({
        element: logsDataTableElements().COLUMN_NAME_REQUEST_RECEIVED_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: logsDataTableElements().COLUMN_NAME_DETAILS_LABEL,
        labelText: "Details",
    });

    cy.verifyElement({
        element: logsDataTableElements().COLUMN_NAME_DETAILS_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: logsDataTableElements().COLUMN_NAME_INFORMATION_LABEL,
        labelText: "Information",
    });

    cy.verifyElement({
        element: logsDataTableElements().COLUMN_NAME_INFORMATION_SORTABLE_ICON,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage(false);

    verifyLogsDataTable({
        isEmpty: true
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage(false);

    cy.checkPaceActive();

    cy
        .elementExists(logsDataTableElements().EMPTY_TABLE_ICON) //Data comes sometimes
        .then((isExists) => {
            if (isExists) {
                verifyLogsDataTable({
                    isEmpty: true
                });
            }
            else {
                verifyLogsDataTable({
                    isEmpty: false,
                    shouldNotEqual: true,
                });
            }
        });
};

const verifyLogsDataTable = ({
    index = 0,
    isEmpty = false,
    shouldNotEqual = false,
    requestReceived = null,
    details = null,
    information = null
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: logsDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: logsDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: logsDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: logsDataTableElements(index).REQUEST_RECEIVED,
        elementText: requestReceived,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: logsDataTableElements(index).DETAILS,
        elementText: details,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: logsDataTableElements(index).INFORMATION_FILTER,
        elementText: information,
    });

    cy.elementExists(logsDataTableElements(index).INFORMATION_PROBLEMS)
        .then((isExists) => {
            if (isExists) {
                cy.verifyElement({
                    element: logsDataTableElements(index).INFORMATION_PROBLEMS,
                    elementText: "Problems occurred",
                });
            }
        });

    cy.elementExists(logsDataTableElements(index).INFORMATION_DESC)
        .then((isExists) => {
            if (isExists) {
                cy.verifyElement({
                    element: logsDataTableElements(index).INFORMATION_DESC,
                    elementText: "Plugin that processes this information is not enabled:",
                });
            }
        });

    cy.clickElement(logsDataTableElements(index).REQUEST_RECEIVED);

    cy.clickElement(logsDataTableElements().TAB_DATA);

    cy.verifyElement({
        labelElement: logsDataTableElements().TAB_DATA,
        labelText: "Data",
        element: logsDataTableElements().EXPAND_DATA,
    });

    cy.clickElement(logsDataTableElements().TAB_HEADER);

    cy.verifyElement({
        labelElement: logsDataTableElements().TAB_HEADER,
        labelText: "Header",
        element: logsDataTableElements().EXPAND_HEADER,
    });
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    verifyLogsDataTable,
};