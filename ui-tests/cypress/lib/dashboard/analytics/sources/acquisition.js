import analyticsSourcesPageElements from "../../../../support/elements/dashboard/analytics/acquisition/acquisition";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: analyticsSourcesPageElements.PAGE_TITLE,
        labelText: "Sources",
        tooltipElement: analyticsSourcesPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Overview of the source of traffic to your mobile application (where the user discovered the app) or website application (how the user came to your website)."
    });

    cy.verifyElement({
        element: analyticsSourcesPageElements.FILTER_DATE_PICKER,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: analyticsSourcesPageElements.EMPTY_PIE_SOURCES_TOTAL_SESSIONS_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsSourcesPageElements.EMPTY_PIE_SOURCES_TOTAL_SESSIONS_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsSourcesPageElements.EMPTY_PIE_SOURCES_TOTAL_SESSIONS_SUBTITLE,
        labelText: "No data found",
    });

    cy.verifyElement({
        element: analyticsSourcesPageElements.EMPTY_PIE_SOURCES_NEW_USERS_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsSourcesPageElements.EMPTY_PIE_SOURCES_NEW_USERS_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsSourcesPageElements.EMPTY_PIE_SOURCES_NEW_USERS_SUBTITLE,
        labelText: "No data found",
    });

    cy.verifyElement({
        element: analyticsSourcesPageElements.EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsSourcesPageElements.EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsSourcesPageElements.EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });
};

module.exports = {
    verifyEmptyPageElements,
};