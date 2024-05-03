const analyticsUsersOverviewPageElements = require("../../../../support/elements/dashboard/analytics/users/overview");

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: analyticsUsersOverviewPageElements.PAGE_TITLE,
        labelText: "Users Overview",
        tooltipElement: analyticsUsersOverviewPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Overview of the main metrics and stats about your audience."
    });

    cy.verifyElement({
        element: analyticsUsersOverviewPageElements.FILTER_DATE_PICKER,
    });
}

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: analyticsUsersOverviewPageElements.EMPTY_PAGE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsUsersOverviewPageElements.EMPTY_PAGE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsUsersOverviewPageElements.EMPTY_PAGE_SUBTITLE,
        labelText: "No data found",
    });
};

module.exports = {
    verifyEmptyPageElements,
};