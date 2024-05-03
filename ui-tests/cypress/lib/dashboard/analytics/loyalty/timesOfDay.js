import analyticsLoyaltyTimesOfDayPageElements from "../../../../support/elements/dashboard/analytics/loyalty/timesOfDay";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: analyticsLoyaltyTimesOfDayPageElements.PAGE_TITLE,
        labelText: "Times of Day",
        tooltipElement: analyticsLoyaltyTimesOfDayPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Scatter plot chart with times and days of Session and Event occurrences in your application, based on users' local time."
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: analyticsLoyaltyTimesOfDayPageElements.TAB_USER_ACTIVITY,
        elementText: "User Activity",
    });

    cy.verifyElement({
        element: analyticsLoyaltyTimesOfDayPageElements.TAB_SLIPPING_AWAY,
        elementText: "Slipping Away",
    });

    cy.verifyElement({
        element: analyticsLoyaltyTimesOfDayPageElements.TAB_TIMES_OF_DAY,
        elementText: "Times of Day",
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: analyticsLoyaltyTimesOfDayPageElements.EMPTY_PAGE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsLoyaltyTimesOfDayPageElements.EMPTY_PAGE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsLoyaltyTimesOfDayPageElements.EMPTY_PAGE_SUBTITLE,
        labelText: "No data found",
    });
};

const clickUserActivityTab = () => {
    cy.clickElement(analyticsLoyaltyTimesOfDayPageElements.TAB_USER_ACTIVITY);
};

const clickSlippingAwayTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsLoyaltyTimesOfDayPageElements.TAB_SLIPPING_AWAY);
};

const clickTimesOfDayTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsLoyaltyTimesOfDayPageElements.TAB_TIMES_OF_DAY);
};

module.exports = {
    verifyEmptyPageElements,
    clickUserActivityTab,
    clickSlippingAwayTab,
    clickTimesOfDayTab
};