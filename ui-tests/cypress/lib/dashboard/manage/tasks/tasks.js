import {
    reportManagerPageElements,
    manuallyCreatedDataTableElements,
    automaticallyCreatedDataTableElements
} from "../../../../support/elements/dashboard/manage/tasks/tasks";

const verifyStaticElementsOfManuallyCreatedPage = () => {
    cy.verifyElement({
        labelElement: reportManagerPageElements.PAGE_TITLE,
        labelText: "Report Manager",
    });

    cy.verifyElement({
        element: reportManagerPageElements.TAB_MANUALLY_CREATED,
        elementText: "Manually Created",
    });

    cy.verifyElement({
        element: reportManagerPageElements.TAB_AUTOMATICALLY_CREATED,
        elementText: "Automatically created",
    });

    cy.verifyElement({
        labelElement: reportManagerPageElements.MANUALLY_TABLE_REMIND_LABEL,
        labelText: "One-time and auto-refreshing reports created by you and your team"
    });

    cy.verifyElement({
        element: reportManagerPageElements.FILTER_PARAMETERS_SELECT,
    });

    cy.verifyElement({
        element: manuallyCreatedDataTableElements().MANUALLY_CREATED_EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: manuallyCreatedDataTableElements().MANUALLY_CREATED_DATATABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        labelElement: manuallyCreatedDataTableElements().COLUMN_NAME_NAME_AND_DESCRIPTION_LABEL,
        labelText: "Name and Description",
    });

    cy.verifyElement({
        labelElement: manuallyCreatedDataTableElements().COLUMN_NAME_DATA_LABEL,
        labelText: "Data",
    });

    cy.verifyElement({
        labelElement: manuallyCreatedDataTableElements().COLUMN_NAME_STATUS_LABEL,
        labelText: "Status",
    });

    cy.verifyElement({
        labelElement: manuallyCreatedDataTableElements().COLUMN_NAME_ORIGIN_LABEL,
        labelText: "Origin",
    });

    cy.verifyElement({
        labelElement: manuallyCreatedDataTableElements().COLUMN_NAME_TYPE_LABEL,
        labelText: "Type",
    });

    cy.verifyElement({
        labelElement: manuallyCreatedDataTableElements().COLUMN_NAME_PERIOD_LABEL,
        labelText: "Period",
    });

    cy.verifyElement({
        labelElement: manuallyCreatedDataTableElements().COLUMN_NAME_VISIBILITY_LABEL,
        labelText: "Visibility",
    });

    cy.verifyElement({
        labelElement: manuallyCreatedDataTableElements().COLUMN_NAME_LAST_UPDATED_LABEL,
        labelText: "Last updated",
    });

    cy.verifyElement({
        element: manuallyCreatedDataTableElements().COLUMN_NAME_LAST_UPDATED_SORTABLE_ICON,
    });
};

const verifyStaticElementsOfAutomaticallyCreatedPage = () => {
    cy.verifyElement({
        labelElement: reportManagerPageElements.PAGE_TITLE,
        labelText: "Report Manager",
    });

    cy.verifyElement({
        element: reportManagerPageElements.TAB_MANUALLY_CREATED,
        elementText: "Manually Created",
    });

    cy.verifyElement({
        element: reportManagerPageElements.TAB_AUTOMATICALLY_CREATED,
        elementText: "Automatically created",
    });

    cy.verifyElement({
        labelElement: reportManagerPageElements.AUTOMATICALLY_TABLE_REMIND_LABEL,
        labelText: "Reports automatically generated when a query takes a long time to complete"
    });

    cy.verifyElement({
        element: reportManagerPageElements.FILTER_PARAMETERS_SELECT,
    });

    cy.verifyElement({
        element: automaticallyCreatedDataTableElements().AUTOMATICALLY_CREATED_EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: automaticallyCreatedDataTableElements().AUTOMATICALLY_CREATED_DATATABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        labelElement: automaticallyCreatedDataTableElements().COLUMN_NAME_NAME_AND_DESCRIPTION_LABEL,
        labelText: "Name and Description",
    });

    cy.verifyElement({
        labelElement: automaticallyCreatedDataTableElements().COLUMN_NAME_DATA_LABEL,
        labelText: "Data",
    });

    cy.verifyElement({
        labelElement: automaticallyCreatedDataTableElements().COLUMN_NAME_STATUS_LABEL,
        labelText: "Status",
    });

    cy.verifyElement({
        labelElement: automaticallyCreatedDataTableElements().COLUMN_NAME_ORIGIN_LABEL,
        labelText: "Origin",
    });

    cy.verifyElement({
        labelElement: automaticallyCreatedDataTableElements().COLUMN_NAME_LAST_UPDATED_LABEL,
        labelText: "Last updated",
    });

    cy.verifyElement({
        element: automaticallyCreatedDataTableElements().COLUMN_NAME_LAST_UPDATED_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: automaticallyCreatedDataTableElements().COLUMN_NAME_DURATION_LABEL,
        labelText: "Duration",
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfManuallyCreatedPage();

    verifyReportManagerManuallyCreatedDataTable({
        isEmpty: true
    });

    clickAutomaticallyCreatedTab();

    verifyStaticElementsOfAutomaticallyCreatedPage();

    verifyReportManagerAutomaticallyCreatedDataTable({
        isEmpty: true
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfManuallyCreatedPage();

    verifyReportManagerManuallyCreatedDataTable({
        isEmpty: false,
        shouldNotEqual: true,
    });

    clickAutomaticallyCreatedTab();

    verifyStaticElementsOfAutomaticallyCreatedPage();

    verifyReportManagerAutomaticallyCreatedDataTable({
        isEmpty: false,
        shouldNotEqual: true,
    });
};

const verifyReportManagerManuallyCreatedDataTable = ({
    index = 0,
    isEmpty = false,
    shouldNotEqual = false,
    nameAndDescription = null,
    data = null,
    status = null,
    origin = null,
    type = null,
    period = null,
    visibility = null,
    lastUpdated = null
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: manuallyCreatedDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: manuallyCreatedDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: manuallyCreatedDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: manuallyCreatedDataTableElements(index).NAME_AND_DESCRIPTION,
        elementText: nameAndDescription,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: manuallyCreatedDataTableElements(index).DATA,
        elementText: data,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: manuallyCreatedDataTableElements(index).STATUS,
        elementText: status,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: manuallyCreatedDataTableElements(index).ORIGIN,
        elementText: origin,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: manuallyCreatedDataTableElements(index).TYPE,
        elementText: type,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: manuallyCreatedDataTableElements(index).PERIOD,
        elementText: period,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: manuallyCreatedDataTableElements(index).VISIBILITY,
        elementText: visibility,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: manuallyCreatedDataTableElements(index).LAST_UPDATED,
        elementText: lastUpdated,
    });
};

const verifyReportManagerAutomaticallyCreatedDataTable = ({
    index = 0,
    isEmpty = false,
    shouldNotEqual = false,
    nameAndDescription = null,
    data = null,
    status = null,
    origin = null,
    lastUpdated = null,
    duration = null
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: automaticallyCreatedDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: automaticallyCreatedDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: automaticallyCreatedDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: automaticallyCreatedDataTableElements(index).NAME_AND_DESCRIPTION,
        elementText: nameAndDescription,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: automaticallyCreatedDataTableElements(index).DATA,
        elementText: data,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: automaticallyCreatedDataTableElements(index).STATUS,
        elementText: status,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: automaticallyCreatedDataTableElements(index).ORIGIN,
        elementText: origin,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: automaticallyCreatedDataTableElements(index).LAST_UPDATED,
        elementText: lastUpdated,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: automaticallyCreatedDataTableElements(index).DURATION,
        elementText: duration,
    });
};

const clickManuallyCreatedTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(reportManagerPageElements.TAB_MANUALLY_CREATED);
};

const clickAutomaticallyCreatedTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(reportManagerPageElements.TAB_AUTOMATICALLY_CREATED);
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    clickManuallyCreatedTab,
    clickAutomaticallyCreatedTab,
    verifyReportManagerManuallyCreatedDataTable,
    verifyReportManagerAutomaticallyCreatedDataTable
};