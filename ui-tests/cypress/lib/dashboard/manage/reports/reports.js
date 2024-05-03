import reportsPageElements from "../../../../support/elements/dashboard/manage/reports/reports";

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
}

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: reportsPageElements.EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: reportsPageElements.EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: reportsPageElements.EMPTY_TABLE_SUBTITLE,
        labelText: "Create reports to receive e-mails periodically.",
    });

    cy.verifyElement({
        element: reportsPageElements.EMPTY_TABLE_CREATE_NEW_REPORT_LINK_BUTTON,
        elementText: '+ Create New Report'
    });
};

module.exports = {
    verifyEmptyPageElements
};