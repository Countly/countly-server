import {
    reportsPageElements,
    reportsDataTableElements,
    reportDrawerElements,
    reportsPreviewElements
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

const typeReportName = (name) => {
    cy.typeInput(reportDrawerElements.REPORT_NAME_INPUT, name);
};

const typeReportToReceive = (...emailAddress) => {
    cy.clickElement(reportDrawerElements.REPORT_TO_RECEIVE_SELECT);
    cy.typeSelectInput(reportDrawerElements.REPORT_TO_RECEIVE_INPUT, ...emailAddress);
};

const selectReportTypeCore = () => {
    cy.clickElement(reportDrawerElements.REPORT_TYPE_RADIO_BUTTON_CORE);
};

const selectReportTypeDashboard = () => {
    cy.clickElement(reportDrawerElements.REPORT_TYPE_RADIO_BUTTON_DASHBOARD);
};

const selectDateRange = (dateRange) => {
    cy.selectListBoxItem(reportDrawerElements.SELECT_DATE_RANGE, dateRange);
};

const selectSourceApp = (app) => {
    cy.selectCheckboxOption(reportDrawerElements.SELECT_SOURCE_APP, app);
};

const selectData = (data) => {
    cy.selectCheckboxOption(reportDrawerElements.SELECT_DATA, data);
};

const selectTime = (time) => {
    cy.selectListBoxItem(reportDrawerElements.SELECT_TIME, time);
};

const selectFrequencyType = (frequencyType) => {
    cy.clickElement(reportDrawerElements[`FREQUENCY_TYPE_RADIO_BUTTON_${frequencyType.toUpperCase().replaceAll(' ', '_')}`]);
};

const selectTimezone = (timezone) => {
    cy.clickElement(reportDrawerElements.SELECT_TIMEZONE_COMBOBOX);
    cy.typeInput(reportDrawerElements.SELECT_TIMEZONE_SEARCH_INPUT, timezone);
    cy.clickElement(reportDrawerElements.SELECT_TIMEZONE_COMBOBOX_ITEM);
};

const clickCreateReportButton = () => {
    cy.clickElement(reportDrawerElements.CREATE_BUTTON);
};

const verifyReportCreatedNotification = () => {
    cy.verifyElement({
        labelElement: reportsPageElements.NOTIFICATION_SAVED_SUCCESSFULLY_MESSAGE,
        labelText: "Successfully saved report"
    });
};

const closeNotification = () => {
    cy.clickElement(reportsPageElements.NOTIFICATION_SAVED_SUCCESSFULLY_MESSAGE_CLOSE_ICON);
};

const openReportPreviewButton = (index = 0) => {
    cy.clickDataTableMoreButtonItem(reportsDataTableElements(index).MORE_OPTIONS_BUTTON_OPTION_PREVIEW);
};

const verifyReportPreviewPageImage = () => {
    cy.verifyElement({
        element: reportsPreviewElements.COUNTLY_LOGO
    });

    cy.verifyElement({
        element: reportsPreviewElements.DASHBOARD_IMAGE
    });
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    verifyReportsDataTable,
    typeReportName,
    typeReportToReceive,
    selectReportTypeCore,
    selectReportTypeDashboard,
    selectSourceApp,
    selectData,
    selectFrequencyType,
    selectDateRange,
    selectTime,
    selectTimezone,
    clickCreateReportButton,
    verifyReportCreatedNotification,
    closeNotification,
    openReportPreviewButton,
    verifyReportPreviewPageImage
};