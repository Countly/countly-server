import {
    reportsPageElements,
    reportsDataTableElements
} from "../../../../support/elements/dashboard/manage/reports/reports";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: reportsPageElements.PAGE_TITLE,
        labelText: "Email Reports",
        tooltipElement: reportsPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Create automatic reports to receive e-mails periodically.Visualize and manage all existing<br /> e-mail reports set up."
    });

    cy.verifyElement({
        element: reportsPageElements.CREATE_NEW_REPORT_BUTTON,
        elementText: 'Create new report'
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyReportsDataTable({
        isEmpty: true
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyReportsDataTable({
        isEmpty: false
    });
};

const verifyReportsDataTable = ({
    index = 0,
    isEmpty = false,
    isStatusChecked = false,
    reportName = null,
    email = null,
    data = null,
    frequency = null,
    time = null
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: reportsDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: reportsDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: reportsDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "Create reports to receive e-mails periodically.",
        });

        cy.verifyElement({
            element: reportsDataTableElements().EMPTY_TABLE_CREATE_NEW_REPORT_LINK_BUTTON,
            elementText: '+ Create New Report'
        });

        return;
    }

    cy.verifyElement({
        isElementVisible: false,
        labelElement: reportsDataTableElements().COLUMN_NAME_REPORT_NAME_LABEL,
        labelText: "Report Name",
        element: reportsDataTableElements().COLUMN_NAME_REPORT_NAME_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: reportsDataTableElements().COLUMN_NAME_EMAILS_LABEL,
        labelText: "Emails",
        element: reportsDataTableElements().COLUMN_NAME_EMAILS_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: reportsDataTableElements().COLUMN_NAME_DATA_LABEL,
        labelText: "Data",
        element: reportsDataTableElements().COLUMN_NAME_DATA_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: reportsDataTableElements().COLUMN_NAME_FREQUENCY_LABEL,
        labelText: "Frequency",
        element: reportsDataTableElements().COLUMN_NAME_FREQUENCY_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: reportsDataTableElements().COLUMN_NAME_TIME_LABEL,
        labelText: "Time",
        element: reportsDataTableElements().COLUMN_NAME_TIME_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: reportsDataTableElements(index).STATUS,
        isChecked: isStatusChecked,
    });

    cy.verifyElement({
        element: reportsDataTableElements(index).REPORT_NAME,
        elementText: reportName
    });

    cy.verifyElement({
        element: reportsDataTableElements(index).EMAILS,
        elementText: email
    });

    cy.verifyElement({
        element: reportsDataTableElements(index).DATA,
        elementText: data
    });

    cy.verifyElement({
        element: reportsDataTableElements(index).FREQUENCY,
        elementText: frequency
    });

    cy.verifyElement({
        element: reportsDataTableElements(index).TIME,
        elementText: time
    });
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    verifyReportsDataTable
};