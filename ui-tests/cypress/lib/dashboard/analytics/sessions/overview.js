import analyticsSessionsOverviewPageElements from "../../../../support/elements/dashboard/analytics/sessions/overview";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: analyticsSessionsOverviewPageElements.PAGE_TITLE,
        labelText: "Session Overview",
        tooltipElement: analyticsSessionsOverviewPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Summary of all sessions your users have had in your application, in the selected time period."
    });

    cy.scrollPageToTop();

    // cy.verifyElement({
    //     element: analyticsSessionsOverviewPageElements.TAB_SESSION_OVERVIEW,
    //     elementText: "Session Overview",
    // });

    cy.verifyElement({
        element: analyticsSessionsOverviewPageElements.TAB_SESSION_DURATIONS,
        elementText: "Session Durations",
    });

    cy.verifyElement({
        element: analyticsSessionsOverviewPageElements.TAB_SESSION_FREQUENCY,
        elementText: "Session Frequency",
    });

    cy.verifyElement({
        element: analyticsSessionsOverviewPageElements.TAB_SESSION_VIEWS_PER_SESSION,
        elementText: "Views per Session",
    });
}

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: analyticsSessionsOverviewPageElements.EMPTY_PAGE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsSessionsOverviewPageElements.EMPTY_PAGE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsSessionsOverviewPageElements.EMPTY_PAGE_SUBTITLE,
        labelText: "No data found",
    });
};

const clickSessionOverviewTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsSessionsOverviewPageElements.TAB_SESSION_OVERVIEW);
};

const clickSessionDurationsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsSessionsOverviewPageElements.TAB_SESSION_DURATIONS);
};

const clickSessionFrequencyTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsSessionsOverviewPageElements.TAB_SESSION_FREQUENCY);
};

const clickViewsPerSessionTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsSessionsOverviewPageElements.TAB_SESSION_VIEWS_PER_SESSION);
};

module.exports = {
    verifyEmptyPageElements,
    clickSessionOverviewTab,
    clickSessionDurationsTab,
    clickSessionFrequencyTab,
    clickViewsPerSessionTab
};