import analyticsViewsPerSessionPageElements from "../../../../support/elements/dashboard/analytics/sessions/viewsPerSession";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: analyticsViewsPerSessionPageElements.PAGE_TITLE,
        labelText: "Views per Session",
        tooltipElement: analyticsViewsPerSessionPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Number of screens or pages that your users viewed in your application, in the selected time period, distributed into frequency ranges."
    });

    cy.scrollPageToTop();

    // cy.verifyElement({
    //     element: analyticsSessionsOverviewPageElements.TAB_SESSION_OVERVIEW,
    //     elementText: "Session Overview",
    // });

    cy.verifyElement({
        element: analyticsViewsPerSessionPageElements.TAB_SESSION_DURATIONS,
        elementText: "Session Durations",
    });

    cy.verifyElement({
        element: analyticsViewsPerSessionPageElements.TAB_SESSION_FREQUENCY,
        elementText: "Session Frequency",
    });

    cy.verifyElement({
        element: analyticsViewsPerSessionPageElements.TAB_SESSION_VIEWS_PER_SESSION,
        elementText: "Views per Session",
    });
}

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: analyticsViewsPerSessionPageElements.EMPTY_PAGE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsViewsPerSessionPageElements.EMPTY_PAGE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsViewsPerSessionPageElements.EMPTY_PAGE_SUBTITLE,
        labelText: "No data found",
    });

    cy.verifyElement({
        element: analyticsViewsPerSessionPageElements.EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsViewsPerSessionPageElements.EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsViewsPerSessionPageElements.EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });
};

const clickSessionOverviewTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsViewsPerSessionPageElements.TAB_SESSION_OVERVIEW);
};

const clickSessionDurationsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsViewsPerSessionPageElements.TAB_SESSION_DURATIONS);
};

const clickSessionFrequencyTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsViewsPerSessionPageElements.TAB_SESSION_FREQUENCY);
};

const clickViewsPerSessionTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsViewsPerSessionPageElements.TAB_SESSION_VIEWS_PER_SESSION);
};

module.exports = {
    verifyEmptyPageElements,
    clickSessionOverviewTab,
    clickSessionDurationsTab,
    clickSessionFrequencyTab,
    clickViewsPerSessionTab
};