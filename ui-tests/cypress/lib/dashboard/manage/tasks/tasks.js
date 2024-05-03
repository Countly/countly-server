import reportManagerPageElements from "../../../../support/elements/dashboard/manage/tasks/tasks";

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
        element: reportManagerPageElements.MANUALLY_CREATED_EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: reportManagerPageElements.MANUALLY_CREATED_DATATABLE_SEARCH_INPUT,
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
        element: reportManagerPageElements.AUTOMATICALLY_CREATED_EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: reportManagerPageElements.AUTOMATICALLY_CREATED_DATATABLE_SEARCH_INPUT,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfManuallyCreatedPage();

    cy.verifyElement({
        element: reportManagerPageElements.EMPTY_MANUALLY_CREATED_DATATABLE_ICON,
    });

    cy.verifyElement({
        labelElement: reportManagerPageElements.EMPTY_MANUALLY_CREATED_DATATABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: reportManagerPageElements.EMPTY_MANUALLY_CREATED_DATATABLE_SUBTITLE,
        labelText: "No data found",
    });

    clickAutomaticallyCreatedTab();

    verifyStaticElementsOfAutomaticallyCreatedPage();

    cy.verifyElement({
        element: reportManagerPageElements.EMPTY_AUTOMATICALLY_CREATED_DATATABLE_ICON,
    });

    cy.verifyElement({
        labelElement: reportManagerPageElements.EMPTY_AUTOMATICALLY_CREATED_DATATABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: reportManagerPageElements.EMPTY_AUTOMATICALLY_CREATED_DATATABLE_SUBTITLE,
        labelText: "No data found",
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
    clickManuallyCreatedTab,
    clickAutomaticallyCreatedTab
};