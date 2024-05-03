import analyticsSessionsDurationsPageElements from "../../../../support/elements/dashboard/analytics/sessions/durations";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: analyticsSessionsDurationsPageElements.PAGE_TITLE,
        labelText: "Session Durations",
        tooltipElement: analyticsSessionsDurationsPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Time period(s) for which users have opened your application."
    });

    cy.scrollPageToTop();

    // cy.verifyElement({
    //     element: analyticsSessionsOverviewPageElements.TAB_SESSION_OVERVIEW,
    //     elementText: "Session Overview",
    // });

    cy.verifyElement({
        element: analyticsSessionsDurationsPageElements.TAB_SESSION_DURATIONS,
        elementText: "Session Durations",
    });

    cy.verifyElement({
        element: analyticsSessionsDurationsPageElements.TAB_SESSION_FREQUENCY,
        elementText: "Session Frequency",
    });

    cy.verifyElement({
        element: analyticsSessionsDurationsPageElements.TAB_SESSION_VIEWS_PER_SESSION,
        elementText: "Views per Session",
    });
}

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: analyticsSessionsDurationsPageElements.EMPTY_PAGE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsSessionsDurationsPageElements.EMPTY_PAGE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsSessionsDurationsPageElements.EMPTY_PAGE_SUBTITLE,
        labelText: "No data found",
    });

    cy.verifyElement({
        element: analyticsSessionsDurationsPageElements.EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsSessionsDurationsPageElements.EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsSessionsDurationsPageElements.EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });
};

const clickSessionOverviewTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsSessionsDurationsPageElements.TAB_SESSION_OVERVIEW);
};

const clickSessionDurationsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsSessionsDurationsPageElements.TAB_SESSION_DURATIONS);
};

const clickSessionFrequencyTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsSessionsDurationsPageElements.TAB_SESSION_FREQUENCY);
};

const clickViewsPerSessionTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsSessionsDurationsPageElements.TAB_SESSION_VIEWS_PER_SESSION);
};

module.exports = {
    verifyEmptyPageElements,
    clickSessionOverviewTab,
    clickSessionDurationsTab,
    clickSessionFrequencyTab,
    clickViewsPerSessionTab
};