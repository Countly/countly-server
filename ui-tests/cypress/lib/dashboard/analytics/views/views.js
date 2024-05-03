import analyticsViewsPageElements from "../../../../support/elements/dashboard/analytics/views/views";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: analyticsViewsPageElements.PAGE_TITLE,
        labelText: "Views",
        tooltipElement: analyticsViewsPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Overview of the data trends and metrics for the pages or screens viewed on your application, in the selected time period."
    });
}

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: analyticsViewsPageElements.EMPTY_PAGE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsViewsPageElements.EMPTY_PAGE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsViewsPageElements.EMPTY_PAGE_SUBTITLE,
        labelText: "No data found",
    });

    cy.verifyElement({
        element: analyticsViewsPageElements.EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsViewsPageElements.EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsViewsPageElements.EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });
};

module.exports = {
    verifyEmptyPageElements
};